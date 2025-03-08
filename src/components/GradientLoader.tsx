// components/GradientLoader.tsx
"use client";

import { Box } from "@mantine/core";
import React from "react";
import { keyframes } from "@emotion/react";

// Define the gradient animation
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
  intervalRate?: number; // Animation speed in ms
  progress?: number; // Optional fixed progress (0-100)
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
    }, intervalRate / 10); // Divide by 10 for smoother steps

    return () => clearInterval(interval);
  }, [intervalRate, progress]);

  return (
    <Box
      sx={{
        width,
        height,
        background: "var(--mantine-color-dark-6)", // Base background from your theme
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: `${Math.min(currentProgress, 100)}%`,
          height: "100%",
          background: "linear-gradient(90deg, var(--mantine-color-blue-7) 0%, var(--mantine-color-blue-4) 50%, var(--mantine-color-blue-7) 100%)",
          backgroundSize: "200% 100%",
          animation: `${gradientAnimation} 2s ease infinite`,
          transition: "width 0.3s ease",
        }}
      />
    </Box>
  );
};

export default GradientLoader;