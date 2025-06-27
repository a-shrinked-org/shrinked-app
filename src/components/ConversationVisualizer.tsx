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

  // Grid configuration
  const COLS = 48;
  const ROWS = 8;
  const DOT_SIZE = 2.5;
  const DOT_GAP = 6;
  const GRID_WIDTH = COLS * (DOT_SIZE + DOT_GAP);
  const GRID_HEIGHT = ROWS * (DOT_SIZE + DOT_GAP);

  // Generate conversation-like data patterns
  const generateConversationPattern = () => {
    const patterns = [];
    const numFrames = 120; // 2 seconds at 60fps
    
    for (let frame = 0; frame < numFrames; frame++) {
      const frameData = [];
      
      for (let col = 0; col < COLS; col++) {
        // Create conversation-like patterns
        const time = frame * 0.1;
        const position = col / COLS;
        
        // Simulate conversation segments with varying intensity
        let intensity = 0;
        
        // Create "speaking" segments
        const segment1 = Math.sin(time + position * 8) * 0.5 + 0.5;
        const segment2 = Math.sin(time * 1.5 + position * 12) * 0.3 + 0.3;
        const segment3 = Math.sin(time * 0.8 + position * 6) * 0.4 + 0.4;
        
        // Combine segments to create conversation flow
        if (position < 0.3) {
          intensity = segment1 * (Math.sin(time * 0.5) > 0 ? 1 : 0.1);
        } else if (position < 0.6) {
          intensity = segment2 * (Math.sin(time * 0.7 + Math.PI) > 0 ? 1 : 0.1);
        } else {
          intensity = segment3 * (Math.sin(time * 0.6 + Math.PI/2) > 0 ? 1 : 0.1);
        }
        
        // Add some randomness for natural feel
        intensity += (Math.random() - 0.5) * 0.1;
        intensity = Math.max(0, Math.min(1, intensity));
        
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

  // Animation loop
  useEffect(() => {
    if (isActive && animationData.length > 0) {
      const animate = () => {
        setCurrentFrame(prev => (prev + 1) % animationData.length);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
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
        
        // Color scheme for conversation data
        let color = '#1a1a1a'; // Default dim
        let opacity = 0.3;
        
        if (hasData && isActive) {
          const rowIntensity = (row + 1) / ROWS;
          const baseIntensity = intensity * 0.8 + 0.2;
          
          // Different colors for different "conversation zones"
          if (col < COLS * 0.33) {
            // Speaker 1 zone - Blue
            color = '#1a4fff';
            opacity = baseIntensity * (0.4 + rowIntensity * 0.6);
          } else if (col < COLS * 0.66) {
            // Overlap/interaction zone - Purple
            color = '#8b5cf6';
            opacity = baseIntensity * (0.3 + rowIntensity * 0.7);
          } else {
            // Speaker 2 zone - Cyan
            color = '#06b6d4';
            opacity = baseIntensity * (0.4 + rowIntensity * 0.6);
          }
        } else if (!hasData) {
          // Static pattern when no data
          const staticNoise = Math.random();
          if (staticNoise > 0.95) {
            color = '#333333';
            opacity = 0.2;
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
            className={isActive && hasData ? 'transition-opacity duration-75' : ''}
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
          c={files.some(f => f.url.trim() !== '') ? "#1a4fff" : "#666"}
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
              backgroundColor: '#1a4fff', 
              borderRadius: '1px',
              opacity: 0.7
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
              backgroundColor: '#8b5cf6', 
              borderRadius: '1px',
              opacity: 0.7
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
              opacity: 0.7
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