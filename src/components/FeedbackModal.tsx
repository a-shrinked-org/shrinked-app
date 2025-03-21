// src/components/FeedbackModal.tsx
import React, { useState } from 'react';
import { 
  Modal, 
  Box, 
  Text, 
  Textarea, 
  Button, 
  Group, 
  ActionIcon,
  Radio,
  Stack,
  Flex
} from '@mantine/core';
import { X } from 'lucide-react';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { toast } from 'react-toastify';

interface FeedbackModalProps {
  opened: boolean;
  onClose: () => void;
}

// Rating options with values
const ratings = [
  { value: 'very_unsatisfied', text: 'Very Unsatisfied' },
  { value: 'unsatisfied', text: 'Unsatisfied' },
  { value: 'neutral', text: 'Neutral' },
  { value: 'satisfied', text: 'Satisfied' },
  { value: 'very_satisfied', text: 'Very Satisfied' }
];

export function FeedbackModal({ opened, onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) {
      toast.error('Please select a rating');
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
          rating,
          details,
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
      setRating(null);
      setDetails('');
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

        {/* Rating section */}
        <Text size="md" mb="md" style={{ fontFamily: GeistSans.style.fontFamily }}>
          How was your experience?
        </Text>

        <Radio.Group
          value={rating}
          onChange={setRating}
          name="rating"
          mb="xl"
        >
          <Group grow>
            {ratings.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                label=""
                styles={{
                  root: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: rating === option.value ? '#1A1A1A' : '#0D0D0D',
                    padding: '15px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${rating === option.value ? '#2B2B2B' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2B2B2B',
                    },
                  },
                  radio: {
                    display: 'none', // Hide the actual radio button
                  },
                  inner: {
                    display: 'none',
                  },
                  body: {
                    alignItems: 'center',
                  },
                  label: {
                    marginLeft: 0,
                    paddingLeft: 0,
                    color: '#ffffff',
                    fontFamily: GeistSans.style.fontFamily,
                    fontSize: '14px',
                  },
                }}
              />
            ))}
          </Group>
        </Radio.Group>

        {/* Feedback details section */}
        <Text size="md" mb="xs" style={{ fontFamily: GeistSans.style.fontFamily }}>
          Give us more details
        </Text>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.currentTarget.value)}
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

        {/* Submit button */}
        <Button
          fullWidth
          onClick={handleSubmit}
          loading={isSubmitting}
          styles={{
            root: {
              backgroundColor: '#333333',
              color: '#ffffff',
              height: '44px',
              '&:hover': {
                backgroundColor: '#ffffff',
                color: '#000000',
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