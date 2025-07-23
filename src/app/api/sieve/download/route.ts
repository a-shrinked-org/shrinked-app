
import { NextRequest, NextResponse } from 'next/server';
import Sieve from 'sieve-js';
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

  // 2. Initialize Sieve client, checking for the API key
  if (!process.env.SIEVE_API_KEY) {
    console.error('SIEVE_API_KEY environment variable is not set.');
    return handleApiError(new Error('SIEVE_API_KEY environment variable is not set.'), 'Server configuration error');
  }
  const sieve = new Sieve({ apiKey: process.env.SIEVE_API_KEY });
  console.log('Sieve client initialized.');

  try {
    // 3. Get the video URL from the request body
    const { url } = await request.json();
    if (!url) {
      console.log('URL is missing from request body.');
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    console.log('Received URL:', url);

    // 4. Process the video through the Sieve 'youtube_to_audio' function
    console.log('Getting Sieve function "damn/youtube_to_audio"...');
    const youtubeToAudio = sieve.function.get('damn/youtube_to_audio');
    console.log('Pushing job to Sieve...');
    const job = await youtubeToAudio.push({ url });
    console.log('Waiting for Sieve job result...');
    const result = await job.result();
    const sieveFileUrl = result[0];
    console.log('Sieve job completed. Sieve file URL:', sieveFileUrl);

    // 5. Fetch the processed file from Sieve
    console.log('Fetching processed file from Sieve...');
    const response = await fetch(sieveFileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from Sieve: ${response.statusText}`);
    }
    const fileBlob = await response.blob();
    console.log('File fetched from Sieve successfully.');

    // 6. Get a presigned URL for uploading to our R2 bucket
    const fileName = `sieve-${Date.now()}.mp3`;
    console.log('Getting presigned URL for R2 upload...');
    const { presignedUrl, fileUrl } = await getPresignedUploadUrl(fileName, 'audio/mpeg');
    console.log('Presigned URL obtained. R2 file URL:', fileUrl);

    // 7. Upload the file from Sieve directly to R2
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

    // 8. Return the final public URL
    return NextResponse.json({ fileUrl });

  } catch (error) {
    console.error('Error during Sieve download process:', error);
    return handleApiError(error, 'Failed to process and upload video');
  }
}
