import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const platformPatterns: { [key: string]: RegExp[] } = {
  youtube: [
    /youtube\.com/,
    /youtu\.be/,
    /m\.youtube\.com/
  ],
  spotify: [
    /open\.spotify\.com/,
    /spotify\.com/,
    /spotify:/
  ],
  apple_podcasts: [
    /podcasts\.apple\.com/,
    /itunes\.apple\.com\/.*podcast/
  ]
};

const detectPlatform = (url: string): string | null => {
  for (const platform in platformPatterns) {
    for (const pattern of platformPatterns[platform]) {
      if (pattern.test(url)) {
        return platform;
      }
    }
  }
  return null;
};

const downloadYouTube = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, '%(title)s.%(ext)s');
    const command = `yt-dlp --extract-audio --audio-format mp3 --audio-quality 0 --embed-metadata --embed-thumbnail --output "${outputPath}" "${url}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`YouTube download failed: ${stderr}`);
        return reject(new Error(`YouTube download failed: ${stderr}`));
      }
      // yt-dlp doesn't give the final filename easily, so we need to find it.
      // This is a simplification. A real implementation would need to parse stdout to get the exact filename.
      const successMessage = stdout || "Downloaded successfully";
      console.log(`YouTube download success: ${successMessage}`);
      // We are returning a generic success message as we don't know the exact file name.
      // A more robust solution would be needed to get the downloaded file path.
      resolve(successMessage);
    });
  });
};

const downloadSpotify = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const command = `spotdl --output "${tempDir}" --format mp3 --bitrate 320 --embed-metadata "${url}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Spotify download failed: ${stderr}`);
        return reject(new Error(`Spotify download failed: ${stderr}`));
      }
      console.log(`Spotify download success: ${stdout}`);
      // Similar to yt-dlp, spotdl doesn't easily provide the final filename.
      // A more robust solution is needed to get the downloaded file path.
      resolve(stdout || "Downloaded successfully");
    });
  });
};

const downloadApplePodcasts = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, '%(podcast)s - %(title)s.%(ext)s');
    const command = `yt-dlp --extract-audio --audio-format mp3 --embed-metadata --output "${outputPath}" "${url}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Apple Podcasts download failed: ${stderr}`);
        return reject(new Error(`Apple Podcasts download failed: ${stderr}`));
      }
      console.log(`Apple Podcasts download success: ${stdout}`);
      // Again, a more robust solution is needed to get the downloaded file path.
      resolve(stdout || "Downloaded successfully");
    });
  });
};


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  const platform = detectPlatform(url);

  if (!platform) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  try {
    let result;
    switch (platform) {
      case 'youtube':
        result = await downloadYouTube(url);
        break;
      case 'spotify':
        result = await downloadSpotify(url);
        break;
      case 'apple_podcasts':
        result = await downloadApplePodcasts(url);
        break;
      default:
        return res.status(501).json({ error: 'Platform handler not implemented' });
    }
    res.status(200).json({ message: 'Download successful', data: result });
  } catch (error) {
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}
