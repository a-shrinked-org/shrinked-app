import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/utils/r2-utils';

// In-memory store for job metadata (replace with Redis/database in production)
const jobStore: Map<string, { status: string; fileUrl?: string; originalUrl: string; output_format: string }> = new Map();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Verify authentication token from request headers
 */
async function verifyAuth(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    const token = authHeader.split(' ')[1];
    return !!token; // Replace with robust token verification
  } catch (error) {
    console.error('Auth verification error:', error);
    return false;
  }
}

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
    // 1. Verify Authentication
    const isAuthenticated = await verifyAuth(request);
    if (!isAuthenticated) {
      console.log('Authentication failed.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('Authentication successful.');

    // 2. Check for the API key
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
          sievePushResponse = await fetch('https://mango.sievedata.com/v2/push', {
            method: 'POST',
            headers: {
              'X-API-Key': SIEVE_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              function: 'sieve/audio_downloader',
              inputs: {
                url: url,
                output_format: output_format,
                cookies_file: '/sieve/cookies.txt',
              },
              webhooks: [{ type: 'job_complete', url: webhookUrl }],
            }),
          });

          if (sievePushResponse.ok) {
            break;
          }
          throw new Error(`HTTP ${sievePushResponse.status}: ${await sievePushResponse.text()}`);
        } catch (error) {
          attempt++;
          if (attempt === maxRetries) {
            throw error;
          }
          const backoff = Math.pow(2, attempt) * 1000;
          console.log(`Retrying job submission (attempt ${attempt + 1}/${maxRetries}) after ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }

      if (!sievePushResponse || !sievePushResponse.ok) {
        const errorBody = await sievePushResponse?.text();
        throw new Error(`Failed to push job to Sieve: ${sievePushResponse?.statusText}. Body: ${errorBody}`);
      }

      const sieveJobData = await sievePushResponse.json();
      const jobId = sieveJobData.id;
      console.log('Sieve job pushed. Job ID:', jobId);

      // 6. Store job metadata
      jobStore.set(jobId, { status: 'queued', originalUrl: url, output_format });

      // 7. Return the job ID for frontend tracking
      return NextResponse.json({ jobId });
    } catch (error) {
      console.error('Error during Sieve job submission:', error);
      return handleApiError(error, 'Failed to initiate audio download');
    }
  } else if (path === '/api/sieve/webhook') {
    // Webhook handler
    try {
      const webhookData = await request.json();
      const { job_id, status, data } = webhookData;
      console.log(`Webhook received for job ${job_id}: ${status}`);

      if (status === 'finished' && data) {
        const fileUrl = Array.isArray(data) ? data[0] : data.url || data;
        if (!fileUrl || !fileUrl.startsWith('http')) {
          throw new Error('No valid file URL in webhook data');
        }

        // Fetch the file from Sieve's output URL
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file from ${fileUrl}: ${fileResponse.statusText}`);
        }
        const fileBuffer = await fileResponse.arrayBuffer();

        // Generate filename based on job ID and output format
        const jobMetadata = jobStore.get(job_id);
        const extension = jobMetadata?.output_format || 'mp3';
        const filename = `sieve-download-${job_id}.${extension}`;

        // Get presigned URL for Cloudflare R2
        const { presignedUrl: uploadUrl } = await getPresignedUploadUrl(filename, `audio/${extension}`);

        // Upload to Cloudflare R2
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: fileBuffer,
          headers: { 'Content-Type': `audio/${extension}` },
        });
        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload to R2: ${uploadResponse.statusText}`);
        }

        // Construct the final file URL (adjust based on your R2 setup)
        const r2FileUrl = `https://your-r2-bucket.s3.amazonaws.com/${filename}`;

        // Update job metadata
        jobStore.set(job_id, { ...jobMetadata!, status, fileUrl: r2FileUrl, originalUrl: jobMetadata?.originalUrl || '', output_format: jobMetadata?.output_format || '' });

        return NextResponse.json({ status: 'received' }, { status: 200 });
      } else if (status === 'error') {
        const jobMetadata = jobStore.get(job_id);
        jobStore.set(job_id, {
          status,
          fileUrl: undefined,
          originalUrl: jobMetadata?.originalUrl || '',
          output_format: jobMetadata?.output_format || '',
        });
        return NextResponse.json({ status: 'received' }, { status: 200 });
      }

      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    } catch (error) {
      console.error('Webhook error:', error);
      return handleApiError(error, 'Failed to process webhook');
    }
  }

  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}

/**
 * Retrieves job status from the in-memory store (fallback for frontend)
 */
export async function GET(request: NextRequest) {
  const path = new URL(request.url).pathname;
  if (path === '/api/sieve/webhook') {
    try {
      const { searchParams } = new URL(request.url);
      const jobId = searchParams.get('jobId');
      if (!jobId) {
        return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
      }

      const jobMetadata = jobStore.get(jobId);
      if (!jobMetadata) {
        return NextResponse.json(
          { status: 'job_not_found', fileUrl: null, error: `Job ${jobId} not found` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        status: jobMetadata.status,
        fileUrl: jobMetadata.fileUrl || null,
        error: jobMetadata.status === 'error' ? 'Job failed' : null,
      });
    } catch (error) {
      return handleApiError(error, 'Failed to retrieve job status');
    }
  }

  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}