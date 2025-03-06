"use client";

import React from 'react';

// Fix SVG rendering for Lucide icons by creating a styled wrapper component
export const IconWrapper = ({ icon: Icon, size = 16, color }) => (
  <Icon 
	size={size} 
	style={{ 
	  width: `${size}px`, 
	  height: `${size}px`,
	  color: color || 'currentColor' 
	}} 
  />
);