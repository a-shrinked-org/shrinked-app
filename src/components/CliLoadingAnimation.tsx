import React, { useState, useEffect } from 'react';
import { Box, Text, Progress, Stack } from '@mantine/core';
import { GeistMono } from 'geist/font/mono';

interface CliLoadingAnimationProps {
  message: string;
  progress?: number; // 0-100
}

const CliLoadingAnimation: React.FC<CliLoadingAnimationProps> = ({
  message,
  progress = 0,
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + '.' : ''));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const progressBar = '# ' + message + dots;

  return (
    <Stack align="flex-start" justify="flex-start" style={{ width: '100%', padding: '20px' }}>
      <Text
        style={{
          fontFamily: GeistMono.style.fontFamily,
          color: '#3DC28B', // Green for terminal feel
          fontSize: '14px',
          whiteSpace: 'pre-wrap',
        }}
      >
        {progressBar}
      </Text>
      <Progress
        value={progress}
        size="sm"
        radius="xs"
        color="#F5A623"
        styles={{
          root: { backgroundColor: '#2B2B2B', width: '100%' },
        }}
      />
    </Stack>
  );
};

export default CliLoadingAnimation;