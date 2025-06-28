import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, Group } from '@mantine/core';
import { GeistMono } from 'geist/font/mono';

interface ConversationVisualizerProps {
  files: Array<{ url: string; filename?: string; type: 'link' | 'upload' }>;
  isActive?: boolean;
}

const ConversationVisualizer: React.FC<ConversationVisualizerProps> = ({ 
  files, 
  isActive = true 
}) => {
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>();

  // Grid configuration
  const COLS = 64;
  const ROWS = 12;
  const DOT_SIZE = 2;
  const DOT_GAP = 4;
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
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.85;

      // Connect audio source to analyser
      const source = audioContextRef.current.createMediaElementSource(audioElementRef.current);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      // Start playing audio (muted for analysis)
      audioElementRef.current.volume = 0;
      audioElementRef.current.loop = true;
      
      await audioElementRef.current.play();
      
      // Start frequency analysis
      startFrequencyAnalysis();
      
    } catch (error) {
      console.error('Audio analysis error:', error);
      setAudioError('Failed to analyze audio - using simulated data');
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
      if (!analyserRef.current || !isActive) return;

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

  // Enhanced simulated data that always shows activity
  const generateSimulatedData = () => {
    const simulate = () => {
      const data = [];
      const time = Date.now() * 0.002;
      
      for (let i = 0; i < COLS; i++) {
        const position = i / COLS;
        
        // Create multiple conversation patterns
        const wave1 = Math.sin(time * 1.5 + position * 12) * 0.4 + 0.5;
        const wave2 = Math.sin(time * 2.1 + position * 8 + Math.PI/3) * 0.3 + 0.4;
        const wave3 = Math.sin(time * 0.8 + position * 15 + Math.PI/2) * 0.5 + 0.6;
        const noise = Math.random() * 0.1;
        
        // Speaker patterns with overlap
        const speakerA = Math.sin(time * 0.6) > 0.1 ? 1 : 0.2;
        const speakerB = Math.sin(time * 0.7 + Math.PI/2) > 0.2 ? 1 : 0.15;
        const background = 0.1 + noise;
        
        let intensity = background;
        
        if (position < 0.3) {
          intensity = Math.max(background, wave1 * speakerA);
        } else if (position < 0.7) {
          intensity = Math.max(background, wave2 * Math.max(speakerA, speakerB) * 0.8);
        } else {
          intensity = Math.max(background, wave3 * speakerB);
        }
        
        // Add some random spikes for realism
        if (Math.random() > 0.95) {
          intensity = Math.min(1, intensity + 0.4);
        }
        
        data.push(Math.max(0.05, Math.min(1, intensity)));
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

  // Always show visualization - either from real files or simulated
  useEffect(() => {
    const validFiles = files.filter(f => f.url.trim() !== '');
    
    if (validFiles.length > 0) {
      const firstFile = validFiles[0];
      
      if (isAudioFile(firstFile.url)) {
        initializeAudioAnalysis(firstFile.url);
      } else {
        setAudioError(null);
        generateSimulatedData();
      }
    } else {
      // Always show simulated data when no files
      setAudioError(null);
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
    const hasFiles = files.some(f => f.url.trim() !== '');
    
    for (let col = 0; col < COLS; col++) {
      const intensity = frequencyData[col] || 0;
      const activeRows = Math.floor(intensity * ROWS);
      
      for (let row = 0; row < ROWS; row++) {
        const x = col * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;
        const y = (ROWS - 1 - row) * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;
        const isActive = row < activeRows;
        
        let color = '#1a1a1a';
        let opacity = 0.15;
        
        if (isActive) {
          const rowIntensity = (row + 1) / ROWS;
          const baseIntensity = intensity;
          
          // Frequency-based coloring
          if (col < COLS * 0.33) {
            // Low frequencies - Blue
            color = '#3b82f6';
            opacity = Math.min(0.9, 0.2 + baseIntensity * 0.8);
          } else if (col < COLS * 0.67) {
            // Mid frequencies - Purple/Magenta
            color = '#a855f7';
            opacity = Math.min(0.9, 0.2 + baseIntensity * 0.8);
          } else {
            // High frequencies - Cyan
            color = '#06b6d4';
            opacity = Math.min(0.9, 0.2 + baseIntensity * 0.8);
          }
          
          // Add some shimmer effect
          if (baseIntensity > 0.7) {
            opacity *= (0.8 + 0.2 * Math.sin(Date.now() * 0.01 + col * 0.1));
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
    if (isAnalyzing) {
      return 'ANALYZING AUDIO...';
    } else if (validFiles.length === 0) {
      return 'SIMULATED CONVERSATION DATA';
    } else if (audioError) {
      return 'SIMULATED DATA (AUDIO ANALYSIS FAILED)';
    } else if (validFiles.length === 1) {
      return `ANALYZING: ${validFiles[0].filename || 'FILE'}`;
    } else {
      return `ANALYZING: ${validFiles.length} FILES`;
    }
  };

  return (
    <Box
      style={{
        backgroundColor: '#0a0a0a',
        border: '0.5px solid #2B2B2B',
        borderRadius: '6px',
        padding: '20px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Status */}
      <Group justify="center" mb="lg">
        <Text 
          size="xs" 
          c={files.some(f => f.url.trim() !== '') ? "#3b82f6" : "#888"}
          style={{ 
            fontFamily: GeistMono.style.fontFamily,
            letterSpacing: '1px',
            textAlign: 'center'
          }}
        >
          {getStatusText()}
        </Text>
      </Group>

      {/* SVG Grid - Full Width */}
      <Box style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '20px',
        width: '100%'
      }}>
        <svg
          width="100%"
          height={GRID_HEIGHT}
          viewBox={`0 0 ${GRID_WIDTH} ${GRID_HEIGHT}`}
          style={{ 
            background: 'transparent',
            overflow: 'visible',
            maxWidth: GRID_WIDTH
          }}
        >
          {renderDots()}
        </svg>
      </Box>

      {/* Legend - Full Width */}
      <Group justify="center" gap="xl">
        <Group gap="xs">
          <Box 
            style={{ 
              width: '6px', 
              height: '6px', 
              backgroundColor: '#3b82f6',
              borderRadius: '1px',
              opacity: 0.8
            }} 
          />
          <Text size="xs" c="#666" style={{ fontFamily: GeistMono.style.fontFamily }}>
            LOW
          </Text>
        </Group>
        <Group gap="xs">
          <Box 
            style={{ 
              width: '6px', 
              height: '6px', 
              backgroundColor: '#a855f7',
              borderRadius: '1px',
              opacity: 0.8
            }} 
          />
          <Text size="xs" c="#666" style={{ fontFamily: GeistMono.style.fontFamily }}>
            MID
          </Text>
        </Group>
        <Group gap="xs">
          <Box 
            style={{ 
              width: '6px', 
              height: '6px', 
              backgroundColor: '#06b6d4',
              borderRadius: '1px',
              opacity: 0.8
            }} 
          />
          <Text size="xs" c="#666" style={{ fontFamily: GeistMono.style.fontFamily }}>
            HIGH
          </Text>
        </Group>
      </Group>
    </Box>
  );
};

export default ConversationVisualizer;