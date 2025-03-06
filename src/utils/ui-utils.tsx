"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

// Define proper TypeScript interface for props
interface IconWrapperProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
}

// Fix SVG rendering for Lucide icons by creating a styled wrapper component
export const IconWrapper: React.FC<IconWrapperProps> = ({ 
  icon: Icon, 
  size = 16, 
  color 
}) => (
  <Icon
	size={size}
	style={{
	  width: `${size}px`,
	  height: `${size}px`,
	  color: color || 'currentColor'
	}}
  />
);