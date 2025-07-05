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

const downloadFile = (platform: string, downloadCommand: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(downloadCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`${platform} download failed: ${stderr}`);
        return reject(new Error(`${platform} download failed: ${stderr}`));
      }
      const output = stdout.trim();
      // spotdl can output multiple lines, the last one is usually the file path
      const filePath = output.split('\n').pop();
      if (!filePath) {
        return reject(new Error(`${platform} download failed: could not determine file path.`));
      }
      console.log(`${platform} download success: ${filePath}`);
      resolve(filePath);
    });
  });
};


const getYouTubeDownloadCommand = (url: string, tempDir: string): string => {
  const outputPath = path.join(tempDir, '%(title)s.%(ext)s');
  return `yt-dlp --extract-audio --audio-format mp3 --audio-quality 0 --embed-metadata --embed-thumbnail --output "${outputPath}" "${url}" --print filename`;
};

const getSpotifyDownloadCommand = (url: string, tempDir: string): string => {
  // spotdl downloads to the current directory by default, so we cd into the temp dir
  return `cd "${tempDir}" && spotdl --format mp3 --bitrate 320 --embed-metadata "${url}"`;
};

const getApplePodcastsDownloadCommand = (url: string, tempDir: string): string => {
  const outputPath = path.join(tempDir, '%(podcast)s - %(title)s.%(ext)s');
  return `yt-dlp --extract-audio --audio-format mp3 --embed-metadata --output "${outputPath}" "${url}" --print filename`;
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
  let downloadCommand;

  switch (platform) {
    case 'youtube':
      downloadCommand = getYouTubeDownloadCommand(url, tempDir);
      break;
    case 'spotify':
      downloadCommand = getSpotifyDownloadCommand(url, tempDir);
      break;
    case 'apple_podcasts':
      downloadCommand = getApplePodcastsDownloadCommand(url, tempDir);
      break;
    default:
      return res.status(501).json({ error: 'Platform handler not implemented' });
  }

  try {
    const filePath = await downloadFile(platform, downloadCommand);
    // For spotdl, the path is relative to tempDir, so we need to join it
    const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.join(tempDir, filePath);

    const fileBuffer = await fs.readFile(absoluteFilePath);
    const fileName = path.basename(absoluteFilePath);

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(fileBuffer);

    await fs.unlink(absoluteFilePath);
    await fs.rmdir(tempDir);

  } catch (error) {
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}