"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Group, Text, useMantineTheme, rem, Box, Button, Progress, Alert, Loader } from '@mantine/core';
import { Dropzone, FileWithPath } from '@mantine/dropzone';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { useAuth } from "@/utils/authUtils";

const R2_CONFIG = {
  bucketName: process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'apptemp',
};

interface FileUploadProps {
  onFileUploaded: (fileUrl: string) => void;
  maxSizeMB?: number;
  acceptedFileTypes?: Record<string, string[]>;
}

interface FFmpegInstance {
  instance: any;
  fetchFile: (file: File) => Promise<Uint8Array>;
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
  const [ffmpeg, setFfmpeg] = useState<FFmpegInstance | null>(null);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [convertedFile, setConvertedFile] = useState<File | null>(null);
  const [isEnvironmentSupported, setIsEnvironmentSupported] = useState<boolean | null>(null);

  const ffmpegPromiseRef = useRef<Promise<FFmpegInstance | null> | null>(null);

  const { fetchWithAuth, handleAuthError } = useAuth();

  const audioFileTypes = useMemo(() => [
    'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/flac', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  ], []);

  const defaultAcceptedTypes = {
    'audio/mpeg': ['.mp3'], 'audio/mp3': ['.mp3'], 'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'], 'audio/aac': ['.aac'], 'audio/m4a': ['.m4a'],
    'audio/flac': ['.flac'], 'audio/webm': ['.weba'], 'video/mp4': ['.mp4'],
    'video/quicktime': ['.mov'], 'video/x-msvideo': ['.avi'], 'video/webm': ['.webm'],
  };

  const needsConversion = useCallback((file: File): boolean => {
    if (file.type === 'audio/mp3' || file.type === 'audio/mpeg') {
      return false;
    }
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    return audioFileTypes.some(type =>
      file.type.includes(type.split('/')[1]) ||
      (fileExtension && ['wav', 'ogg', 'aac', 'm4a', 'flac', 'mp4', 'mov', 'avi', 'webm'].includes(fileExtension))
    );
  }, [audioFileTypes]);

  const loadFffmpeg = useCallback(async (): Promise<FFmpegInstance | null> => {
    if (ffmpeg) return ffmpeg;
    if (ffmpegPromiseRef.current) return ffmpegPromiseRef.current;
  
    const timeoutPromise = new Promise<FFmpegInstance | null>((_, reject) => {
      setTimeout(() => reject(new Error('FFmpeg loading timed out after 15 seconds')), 15000);
    });
  
    setFfmpegLoading(true);
  
    const loadingPromise = (async () => {
      try {
        console.log('Starting FFmpeg load...');
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { fetchFile } = await import('@ffmpeg/util');
        const ffmpegInstance = new FFmpeg();
  
        console.log("Loading FFmpeg from UNPKG...");
        await ffmpegInstance.load({
          coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
          wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
          workerURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.worker.js',
        });
  
        const ffmpegObj = { instance: ffmpegInstance, fetchFile };
        setFfmpeg(ffmpegObj);
        console.log('FFmpeg loaded successfully from UNPKG');
        return ffmpegObj;
      } catch (error) {
        console.error('Error loading FFmpeg from UNPKG:', error);
        setError('Failed to load audio conversion library. Original file will be uploaded instead.');
        ffmpegPromiseRef.current = null;
        return null;
      } finally {
        setFfmpegLoading(false);
      }
    })();
  
    ffmpegPromiseRef.current = Promise.race([loadingPromise, timeoutPromise]).catch((error) => {
      console.error('FFmpeg loading error or timeout:', error);
      setFfmpegLoading(false);
      setError('Failed to load audio conversion library. Original file will be uploaded instead.');
      ffmpegPromiseRef.current = null;
      return null;
    });
  
    return ffmpegPromiseRef.current;
  }, [ffmpeg]);

  useEffect(() => {
    const checkEnvironment = () => {
      try {
        const isSABSupported = typeof SharedArrayBuffer !== 'undefined';
        const isCrossOriginIsolated =
          typeof window !== 'undefined' &&
          Boolean(window.crossOriginIsolated);

        console.log("Environment check:", {
          sharedArrayBuffer: isSABSupported ? "Available" : "Not available",
          crossOriginIsolated: isCrossOriginIsolated ? "Yes" : "No",
          userAgent: navigator.userAgent,
        });

        const supported = isSABSupported && isCrossOriginIsolated;
        console.log(`Will attempt conversion: ${supported}`);
        return supported;
      } catch (error) {
        console.warn("Error checking environment support:", error);
        return false;
      }
    };

    const supported = checkEnvironment();
    setIsEnvironmentSupported(supported);
  }, []);

  useEffect(() => {
    const initFFmpeg = async () => {
      if (file && needsConversion(file) && isEnvironmentSupported) {
        try {
          await loadFffmpeg();
        } catch (error) {
          console.error("Failed to initialize FFmpeg:", error);
          setError("Failed to initialize audio conversion library. Using original file instead.");
        }
      }
    };

    initFFmpeg();
  }, [file, loadFffmpeg, needsConversion, isEnvironmentSupported]);

  const convertToMp3 = async (inputFile: File): Promise<File | null> => {
    if (!inputFile) return null;

    try {
      setConversionProgress(0);
      const ffmpegObj = await loadFffmpeg();
      if (!ffmpegObj) {
        throw new Error('Audio conversion library not loaded');
      }

      const { instance: ffmpegInstance, fetchFile } = ffmpegObj;
      const inputFileName = 'input' + inputFile.name.substring(inputFile.name.lastIndexOf('.'));
      const outputFileName = 'output.mp3';

      console.log(`Fetching file data for ${inputFile.name}...`);
      const fileData = await fetchFile(inputFile);
      console.log(`Writing file to FFmpeg...`);
      await ffmpegInstance.writeFile(inputFileName, fileData);

      ffmpegInstance.on('progress', ({ progress }: { progress: number }) => {
        setConversionProgress(Math.round(progress * 100));
      });

      console.log(`Starting conversion to MP3...`);
      const ffmpegArgs = ['-i', inputFileName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputFileName];
      await ffmpegInstance.exec(ffmpegArgs);
      console.log(`Conversion completed successfully`);

      console.log(`Reading converted file...`);
      const data = await ffmpegInstance.readFile(outputFileName);
      console.log(`Creating MP3 blob...`);
      const blob = new Blob([data], { type: 'audio/mp3' });
      const convertedFileName = inputFile.name.substring(0, inputFile.name.lastIndexOf('.')) + '.mp3';
      const convertedFile = new File([blob], convertedFileName, {
        type: 'audio/mp3',
        lastModified: new Date().getTime(),
      });

      console.log(`Cleaning up temporary files...`);
      await ffmpegInstance.deleteFile(inputFileName);
      await ffmpegInstance.deleteFile(outputFileName);

      setConvertedFile(convertedFile);
      showNotification({
        title: 'Success',
        message: 'Audio converted to MP3',
        color: 'green',
      });

      return convertedFile;
    } catch (error) {
      console.error('Error converting audio:', error);
      setError(error instanceof Error ? `Conversion error: ${error.message}` : 'Failed to convert audio file');
      return null;
    }
  };

  const uploadFile = async (fileToUpload: File): Promise<boolean> => {
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

      console.log(`Requesting presigned URL for ${fileName}...`);
      const presignedResponse = await fetchWithAuth('/api/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          contentType: fileToUpload.type,
          bucketName: R2_CONFIG.bucketName,
        }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || `Failed to get upload URL: ${presignedResponse.status}`);
      }

      const { presignedUrl, fileUrl } = await presignedResponse.json();
      console.log(`Received presigned URL, beginning upload...`);

      setProgress(10);
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + (Math.floor(Math.random() * 10) + 5), 90));
      }, 500);

      console.log(`Uploading file to storage...`);
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileToUpload.type },
        body: fileToUpload,
      });

      clearInterval(progressInterval);

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to storage: ${uploadResponse.status}`);
      }

      console.log(`Upload completed successfully`);
      setProgress(100);
      onFileUploaded(fileUrl);
      showNotification({
        title: 'Success',
        message: 'File uploaded successfully',
        color: 'green',
      });

      return true;
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

      if (!(error instanceof Error && error.message.includes('offline'))) {
        setFile(null);
      }

      return false;
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
    setProgress(0);
    setConversionProgress(0);

    console.log(`File dropped: ${droppedFile.name} (${droppedFile.type})`);

    try {
      if (droppedFile.type === 'audio/mp3' || droppedFile.type === 'audio/mpeg') {
        console.log(`File is already MP3, uploading directly...`);
        await uploadFile(droppedFile);
      } else if (needsConversion(droppedFile) && isEnvironmentSupported) {
        console.log(`File needs conversion, proceeding...`);
        const ffmpegObj = await loadFffmpeg();

        if (ffmpegObj) {
          const converted = await convertToMp3(droppedFile);
          if (converted) {
            console.log(`Conversion successful, uploading converted file...`);
            await uploadFile(converted);
          } else {
            throw new Error('Conversion failed');
          }
        } else {
          throw new Error('FFmpeg failed to load');
        }
      } else {
        console.log(`File doesn't need conversion or environment unsupported, uploading directly...`);
        await uploadFile(droppedFile);
      }
    } catch (error) {
      console.warn(`Processing error, falling back to original file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setError("Audio conversion unavailable. Uploading original file instead.");
      await uploadFile(droppedFile);
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
          loading={uploading || ffmpegLoading}
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
              <Text size="xl" inline>Drag file here or click to select</Text>
              <Text size="sm" color="dimmed" inline mt={7}>
                MP3 files upload directly. Others will be converted to MP3 automatically.
              </Text>
            </div>
          </Group>
        </Dropzone>
      ) : (
        <Box>
          <Group
            justify="space-between"
            p="md"
            mb="md"
            style={{
              border: `1px solid ${theme.colors.gray[3]}`,
              borderRadius: theme.radius.md,
            }}
          >
            <Group>
              <FileText size={24} />
              <Box>
                <Text size="sm" fw={500}>
                  {convertedFile ? convertedFile.name : file?.name}
                </Text>
                {file && (
                  <Text size="xs" color="dimmed">
                    {formatFileSize(convertedFile ? convertedFile.size : file.size)}
                  </Text>
                )}
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
                setError(null);
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