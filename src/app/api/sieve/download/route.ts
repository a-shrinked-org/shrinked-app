import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/utils/r2-utils';
import { createClient } from '@/utils/supabase';
import { Buffer } from 'buffer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Handle API errors with consistent formatting
 */
function handleApiError(error: any, defaultMessage: string): NextResponse {
  console.error(`API error in sieve:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json(
    { error: defaultMessage, details: errorMessage },
    { status: 500 }
  );
}

/**
 * Handles audio download job submission to Sieve
 */
export async function POST(request: NextRequest) {
  const path = new URL(request.url).pathname;
  if (path === '/api/sieve/download') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Authentication failed: No Bearer token.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let userId: string;
    try {
      // Assuming the token is a JWT and contains a 'sub' (subject) claim for userId
      // You might need a more robust JWT decoding/verification library here
      // For simplicity, we'll do a basic decode. In production, verify signature.
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('[Sieve Download API] JWT Payload:', payload); // Log the entire payload
      userId = payload._id; // Use _id as the user ID
      if (!userId) {
        throw new Error('User ID not found in token payload.');
      }
    } catch (error) {
      console.error('Authentication failed: Invalid token.', error);
      return NextResponse.json({ error: 'Unauthorized', details: 'Invalid token' }, { status: 401 });
    }
    console.log('Authentication successful for user:', userId);
    const supabase = createClient();

    // IMPORTANT: Ensure SIEVE_API_KEY is set in your environment variables.
    // If not set, this API route will return a 500 error.
    if (!process.env.SIEVE_API_KEY) {
      console.error('SIEVE_API_KEY environment variable is not set.');
      return handleApiError(new Error('SIEVE_API_KEY environment variable is not set.'), 'Server configuration error');
    }
    const SIEVE_API_KEY = process.env.SIEVE_API_KEY;
    console.log('Sieve API key found.');

    try {
      // 3. Get the URL and other parameters from the request body
      const { url, output_format = 'mp3' } = await request.json();
      if (!url) {
        console.log('URL is missing from request body.');
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
      }
      console.log('Received URL:', url, 'Output format:', output_format);

      // 4. Generate a unique webhook URL
      const webhookUrl = `${request.nextUrl.origin}/api/sieve/webhook`;

      // 5. Push job to Sieve via HTTP POST with webhook
      console.log('Pushing job to Sieve via HTTP POST...');
      const maxRetries = 3;
      let attempt = 0;
      let sievePushResponse;
      while (attempt < maxRetries) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
          sievePushResponse = await fetch('https://mango.sievedata.com/v2/push', {
            method: 'POST',
            headers: {
              'X-API-Key': SIEVE_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              function: 'damn/audio_downloader',
              inputs: {
                url: url,
                output_format: output_format,
                cookies_file: '/sieve/cookies.txt',
              },
              webhooks: [{ type: 'job_start', url: webhookUrl }],
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (sievePushResponse.ok) {
            break;
          }
          const errorBody = await sievePushResponse.text(); // Read body once
          throw new Error(`HTTP ${sievePushResponse.status}: ${errorBody}`);
        } catch (error: any) {
          console.error(`Error during Sieve push attempt ${attempt + 1}:`, error.message);
          attempt++;
          if (attempt === maxRetries) {
            throw error;
          }
          const backoff = Math.pow(2, attempt) * 2000;
          console.log(`Retrying job submission (attempt ${attempt + 1}/${maxRetries}) after ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }

      if (!sievePushResponse || !sievePushResponse.ok) {
        let finalErrorBody = '';
        if (sievePushResponse) {
          try {
            finalErrorBody = await sievePushResponse.text();
          } catch (e) {
            console.warn('Could not read sievePushResponse body after error (it might have been read already):', e);
          }
        }
        console.error(`Failed to push job to Sieve. Status: ${sievePushResponse?.status}, StatusText: ${sievePushResponse?.statusText}, Body: ${finalErrorBody}`);
        throw new Error(`Failed to push job to Sieve: ${sievePushResponse?.statusText}. Body: ${finalErrorBody}`);
      }

      const sieveJobData = await sievePushResponse.json();
      const jobId = sieveJobData.id;
      console.log('Sieve job pushed. Job ID:', jobId);

      // 6. Store job metadata in Supabase
      const { error: dbError } = await supabase
        .from('job_statuses')
        .insert({
          job_id: jobId,
          user_id: userId,
          status: 'queued',
          original_url: url,
          output_format: output_format,
        });

      if (dbError) {
        console.error('Error saving job to Supabase:', JSON.stringify(dbError));
        return handleApiError(dbError, 'Failed to save job metadata');
      }

      // 7. Return the job ID for frontend tracking
      return NextResponse.json({ jobId });
    } catch (error) {
      console.error('Error during Sieve job submission:', error);
      return handleApiError(error, 'Failed to initiate audio download');
    }
  }

  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const supabase = createClient();
    let jobMetadata;
    let fetchError;

    // 1. Fetch current status from Supabase
    ({ data: jobMetadata, error: fetchError } = await supabase
      .from('job_statuses')
      .select('status, file_url, error, original_url, output_format')
      .eq('job_id', jobId)
      .single());

    if (fetchError || !jobMetadata) {
      console.error('Error fetching job status from Supabase:', JSON.stringify(fetchError));
      // If job not found in DB, it might be a very new job, try Sieve directly
      jobMetadata = { status: 'job_not_found' };
    }

    // 2. If status is queued or processing, query Sieve directly
    if (jobMetadata.status === 'queued' || jobMetadata.status === 'processing' || jobMetadata.status === 'job_not_found') {
      if (!process.env.SIEVE_API_KEY) {
        console.error('SIEVE_API_KEY environment variable is not set for status check.');
        return handleApiError(new Error('SIEVE_API_KEY environment variable is not set.'), 'Server configuration error');
      }
      const SIEVE_API_KEY = process.env.SIEVE_API_KEY;

      try {
        const sieveStatusResponse = await fetch(`https://mango.sievedata.com/v2/jobs/${jobId}`, {
          headers: {
            'X-API-Key': SIEVE_API_KEY,
          },
        });

        if (!sieveStatusResponse.ok) {
          const errorBody = await sieveStatusResponse.text();
          console.error(`Failed to fetch Sieve job status for ${jobId}: HTTP ${sieveStatusResponse.status}, Body: ${errorBody}`);
          // If Sieve says job not found, and it was also not found in Supabase, return 404
          if (sieveStatusResponse.status === 404 && jobMetadata.status === 'job_not_found') {
            return NextResponse.json(
              { status: 'job_not_found', fileUrl: null, error: `Job ${jobId} not found` },
              { status: 404 }
            );
          }
          // Otherwise, return current Supabase status or a generic error
          return NextResponse.json({
            status: jobMetadata.status || 'error',
            fileUrl: jobMetadata.file_url || null,
            error: jobMetadata.error || `Failed to get Sieve status: ${sieveStatusResponse.statusText}`,
          });
        }

        const sieveJobData = await sieveStatusResponse.json();
        const sieveStatus = sieveJobData.status;
        const sieveOutputs = sieveJobData.outputs;
        const sieveError = sieveJobData.error;

        // 3. Update Supabase if Sieve reports a final status
        if (sieveStatus === 'finished' || sieveStatus === 'error' || sieveStatus === 'cancelled') {
          let updatedFileUrl = jobMetadata.file_url;
          if (sieveStatus === 'finished' && sieveOutputs && sieveOutputs.length > 0) {
            // Assuming the first output is the file URL
            updatedFileUrl = sieveOutputs[0].url || sieveOutputs[0];
            // TODO: You might need to re-upload this file to R2 if it's a temporary Sieve URL
            // For now, we'll just use the Sieve URL directly if it's a final output
          }

          const { error: updateError } = await supabase
            .from('job_statuses')
            .update({
              status: sieveStatus,
              file_url: updatedFileUrl,
              error: sieveError,
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', jobId);

          if (updateError) {
            console.error('Error updating job status in Supabase from Sieve poll:', JSON.stringify(updateError));
          }
          // Update jobMetadata to reflect the new status before returning
          jobMetadata.status = sieveStatus;
          jobMetadata.file_url = updatedFileUrl;
          jobMetadata.error = sieveError;
        }

        // If Sieve status is still processing/queued, just return that
        jobMetadata.status = sieveStatus;
      } catch (sieveErr) {
        console.error('Error querying Sieve for job status:', sieveErr);
        // Fallback to Supabase status if Sieve query fails
        return NextResponse.json({
          status: jobMetadata.status || 'error',
          fileUrl: jobMetadata.file_url || null,
          error: jobMetadata.error || 'Failed to query Sieve for status',
        });
      }
    }

    // 4. Return the latest status
    return NextResponse.json({
      status: jobMetadata.status,
      fileUrl: jobMetadata.file_url || null,
      error: jobMetadata.status === 'error' ? jobMetadata.error || 'Job failed' : null,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to retrieve job status');
  }
}