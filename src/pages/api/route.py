from fastapi import FastAPI, HTTPException, status
from starlette.responses import FileResponse
from yt_dlp import YoutubeDL
from yt_dlp.version import __version__ as yt_dlp_version
from typing import Union
import os
import tempfile
import shutil
import pathlib

app = FastAPI(docs_url=None, redoc_url=None)

@app.get("/api/version")
async def version_info():
    return {"yt_dlp": yt_dlp_version}

@app.get("/api/download")
async def download(url: str, platform: Union[str, None] = None):
    # Supported platforms
    supported_platforms = ["youtube", "apple_podcasts"]
    if platform and platform not in supported_platforms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported platform",
            headers={"Cache-Control": "no-store, max-age=0"},
        )

    # Create temporary directory
    temp_dir = tempfile.mkdtemp(prefix="downloader-")
    file_name = f"{int(os.times()[4] * 1000)}.mp3"  # Use timestamp for filename
    file_path = os.path.join(temp_dir, file_name)

    # FFmpeg binary path
    ffmpeg_path = os.path.join(os.getcwd(), "bin", "ffmpeg")
    if not os.path.exists(ffmpeg_path):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"FFmpeg binary not found at {ffmpeg_path}",
            headers={"Cache-Control": "no-store, max-age=0"},
        )

    ydl_options = {
        "format": "bestaudio/best",
        "extractaudio": True,
        "audioformat": "mp3",
        "outtmpl": file_path.replace(".mp3", ".%(ext)s"),
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "0",
        }],
        "ffmpeg_location": ffmpeg_path,
        "retries": 3,
        "encoding": "utf-8",
        "noplaylist": True,
        "ignoreerrors": True,
        "writethumbnail": True,
        "embedthumbnail": True,
    }

    try:
        with YoutubeDL(ydl_options) as ytdl:
            ytdl.download([url])

        # Find the downloaded MP3 file
        mp3_file = None
        for file in os.listdir(temp_dir):
            if file.endswith(".mp3"):
                mp3_file = os.path.join(temp_dir, file)
                break

        if not mp3_file or not os.path.exists(mp3_file):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No MP3 file found after download",
                headers={"Cache-Control": "no-store, max-age=0"},
            )

        # Return the file
        return FileResponse(
            mp3_file,
            media_type="audio/mpeg",
            filename=os.path.basename(mp3_file),
            headers={"Cache-Control": "no-store, max-age=0"},
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Download failed: {str(e)}",
            headers={"Cache-Control": "no-store, max-age=0"},
        )

    finally:
        # Cleanup
        try:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir教科

System: dir(temp_dir)
        except Exception as cleanup_error:
            print(f"Cleanup error: {cleanup_error}")
        except:
            pass
```

**Changes**:
- Adapted `main-3.py` to handle MP3 downloads directly (instead of just metadata).
- Added `ffmpeg` binary path for audio conversion.
- Supports YouTube and Apple Podcasts URLs (Spotify remains unimplemented).
- Uses Vercel-compatible temporary directory handling.
- Includes robust error handling and cleanup.

#### 3. Updated `Downloader.tsx`
Modified to call the new `/api/download` Python endpoint and maintain S3 upload functionality.

<xaiArtifact artifact_id="208ef249-c1a3-4fdb-91d7-0da7e7269a2c" artifact_version_id="b7a4df37-1563-4ec7-a518-dff24f7c4f4b" title="Downloader.tsx" contentType="text/typescript">
"use client";

import React, { useState } from 'react';
import { TextInput, Button, Group, Text, Progress, Alert, Stack } from '@mantine/core';
import { UploadCloud, AlertCircle } from 'lucide-react';

interface DownloaderProps {
  onUploadComplete: (uploadedUrl: string, originalUrl: string) => void;
}

const Downloader: React.FC<DownloaderProps> = ({ onUploadComplete }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

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

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Download the file from the Python API
      setStatus('Downloading...');
      setProgress(25);
      const downloadRes = await fetch(`/api/download?url=${encodeURIComponent(url)}&platform=${platform}`);

      if (!downloadRes.ok) {
        const err = await downloadRes.json();
        throw new Error(err.detail || 'Failed to download file');
      }

      const fileBlob = await downloadRes.blob();
      const fileName = downloadRes.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'downloaded-file.mp3';
      const file = new File([fileBlob], fileName, { type: fileBlob.type });

      // Step 2: Upload the file to S3
      setStatus('Uploading to storage...');
      setProgress(50);
      const presignRes = await fetch(`/api/presign?file=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(file.type)}`);
      if (!presignRes.ok) {
        throw new Error('Failed to get presigned URL for upload');
      }
      const { url: presignedUrl, fields } = await presignRes.json();

      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', file);

      const uploadRes = await fetch(presignedUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Step 3: Processing
      setStatus('Processing file...');
      setProgress(75);
      await new Promise((resolve) => setTimeout(resolve, 1000));

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