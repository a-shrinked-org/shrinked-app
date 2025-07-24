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
  console.error(`API error in sieve:`, error, error.stack);
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
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('[Sieve Download API] JWT Payload:', payload);
      userId = payload._id;
      if (!userId) {
        throw new Error('User ID not found in token payload.');
      }
    } catch (error) {
      console.error('Authentication failed: Invalid token.', error);
      return NextResponse.json({ error: 'Unauthorized', details: 'Invalid token' }, { status: 401 });
    }
    console.log('Authentication successful for user:', userId);
    const supabase = createClient();

    if (!process.env.SIEVE_API_KEY) {
      console.error('SIEVE_API_KEY not set.');
      return handleApiError(new Error('SIEVE_API_KEY not set'), 'Server configuration error');
    }
    const SIEVE_API_KEY = process.env.SIEVE_API_KEY;

    try {
      const { url, output_format = 'mp3' } = await request.json();
      if (!url) {
        console.log('URL is missing from request body.');
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
      }
      console.log('Received URL:', url, 'Output format:', output_format);

      const webhookUrl = `${request.nextUrl.origin}/api/sieve/webhook`;
      console.log('Webhook URL:', webhookUrl);

      console.log('Pushing job to Sieve...');
      const maxRetries = 3;
      let attempt = 0;
      let sievePushResponse;
      while (attempt < maxRetries) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);
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
              webhooks: [
                { type: 'job_start', url: webhookUrl },
                { type: 'job_completed', url: webhookUrl },
                { type: 'job_failed', url: webhookUrl },
              ],
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (sievePushResponse.ok) {
            break;
          }
          const errorBody = await sievePushResponse.text();
          throw new Error(`HTTP ${sievePushResponse.status}: ${errorBody}`);
        } catch (error: any) {
          console.error(`Sieve push attempt ${attempt + 1} failed:`, error.message);
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
        const finalErrorBody = sievePushResponse ? await sievePushResponse.text() : 'No response';
        console.error(`Failed to push job to Sieve. Status: ${sievePushResponse?.status}, Body: ${finalErrorBody}`);
        throw new Error(`Failed to push job to Sieve: ${sievePushResponse?.statusText}. Body: ${finalErrorBody}`);
      }

      const sieveJobData = await sievePushResponse.json();
      const jobId = sieveJobData.id;
      console.log('Sieve job pushed. Job ID:', jobId, 'Response:', JSON.stringify(sieveJobData, null, 2));

      const maxDbRetries = 3;
      let dbAttempt = 0;
      let dbError: any;
      while (dbAttempt < maxDbRetries) {
        try {
          const { error } = await supabase
            .from('job_statuses')
            .insert({
              job_id: jobId,
              user_id: userId,
              status: 'queued',
              original_url: url,
              output_format: output_format,
              updated_at: new Date().toISOString(),
            });
          if (!error) {
            break;
          }
          dbError = error;
          throw new Error(`Supabase insert failed: ${JSON.stringify(dbError)}`);
        } catch (error: any) {
          console.error(`Supabase insert attempt ${dbAttempt + 1} failed:`, error.message);
          dbAttempt++;
          if (dbAttempt === maxDbRetries) {
            throw error;
          }
          const backoff = Math.pow(2, dbAttempt) * 1000;
          console.log(`Retrying Supabase insert (attempt ${dbAttempt + 1}/${maxDbRetries}) after ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }

      if (dbError) {
        console.error('Error saving job to Supabase:', JSON.stringify(dbError));
        return handleApiError(dbError, 'Failed to save job metadata');
      }

      return NextResponse.json({ jobId });
    } catch (error) {
      console.error('Error during Sieve job submission:', error);
      return handleApiError(error, 'Failed to initiate audio download');
    }
  }

  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}

/**
 * Handles polling for Sieve job status.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      console.log('Job ID is missing from request query.');
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    console.log('Checking status for Job ID:', jobId);

    const supabase = createClient();
    let jobMetadata;
    let fetchError;

    // Fetch current status from Supabase with retries
    const maxDbRetries = 3;
    let dbAttempt = 0;
    while (dbAttempt < maxDbRetries) {
      try {
        ({ data: jobMetadata, error: fetchError } = await supabase
          .from('job_statuses')
          .select('status, file_url, error, original_url, output_format, updated_at')
          .eq('job_id', jobId)
          .single());
        if (!fetchError) {
          break;
        }
        throw new Error(`Supabase fetch failed: ${JSON.stringify(fetchError)}`);
      } catch (error: any) {
        console.error(`Supabase fetch attempt ${dbAttempt + 1} failed:`, error.message);
        dbAttempt++;
        if (dbAttempt === maxDbRetries) {
          console.error('Supabase fetch error:', JSON.stringify(fetchError));
          jobMetadata = { status: 'job_not_found', file_url: null, error: null, original_url: null, output_format: null, updated_at: null };
          break;
        }
        const backoff = Math.pow(2, dbAttempt) * 1000;
        console.log(`Retrying Supabase fetch (attempt ${dbAttempt + 1}/${maxDbRetries}) after ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }

    if (!jobMetadata) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Query Sieve for non-final states or if no recent update
    const isNonFinalState = ['queued', 'processing', 'job_not_found', 'started'].includes(jobMetadata.status);
    const isRecentUpdate = jobMetadata.updated_at && (Date.now() - new Date(jobMetadata.updated_at).getTime()) < 30000;

    if (isNonFinalState && !isRecentUpdate) {
      if (!process.env.SIEVE_API_KEY) {
        console.error('SIEVE_API_KEY not set.');
        return handleApiError(new Error('SIEVE_API_KEY not set'), 'Server configuration error');
      }
      const SIEVE_API_KEY = process.env.SIEVE_API_KEY;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const sieveStatusResponse = await fetch(`https://mango.sievedata.com/v2/jobs/${jobId}`, {
          headers: {
            'X-API-Key': SIEVE_API_KEY,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!sieveStatusResponse.ok) {
          const errorBody = await sieveStatusResponse.text();
          console.error(`Sieve status fetch failed for ${jobId}: HTTP ${sieveStatusResponse.status}, Body: ${errorBody}`);
          if (sieveStatusResponse.status === 404 && jobMetadata.status === 'job_not_found') {
            return NextResponse.json(
              { status: 'job_not_found', fileUrl: null, error: `Job ${jobId} not found` },
              { status: 404 }
            );
          }
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

        // Validate state transition
        const validTransitions: Record<string, string[]> = {
          'job_not_found': ['queued', 'started', 'processing'],
          'queued': ['started', 'processing', 'finished', 'error', 'cancelled'],
          'started': ['processing', 'finished', 'error', 'cancelled'],
          'processing': ['finished', 'error', 'cancelled'],
        };
        if (validTransitions[jobMetadata.status as keyof typeof validTransitions]?.includes(sieveStatus) || jobMetadata.status === 'job_not_found') {
          let updatedFileUrl = jobMetadata.file_url;
          if (sieveStatus === 'finished' && sieveOutputs) {
            const sieveFileUrl = Array.isArray(sieveOutputs) ? sieveOutputs[0]?.url || sieveOutputs[0] : sieveOutputs.url || sieveOutputs;
            if (sieveFileUrl && sieveFileUrl.startsWith('http')) {
              updatedFileUrl = sieveFileUrl;
              console.log(`Using Sieve output URL: ${updatedFileUrl}`);
            }
          }

          const maxDbRetriesUpdate = 3;
          let dbUpdateAttempt = 0;
          let updateError: any;
          while (dbUpdateAttempt < maxDbRetriesUpdate) {
            try {
              const { error } = await supabase
                .from('job_statuses')
                .update({
                  status: sieveStatus,
                  file_url: updatedFileUrl,
                  error: sieveError,
                  updated_at: new Date().toISOString(),
                })
                .eq('job_id', jobId);
              if (!error) {
                break;
              }
              updateError = error;
              throw new Error(`Supabase update failed: ${JSON.stringify(updateError)}`);
            } catch (error: any) {
              console.error(`Supabase update attempt ${dbUpdateAttempt + 1} failed:`, error.message);
              dbUpdateAttempt++;
              if (dbUpdateAttempt === maxDbRetriesUpdate) {
                throw error;
              }
              const backoff = Math.pow(2, dbUpdateAttempt) * 1000;
              console.log(`Retrying Supabase update (attempt ${dbUpdateAttempt + 1}/${maxDbRetriesUpdate}) after ${backoff}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoff));
            }
          }

          if (updateError) {
            console.error('Supabase update error:', JSON.stringify(updateError));
          }
          console.log(`Job ${jobId} status updated: ${jobMetadata.status} -> ${sieveStatus}`);
          jobMetadata.status = sieveStatus;
          jobMetadata.file_url = updatedFileUrl;
          jobMetadata.error = sieveError;
        } else {
          console.warn(`Invalid state transition for job ${jobId}: ${jobMetadata.status} -> ${sieveStatus}`);
          return NextResponse.json({
            status: jobMetadata.status,
            fileUrl: jobMetadata.file_url || null,
            error: `Invalid status transition: ${jobMetadata.status} -> ${sieveStatus}`,
          });
        }
      } catch (sieveErr) {
        console.error('Sieve query error:', sieveErr);
        return NextResponse.json({
          status: jobMetadata.status || 'error',
          fileUrl: jobMetadata.file_url || null,
          error: jobMetadata.error || 'Failed to query Sieve for status',
        });
      }
    }

    return NextResponse.json({
      status: jobMetadata.status,
      fileUrl: jobMetadata.file_url || null,
      error: jobMetadata.status === 'error' ? jobMetadata.error || 'Job failed' : null,
    });
  } catch (error: any) {
    console.error('Error during Sieve job status check:', error, error.stack);
    return handleApiError(error, 'Failed to retrieve job status');
  }
}