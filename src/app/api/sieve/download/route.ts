import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/utils/r2-utils';

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
    // In a real app, you would have a robust token verification here
    return !!token;
  } catch (error) {
    console.error('Auth verification error:', error);
    return false;
  }
}

/**
 * Handle API errors with consistent formatting
 */
function handleApiError(error: any, defaultMessage: string): NextResponse {
  console.error(`API error in sieve/download:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json(
    { error: defaultMessage, details: errorMessage },
    { status: 500 }
  );
}

/**
 * Handles video download from a URL via Sieve, and uploads the result to Cloudflare R2.
 */
export async function POST(request: NextRequest) {
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
    // 3. Get the video URL from the request body
    const { url } = await request.json();
    if (!url) {
      console.log('URL is missing from request body.');
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    console.log('Received URL:', url);

    // 4. Push job to Sieve via HTTP POST
    console.log('Pushing job to Sieve via HTTP POST...');
    const sievePushResponse = await fetch('https://mango.sievedata.com/v2/push', {
      method: 'POST',
      headers: {
        'X-API-Key': SIEVE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        function: 'damn/youtube_to_audio',
        inputs: {
          url: url,
        },
      }),
    });

    if (!sievePushResponse.ok) {
      const errorBody = await sievePushResponse.text();
      throw new Error(`Failed to push job to Sieve: ${sievePushResponse.statusText}. Body: ${errorBody}`);
    }

    const sieveJobData = await sievePushResponse.json();
    const jobId = sieveJobData.id; // Assuming the response contains a job ID
    console.log('Sieve job pushed. Job ID:', jobId);

    // 5. Poll for job result
    console.log('Polling for Sieve job result...');
    let jobStatus = '';
    let sieveFileUrl: string | null = null;
    const MAX_POLLING_ATTEMPTS = 60; // e.g., 5 minutes with 5-second intervals
    const POLLING_INTERVAL_MS = 5000; // 5 seconds

    for (let i = 0; i < MAX_POLLING_ATTEMPTS; i++) {
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));

      const statusResponse = await fetch(`https://mango.sievedata.com/v2/job/${jobId}`, {
        headers: { 'X-API-Key': SIEVE_API_KEY }
      });

      if (!statusResponse.ok) {
        const errorBody = await statusResponse.text();
        console.error(`Failed to fetch job status for ${jobId}: ${statusResponse.statusText}. Body: ${errorBody}`);
        continue; // Try again
      }

      const statusData = await statusResponse.json();
      jobStatus = statusData.status;
      console.log(`Job ${jobId} status: ${jobStatus}`);

      if (jobStatus === 'completed') {
        // Assuming the output is an array and the first element is the URL
        if (statusData.output && Array.isArray(statusData.output) && statusData.output.length > 0) {
          sieveFileUrl = statusData.output[0];
        } else {
          throw new Error(`Sieve job completed but no output URL found for job ${jobId}. Output: ${JSON.stringify(statusData.output)}`);
        }
        break;
      } else if (jobStatus === 'failed' || jobStatus === 'cancelled') {
        throw new Error(`Sieve job ${jobId} ${jobStatus}. Details: ${JSON.stringify(statusData.error || statusData)}`);
      }
    }

    if (!sieveFileUrl) {
      throw new Error(`Sieve job ${jobId} did not complete within the expected time.`);
    }
    console.log('Sieve job completed. Sieve file URL:', sieveFileUrl);

    // 6. Fetch the processed file from Sieve
    console.log('Fetching processed file from Sieve...');
    const response = await fetch(sieveFileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from Sieve: ${response.statusText}`);
    }
    const fileBlob = await response.blob();
    console.log('File fetched from Sieve successfully.');

    // 7. Get a presigned URL for uploading to our R2 bucket
    const fileName = `sieve-${Date.now()}.mp3`;
    console.log('Getting presigned URL for R2 upload...');
    const { presignedUrl, fileUrl } = await getPresignedUploadUrl(fileName, 'audio/mpeg');
    console.log('Presigned URL obtained. R2 file URL:', fileUrl);

    // 8. Upload the file from Sieve directly to R2
    console.log('Uploading file to R2...');
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: fileBlob,
      headers: { 'Content-Type': 'audio/mpeg' },
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      throw new Error(`Failed to upload to R2. Status: ${uploadResponse.status} Body: ${errorBody}`);
    }
    console.log('File uploaded to R2 successfully.');

    // 9. Return the final public URL
    return NextResponse.json({ fileUrl });

  } catch (error) {
    console.error('Error during Sieve download process:', error);
    return handleApiError(error, 'Failed to process and upload video');
  }
}
