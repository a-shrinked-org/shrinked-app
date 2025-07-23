"use client";

import React, { useState, useEffect } from 'react';
import { TextInput, Button, Group, Text, Progress, Alert, Stack } from '@mantine/core';
import { UploadCloud, AlertCircle } from 'lucide-react';

interface DownloaderProps {
  onUploadComplete: (uploadedUrl: string, originalUrl: string, index: number) => void;
  index: number;
}

import { useAuth } from '@/utils/authUtils';

const Downloader: React.FC<DownloaderProps> = ({ onUploadComplete, index }) => {
  const { fetchWithAuth, handleAuthError } = useAuth();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [notFoundRetryCount, setNotFoundRetryCount] = useState(0);
  const MAX_NOT_FOUND_RETRIES = 15;
  const POLLING_INTERVAL_INITIAL = 5000;
  const POLLING_BACKOFF_FACTOR = 1.5;
  const POLLING_MAX_INTERVAL = 30000;
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
    let retryCount = 0;

    const getPollingInterval = () => {
      return Math.min(POLLING_MAX_INTERVAL, POLLING_INTERVAL_INITIAL * Math.pow(POLLING_BACKOFF_FACTOR, retryCount));
    };

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

        if (jobStatus === 'finished' && fileUrl) {
          clearInterval(pollingInterval);
          clearTimeout(timeoutId);
          setProgress(100);
          setStatus('Download complete! Processing...');
          onUploadComplete(fileUrl, url, index);
        } else if (jobStatus === 'error') {
          clearInterval(pollingInterval);
          clearTimeout(timeoutId);
          setError(`Sieve job ${jobId} failed. Details: ${statusData.error || 'No details provided.'}`);
          setIsLoading(false);
        } else if (jobStatus === 'job_not_found') {
          if (notFoundRetryCount < MAX_NOT_FOUND_RETRIES) {
            console.warn(`Sieve job ${jobId} not found (retry ${notFoundRetryCount + 1}/${MAX_NOT_FOUND_RETRIES}). Continuing to poll.`);
            setNotFoundRetryCount((prev) => prev + 1);
            retryCount++;
            clearInterval(pollingInterval);
            pollingInterval = setInterval(pollJobStatus, getPollingInterval());
          } else {
            clearInterval(pollingInterval);
            clearTimeout(timeoutId);
            setError(`Sieve job ${jobId} not found after multiple attempts.`);
            setIsLoading(false);
          }
        } else if (jobStatus === 'queued' || jobStatus === 'started') {
          setProgress((prev) => Math.min(90, prev + (70 / MAX_NOT_FOUND_RETRIES)));
          retryCount++;
          clearInterval(pollingInterval);
          pollingInterval = setInterval(pollJobStatus, getPollingInterval());
        } else {
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
      pollingInterval = setInterval(pollJobStatus, POLLING_INTERVAL_INITIAL);
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