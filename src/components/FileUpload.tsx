"use client";

import React, { useState } from 'react';
import { Group, Text, useMantineTheme, rem, Box, Button, Progress, Alert } from '@mantine/core';
import { Dropzone, FileWithPath } from '@mantine/dropzone';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { authUtils, useAuth } from "@/utils/authUtils";

// R2 Configuration from environment variables
const R2_CONFIG = {
  bucketName: process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'apptemp',
};

interface FileUploadProps {
  onFileUploaded: (fileUrl: string) => void;
  maxSizeMB?: number;
  acceptedFileTypes?: Record<string, string[]>;
}

export function FileUpload({
  onFileUploaded,
  maxSizeMB = 100, // Default to 100MB
  acceptedFileTypes,
}: FileUploadProps) {
  const theme = useMantineTheme();
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { fetchWithAuth, handleAuthError } = useAuth();

  const defaultAcceptedTypes = {
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/aac': ['.aac'],
    'video/mp4': ['.mp4'],
    'video/quicktime': ['.mov'],
    'video/x-msvideo': ['.avi'],
    'video/webm': ['.webm'],
  };

  const uploadFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File size exceeds the maximum limit of ${maxSizeMB}MB`);
      }

      if (!navigator.onLine) {
        throw new Error('You appear to be offline. Please check your internet connection.');
      }

      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 10);
      const fileName = `${timestamp}-${randomString}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      console.log('Requesting presigned URL for:', { fileName, contentType: file.type, bucketName: R2_CONFIG.bucketName });

      const presignedResponse = await fetchWithAuth('/api/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          contentType: file.type,
          bucketName: R2_CONFIG.bucketName,
        }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || `Failed to get upload URL: ${presignedResponse.status}`);
      }

      const { presignedUrl, fileUrl } = await presignedResponse.json();
      console.log('Received Presigned URL:', presignedUrl);
      console.log('Expected File URL:', fileUrl);

      setProgress(10);
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const increment = Math.floor(Math.random() * 10) + 5;
          const newProgress = prev + increment;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 500);

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      clearInterval(progressInterval);

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to storage: ${uploadResponse.status}`);
      }

      setProgress(100);
      onFileUploaded(fileUrl);

      showNotification({
        title: 'Success',
        message: 'File uploaded successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      setError(errorMessage);
      handleAuthError(error);

      showNotification({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (files: FileWithPath[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      uploadFile(files[0]);
    }
  };

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} bytes`;
    else if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    else if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    else return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <Box>
      {error && (
        <Alert
          icon={<AlertCircle size={16} />}
          color="red"
          mb="md"
          title="Upload Error"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {!file && !uploading ? (
        <Dropzone
          onDrop={handleDrop}
          maxSize={maxSizeMB * 1024 * 1024}
          accept={acceptedFileTypes || defaultAcceptedTypes}
          loading={uploading}
        >
          <Group justify="center" style={{ minHeight: rem(140), pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <Upload size={50} strokeWidth={1.5} color={theme.colors[theme.primaryColor][6]} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <X size={50} strokeWidth={1.5} color={theme.colors.red[6]} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <Upload size={50} strokeWidth={1.5} />
            </Dropzone.Idle>

            <div>
              <Text size="xl" inline>
                Drag file here or click to select
              </Text>
              <Text size="sm" color="dimmed" inline mt={7}>
                Max file size: {maxSizeMB} MB
              </Text>
            </div>
          </Group>
        </Dropzone>
      ) : (
        <Box>
          {uploading ? (
            <Box>
              <Group justify="space-between" mb={5}>
                <Text size="sm" fw={500}>
                  Uploading...
                </Text>
                <Text size="sm" fw={500}>
                  {progress}%
                </Text>
              </Group>
              <Progress value={progress} size="xl" radius="xl" />
            </Box>
          ) : (
            <Group
              justify="space-between"
              p="md"
              style={{ border: `1px solid ${theme.colors.gray[3]}`, borderRadius: theme.radius.md }}
            >
              <Group>
                <FileText size={24} />
                <Box>
                  <Text size="sm" fw={500}>
                    {file?.name}
                  </Text>
                  {file && (
                    <Text size="xs" color="dimmed">
                      {formatFileSize(file.size)}
                    </Text>
                  )}
                </Box>
              </Group>
              <Button variant="light" color="red" size="xs" onClick={() => setFile(null)}>
                Remove
              </Button>
            </Group>
          )}
        </Box>
      )}
    </Box>
  );
}