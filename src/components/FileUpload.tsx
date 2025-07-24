"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Group, Text, useMantineTheme, rem, Box, Button, Progress, Alert } from '@mantine/core';
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
  isDragging?: boolean;
  fileType?: string;
}

export function FileUpload({
  onFileUploaded,
  maxSizeMB,
  acceptedFileTypes,
  isDragging,
}: FileUploadProps) {
  const theme = useMantineTheme();
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ffmpeg, setFfmpeg] = useState<any | null>(null);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [convertedFile, setConvertedFile] = useState<File | null>(null);
  const [isEnvironmentSupported, setIsEnvironmentSupported] = useState<boolean | null>(null);

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

  // Improved file name sanitization function
  const sanitizeFileName = (fileName: string): string => {
    // 1. Remove any directory paths
    const baseName = fileName.split(/[\/\\]/).pop() || fileName;
    
    // 2. Replace any non-alphanumeric characters except for basic safe ones
    // Only allow alphanumeric, periods, hyphens, and underscores
    const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // 3. Ensure the file name isn't too long (many storage systems have limits)
    // Max length of 100 characters should be safe
    const truncated = sanitized.length > 100 ? sanitized.substring(0, 100) : sanitized;
    
    // 4. Add a timestamp and random string for uniqueness
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    
    return `${timestamp}-${randomStr}-${truncated}`;
  };

  const needsConversion = useCallback((file: File): boolean => {
    if (file.type === 'audio/mp3' || file.type === 'audio/mpeg') return false;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    return audioFileTypes.some(type =>
      file.type.includes(type.split('/')[1]) ||
      (fileExtension && ['wav', 'ogg', 'aac', 'm4a', 'flac', 'mp4', 'mov', 'avi', 'webm'].includes(fileExtension))
    );
  }, [audioFileTypes]);

  // Check environment support before trying to load FFmpeg
  useEffect(() => {
    const checkEnvironment = () => {
      const isSABSupported = typeof SharedArrayBuffer !== 'undefined';
      const isCrossOriginIsolated = typeof window !== 'undefined' && Boolean(window.crossOriginIsolated);
      console.log("Environment check:", {
        sharedArrayBuffer: isSABSupported ? "Available" : "Not available",
        crossOriginIsolated: isCrossOriginIsolated ? "Yes" : "No",
      });
      const supported = isSABSupported && isCrossOriginIsolated;
      setIsEnvironmentSupported(supported);
      return supported;
    };
    checkEnvironment();
  }, []);

  const loadFfmpeg = async () => {
    if (ffmpeg) return ffmpeg;
    
    if (!isEnvironmentSupported) {
      console.warn('Environment does not support FFmpeg, skipping loading');
      return null;
    }
  
    setFfmpegLoading(true);
    try {
      console.log('Starting FFmpeg load...');
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { fetchFile } = await import('@ffmpeg/util');
      const ffmpegInstance = new FFmpeg();
  
      console.log("Loading FFmpeg from CDN...");
      
      // Use a reliable CDN with proper CORS headers
      await ffmpegInstance.load({
        coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
        workerURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.worker.js'
      });
  
      setFfmpeg({ instance: ffmpegInstance, fetchFile });
      console.log('FFmpeg loaded successfully');
      return { instance: ffmpegInstance, fetchFile };
    } catch (error) {
      console.error('Error loading FFmpeg:', error);
      setError('Failed to load audio conversion library. Original file will be uploaded instead.');
      return null;
    } finally {
      setFfmpegLoading(false);
    }
  };

  const convertToMp3 = async (inputFile: File): Promise<File | null> => {
    if (!inputFile) return null;
    
    // Try to load FFmpeg if not already loaded
    const ffmpegInstance = ffmpeg || await loadFfmpeg();
    if (!ffmpegInstance) return null;
    
    const { instance: ffmpegCore, fetchFile } = ffmpegInstance;
    const inputFileName = 'input' + inputFile.name.substring(inputFile.name.lastIndexOf('.'));
    const outputFileName = 'output.mp3';

    try {
      setConversionProgress(0);
      console.log(`Fetching file data for ${inputFile.name}...`);
      const fileData = await fetchFile(inputFile);
      console.log(`Writing file to FFmpeg...`);
      await ffmpegCore.writeFile(inputFileName, fileData);

      ffmpegCore.on('progress', ({ progress }: { progress: number }) => {
        setConversionProgress(Math.round(progress * 100));
      });

      console.log(`Starting conversion to MP3...`);
      await ffmpegCore.exec(['-i', inputFileName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputFileName]);
      console.log(`Conversion completed successfully`);

      const data = await ffmpegCore.readFile(outputFileName);
      const blob = new Blob([data], { type: 'audio/mp3' });
      // Use sanitized filename for the converted file as well
      const convertedFileName = sanitizeFileName(inputFile.name.substring(0, inputFile.name.lastIndexOf('.')) + '.mp3');
      const convertedFile = new File([blob], convertedFileName, { type: 'audio/mp3' });

      await ffmpegCore.deleteFile(inputFileName);
      await ffmpegCore.deleteFile(outputFileName);

      setConvertedFile(convertedFile);
      showNotification({ title: 'Success', message: 'Audio converted to MP3', color: 'green' });
      return convertedFile;
    } catch (error) {
      console.error('Error converting audio:', error);
      setError('Failed to convert audio file');
      return null;
    }
  };

  const uploadFile = async (fileToUpload: File): Promise<boolean> => {
    setUploading(true);
    setProgress(0);
    try {
      if (maxSizeMB && fileToUpload.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File size exceeds ${maxSizeMB}MB`);
      }

      // Use the sanitized file name function instead of the old method
      const fileName = sanitizeFileName(fileToUpload.name);
      
      const presignedResponse = await fetchWithAuth('/api/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          contentType: fileToUpload.type,
          bucketName: R2_CONFIG.bucketName,
        }),
      });

      if (!presignedResponse.ok) throw new Error('Failed to get upload URL');
      const { presignedUrl, fileUrl } = await presignedResponse.json();

      setProgress(10);
      const progressInterval = setInterval(() => setProgress(prev => Math.min(prev + 5, 90)), 500);

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileToUpload.type },
        body: fileToUpload,
      });

      clearInterval(progressInterval);
      if (!uploadResponse.ok) throw new Error('Upload failed');

      setProgress(100);
      onFileUploaded(fileUrl);
      showNotification({ title: 'Success', message: 'File uploaded successfully', color: 'green' });
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
      handleAuthError(error);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (files: FileWithPath[]) => {
    if (!files.length) return;
    const droppedFile = files[0];
    setFile(droppedFile);
    setConvertedFile(null);
    setError(null);
    setProgress(0);
    setConversionProgress(0);

    console.log(`File dropped: ${droppedFile.name} (${droppedFile.type})`);

    try {
      if (droppedFile.type === 'audio/mp3' || droppedFile.type === 'audio/mpeg') {
        console.log('File is MP3, uploading directly...');
        await uploadFile(droppedFile);
      } else if (needsConversion(droppedFile) && isEnvironmentSupported) {
        console.log('File needs conversion, proceeding...');
        // Only try to load FFmpeg when actually needed
        const converted = await convertToMp3(droppedFile);
        if (converted) await uploadFile(converted);
        else throw new Error('Conversion failed');
      } else {
        console.log('Uploading original file...');
        await uploadFile(droppedFile);
      }
    } catch (error) {
      console.warn(`Processing error, falling back: ${error}`);
      setError('Conversion unavailable. Uploading original file.');
      await uploadFile(droppedFile);
    }
  };

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} bytes`;
    else if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    else return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box>
      {error && (
        <Alert icon={<AlertCircle size={16} />} color="red" mb="md" title="Error" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!file && !uploading ? (
        <Dropzone
          onDrop={handleDrop}
          maxSize={maxSizeMB ? maxSizeMB * 1024 * 1024 : undefined}
          accept={acceptedFileTypes || defaultAcceptedTypes}
          loading={uploading || ffmpegLoading}
          className={isDragging ? 'dropzone-active' : 'dropzone-idle'}
        >
          <Group justify="center" style={{ minHeight: rem(140), pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <Upload size={50} color={theme.colors[theme.primaryColor][6]} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <X size={50} color={theme.colors.red[6]} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <Upload size={50} />
            </Dropzone.Idle>
            <div>
              <Text size="xl" inline className={isDragging ? 'dropzone-text-active' : 'dropzone-text-idle'}>
                {isDragging ? 'Drop it here' : 'Drag file here or click to select'}
              </Text>
              <Text size="sm" color="dimmed" inline mt={7}>
                MP3 files upload directly. Others will be converted to MP3.
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
              onClick={() => { setFile(null); setConvertedFile(null); setConversionProgress(0); setError(null); }}
              disabled={uploading || ffmpegLoading}
            >
              Remove
            </Button>
          </Group>

          {ffmpegLoading && (
            <Box mb="md">
              <Text size="sm">Loading conversion library...</Text>
              <Progress value={50} size="sm" radius="xl" />
            </Box>
          )}

          {file && needsConversion(file) && !convertedFile && !uploading && !ffmpegLoading && (
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