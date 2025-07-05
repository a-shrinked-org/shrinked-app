import React, { useState, useEffect } from 'react';
import { Box } from '@mantine/core';

interface ConversationVisualizerProps {
  files: Array<{ url: string; filename?: string; type: 'link' | 'upload' | 'download' }>;
  isActive?: boolean;
}

const ConversationVisualizer: React.FC<ConversationVisualizerProps> = ({ files }) => {
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  // Grid configuration
  const COLS = 49;
  const ROWS = 8;
  const DOT_SIZE = 5;
  const DOT_GAP = 7;
  const GRID_WIDTH = COLS * (DOT_SIZE + DOT_GAP);
  const GRID_HEIGHT = ROWS * (DOT_SIZE + DOT_GAP);

  // Derive hasFiles here, as it's used in useEffect and renderDots
  const hasFiles = files && files.length > 0 && files.some(f => f.url.trim() !== '');

  // Generate a static pattern once on mount or when files change
  useEffect(() => {
    const data = [];

    for (let i = 0; i < COLS; i++) {
      const position = i / COLS;
      let intensity = 0;

      if (hasFiles) { // Use the derived hasFiles
        // Generate colored pattern
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
      } else {
        // Generate grey pattern
        intensity = Math.random() * 0.3 + 0.1; // Low intensity grey
      }
      
      data.push(Math.max(0, Math.min(1, intensity)));
    }
    setFrequencyData(data);
  }, [files, hasFiles]); // Add hasFiles to dependency array

  const renderDots = (currentHasFiles: boolean) => { // Accept hasFiles as parameter
    const dots = [];
    
    for (let col = 0; col < COLS; col++) {
      const intensity = frequencyData[col] || 0;
      const activeRows = Math.floor(intensity * ROWS);
      
      for (let row = 0; row < ROWS; row++) {
        const x = col * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;
        const y = (ROWS - 1 - row) * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;
        const isActiveDot = row < activeRows;
        
        let color = '#1a1a1a'; // Default background color for inactive dots
        let opacity = 0.2;
        
        if (currentHasFiles) { // If files are present, use colored logic for active dots
          if (isActiveDot) {
            const baseIntensity = intensity;
            // Color zones based on frequency ranges (for active dots)
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
            // Inactive dots when files are present (subtle grey)
            color = '#404040';
            opacity = 0.1;
          }
        } else { // If no files are present, all dots are shades of grey
          if (isActiveDot) {
            // Active dots, but no files, so grey shades
            color = '#404040'; // A slightly darker grey for active dots
            opacity = Math.min(0.9, 0.3 + intensity * 0.7); // Vary opacity based on intensity
          } else {
            // Inactive dots when no files are present (very subtle grey)
            color = '#404040';
            opacity = 0.05;
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
        display: 'flex', // Add flexbox to center content
        justifyContent: 'center', // Center horizontally
        alignItems: 'center', // Center vertically
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
        {renderDots(hasFiles)} {/* Pass hasFiles to renderDots */}
      </svg>
    </Box>
  );
};

export default ConversationVisualizer;
