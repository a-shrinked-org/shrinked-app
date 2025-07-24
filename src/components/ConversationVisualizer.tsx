import React, { useState, useEffect } from 'react';
import { Box } from '@mantine/core';

interface ConversationVisualizerProps {
  files: Array<{ url: string; filename?: string; type: 'link' | 'upload' | 'download' }>;
  isActive?: boolean;
  extractionSuccess?: {[key: number]: boolean};
}

// Simple string hash function to generate a deterministic seed
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

// Seeded random number generator
const createSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
};

const ConversationVisualizer: React.FC<ConversationVisualizerProps> = ({ files, isActive, extractionSuccess }) => {
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  // Grid configuration
  const COLS = 49;
  const ROWS = 8;
  const DOT_SIZE = 5;
  const DOT_GAP = 7;
  const GRID_WIDTH = COLS * (DOT_SIZE + DOT_GAP);
  const GRID_HEIGHT = ROWS * (DOT_SIZE + DOT_GAP);

  // Derive hasFiles here, as it's used in useEffect and renderDots
  const hasFiles = files && files.length > 0 && files.some((f, i) => f.url.trim() !== '' && (f.type !== 'link' || (extractionSuccess && extractionSuccess[i])));

  // Generate a dynamic pattern based on file data or modal open
  useEffect(() => {
    const data: number[] = new Array(COLS).fill(0);

    if (hasFiles) {
      // Combine file data to create a unique seed
      const fileString = files
        .filter(f => f.url.trim() !== '')
        .map(f => f.url + (f.filename || ''))
        .join('');
      const fileCount = files.filter(f => f.url.trim() !== '').length;
      const seed = simpleHash(fileString) + fileCount;
      const random = createSeededRandom(seed);

      // Generate intensities based on file count and file-specific hash
      for (let i = 0; i < COLS; i++) {
        const position = i / COLS;
        let intensity = 0;

        // Use file count to modulate intensity range
        const fileCountFactor = Math.min(1, fileCount / 3); // Scale intensity with number of files (up to 3)
        
        // Create distinct zones based on position
        if (position < 0.33) {
          // First third: Emphasize first file's hash
          const file = files[0] && files[0].url.trim() !== '' ? files[0] : { url: '', filename: '' };
          const fileSeed = simpleHash(file.url + (file.filename || '')) || 1;
          const fileRandom = createSeededRandom(fileSeed + i);
          intensity = fileRandom() * 0.6 * fileCountFactor + 0.2;
        } else if (position < 0.67) {
          // Middle third: Blend all files
          intensity = random() * 0.5 * fileCountFactor + 0.3;
        } else {
          // Last third: Emphasize last file or random variation
          const file = files[files.length - 1] && files[files.length - 1].url.trim() !== '' 
            ? files[files.length - 1] 
            : { url: '', filename: '' };
          const fileSeed = simpleHash(file.url + (file.filename || '')) || 1;
          const fileRandom = createSeededRandom(fileSeed + i);
          intensity = fileRandom() * 0.7 * fileCountFactor + 0.1;
        }

        data[i] = Math.max(0, Math.min(1, intensity));
      }
    } else {
      // Generate grey pattern for no files, triggered on modal open
      const seed = simpleHash(Date.now().toString() + (isActive ? 'active' : 'inactive'));
      const random = createSeededRandom(seed);
      for (let i = 0; i < COLS; i++) {
        // Slightly increased intensity range for more noticeable variation
        data[i] = random() * 0.5 + 0.1; // Intensity between 0.1 and 0.6
      }
    }

    setFrequencyData(data);
  }, [files, hasFiles, isActive]); // Added isActive to dependencies

  const renderDots = (currentHasFiles: boolean) => {
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
        
        if (currentHasFiles) {
          if (isActiveDot) {
            const baseIntensity = intensity;
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
            color = '#404040';
            opacity = 0.1;
          }
        } else {
          if (isActiveDot) {
            color = '#404040';
            opacity = Math.min(0.9, 0.3 + intensity * 0.7);
          } else {
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
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
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
        {renderDots(hasFiles)}
      </svg>
    </Box>
  );
};

export default ConversationVisualizer;