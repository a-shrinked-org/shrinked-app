
import { NextApiRequest, NextApiResponse } from 'next';
import Sieve from 'sieve-js';

const sieve = new Sieve({
  apiKey: process.env.SIEVE_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { url } = req.body;
  const authHeader = req.headers.authorization;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const youtubeToAudio = sieve.function.get('damn/youtube_to_audio');
    const job = await youtubeToAudio.push({ url });
    const result = await job.result();

    const sieveFileUrl = result[0];

    const response = await fetch(sieveFileUrl);
    const fileBlob = await response.blob();

    const fileName = `sieve-${Date.now()}.mp3`;

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
      throw new Error('Failed to get presigned URL');
    }

    const { presignedUrl, fileUrl } = await presignedResponse.json();

    await fetch(presignedUrl, {
      method: 'PUT',
      body: fileBlob,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

    res.status(200).json({ fileUrl });
  } catch (error) {
    console.error('Sieve/R2 error:', error);
    res.status(500).json({ message: 'Failed to process and upload video' });
  }
}
