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
  const [notFoundRetryCount, setNotFoundRetryCount] = useState(0);
  const MAX_NOT_FOUND_RETRIES = 15; // Increased from 5 to 15 for longer videos
  const POLLING_INTERVAL_INITIAL = 5000; // 5 seconds
  const POLLING_INTERVAL_LONG = 10000; // 10 seconds after 5 retries
  const TOTAL_TIMEOUT = 5 * 60 * 1000; // 5 minutes total timeout

  const handleDownload = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setJobId(null);
    setNotFoundRetryCount(0); // Reset retry count for new job

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
    let timeoutId: NodeJS.Timeout;
    let retryCount = 0;

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
          clearTimeout(timeoutId);
          setProgress(100);
          setStatus('Complete! Uploading to storage...');
          onUploadComplete(fileUrl, url);
          setIsLoading(false);
        } else if (jobStatus === 'failed' || jobStatus === 'cancelled') {
          clearInterval(pollingInterval);
          clearTimeout(timeoutId);
          setError(`Sieve job ${jobId} ${jobStatus}. Details: ${statusData.error || 'No details provided.'}`);
          setIsLoading(false);
        } else if (jobStatus === 'job_not_found') {
          if (notFoundRetryCount < MAX_NOT_FOUND_RETRIES) {
            console.warn(`Sieve job ${jobId} not found (retry ${notFoundRetryCount + 1}/${MAX_NOT_FOUND_RETRIES}). Continuing to poll.`);
            setNotFoundRetryCount((prev) => prev + 1);
            // Adjust polling interval after 5 retries
            if (notFoundRetryCount >= 5 && pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = setInterval(pollJobStatus, POLLING_INTERVAL_LONG);
            }
          } else {
            clearInterval(pollingInterval);
            clearTimeout(timeoutId);
            setError(`Sieve job ${jobId} not found after multiple attempts. It might have completed or failed without providing a result.`);
            setIsLoading(false);
          }
        } else {
          // Update progress based on polling attempts
          setProgress((prev) => Math.min(90, prev + (70 / MAX_NOT_FOUND_RETRIES))); // Spread progress from 20 to 90 over retries
          retryCount++;
        }
      } catch (err) {
        clearInterval(pollingInterval);
        clearTimeout(timeoutId);
        handleAuthError(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during polling');
        setIsLoading(false);
      }
    };

    if (jobId) {
      pollingInterval = setInterval(pollJobStatus, POLLING_INTERVAL_INITIAL);
      // Set total timeout
      timeoutId = setTimeout(() => {
        clearInterval(pollingInterval);
        setError(`Sieve job ${jobId} timed out after ${TOTAL_TIMEOUT / 1000 / 60} minutes.`);
        setIsLoading(false);
      }, TOTAL_TIMEOUT);
    }

    return () => {
      clearInterval(pollingInterval);
      clearTimeout(timeoutId);
    };
  }, [jobId, fetchWithAuth, handleAuthError, onUploadComplete, url, notFoundRetryCount]);

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