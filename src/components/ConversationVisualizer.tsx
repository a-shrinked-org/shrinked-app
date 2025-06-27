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
  const [animationData, setAnimationData] = useState<number[][]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number>();

  // Grid configuration - made dots bigger and more spaced
  const COLS = 48;
  const ROWS = 8;
  const DOT_SIZE = 3; // Increased from 2.5
  const DOT_GAP = 7; // Increased from 6
  const GRID_WIDTH = COLS * (DOT_SIZE + DOT_GAP);
  const GRID_HEIGHT = ROWS * (DOT_SIZE + DOT_GAP);

  // Generate more dramatic conversation-like data patterns
  const generateConversationPattern = () => {
    const patterns = [];
    const numFrames = 180; // 3 seconds at 60fps - longer loop
    
    for (let frame = 0; frame < numFrames; frame++) {
      const frameData = [];
      
      for (let col = 0; col < COLS; col++) {
        const time = frame * 0.08; // Slower animation
        const position = col / COLS;
        
        // Create more dramatic conversation segments
        let intensity = 0;
        
        // Multiple overlapping wave patterns for richer visualization
        const wave1 = Math.sin(time * 2 + position * 10) * 0.5 + 0.5;
        const wave2 = Math.sin(time * 1.3 + position * 8 + Math.PI/3) * 0.4 + 0.4;
        const wave3 = Math.sin(time * 0.7 + position * 6 + Math.PI/2) * 0.6 + 0.6;
        
        // Create speaking segments with more dramatic on/off
        const speakerA = Math.sin(time * 0.4) > 0.3 ? 1 : 0.1;
        const speakerB = Math.sin(time * 0.5 + Math.PI) > 0.2 ? 1 : 0.1;
        const overlap = Math.sin(time * 0.6 + Math.PI/4) > 0.4 ? 1 : 0.1;
        
        // Assign different patterns to different zones
        if (position < 0.33) {
          // Speaker A zone - Blue
          intensity = wave1 * speakerA;
        } else if (position < 0.67) {
          // Overlap zone - Purple
          intensity = wave2 * overlap;
        } else {
          // Speaker B zone - Cyan
          intensity = wave3 * speakerB;
        }
        
        // Add some high-frequency variation for texture
        const texture = Math.sin(time * 8 + position * 20) * 0.1;
        intensity += texture;
        
        // Add occasional "bursts" for emphasis
        const burst = Math.sin(time * 0.3 + position * 4) > 0.8 ? 0.3 : 0;
        intensity += burst;
        
        // Ensure intensity stays in bounds but allow higher values
        intensity = Math.max(0, Math.min(1.2, intensity)); // Allow up to 1.2 for brighter peaks
        
        frameData.push(intensity);
      }
      
      patterns.push(frameData);
    }
    
    return patterns;
  };

  // Initialize animation data when files change
  useEffect(() => {
    if (files.some(f => f.url.trim() !== '')) {
      const patterns = generateConversationPattern();
      setAnimationData(patterns);
      setCurrentFrame(0);
    } else {
      setAnimationData([]);
    }
  }, [files]);

  // Animation loop - slower frame rate for smoother appearance
  useEffect(() => {
    if (isActive && animationData.length > 0) {
      const animate = () => {
        setCurrentFrame(prev => (prev + 1) % animationData.length);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      // Start animation with a slight delay
      const timeoutId = setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isActive, animationData.length]);

  const renderDots = () => {
    const dots = [];
    const hasData = files.some(f => f.url.trim() !== '');
    const currentData = animationData[currentFrame] || new Array(COLS).fill(0);
    
    for (let col = 0; col < COLS; col++) {
      const intensity = hasData ? currentData[col] : 0;
      const activeRows = Math.floor(intensity * ROWS);
      
      for (let row = 0; row < ROWS; row++) {
        const x = col * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;
        const y = (ROWS - 1 - row) * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;
        const isActive = row < activeRows;
        
        // Enhanced color scheme with better visibility
        let color = '#1a1a1a'; // Default dim
        let opacity = 0.2;
        
        if (hasData && isActive) {
          const rowIntensity = (row + 1) / ROWS;
          const baseIntensity = Math.min(intensity, 1); // Cap at 1 for opacity calculation
          
          // Brighter, more vibrant colors
          if (col < COLS * 0.33) {
            // Speaker A zone - Bright Blue
            color = '#3b82f6'; // Brighter blue
            opacity = Math.min(0.9, 0.3 + baseIntensity * 0.7); // Higher opacity range
          } else if (col < COLS * 0.67) {
            // Overlap zone - Bright Purple
            color = '#a855f7'; // Brighter purple
            opacity = Math.min(0.9, 0.3 + baseIntensity * 0.7);
          } else {
            // Speaker B zone - Bright Cyan
            color = '#06b6d4'; // Keep cyan as is
            opacity = Math.min(0.9, 0.3 + baseIntensity * 0.7);
          }
          
          // Add extra brightness for peaks
          if (intensity > 1) {
            opacity = Math.min(1, opacity * 1.3);
          }
        } else if (!hasData) {
          // More visible static pattern when no data
          const staticNoise = Math.random();
          if (staticNoise > 0.92) { // More frequent static
            color = '#404040'; // Brighter static
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
            rx={0.5} // Slightly rounded corners for better appearance
            className={isActive && hasData ? 'animate-pulse' : ''}
            style={{
              transition: 'fill-opacity 0.1s ease-out'
            }}
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
      return `[${index + 1}] ${type}: ${filename.substring(0, 20)}${filename.length > 20 ? '...' : ''}`;
    });
  };

  return (
    <Box
      style={{
        backgroundColor: '#0a0a0a',
        border: '0.5px solid #2B2B2B',
        borderRadius: '6px',
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Group justify="space-between" mb="sm">
        <Text 
          size="xs" 
          c="#666" 
          style={{ 
            fontFamily: GeistMono.style.fontFamily,
            letterSpacing: '0.5px'
          }}
        >
          CONVERSATION DATA VISUALIZATION
        </Text>
        <Text 
          size="xs" 
          c={files.some(f => f.url.trim() !== '') ? "#3b82f6" : "#666"}
          style={{ 
            fontFamily: GeistMono.style.fontFamily,
            letterSpacing: '0.5px'
          }}
        >
          {getStatusText()}
        </Text>
      </Group>

      {/* SVG Grid */}
      <Box style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
        <svg
          width={GRID_WIDTH}
          height={GRID_HEIGHT}
          style={{ 
            background: 'transparent',
            overflow: 'visible'
          }}
        >
          {renderDots()}
        </svg>
      </Box>

      {/* File Info */}
      {getFileInfo() && (
        <Box>
          {getFileInfo()?.map((info, index) => (
            <Text 
              key={index}
              size="xs" 
              c="#888" 
              style={{ 
                fontFamily: GeistMono.style.fontFamily,
                fontSize: '10px',
                lineHeight: 1.3,
                marginBottom: '2px'
              }}
            >
              {info}
            </Text>
          ))}
        </Box>
      )}

      {/* Legend */}
      <Group gap="lg" mt="xs">
        <Group gap="xs">
          <Box 
            style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#3b82f6', // Updated to match new blue
              borderRadius: '1px',
              opacity: 0.8
            }} 
          />
          <Text size="xs" c="#666" style={{ fontFamily: GeistMono.style.fontFamily }}>
            SPEAKER_A
          </Text>
        </Group>
        <Group gap="xs">
          <Box 
            style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#a855f7', // Updated to match new purple
              borderRadius: '1px',
              opacity: 0.8
            }} 
          />
          <Text size="xs" c="#666" style={{ fontFamily: GeistMono.style.fontFamily }}>
            OVERLAP
          </Text>
        </Group>
        <Group gap="xs">
          <Box 
            style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#06b6d4', 
              borderRadius: '1px',
              opacity: 0.8
            }} 
          />
          <Text size="xs" c="#666" style={{ fontFamily: GeistMono.style.fontFamily }}>
            SPEAKER_B
          </Text>
        </Group>
      </Group>
    </Box>
  );
};

export default ConversationVisualizer;