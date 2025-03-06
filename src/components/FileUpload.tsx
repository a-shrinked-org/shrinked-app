import React, { useState } from 'react';
import { Group, Text, useMantineTheme, rem, Box, Button, Progress } from '@mantine/core';
import { Dropzone, FileWithPath } from '@mantine/dropzone';
import { Upload, X, FileText } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { authUtils, useAuth, API_CONFIG } from "@/utils/authUtils";

// R2 Configuration - ideally move to environment variables in production
const R2_CONFIG = {
  bucketName: process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'jobs-uploads'
};

interface FileUploadProps {
  onFileUploaded: (fileUrl: string) => void;
  // Optional props for customization
  maxSizeMB?: number;
  acceptedFileTypes?: Record<string, string[]>;
}

export function FileUpload({ 
  onFileUploaded,
  maxSizeMB = 100, // Default to 100MB
  acceptedFileTypes
}: FileUploadProps) {
  const theme = useMantineTheme();
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  // Using the centralized auth hook
  const { fetchWithAuth, handleAuthError } = useAuth();

  // Default accepted file types if not provided
  const defaultAcceptedTypes = {
    // Audio
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/aac': ['.aac'],
    // Video
    'video/mp4': ['.mp4'],
    'video/quicktime': ['.mov'],
    'video/x-msvideo': ['.avi'],
    'video/webm': ['.webm']
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      // Check if online before making request
      if (!navigator.onLine) {
        throw new Error('You appear to be offline. Please check your internet connection.');
      }
      
      // Generate a unique file name to avoid collisions
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 10);
      const fileName = `${timestamp}-${randomString}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Convert file to base64
      const base64String = await file2Base64(file);
      
      // Create a simulated progress update
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 200);
      
      // Upload to your backend using centralized fetchWithAuth
      const response = await fetchWithAuth('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          contentType: file.type,
          base64Data: base64String,
          bucketName: R2_CONFIG.bucketName
        })
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        // Handle specific status codes
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required. Please login again.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          // Try to parse error message from response
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload file');
          } catch {
            throw new Error(`Upload failed with status: ${response.status}`);
          }
        }
      }
      
      const data = await response.json();
      setProgress(100);
      
      // Provide the URL to the parent component
      onFileUploaded(data.fileUrl);
      
      showNotification({
        title: 'Success',
        message: 'File uploaded successfully',
        color: 'green'
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      // Use centralized error handling
      handleAuthError(error);
      
      showNotification({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to upload file',
        color: 'red'
      });
    } finally {
      setUploading(false);
    }
  };

  // Convert file to base64
  const file2Base64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:mime/type;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleDrop = (files: FileWithPath[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      uploadFile(files[0]);
    }
  };

  // Calculate file size for display
  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} bytes`;
    else if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    else if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    else return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <Box>
      {!file && !uploading ? (
        <Dropzone
          onDrop={handleDrop}
          maxSize={maxSizeMB * 1024 * 1024}
          accept={acceptedFileTypes || defaultAcceptedTypes}
          loading={uploading}
        >
          <Group justify="center" style={{ minHeight: rem(140), pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <Upload
                size={50}
                strokeWidth={1.5}
                color={theme.colors[theme.primaryColor][6]}
              />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <X
                size={50}
                strokeWidth={1.5}
                color={theme.colors.red[6]}
              />
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
            <Group justify="space-between" p="md" style={{ border: `1px solid ${theme.colors.gray[3]}`, borderRadius: theme.radius.md }}>
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
              <Button 
                variant="light" 
                color="red" 
                size="xs" 
                onClick={() => setFile(null)}
              >
                Remove
              </Button>
            </Group>
          )}
        </Box>
      )}
    </Box>
  );
}