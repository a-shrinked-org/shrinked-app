
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Initialize Sieve client, checking for the API key
  if (!process.env.SIEVE_API_KEY) {
    return handleApiError(new Error('SIEVE_API_KEY environment variable is not set.'), 'Server configuration error');
  }
  const sieve = new Sieve({ apiKey: process.env.SIEVE_API_KEY });

  try {
    // 3. Get the video URL from the request body
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 4. Process the video through the Sieve 'youtube_to_audio' function
    const youtubeToAudio = sieve.function.get('damn/youtube_to_audio');
    const job = await youtubeToAudio.push({ url });
    const result = await job.result();
    const sieveFileUrl = result[0];

    // 5. Fetch the processed file from Sieve
    const response = await fetch(sieveFileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from Sieve: ${response.statusText}`);
    }
    const fileBlob = await response.blob();

    // 6. Get a presigned URL for uploading to our R2 bucket
    const fileName = `sieve-${Date.now()}.mp3`;
    const { presignedUrl, fileUrl } = await getPresignedUploadUrl(fileName, 'audio/mpeg');

    // 7. Upload the file from Sieve directly to R2
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: fileBlob,
      headers: { 'Content-Type': 'audio/mpeg' },
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      throw new Error(`Failed to upload to R2. Status: ${uploadResponse.status} Body: ${errorBody}`);
    }

    // 8. Return the final public URL
    return NextResponse.json({ fileUrl });

  } catch (error) {
    return handleApiError(error, 'Failed to process and upload video');
  }
}
