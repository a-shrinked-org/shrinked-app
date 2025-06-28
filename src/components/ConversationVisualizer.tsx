import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, Group } from '@mantine/core';
import { GeistMono } from 'geist/font/mono';

interface ConversationVisualizerProps {
  files: Array<{ url: string; filename?: string; type: 'link' | 'upload' }>;
  isActive?: boolean;
}

const ConversationVisualizer: React.FC<ConversationVisualizerProps> = ({ 
  files, 
  isActive = false 
}) => {
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>();

  // Grid configuration
  const COLS = 48;
  const ROWS = 8;
  const DOT_SIZE = 5; // Made dots bigger
  const DOT_GAP = 7;
  const GRID_WIDTH = COLS * (DOT_SIZE + DOT_GAP);
  const GRID_HEIGHT = ROWS * (DOT_SIZE + DOT_GAP);

  // Initialize audio analysis
  const initializeAudioAnalysis = async (audioUrl: string) => {
    try {
      setIsAnalyzing(true);
      setAudioError(null);

      // Create audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Create audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.remove();
      }

      audioElementRef.current = new Audio();
      audioElementRef.current.crossOrigin = 'anonymous';
      audioElementRef.current.src = audioUrl;

      // Create analyser
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      // Connect audio source to analyser
      const source = audioContextRef.current.createMediaElementSource(audioElementRef.current);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      // Start playing audio (muted for analysis)
      audioElementRef.current.volume = 0; // Mute for visualization only
      audioElementRef.current.loop = true;
      
      await audioElementRef.current.play();
      
      // Start frequency analysis
      startFrequencyAnalysis();
      
    } catch (error) {
      console.error('Audio analysis error:', error);
      setAudioError('Failed to analyze audio file');
      // Fall back to simulated data
      generateSimulatedData();
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Real-time frequency analysis
  const startFrequencyAnalysis = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Sample data to match our column count
      const sampledData = [];
      const sampleRate = Math.floor(bufferLength / COLS);
      
      for (let i = 0; i < COLS; i++) {
        const startIndex = i * sampleRate;
        const endIndex = Math.min(startIndex + sampleRate, bufferLength);
        let sum = 0;
        let count = 0;
        
        for (let j = startIndex; j < endIndex; j++) {
          sum += dataArray[j];
          count++;
        }
        
        const average = count > 0 ? sum / count : 0;
        sampledData.push(average / 255); // Normalize to 0-1
      }
      
      setFrequencyData(sampledData);
      
      if (isActive) {
        animationRef.current = requestAnimationFrame(analyze);
      }
    };

    analyze();
  };

  // Fallback simulated data for when real audio analysis fails
  const generateSimulatedData = () => {
    const simulate = () => {
      const data = [];
      const time = Date.now() * 0.001;
      
      for (let i = 0; i < COLS; i++) {
        const position = i / COLS;
        
        // Create conversation-like patterns
        let intensity = 0;
        const wave1 = Math.sin(time * 2 + position * 10) * 0.5 + 0.5;
        const wave2 = Math.sin(time * 1.3 + position * 8 + Math.PI/3) * 0.4 + 0.4;
        const wave3 = Math.sin(time * 0.7 + position * 6 + Math.PI/2) * 0.6 + 0.6;
        
        const speakerA = Math.sin(time * 0.4) > 0.3 ? 1 : 0.1;
        const speakerB = Math.sin(time * 0.5 + Math.PI) > 0.2 ? 1 : 0.1;
        const overlap = Math.sin(time * 0.6 + Math.PI/4) > 0.4 ? 1 : 0.1;
        
        if (position < 0.33) {
          intensity = wave1 * speakerA;
        } else if (position < 0.67) {
          intensity = wave2 * overlap;
        } else {
          intensity = wave3 * speakerB;
        }
        
        data.push(Math.max(0, Math.min(1, intensity)));
      }
      
      setFrequencyData(data);
      
      if (isActive) {
        animationRef.current = requestAnimationFrame(simulate);
      }
    };

    simulate();
  };

  // Check if URL is a valid audio file
  const isAudioFile = (url: string): boolean => {
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    const lowerUrl = url.toLowerCase();
    return audioExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('audio') || 
           lowerUrl.includes('sound');
  };

  // Initialize when files change
  useEffect(() => {
    const validFiles = files.filter(f => f.url.trim() !== '');
    
    if (validFiles.length > 0) {
      const firstFile = validFiles[0];
      
      // Check if it's likely an audio file
      if (isAudioFile(firstFile.url)) {
        initializeAudioAnalysis(firstFile.url);
      } else {
        // For non-audio files, use simulated conversation data
        setAudioError('Non-audio file detected - showing simulated conversation data');
        generateSimulatedData();
      }
    } else {
      // No files - show simulated data
      generateSimulatedData();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [files, isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.remove();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const renderDots = () => {
    const dots = [];
    const hasData = files.some(f => f.url.trim() !== '');
    
    for (let col = 0; col < COLS; col++) {
      const intensity = hasData && frequencyData[col] ? frequencyData[col] : 0;
      const activeRows = Math.floor(intensity * ROWS);
      
      for (let row = 0; row < ROWS; row++) {
        const x = col * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;
        const y = (ROWS - 1 - row) * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;
        const isActive = row < activeRows;
        
        let color = '#1a1a1a';
        let opacity = 0.2;
        
        if (hasData && isActive) {
          const rowIntensity = (row + 1) / ROWS;
          const baseIntensity = intensity;
          
          // Color zones based on frequency ranges
          if (col < COLS * 0.33) {
            // Low frequencies - Blue
            color = '#3b82f6';
            opacity = Math.min(0.9, 0.3 + baseIntensity * 0.7);
          } else if (col < COLS * 0.67) {
            // Mid frequencies - Purple
            color = '#a855f7';
            opacity = Math.min(0.9, 0.3 + baseIntensity * 0.7);
          } else {
            // High frequencies - Cyan
            color = '#06b6d4';
            opacity = Math.min(0.9, 0.3 + baseIntensity * 0.7);
          }
        } else if (!hasData) {
          // Static noise when no data
          const staticNoise = Math.random();
          if (staticNoise > 0.95) {
            color = '#404040';
            opacity = 0.3;
          }
        }
        
        dots.push(
          <rect
            key={`${col}-${row}`}
            x={x - DOT_SIZE / 2}
            y={y - DOT_SIZE / 2}
            width={DOT_SIZE}
            height={DOT_SIZE}
            fill={color}
            fillOpacity={opacity}
            rx={0.5}
          />
        );
      }
    }
    
    return dots;
  };

  const getStatusText = () => {
    const validFiles = files.filter(f => f.url.trim() !== '');
    if (validFiles.length === 0) {
      return 'NO DATA SOURCES';
    } else if (isAnalyzing) {
      return 'ANALYZING AUDIO...';
    } else if (audioError) {
      return 'SIMULATED DATA';
    } else if (validFiles.length === 1) {
      return `1 SOURCE LOADED`;
    } else {
      return `${validFiles.length} SOURCES LOADED`;
    }
  };

  const getFileInfo = () => {
    const validFiles = files.filter(f => f.url.trim() !== '');
    if (validFiles.length === 0) return null;
    
    return validFiles.map((file, index) => {
      const filename = file.filename || file.url.split('/').pop()?.split('?')[0] || 'UNKNOWN';
      const type = file.type.toUpperCase();
      const audioType = isAudioFile(file.url) ? 'AUDIO' : 'OTHER';
      return `[${index + 1}] ${type}/${audioType}: ${filename.substring(0, 20)}${filename.length > 20 ? '...' : ''}`;
    });
  };

  return (
    <Box
      style={{
        backgroundColor: '#0A0A0A',
        borderRadius: '6px',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${GRID_WIDTH} ${GRID_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ 
          background: 'transparent',
        }}
      >
        {renderDots()}
      </svg>
    </Box>
  );
};

export default ConversationVisualizer;