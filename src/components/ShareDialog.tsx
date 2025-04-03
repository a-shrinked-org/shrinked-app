// src/components/ShareDialog.tsx
import React, { useState } from 'react';
import { 
  Dialog, 
  TextInput, 
  Button, 
  Group, 
  Text, 
  CopyButton, 
  Tooltip, 
  ActionIcon,
  Box,
  Stack
} from '@mantine/core';
import { Copy, Check, Twitter, Facebook, Linkedin, Mail } from 'lucide-react';
import { GeistMono } from 'geist/font/mono';

interface ShareDialogProps {
  opened: boolean;
  onClose: () => void;
  shareUrl: string | null;
  documentTitle: string;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ 
  opened, 
  onClose, 
  shareUrl, 
  documentTitle 
}) => {
  const [copied, setCopied] = useState(false);
  const fullShareUrl = shareUrl ? window.location.origin + shareUrl : '';
  
  const handleSocialShare = (platform: string) => {
    let shareLink = '';
    const encodedUrl = encodeURIComponent(fullShareUrl);
    const encodedTitle = encodeURIComponent(documentTitle);
    
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'email':
        shareLink = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
        break;
    }
    
    if (shareLink) {
      window.open(shareLink, '_blank');
    }
  };
  
  return (
    <Dialog
      opened={opened}
      withCloseButton
      onClose={onClose}
      size="lg"
      radius="md"
      position={{ top: 20, left: 20 }}
      styles={{
        root: {
          backgroundColor: '#131313',
          border: '1px solid #2b2b2b',
          color: '#ffffff',
        },
        closeButton: {
          color: '#a1a1a1',
          '&:hover': {
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
          },
        },
      }}
    >
      <Box mb="md">
        <Text 
          size="lg" 
          fw={700}
          style={{
            fontFamily: 'Geist, sans-serif'
          }}
          mb="md"
        >
          Share Document
        </Text>
        
        <Text size="sm" c="dimmed" mb="md">
          Copy the link below to share this document:
        </Text>
        
        <Group mb="md">
          <TextInput
            style={{ flex: 1 }}
            value={fullShareUrl}
            readOnly
            styles={{
              input: {
                backgroundColor: '#1a1a1a',
                color: '#ffffff',
                border: '1px solid #2b2b2b',
                fontFamily: GeistMono.style.fontFamily,
                '&:focus': {
                  borderColor: '#4863f7',
                },
              },
            }}
          />
          <CopyButton value={fullShareUrl} timeout={2000}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="right">
                <ActionIcon 
                  color={copied ? 'teal' : 'blue'} 
                  onClick={copy}
                  styles={{
                    root: {
                      backgroundColor: copied ? '#164e45' : '#172554',
                      color: copied ? '#4ade80' : '#3b82f6',
                      '&:hover': {
                        backgroundColor: copied ? '#115e59' : '#1e3a8a',
                      },
                    },
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
        
        <Box mb="md">
          <Text size="sm" c="dimmed" mb="sm">
            Or share directly to:
          </Text>
          
          <Group>
            <ActionIcon 
              variant="filled" 
              onClick={() => handleSocialShare('twitter')}
              styles={{
                root: {
                  backgroundColor: '#1DA1F2',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#0c85d0',
                  },
                },
              }}
            >
              <Twitter size={16} />
            </ActionIcon>
            <ActionIcon 
              variant="filled" 
              onClick={() => handleSocialShare('facebook')}
              styles={{
                root: {
                  backgroundColor: '#4267B2',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#365899',
                  },
                },
              }}
            >
              <Facebook size={16} />
            </ActionIcon>
            <ActionIcon 
              variant="filled" 
              onClick={() => handleSocialShare('linkedin')}
              styles={{
                root: {
                  backgroundColor: '#0077B5',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#006699',
                  },
                },
              }}
            >
              <Linkedin size={16} />
            </ActionIcon>
            <ActionIcon 
              variant="filled" 
              onClick={() => handleSocialShare('email')}
              styles={{
                root: {
                  backgroundColor: '#666666',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#555555',
                  },
                },
              }}
            >
              <Mail size={16} />
            </ActionIcon>
          </Group>
        </Box>
        
        <Text size="xs" c="dimmed" mt="md">
          Anyone with this link can view this document
        </Text>
      </Box>
    </Dialog>
  );
};

export default ShareDialog;