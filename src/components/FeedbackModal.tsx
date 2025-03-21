// src/components/FeedbackModal.tsx
import React, { useState } from 'react';
import { 
  Modal, 
  Box, 
  Text, 
  Textarea, 
  Button, 
  Flex,
  ActionIcon
} from '@mantine/core';
import { X } from 'lucide-react';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { toast } from 'react-toastify';

interface FeedbackModalProps {
  opened: boolean;
  onClose: () => void;
}

export function FeedbackModal({ opened, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasMessage = message.trim().length > 0;

  const handleSubmit = async () => {
    if (!hasMessage) {
      toast.error('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);

    try {
      // Send feedback via API
      const response = await fetch('/api/send-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
          email: 'cherepukhin@damn.vc' // Target email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit feedback');
      }

      // Show success toast
      toast.success('Feedback submitted successfully');
      
      // Reset form and close modal
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      title={null}
      centered
      styles={{
        header: {
          display: 'none',
        },
        body: {
          backgroundColor: '#000000',
          color: '#ffffff',
          padding: '22px 30px',
        },
        inner: {
          padding: 0,
        },
        content: {
          maxWidth: '520px',
          borderRadius: '10px',
          border: '0.5px solid #2B2B2B',
          overflow: 'hidden',
        },
      }}
    >
      <Box>
        {/* Custom header with properly aligned title and close button */}
        <Flex justify="space-between" align="center" mb="16px">
          <Text fw={500} size="md" style={{ fontFamily: GeistMono.style.fontFamily }}>
            SUBMIT FEEDBACK
          </Text>
          <ActionIcon
            onClick={onClose}
            variant="transparent"
            color="#ffffff"
            style={{ marginRight: '-10px', marginTop: '-10px' }}
          >
            <X size={18} />
          </ActionIcon>
        </Flex>

        {/* Feedback message section */}
        <Text size="md" mb="xs" style={{ fontFamily: GeistSans.style.fontFamily }}>
          Share your thoughts with us
        </Text>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          placeholder="How can we improve your experience?"
          minRows={6}
          mb="lg"
          autosize
          maxRows={12}
          styles={{
            root: {
              marginBottom: '20px',
            },
            input: {
              backgroundColor: '#0D0D0D',
              border: '0.5px solid #2B2B2B',
              borderRadius: '6px',
              color: '#ffffff',
              fontFamily: GeistSans.style.fontFamily,
              fontSize: '14px',
              padding: '12px',
              '&:focus': {
                borderColor: '#3B3B3B',
              },
            },
          }}
        />

        {/* Help text */}
        <Text mb="xl" size="sm" c="#A1A1A1" style={{ fontFamily: GeistSans.style.fontFamily }}>
          Need help instead? Visit{' '}
          <Text
            component="a"
            href="https://shrinked.ai/support"
            target="_blank"
            c="#ffffff"
            style={{ textDecoration: 'underline' }}
          >
            Help & Support
          </Text>
        </Text>

        {/* Submit button - turns yellow when there's text */}
        <Button
          fullWidth
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!hasMessage}
          styles={{
            root: {
              backgroundColor: hasMessage ? '#EAA944' : '#333333',
              color: hasMessage ? '#000000' : '#ffffff',
              height: '44px',
              '&:hover': {
                backgroundColor: hasMessage ? '#FFBD57' : '#444444',
                color: hasMessage ? '#000000' : '#ffffff',
              },
              transition: 'all 0.2s ease',
              fontFamily: GeistMono.style.fontFamily,
              fontWeight: 500,
              fontSize: '14px',
            },
          }}
        >
          SUBMIT
        </Button>
      </Box>
    </Modal>
  );
}

export default FeedbackModal;