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

    // 5. Return the job ID immediately. Frontend will poll for status.
    return NextResponse.json({ jobId: jobId });

  } catch (error) {
    console.error('Error during Sieve download process:', error);
    return handleApiError(error, 'Failed to process and upload video');
  }
}