"use client";

import React, { useState } from 'react';
import { TextInput, Button, Group, Text, Progress, Alert } from '@mantine/core';
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

  const handleDownload = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Download the file from the provided URL
      setStatus('Downloading...');
      setProgress(25);
      const downloadRes = await fetch(`/api/download?url=${encodeURIComponent(url)}`);

      if (!downloadRes.ok) {
        const err = await downloadRes.json();
        throw new Error(err.error || 'Failed to download file');
      }

      const fileBlob = await downloadRes.blob();
      const fileName = downloadRes.headers.get('content-disposition')?.split('filename=')[1].replace(/"/g, '') || 'downloaded-file';
      const file = new File([fileBlob], fileName, { type: fileBlob.type });

      // Step 2: Upload the file to your storage (e.g., S3)
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
      
      // Step 3: Processing the file
      setStatus('Processing file...');
      setProgress(75);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time

      // Step 4: Get the internal link and pass it to the parent component
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
      />
      <Button onClick={handleDownload} loading={isLoading} leftSection={<UploadCloud size={16}/>}>
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
