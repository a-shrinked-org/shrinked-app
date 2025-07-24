import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/utils/r2-utils';
import { jobStore } from '@/lib/jobStore';
import { JobMetadata } from '@/types/job';

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

      // 6. Store job metadata
      jobStore.set(jobId, { status: 'queued', originalUrl: url, output_format });

      // 7. Return the job ID for frontend tracking
      return NextResponse.json({ jobId });
    } catch (error) {
      console.error('Error during Sieve job submission:', error);
      return handleApiError(error, 'Failed to initiate audio download');
    }
  }

  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}

/**
 * Retrieves job status from the in-memory store (fallback for frontend)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}