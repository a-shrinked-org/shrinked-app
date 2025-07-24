"use client";

import React, { useState, useEffect } from 'react';
import { TextInput, Button, Group, Text, Progress, Alert, Stack } from '@mantine/core';
import { UploadCloud, AlertCircle, RefreshCw } from 'lucide-react';
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
  const [retryCount, setRetryCount] = useState(0);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const MAX_RETRIES = 10;
  const POLLING_INTERVALS = {
    queued: 2000,
    started: 3000,
    processing: 5000,
    job_not_found: 4000,
  };
  const POLLING_BACKOFF_FACTOR = 1.2;
  const POLLING_MAX_INTERVAL = 10000;
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
    setRetryCount(0);
    setLastStatus(null);
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
        setProgress(10);
      } else {
        throw new Error('Sieve job ID not received.');
      }
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(0);
    handleDownload();
  };

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    const getPollingInterval = (status: string | null, retry: number) => {
      const baseInterval = POLLING_INTERVALS[status as keyof typeof POLLING_INTERVALS] || 3000;
      return Math.min(POLLING_MAX_INTERVAL, baseInterval * Math.pow(POLLING_BACKOFF_FACTOR, retry));
    };

    const pollJobStatus = async (retry = 0) => {
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

        // Detect invalid state transitions
        const validTransitions = {
          null: ['queued', 'started', 'processing', 'job_not_found'],
          job_not_found: ['queued', 'started', 'processing'],
          queued: ['started', 'processing', 'finished', 'error', 'cancelled'],
          started: ['processing', 'finished', 'error', 'cancelled'],
          processing: ['finished', 'error', 'cancelled'],
        };
        if (!validTransitions[lastStatus as keyof typeof validTransitions]?.includes(jobStatus)) {
          console.warn(`Invalid state transition for job ${jobId}: ${lastStatus} -> ${jobStatus}`);
          clearInterval(pollingInterval);
          clearTimeout(timeoutId);
          setError(`Invalid job status transition: ${lastStatus} -> ${jobStatus}. Retry or contact support.`);
          setIsLoading(false);
          return;
        }

        if (process.env.NODE_ENV === 'development') {
          console.log(`Job ${jobId} status: ${jobStatus} (Previous: ${lastStatus})`);
        }

        setStatus(`Job ${jobId} status: ${jobStatus}`);
        setLastStatus(jobStatus);

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
          setError(`Sieve job ${jobId} failed. Details: ${statusData.error || 'No details provided.'}. Retry or contact support.`);
          setIsLoading(false);
        } else if (jobStatus === 'job_not_found') {
          if (retryCount < MAX_RETRIES) {
            console.warn(`Sieve job ${jobId} not found (retry ${retryCount + 1}/${MAX_RETRIES}).`);
            setRetryCount((prev) => prev + 1);
            const newInterval = getPollingInterval(jobStatus, retry);
            clearInterval(pollingInterval);
            pollingInterval = setInterval(() => pollJobStatus(retry + 1), newInterval);
            setProgress((prev) => Math.min(90, prev + 5));
          } else {
            clearInterval(pollingInterval);
            clearTimeout(timeoutId);
            setError(`Sieve job ${jobId} not found after ${MAX_RETRIES} attempts. Retry or contact support.`);
            setIsLoading(false);
          }
        } else if (['queued', 'started', 'processing'].includes(jobStatus)) {
          setProgress((prev) => Math.min(90, prev + 5));
          const newInterval = getPollingInterval(jobStatus, retry);
          clearInterval(pollingInterval);
          pollingInterval = setInterval(() => pollJobStatus(retry + 1), newInterval);
        } else if (jobStatus === 'cancelled') {
          clearInterval(pollingInterval);
          clearTimeout(timeoutId);
          setError(`Sieve job ${jobId} was cancelled. Retry or contact support.`);
          setIsLoading(false);
        } else {
          clearInterval(pollingInterval);
          clearTimeout(timeoutId);
          setError(`Unknown job status: ${jobStatus}. Retry or contact support.`);
          setIsLoading(false);
        }
      } catch (err) {
        clearInterval(pollingInterval);
        clearTimeout(timeoutId);
        handleAuthError(err);
        setError(err instanceof Error ? err.message + '. Retry or contact support.' : 'An unknown error occurred during polling. Retry or contact support.');
        setIsLoading(false);
      }
    };

    if (jobId) {
      pollingInterval = setInterval(() => pollJobStatus(0), POLLING_INTERVALS.queued);
      timeoutId = setTimeout(() => {
        clearInterval(pollingInterval);
        setError(`Sieve job ${jobId} timed out after ${TOTAL_TIMEOUT / 1000 / 60} minutes. Retry or contact support.`);
        setIsLoading(false);
      }, TOTAL_TIMEOUT);
    }

    return () => {
      clearInterval(pollingInterval);
      clearTimeout(timeoutId);
    };
  }, [jobId, fetchWithAuth, handleAuthError, onUploadComplete, url, retryCount, lastStatus, index]);

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
      <Group>
        <Button onClick={handleDownload} loading={isLoading} leftSection={<UploadCloud size={16} />}>
          Download
        </Button>
        {error && (
          <Button
            variant="outline"
            onClick={handleRetry}
            leftSection={<RefreshCw size={16} />}
            disabled={isLoading}
          >
            Retry
          </Button>
        )}
      </Group>
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