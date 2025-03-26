"use client";

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Text, 
  Button, 
  Progress, 
  Group, 
  Paper, 
  TextInput, 
  Alert 
} from '@mantine/core';
import { useAuth } from "@/utils/authUtils";
import { AlertCircle } from 'lucide-react';

export default function AudioExtractor() {
  // State variables for file processing
  const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [ffmpeg, setFfmpeg] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { fetchWithAuth } = useAuth();

  // Load FFmpeg on component mount
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const loadFfmpeg = async () => {
      try {
        setStatus('loading');

        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { fetchFile } = await import('@ffmpeg/util');
        
        // Initialize FFmpeg with specific CDN URLs
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        
        const ffmpegInstance = new FFmpeg();
        await ffmpegInstance.load({
          coreURL: `${baseURL}/ffmpeg-core.js`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm`,
          workerURL: `${baseURL}/ffmpeg-core.worker.js`
        });
        
        // Store both FFmpeg instance and fetchFile utility
        setFfmpeg({ instance: ffmpegInstance, fetchFile });
        setStatus('idle');
      } catch (error) {
        console.error('Error loading FFmpeg:', error);
        setStatus('error');
      }
    };

    loadFfmpeg();
  }, []);

  const extractAudio = async (file: File) => {
    if (!ffmpeg?.instance) return;

    try {
      setStatus('processing');
      setProgress(0);

      const { instance: ffmpegInstance, fetchFile } = ffmpeg;

      // Write input file
      const inputFileName = 'input' + file.name.substring(file.name.lastIndexOf('.'));
      const outputFileName = 'output.mp3';
      
      await ffmpegInstance.writeFile(inputFileName, await fetchFile(file));

      // Set up progress handler
      ffmpegInstance.on('progress', ({ progress }: { progress: number }) => {
        setProgress(Math.round(progress * 100));
      });

      // Prepare FFmpeg command
      const ffmpegArgs = [
        '-i', inputFileName,
        ...(startTime ? ['-ss', startTime] : []),
        ...(duration ? ['-t', duration] : []),
        '-vn',  // Remove video stream
        '-acodec', 'libmp3lame',  // Use MP3 codec
        '-q:a', '2',  // Set quality (0-9, lower is better)
        outputFileName
      ];

      // Run FFmpeg command
      await ffmpegInstance.exec(ffmpegArgs);

      // Read the result
      const data = await ffmpegInstance.readFile(outputFileName);
      const blob = new Blob([data], { type: 'audio/mp3' });
      
      // Clean up files
      await ffmpegInstance.deleteFile(inputFileName);
      await ffmpegInstance.deleteFile(outputFileName);

      setAudioUrl(URL.createObjectURL(blob));
      setStatus('complete');
    } catch (error) {
      console.error('Error extracting audio:', error);
      setStatus('error');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSelectedFile(file);
  };

  const handleExtract = () => {
    if (selectedFile) {
      extractAudio(selectedFile);
    }
  };

  const downloadAudio = () => {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'extracted_audio.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Box p="md" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Paper p="xl" shadow="sm" withBorder>
        <Text size="xl" fw={700} mb="md">Audio Extractor</Text>
        
        {status === 'loading' ? (
          <Box my="xl">
            <Text mb="xs">Loading FFmpeg...</Text>
            <Progress value={50} size="md" radius="sm" animate />
          </Box>
        ) : (
          <>
            <Group grow mb="md">
              <TextInput
                label="Start Time (optional)"
                placeholder="00:00:00"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                description="Format: HH:MM:SS or seconds"
              />
              <TextInput
                label="Duration (optional)"
                placeholder="00:00:00"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                description="Format: HH:MM:SS or seconds"
              />
            </Group>
            
            <Box my="md">
              <Text size="sm" fw={500} mb="xs">Select video or audio file</Text>
              <input
                type="file"
                accept="video/*,audio/*"
                onChange={handleFileSelect}
                style={{ 
                  width: '100%',
                  padding: '10px',
                  marginBottom: '10px',
                  border: '1px dashed #ccc',
                  borderRadius: '4px'
                }}
              />
              {selectedFile && (
                <Text size="sm" mt="xs">Selected: {selectedFile.name}</Text>
              )}
            </Box>
            
            <Button 
              onClick={handleExtract} 
              disabled={!selectedFile || status === 'processing' || !ffmpeg?.instance}
              loading={status === 'processing'}
              fullWidth
              mb="md"
            >
              {status === 'processing' ? `Converting... ${progress}%` : 'Extract Audio'}
            </Button>

            {status === 'error' && (
              <Alert 
                icon={<AlertCircle size={16} />} 
                title="Error" 
                color="red" 
                mb="md"
              >
                Failed to extract audio. Please try again.
              </Alert>
            )}
            
            {status === 'complete' && (
              <Box mt="md">
                <Alert 
                  title="Success" 
                  color="green" 
                  mb="md"
                >
                  Audio extracted successfully!
                </Alert>
                
                <Box mb="md">
                  <Text size="sm" fw={500} mb="xs">Preview:</Text>
                  <audio controls src={audioUrl} style={{ width: '100%' }} />
                </Box>
                
                <Button 
                  onClick={downloadAudio}
                  fullWidth
                >
                  Download MP3
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
}