// src/components/UserAvatar.tsx
import React from 'react';
import { Avatar, createStyles } from '@mantine/core';
import { GeistMono } from 'geist/font/mono';

interface UserAvatarProps {
  name?: string | null;
  src?: string | null;
  size?: number | string;
  radius?: number | string;
  className?: string;
  onClick?: () => void;
}

const useStyles = createStyles((theme) => ({
  avatar: {
    backgroundColor: '#000',
    color: theme.white,
    fontFamily: GeistMono.style.fontFamily,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#222',
    },
  },
  initialsText: {
    fontFamily: GeistMono.style.fontFamily,
    fontSize: '14px',
    lineHeight: 1,
    letterSpacing: '0.02em',
    fontWeight: 500,
  },
}));

export function UserAvatar({ name, src, size = 40, radius = '50%', className = '', onClick }: UserAvatarProps) {
  const { classes, cx } = useStyles();
  
  // Generate initials from the name (max 2 characters)
  const getInitials = (name?: string | null): string => {
    if (!name) return '?';
    
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  
  const initials = getInitials(name);
  
  return (
    <Avatar
      src={src}
      alt={name || 'User'}
      size={size}
      radius={radius}
      className={cx(classes.avatar, className)}
      onClick={onClick}
    >
      <span className={classes.initialsText}>{initials}</span>
    </Avatar>
  );
}

export default UserAvatar;