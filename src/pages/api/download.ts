// app/api/download.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import YTDlpWrap from 'yt-dlp-wrap';

const platformPatterns: { [key: string]: RegExp[] } = {
  youtube: [
    /youtube\.com/,
    /youtu\.be/,
    /m\.youtube\.com/,
  ],
  spotify: [
    /open\.spotify\.com/,
    /spotify\.com/,
    /spotify:/,
  ],
  apple_podcasts: [
    /podcasts\.apple\.com/,
    /itunes\.apple\.com\/.*podcast/,
  ],
};

const detectPlatform = (url: string): string | null => {
  try {
    new URL(url); // Validate URL format
  } catch {
    return null;
  }
  for (const platform in platformPatterns) {
    for (const pattern of platformPatterns[platform]) {
      if (pattern.test(url)) {
        return platform;
      }
    }
  }
  return null;
};

const downloadYouTube = async (url: string, tempDir: string): Promise<string> => {
  try {
    // Use bundled yt-dlp binary
    const ytDlpBinaryPath = path.join(process.cwd(), 'bin', 'yt-dlp');
    const ytDlpWrap = new YTDlpWrap(ytDlpBinaryPath);
    const fileName = `${Date.now()}.mp3`;
    const filePath = path.join(tempDir, fileName);

    await ytDlpWrap.execPromise([
      url,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--embed-metadata',
      '--embed-thumbnail',
      '--output', filePath.replace('.mp3', '.%(ext)s'),
    ]);

    // Find the downloaded file
    const files = await fs.readdir(tempDir);
    const mp3File = files.find((f) => f.endsWith('.mp3'));

    if (!mp3File) {
      throw new Error('No MP3 file found after download');
    }

    return path.join(tempDir, mp3File);
  } catch (error) {
    throw new Error(`YouTube download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const downloadApplePodcast = async (url: string, tempDir: string): Promise<string> => {
  try {
    const ytDlpBinaryPath = path.join(process.cwd(), 'bin', 'yt-dlp');
    const ytDlpWrap = new YTDlpWrap(ytDlpBinaryPath);
    const fileName = `${Date.now()}.mp3`;
    const filePath = path.join(tempDir, fileName);

    await ytDlpWrap.execPromise([
      url,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--embed-metadata',
      '--output', filePath.replace('.mp3', '.%(ext)s'),
    ]);

    // Find the downloaded file
    const files = await fs.readdir(tempDir);
    const mp3File = files.find((f) => f.endsWith('.mp3'));

    if (!mp3File) {
      throw new Error('No MP3 file found after download');
    }

    return path.join(tempDir, mp3File);
  } catch (error) {
    throw new Error(`Apple Podcast download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const downloadSpotify = async (url: string, tempDir: string): Promise<string> => {
  // Placeholder: Implement Spotify download by searching YouTube
  throw new Error('Spotify download not implemented. Please use YouTube or Apple Podcasts URLs.');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return res.status(400).json({ error: 'Invalid or unsupported URL' });
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'downloader-'));

  try {
    let filePath: string;

    switch (platform) {
      case 'youtube':
        filePath = await downloadYouTube(url, tempDir);
        break;
      case 'apple_podcasts':
        filePath = await downloadApplePodcast(url, tempDir);
        break;
      case 'spotify':
        filePath = await downloadSpotify(url, tempDir);
        break;
      default:
        return res.status(501).json({ error: 'Platform handler not implemented' });
    }

    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(fileBuffer);

    // Cleanup
    await fs.unlink(filePath);
    await fs.rmdir(tempDir, { recursive: true });
  } catch (error) {
    // Cleanup on error
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
}