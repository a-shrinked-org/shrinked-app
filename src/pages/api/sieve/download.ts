
import { NextApiRequest, NextApiResponse } from 'next';
import Sieve from 'sieve-js';

const sieve = new Sieve({
  apiKey: process.env.SIEVE_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('--- Sieve Download API Start ---');
  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { url } = req.body;
  const authHeader = req.headers.authorization;

  console.log('Request URL:', url);
  console.log('Auth Header present:', !!authHeader);

  if (!url) {
    console.log('URL is required, but not provided.');
    return res.status(400).json({ message: 'URL is required' });
  }

  if (!authHeader) {
    console.log('Authorization header is missing.');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    console.log('Step 1: Calling Sieve API...');
    const youtubeToAudio = sieve.function.get('damn/youtube_to_audio');
    const job = await youtubeToAudio.push({ url });
    const result = await job.result();
    const sieveFileUrl = result[0];
    console.log('Sieve processing complete. File URL:', sieveFileUrl);

    console.log('Step 2: Fetching file from Sieve URL...');
    const response = await fetch(sieveFileUrl);
    const fileBlob = await response.blob();
    console.log('Successfully fetched file from Sieve.');

    const fileName = `sieve-${Date.now()}.mp3`;
    console.log('Generated filename:', fileName);

    console.log('Step 3: Getting presigned URL from our API...');
    const presignedResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        fileName,
        contentType: 'audio/mpeg',
      }),
    });

    if (!presignedResponse.ok) {
      const errorBody = await presignedResponse.text();
      console.error('Failed to get presigned URL. Status:', presignedResponse.status, 'Body:', errorBody);
      throw new Error(`Failed to get presigned URL: ${presignedResponse.statusText}`);
    }

    const { presignedUrl, fileUrl } = await presignedResponse.json();
    console.log('Successfully got presigned URL.');

    console.log('Step 4: Uploading file to Cloudflare R2...');
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: fileBlob,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      console.error('Failed to upload to R2. Status:', uploadResponse.status, 'Body:', errorBody);
      throw new Error(`Failed to upload to R2: ${uploadResponse.statusText}`);
    }

    console.log('Successfully uploaded to R2. Final URL:', fileUrl);
    console.log('--- Sieve Download API End ---');
    res.status(200).json({ fileUrl });

  } catch (error) {
    console.error('Unhandled error in Sieve/R2 process:', error);
    res.status(500).json({ message: 'Failed to process and upload video' });
  }
}
