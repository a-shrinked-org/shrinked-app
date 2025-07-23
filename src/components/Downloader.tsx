// app/Downloader.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { TextInput, Button, Group, Text, Progress, Alert, Stack } from '@mantine/core';
import { UploadCloud, AlertCircle } from 'lucide-react';

interface DownloaderProps {
  onUploadComplete: (uploadedUrl: string, originalUrl: string) => void;
}

import { useAuth } from '@/utils/authUtils';

const Downloader: React.FC<DownloaderProps> = ({ onUploadComplete }) => {
  const { fetchWithAuth, handleAuthError } = useAuth();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setJobId(null);

    try {
      setStatus('Sending to Sieve...');
      setProgress(10);

      const response = await fetchWithAuth('/api/sieve/download', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to initiate Sieve process');
      }

      const responseData = await response.json();
      if (responseData.jobId) {
        setJobId(responseData.jobId);
        setStatus(`Sieve job initiated: ${responseData.jobId}. Waiting for completion...`);
        setProgress(20);
      } else {
        throw new Error('Sieve job ID not received.');
      }

    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;

    const pollJobStatus = async () => {
      if (!jobId) return;

      try {
        const statusResponse = await fetchWithAuth(`/api/sieve/download/status?jobId=${jobId}`);
        if (!statusResponse.ok) {
          const err = await statusResponse.json();
          throw new Error(err.message || `Failed to fetch job status for ${jobId}`);
        }

        const statusData = await statusResponse.json();
        const jobStatus = statusData.status;
        const fileUrl = statusData.fileUrl;

        setStatus(`Job ${jobId} status: ${jobStatus}`);

        if (jobStatus === 'completed' && fileUrl) {
          clearInterval(pollingInterval);
          setProgress(100);
          setStatus('Complete! Uploading to storage...');
          onUploadComplete(fileUrl, url);
          setIsLoading(false);
        } else if (jobStatus === 'failed' || jobStatus === 'cancelled') {
          clearInterval(pollingInterval);
          setError(`Sieve job ${jobId} ${jobStatus}. Details: ${statusData.error || 'No details provided.'}`);
          setIsLoading(false);
        } else {
          // Update progress based on polling attempts or a more sophisticated logic if Sieve provides it
          setProgress((prev) => Math.min(90, prev + 5)); // Increment progress up to 90%
        }
      } catch (err) {
        clearInterval(pollingInterval);
        handleAuthError(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during polling');
        setIsLoading(false);
      }
    };

    if (jobId) {
      pollingInterval = setInterval(pollJobStatus, 5000); // Poll every 5 seconds
    }

    return () => clearInterval(pollingInterval);
  }, [jobId, fetchWithAuth, handleAuthError, onUploadComplete, url]);

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
      {isLoading && (
        <Stack>
          <Progress value={progress} animated />
          <Text size="sm" c="dimmed">{status}</Text>
        </Stack>
      )}
      {error && (
        <Alert icon={<AlertCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      )}
    </Stack>
  );
};

export default Downloader;