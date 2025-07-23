// app/Downloader.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { TextInput, Button, Group, Text, Progress, Alert, Stack } from '@mantine/core';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

interface DownloaderProps {
  onUploadComplete: (uploadedUrl: string, originalUrl: string) => void;
}

const Downloader: React.FC<DownloaderProps> = ({ onUploadComplete }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  const [ffmpegLoaded, setFFmpegLoaded] = useState(false);

  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpegInstance = new FFmpeg();
      ffmpegInstance.on('log', ({ message }) => console.log(message));
      ffmpegInstance.on('progress', ({ progress }) => setProgress(Math.floor(progress * 100)));
      try {
        await ffmpegInstance.load({
          coreURL: '/ffmpeg-cache/ffmpeg-core.js',
          wasmURL: '/ffmpeg-cache/ffmpeg-core.wasm',
          workerURL: '/ffmpeg-cache/ffmpeg-core.worker.js',
        });
        setFFmpeg(ffmpegInstance);
        setFFmpegLoaded(true);
      } catch (e) {
        console.error('Failed to load FFmpeg:', e);
        setError('Failed to load video processing tools.');
      }
    };
    loadFFmpeg();
  }, []);

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
      new URL(url);
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

  const handleDownload = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      setStatus('Sending to Sieve...');
      setProgress(25);

      const response = await fetch('/api/sieve/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to process video');
      }

      const { fileUrl } = await response.json();

      setStatus('Uploading to storage...');
      setProgress(75);

      // Here you would add your logic to upload the file to Cloudflare
      // For now, we'll just use the URL from Sieve

      setProgress(100);
      setStatus('Complete!');
      onUploadComplete(fileUrl, url);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack>
      <TextInput
        label="Download from URL"
        placeholder="Enter a YouTube, Spotify, or Apple Podcasts URL"
        value={url}
        onChange={(e) => setUrl(e.currentTarget.value)}
        disabled={isLoading}
        error={error}
      />
      <Button onClick={handleDownload} loading={isLoading} leftSection={<UploadCloud size={16} />}>
        Download and Upload
      </Button>
      {isLoading && <Progress value={progress} animated />}
      {error && (
        <Alert icon={<AlertCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      )}
    </Stack>
  );
};

export default Downloader;
