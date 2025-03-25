"use client";

import React, { useState, useEffect } from 'react';
import { Group, Text, useMantineTheme, rem, Box, Button, Progress, Alert, Loader, Collapse, TextInput } from '@mantine/core';
import { Dropzone, FileWithPath } from '@mantine/dropzone';
import { Upload, X, FileText, AlertCircle, Music, RefreshCw } from 'lucide-react';
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
  const [ffmpeg, setFfmpeg] = useState<any>(null);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [conversionStatus, setConversionStatus] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [convertedFile, setConvertedFile] = useState<File | null>(null);
  const [showAudioOptions, setShowAudioOptions] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [needsManualConversion, setNeedsManualConversion] = useState(false);

  const { fetchWithAuth, handleAuthError } = useAuth();

  // Audio file types that need conversion
  const audioFileTypes = [
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/m4a',
    'audio/flac',
    'audio/webm',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
  ];

  // Default accepted file types (including audio and video)
  const defaultAcceptedTypes = {
    'audio/mpeg': ['.mp3'],
    'audio/mp3': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/aac': ['.aac'],
    'audio/m4a': ['.m4a'],
    'audio/flac': ['.flac'],
    'audio/webm': ['.weba'],
    'video/mp4': ['.mp4'],
    'video/quicktime': ['.mov'],
    'video/x-msvideo': ['.avi'],
    'video/webm': ['.webm'],
  };

  // Check if a file needs conversion
  const checkFileNeedsConversion = (file: File): boolean => {
    return Boolean(file && audioFileTypes.some(type => file.type.includes(type)));
  };

  // Load FFmpeg when needed
  useEffect(() => {
    if (!file) return;
    
    const needsConversion = checkFileNeedsConversion(file);
    setNeedsManualConversion(needsConversion);
    setShowAudioOptions(needsConversion);
    
    if (needsConversion && !ffmpeg) {
      const loadFfmpeg = async () => {
        setFfmpegLoading(true);
        try {
          const { createFFmpeg, fetchFile } = await import('@ffmpeg/ffmpeg');
          const ffmpegInstance = createFFmpeg({ 
            log: true,
            corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js'
          });
          await ffmpegInstance.load();
          setFfmpeg({ instance: ffmpegInstance, fetchFile });
        } catch (error) {
          console.error('Error loading FFmpeg:', error);
          setError('Failed to load audio conversion library. Please use MP3 files directly.');
        } finally {
          setFfmpegLoading(false);
        }
      };
      loadFfmpeg();
    }
  }, [file, ffmpeg]);

  // Convert audio to MP3 using FFmpeg
  const convertToMp3 = async () => {
    if (!file || !ffmpeg) {
      setError('Audio conversion library not loaded');
      return null;
    }
    
    try {
      setConversionStatus('processing');
      setConversionProgress(0);

      const { instance: ffmpegInstance, fetchFile } = ffmpeg;

      // Write input file
      const inputFileName = 'input' + file.name.substring(file.name.lastIndexOf('.'));
      const outputFileName = 'output.mp3';
      
      ffmpegInstance.FS('writeFile', inputFileName, await fetchFile(file));

      // Set up progress tracking
      ffmpegInstance.setProgress(({ ratio }) => {
        setConversionProgress(Math.round(ratio * 100));
      });

      // Prepare FFmpeg command
      const ffmpegArgs = [
        '-i', inputFileName
      ];
      
      // Add start time if specified
      if (startTime) {
        ffmpegArgs.push('-ss', startTime);
      }
      
      // Add duration if specified  
      if (duration) {
        ffmpegArgs.push('-t', duration);
      }
      
      // Add output options
      ffmpegArgs.push(
        '-vn',  // Remove video stream
        '-acodec', 'libmp3lame',  // Use MP3 codec
        '-q:a', '2',  // Set quality (0-9, lower is better)
        outputFileName
      );

      // Run FFmpeg command
      await ffmpegInstance.run(...ffmpegArgs);

      // Read the result
      const data = ffmpegInstance.FS('readFile', outputFileName);
      const blob = new Blob([data.buffer], { type: 'audio/mp3' });
      
      // Create a File object from the blob
      const convertedFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.mp3';
      const convertedFile = new File([blob], convertedFileName, { 
        type: 'audio/mp3',
        lastModified: new Date().getTime()
      });
      
      // Clean up files
      ffmpegInstance.FS('unlink', inputFileName);
      ffmpegInstance.FS('unlink', outputFileName);

      setConversionStatus('complete');
      setConvertedFile(convertedFile);
      
      showNotification({
        title: 'Success',
        message: 'Audio converted to MP3 successfully',
        color: 'green',
      });
      
      return convertedFile;
    } catch (error) {
      console.error('Error converting audio:', error);
      setConversionStatus('error');
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

      console.log('Requesting presigned URL for:', {
        fileName,
        contentType: fileToUpload.type,
        bucketName: R2_CONFIG.bucketName,
      });

      const presignedResponse = await fetchWithAuth('/api/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
          'Content-Type': fileToUpload.type,
        },
        body: fileToUpload,
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
      
      // Don't reset file if it's a network error - allow retry
      if (!(error instanceof Error && error.message.includes('offline'))) {
        setFile(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (files: FileWithPath[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setConvertedFile(null);
      setConversionStatus(null);
      
      const droppedFile = files[0];
      
      // Check if the file is already an MP3
      if (droppedFile.type === 'audio/mp3' || droppedFile.type === 'audio/mpeg') {
        // If MP3, upload directly
        uploadFile(droppedFile);
      }
      // Otherwise, file will wait for conversion
    }
  };

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} bytes`;
    else if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    else if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    else return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Handle the full process of conversion and upload
  const handleConvertAndUpload = async () => {
    if (!file) return;
    
    try {
      const convertedFile = await convertToMp3();
      if (convertedFile) {
        await uploadFile(convertedFile);
      }
    } catch (error) {
      console.error('Convert and upload error:', error);
      setError('Failed to process and upload file');
    }
  };

  // After successful conversion, handle upload
  const handleUploadAfterConversion = () => {
    if (convertedFile) {
      uploadFile(convertedFile);
    }
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
                MP3 files will upload directly. Other audio/video formats will be converted first.
              </Text>
            </div>
          </Group>
        </Dropzone>
      ) : (
        <Box>
          {/* Show file info */}
          <Group
            justify="space-between"
            p="md"
            mb="md"
            style={{ border: `1px solid ${theme.colors.gray[3]}`, borderRadius: theme.radius.md }}
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
                setConversionStatus(null);
                setShowAudioOptions(false);
              }}
              disabled={uploading}
            >
              Remove
            </Button>
          </Group>

          {/* Audio conversion options */}
          {showAudioOptions && (
            <Box mb="md">
              <Collapse in={showAudioOptions}>
                <Box p="md" style={{ border: `1px solid ${theme.colors.blue[3]}`, borderRadius: theme.radius.md, background: theme.colors.blue[0] }}>
                  <Text size="sm" fw={500} mb="md">
                    <Music size={16} style={{ marginRight: '8px', display: 'inline' }} />
                    Audio Conversion Options
                  </Text>
                  
                  <Box mb="md">
                    <TextInput
                      label="Start Time (optional)"
                      placeholder="00:00:00"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      size="xs"
                      disabled={conversionStatus === 'processing' || uploading}
                    />
                    <Text size="xs" color="dimmed" mt={4}>Format: HH:MM:SS or seconds</Text>
                  </Box>

                  <Box mb="md">
                    <TextInput
                      label="Duration (optional)"
                      placeholder="00:00:00"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      size="xs"
                      disabled={conversionStatus === 'processing' || uploading}
                    />
                    <Text size="xs" color="dimmed" mt={4}>Format: HH:MM:SS or seconds</Text>
                  </Box>
                  
                  {ffmpegLoading && (
                    <Group justify="center" mb="md">
                      <Loader size="sm" />
                      <Text size="sm">Loading audio conversion library...</Text>
                    </Group>
                  )}
                  
                  {/* Conversion progress */}
                  {conversionStatus === 'processing' && (
                    <Box mb="md">
                      <Group justify="space-between" mb={5}>
                        <Text size="sm" fw={500}>Converting to MP3...</Text>
                        <Text size="sm" fw={500}>{conversionProgress}%</Text>
                      </Group>
                      <Progress value={conversionProgress} size="sm" radius="xl" />
                    </Box>
                  )}
                  
                  {/* Conversion actions */}
                  {!convertedFile && conversionStatus !== 'processing' && (
                    <Button
                      onClick={handleConvertAndUpload}
                      leftSection={<RefreshCw size={16} />}
                      color="blue"
                      fullWidth
                      disabled={ffmpegLoading || !ffmpeg || uploading}
                      loading={conversionStatus === 'processing'}
                    >
                      Convert to MP3 & Upload
                    </Button>
                  )}
                  
                  {/* Upload after conversion */}
                  {convertedFile && !uploading && (
                    <Button
                      onClick={handleUploadAfterConversion}
                      leftSection={<Upload size={16} />}
                      color="green"
                      fullWidth
                    >
                      Upload Converted MP3
                    </Button>
                  )}
                </Box>
              </Collapse>
            </Box>
          )}

          {/* Upload progress */}
          {uploading && (
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
          )}
        </Box>
      )}
    </Box>
  );
}