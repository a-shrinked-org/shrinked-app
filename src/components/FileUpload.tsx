"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Group, Text, useMantineTheme, rem, Box, Button, Progress, Alert, Loader } from '@mantine/core';
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
  maxSizeMB = 100,
  acceptedFileTypes,
}: FileUploadProps) {
  const theme = useMantineTheme();
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ffmpeg, setFmpeg] = useState<any>(null);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [convertedFile, setConvertedFile] = useState<File | null>(null);

  const { fetchWithAuth, handleAuthError } = useAuth();

  const audioFileTypes = [
    'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/flac', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  ];

  const defaultAcceptedTypes = {
    'audio/mpeg': ['.mp3'], 'audio/mp3': ['.mp3'], 'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'], 'audio/aac': ['.aac'], 'audio/m4a': ['.m4a'],
    'audio/flac': ['.flac'], 'audio/webm': ['.weba'], 'video/mp4': ['.mp4'],
    'video/quicktime': ['.mov'], 'video/x-msvideo': ['.avi'], 'video/webm': ['.webm'],
  };

  // Promise to track FFmpeg loading
  let ffmpegLoadPromise: Promise<void> | null = null;

  const loadFffmpeg = useCallback(async () => {
    if (ffmpeg) return;
    setFfmpegLoading(true);
    ffmpegLoadPromise = new Promise(async (resolve, reject) => {
      try {
        console.log('Starting FFmpeg load...');
        const FFmpegModule = await import('@ffmpeg/ffmpeg');
        const UtilModule = await import('@ffmpeg/util');
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        const ffmpegInstance = new FFmpegModule.FFmpeg();

        await ffmpegInstance.load({
          coreURL: `${baseURL}/ffmpeg-core.js`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm`,
          workerURL: `${baseURL}/ffmpeg-core.worker.js`,
        });

        setFmpeg({ instance: ffmpegInstance, fetchFile: UtilModule.fetchFile });
        console.log('FFmpeg loaded successfully');
        resolve();
      } catch (error) {
        console.error('Error loading FFmpeg:', error);
        setError('Failed to load audio conversion library. Please try again or use an MP3 file.');
        reject(error);
      } finally {
        setFfmpegLoading(false);
      }
    });
  }, [ffmpeg]);

  useEffect(() => {
    if (file && needsConversion(file)) {
      loadFffmpeg();
    }
  }, [file, loadFffmpeg]);

  const needsConversion = (file: File): boolean => {
    return audioFileTypes.some(type => file.type.includes(type));
  };

  const convertToMp3 = async (inputFile: File) => {
    if (!inputFile) return null;

    // Wait for FFmpeg to load
    if (ffmpegLoadPromise) {
      await ffmpegLoadPromise;
    }

    if (!ffmpeg?.instance) {
      setError('Audio conversion library not loaded');
      return null;
    }

    try {
      setConversionProgress(0);
      const { instance: ffmpegInstance, fetchFile } = ffmpeg;
      const inputFileName = 'input' + inputFile.name.substring(inputFile.name.lastIndexOf('.'));
      const outputFileName = 'output.mp3';

      await ffmpegInstance.writeFile(inputFileName, await fetchFile(inputFile));
      ffmpegInstance.on('progress', ({ progress }: { progress: number }) => {
        setConversionProgress(Math.round(progress * 100));
      });

      const ffmpegArgs = ['-i', inputFileName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputFileName];
      await ffmpegInstance.exec(ffmpegArgs);

      const data = await ffmpegInstance.readFile(outputFileName);
      const blob = new Blob([data], { type: 'audio/mp3' });
      const convertedFileName = inputFile.name.substring(0, inputFile.name.lastIndexOf('.')) + '.mp3';
      const convertedFile = new File([blob], convertedFileName, { type: 'audio/mp3', lastModified: new Date().getTime() });

      await ffmpegInstance.deleteFile(inputFileName);
      await ffmpegInstance.deleteFile(outputFileName);

      setConvertedFile(convertedFile);
      showNotification({ title: 'Success', message: 'Audio converted to MP3', color: 'green' });
      return convertedFile;
    } catch (error) {
      console.error('Error converting audio:', error);
      setError(error instanceof Error ? `Conversion error: ${error.message}` : 'Failed to convert audio file');
      return null;
    }
  };

  const uploadFile = async (fileToUpload: File) => {
    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      if (fileToUpload.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File size exceeds the maximum limit of ${maxSizeMB}MB`);
      }

      if (!navigator.onLine) {
        throw new Error('You appear to be offline. Please check your internet connection.');
      }

      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 10);
      const fileName = `${timestamp}-${randomString}-${fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const presignedResponse = await fetchWithAuth('/api/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contentType: fileToUpload.type, bucketName: R2_CONFIG.bucketName }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || `Failed to get upload URL: ${presignedResponse.status}`);
      }

      const { presignedUrl, fileUrl } = await presignedResponse.json();
      setProgress(10);
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + (Math.floor(Math.random() * 10) + 5), 90));
      }, 500);

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileToUpload.type },
        body: fileToUpload,
      });

      clearInterval(progressInterval);
      if (!uploadResponse.ok) throw new Error(`Failed to upload to storage: ${uploadResponse.status}`);

      setProgress(100);
      onFileUploaded(fileUrl);
      showNotification({ title: 'Success', message: 'File uploaded successfully', color: 'green' });
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      setError(errorMessage);
      handleAuthError(error);
      showNotification({ title: 'Error', message: errorMessage, color: 'red' });
      if (!(error instanceof Error && error.message.includes('offline'))) setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (files: FileWithPath[]) => {
    if (files.length === 0) return;
    const droppedFile = files[0];
    setFile(droppedFile);
    setConvertedFile(null);
    setError(null);

    if (droppedFile.type === 'audio/mp3' || droppedFile.type === 'audio/mpeg') {
      await uploadFile(droppedFile);
    } else if (needsConversion(droppedFile)) {
      if (ffmpegLoadPromise) await ffmpegLoadPromise;
      const converted = await convertToMp3(droppedFile);
      if (converted) await uploadFile(converted);
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
        <Alert icon={<AlertCircle size={16} />} color="red" mb="md" title="Upload Error" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!file && !uploading ? (
        <Dropzone onDrop={handleDrop} maxSize={maxSizeMB * 1024 * 1024} accept={acceptedFileTypes || defaultAcceptedTypes} loading={uploading}>
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
              <Text size="xl" inline>Drag file here or click to select</Text>
              <Text size="sm" color="dimmed" inline mt={7}>
                MP3 files upload directly. Others will be converted to MP3 automatically.
              </Text>
            </div>
          </Group>
        </Dropzone>
      ) : (
        <Box>
          <Group justify="space-between" p="md" mb="md" style={{ border: `1px solid ${theme.colors.gray[3]}`, borderRadius: theme.radius.md }}>
            <Group>
              <FileText size={24} />
              <Box>
                <Text size="sm" fw={500}>{convertedFile ? convertedFile.name : file?.name}</Text>
                {file && <Text size="xs" color="dimmed">{formatFileSize(convertedFile ? convertedFile.size : file.size)}</Text>}
              </Box>
            </Group>
            <Button
              variant="light"
              color="red"
              size="xs"
              onClick={() => {
                setFile(null);
                setConvertedFile(null);
                setConversionProgress(0);
              }}
              disabled={uploading || ffmpegLoading}
            >
              Remove
            </Button>
          </Group>

          {ffmpegLoading && (
            <Box mb="md">
              <Group justify="center" mb={5}>
                <Loader size="sm" />
                <Text size="sm">Loading conversion library...</Text>
              </Group>
            </Box>
          )}

          {(file && needsConversion(file) && !convertedFile && !uploading && !ffmpegLoading) && (
            <Box mb="md">
              <Group justify="space-between" mb={5}>
                <Text size="sm" fw={500}>Converting to MP3...</Text>
                <Text size="sm" fw={500}>{conversionProgress}%</Text>
              </Group>
              <Progress value={conversionProgress} size="sm" radius="xl" />
            </Box>
          )}

          {uploading && (
            <Box mb="md">
              <Group justify="space-between" mb={5}>
                <Text size="sm" fw={500}>Uploading...</Text>
                <Text size="sm" fw={500}>{progress}%</Text>
              </Group>
              <Progress value={progress} size="xl" radius="xl" />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}