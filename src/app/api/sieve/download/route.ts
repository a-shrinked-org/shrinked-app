
import { NextRequest, NextResponse } from 'next/server';
import Sieve from 'sieve-js';
import { getPresignedUploadUrl } from '@/utils/r2-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Handles video download from a URL via Sieve, and uploads the result to Cloudflare R2.
 */
export async function POST(request: NextRequest) {
  // 1. Initialize Sieve client
  if (!process.env.SIEVE_API_KEY) {
    console.error('FATAL: SIEVE_API_KEY environment variable is not set.');
    return NextResponse.json(
      { error: 'Server configuration error: Missing Sieve API Key.' },
      { status: 500 }
    );
  }
  const sieve = new Sieve({ apiKey: process.env.SIEVE_API_KEY });

  try {
    // 2. Get the video URL from the request body
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 3. Process the video through the Sieve 'youtube_to_audio' function
    console.log(`Starting Sieve job for URL: ${url}`);
    const youtubeToAudio = sieve.function.get('damn/youtube_to_audio');
    const job = await youtubeToAudio.push({ url });
    const result = await job.result();
    const sieveFileUrl = result[0];
    console.log(`Sieve job finished. File is at: ${sieveFileUrl}`);

    // 4. Fetch the processed file from Sieve
    const response = await fetch(sieveFileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from Sieve: ${response.statusText}`);
    }
    const fileBlob = await response.blob();

    // 5. Get a presigned URL for uploading to our R2 bucket
    const fileName = `sieve-${Date.now()}.mp3`;
    const { presignedUrl, fileUrl } = await getPresignedUploadUrl(fileName, 'audio/mpeg');
    console.log(`Generated presigned URL for: ${fileName}`);

    // 6. Upload the file from Sieve directly to R2
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: fileBlob,
      headers: { 'Content-Type': 'audio/mpeg' },
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      throw new Error(`Failed to upload to R2. Status: ${uploadResponse.status} Body: ${errorBody}`);
    }
    console.log(`Successfully uploaded to R2. Public URL: ${fileUrl}`);

    // 7. Return the final public URL
    return NextResponse.json({ fileUrl });

  } catch (error) {
    console.error('API Error in sieve/download route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to process and upload video', details: errorMessage },
      { status: 500 }
    );
  }
}
