"use client";

import React, { useState, useEffect } from 'react';
import { TextInput, Button, Group, Text, Progress, Alert, Stack } from '@mantine/core';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { useAuth } from '@/utils/authUtils';

interface DownloaderProps {
  onUploadComplete: (uploadedUrl: string, originalUrl: string, index: number) => void;
  index: number;
}

const Downloader: React.FC<DownloaderProps> = ({ onUploadComplete, index }) => {
  const { fetchWithAuth, handleAuthError } = useAuth();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [notFoundRetryCount, setNotFoundRetryCount] = useState(0);
  const MAX_NOT_FOUND_RETRIES = 10;
  const POLLING_INTERVAL_INITIAL = 3000;
  const POLLING_BACKOFF_FACTOR = 1.3;
  const POLLING_MAX_INTERVAL = 15000;
  const TOTAL_TIMEOUT = 5 * 60 * 1000;

  const handleDownload = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setJobId(null);
    setNotFoundRetryCount(0);
    setStatus('Sending to Sieve...');

    try {
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
        setStatus(`Sieve job initiated: ${responseData.jobId}. Waiting for start...`);
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

    const getPollingInterval = (retry: number) => {
      return Math.min(POLLING_MAX_INTERVAL, POLLING_INTERVAL_INITIAL * Math.pow(POLLING_BACKOFF_FACTOR, retry));
    };

    const pollJobStatus = async (retryCount = 0) => {
      if (!jobId) return;

      try {
        const response = await fetchWithAuth(`/api/sieve/download?jobId=${jobId}`);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || `Failed to fetch job status for ${jobId}`);
        }

        const statusData = await response.json();
        const jobStatus = statusData.status;
        const fileUrl = statusData.fileUrl;

        setStatus(`Job ${jobId} status: ${jobStatus}`);

        if (jobStatus === 'finished' && fileUrl) {
          clearInterval(pollingInterval);
          clearTimeout(timeoutId);
          setProgress(100);
          setStatus('Download complete! Processing...');
          onUploadComplete(fileUrl, url, index);
          setIsLoading(false);
        } else if (jobStatus === 'error') {
          clearInterval(pollingInterval);
          clearTimeout(timeoutId);
          setError(`Sieve job ${jobId} failed. Details: ${statusData.error || 'No details provided.'}`);
          setIsLoading(false);
        } else if (jobStatus === 'job_not_found') {
          if (notFoundRetryCount < MAX_NOT_FOUND_RETRIES) {
            console.warn(`Sieve job ${jobId} not found (retry ${notFoundRetryCount + 1}/${MAX_NOT_FOUND_RETRIES}).`);
            setNotFoundRetryCount((prev) => prev + 1);
            const newInterval = getPollingInterval(retryCount);
            clearInterval(pollingInterval);
            pollingInterval = setInterval(() => pollJobStatus(retryCount + 1), newInterval);
          } else {
            clearInterval(pollingInterval);
            clearTimeout(timeoutId);
            setError(`Sieve job ${jobId} not found after ${MAX_NOT_FOUND_RETRIES} attempts.`);
            setIsLoading(false);
          }
        } else if (jobStatus === 'queued' || jobStatus === 'started' || jobStatus === 'processing') {
          setProgress((prev) => Math.min(90, prev + (70 / (MAX_NOT_FOUND_RETRIES * 2))));
          const newInterval = getPollingInterval(retryCount);
          clearInterval(pollingInterval);
          pollingInterval = setInterval(() => pollJobStatus(retryCount + 1), newInterval);
        } else if (jobStatus === 'cancelled') {
          clearInterval(pollingInterval);
          clearTimeout(timeoutId);
          setError(`Sieve job ${jobId} was cancelled.`);
          setIsLoading(false);
        } else {
          clearInterval(pollingInterval);
          clearTimeout(timeoutId);
          setError(`Unknown job status: ${jobStatus}`);
          setIsLoading(false);
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
      pollingInterval = setInterval(() => pollJobStatus(0), POLLING_INTERVAL_INITIAL);
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
  }, [jobId, fetchWithAuth, handleAuthError, onUploadComplete, url, notFoundRetryCount, index]);

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
        Download
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