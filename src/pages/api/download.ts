import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
// Use Node.js wrappers instead of direct Python executables
import ytdlp from 'yt-dlp-exec';
import youtubedl from 'youtube-dl-exec';

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

const downloadYouTube = async (url: string, tempDir: string): Promise<string> => {
  try {
    const output = await ytdlp(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      embedMetadata: true,
      embedThumbnail: true,
      output: path.join(tempDir, '%(title)s.%(ext)s'),
      printJson: false
    });
    
    // Find the downloaded file
    const files = await fs.readdir(tempDir);
    const mp3File = files.find(f => f.endsWith('.mp3'));
    
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
    const output = await ytdlp(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      embedMetadata: true,
      output: path.join(tempDir, '%(podcast)s - %(title)s.%(ext)s'),
      printJson: false
    });
    
    // Find the downloaded file
    const files = await fs.readdir(tempDir);
    const mp3File = files.find(f => f.endsWith('.mp3'));
    
    if (!mp3File) {
      throw new Error('No MP3 file found after download');
    }
    
    return path.join(tempDir, mp3File);
  } catch (error) {
    throw new Error(`Apple Podcast download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// For Spotify, we'll use a fallback approach since spotDL isn't available as a Node.js package
const downloadSpotify = async (url: string, tempDir: string): Promise<string> => {
  // This is a simplified approach - in production, you'd want to:
  // 1. Use Spotify API to get track metadata
  // 2. Search for the track on YouTube
  // 3. Download from YouTube using the metadata
  
  throw new Error('Spotify download not implemented yet. Please use YouTube or Apple Podcasts URLs for now.');
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

    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}