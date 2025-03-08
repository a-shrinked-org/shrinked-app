// components/GradientLoader.tsx
"use client";

import { Box } from "@mantine/core";
import React from "react";
import { keyframes } from "@emotion/react";

const gradientAnimation = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

interface GradientLoaderProps {
  width?: string | number;
  height?: string | number;
  intervalRate?: number;
  progress?: number;
}

export const GradientLoader: React.FC<GradientLoaderProps> = ({
  width = "100%",
  height = 4,
  intervalRate = 2000,
  progress,
}) => {
  const [currentProgress, setCurrentProgress] = React.useState<number>(progress || 0);

  React.useEffect(() => {
    if (progress !== undefined) {
      setCurrentProgress(progress);
      return;
    }

    const interval = setInterval(() => {
      setCurrentProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 10;
      });
    }, intervalRate / 10);

    return () => clearInterval(interval);
  }, [intervalRate, progress]);

  return (
    <Box
      w={width}
      h={height}
      bg="var(--mantine-color-dark-6)"
      style={{
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        w={`${Math.min(currentProgress, 100)}%`}
        h="100%"
        bg="linear-gradient(90deg, var(--mantine-color-blue-7) 0%, var(--mantine-color-blue-4) 50%, var(--mantine-color-blue-7) 100%)"
        style={{
          backgroundSize: "200% 100%",
          animation: `${gradientAnimation} 2s ease infinite`,
          transition: "width 0.3s ease",
        }}
      />
    </Box>
  );
};

export default GradientLoader;