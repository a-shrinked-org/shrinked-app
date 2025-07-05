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

    const platform = detectPlatform(url);
    if (!platform) {
      setError('Invalid or unsupported URL');
      return;
    }

    if (platform === 'spotify') {
      setError('Spotify download not implemented. Please use YouTube or Apple Podcasts URLs.');
      return;
    }

    if (!ffmpegLoaded || !ffmpeg) {
      setError('FFmpeg is not loaded yet. Please wait.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Download the file from the Python API
      setStatus('Downloading...');
      setProgress(10);
      const downloadRes = await fetch(`/api/download?url=${encodeURIComponent(url)}&platform=${platform}`);

      if (!downloadRes.ok) {
        const err = await downloadRes.json();
        throw new Error(err.detail || 'Failed to download file');
      }

      const fileBlob = await downloadRes.blob();
      const originalFileName = downloadRes.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'downloaded-file';
      const originalFileExtension = originalFileName.split('.').pop() || 'mp4';
      const inputFileName = `input.${originalFileExtension}`;
      const outputFileName = `output.mp3`;

      // Step 2: Convert to MP3 using FFmpeg.wasm
      setStatus('Converting to MP3...');
      setProgress(30);

      await ffmpeg.writeFile(inputFileName, await fetchFile(fileBlob));
      await ffmpeg.exec(['-i', inputFileName, outputFileName]);
      const data = await ffmpeg.readFile(outputFileName);

      const mp3Blob = new Blob([data], { type: 'audio/mpeg' });
      const mp3File = new File([mp3Blob], outputFileName, { type: 'audio/mpeg' });

      // Step 3: Upload the file to S3
      setStatus('Uploading to storage...');
      setProgress(70);
      const presignRes = await fetch(`/api/presign?file=${encodeURIComponent(outputFileName)}&fileType=${encodeURIComponent(mp3File.type)}`);
      if (!presignRes.ok) {
        throw new Error('Failed to get presigned URL for upload');
      }
      const { url: presignedUrl, fields } = await presignRes.json();

      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', mp3File);

      const uploadRes = await fetch(presignedUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Step 4: Complete
      setProgress(100);
      setStatus('Complete!');
      const fileUrl = `${presignedUrl}${fields.key}`;
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
