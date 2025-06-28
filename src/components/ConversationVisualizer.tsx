import React, { useState, useEffect } from 'react';
import { Box } from '@mantine/core';

interface ConversationVisualizerProps {
  // Props are kept for API compatibility but are no longer used.
  files: Array<{ url: string; filename?: string; type: 'link' | 'upload' }>;
  isActive?: boolean;
}

const ConversationVisualizer: React.FC<ConversationVisualizerProps> = () => {
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  // Grid configuration
  const COLS = 48;
  const ROWS = 8;
  const DOT_SIZE = 5;
  const DOT_GAP = 7;
  const GRID_WIDTH = COLS * (DOT_SIZE + DOT_GAP);
  const GRID_HEIGHT = ROWS * (DOT_SIZE + DOT_GAP);

  // Generate a static, random pattern once on mount
  useEffect(() => {
    const data = [];
    for (let i = 0; i < COLS; i++) {
      const position = i / COLS;
      
      // Create random conversation-like patterns
      let intensity = 0;
      const wave1 = Math.sin(Math.random() * 2 + position * 10) * 0.5 + 0.5;
      const wave2 = Math.sin(Math.random() * 1.3 + position * 8) * 0.4 + 0.4;
      const wave3 = Math.sin(Math.random() * 0.7 + position * 6) * 0.6 + 0.6;
      
      const speakerA = Math.random() > 0.3 ? 1 : 0.1;
      const speakerB = Math.random() > 0.2 ? 1 : 0.1;
      const overlap = Math.random() > 0.4 ? 1 : 0.1;
      
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
  }, []); // Empty dependency array ensures this runs only once on mount

  const renderDots = () => {
    const dots = [];
    
    for (let col = 0; col < COLS; col++) {
      const intensity = frequencyData[col] || 0;
      const activeRows = Math.floor(intensity * ROWS);
      
      for (let row = 0; row < ROWS; row++) {
        const x = col * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;
        const y = (ROWS - 1 - row) * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;
        const isActive = row < activeRows;
        
        let color = '#1a1a1a';
        let opacity = 0.2;
        
        if (isActive) {
          const baseIntensity = intensity;
          
          // Color zones based on frequency ranges
          if (col < COLS * 0.33) {
            color = '#3b82f6'; // Blue
            opacity = Math.min(0.9, 0.3 + baseIntensity * 0.7);
          } else if (col < COLS * 0.67) {
            color = '#a855f7'; // Purple
            opacity = Math.min(0.9, 0.3 + baseIntensity * 0.7);
          } else {
            color = '#06b6d4'; // Cyan
            opacity = Math.min(0.9, 0.3 + baseIntensity * 0.7);
          }
        } else {
          // Deterministic static noise for inactive dots
          const staticNoise = ((col * 5 + row * 3) % 100) / 100;
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

  return (
    <Box
      style={{
        backgroundColor: '#0A0A0A',
        borderRadius: '6px',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        padding: '10px',
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
