"use client";

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import DocumentsTable from '@/components/shared/DocumentsTable';
import { Modal, Box, Text, Textarea, Button, Flex, ActionIcon } from '@mantine/core';
import { X } from 'lucide-react';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { toast } from 'react-toastify';

// Format date function to match the expected format in DocumentsTable
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// NotifyModal component
function NotifyModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [message, setMessage] = useState('I would like to be notified when Scheduled Jobs feature is available.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasMessage = message.trim().length > 0;

  const handleSubmit = async () => {
    if (!hasMessage) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/send-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
          email: 'cherepukhin@damn.vc'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send notification request');
      }

      toast.success('Notification request submitted successfully');
      setMessage('I would like to be notified when Scheduled Jobs feature is available.');
      onClose();
    } catch (error) {
      console.error('Error submitting notification request:', error);
      toast.error('Failed to submit request. Please try again.');
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
        header: { display: 'none' },
        body: {
          backgroundColor: '#000000',
          color: '#ffffff',
          padding: '22px 30px',
        },
        inner: { padding: 0 },
        content: {
          maxWidth: '520px',
          borderRadius: '10px',
          border: '0.5px solid #2B2B2B',
          overflow: 'hidden',
        },
      }}
    >
      <Box>
        <Flex justify="space-between" align="center" mb="16px">
          <Text fw={500} size="md" style={{ fontFamily: GeistMono.style.fontFamily }}>
            NOTIFY ME
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

        <Text size="md" mb="xs" style={{ fontFamily: GeistSans.style.fontFamily }}>
          Let us know you’re interested
        </Text>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          placeholder="Enter your message"
          minRows={6}
          mb="lg"
          autosize
          maxRows={12}
          styles={{
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

export default function ScheduledJobs() {
  const [notifyModalOpened, setNotifyModalOpened] = useState(false);

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <DocumentsTable
        data={[]}
        formatDate={formatDate}
        title="SCHEDULED JOBS"
        comingSoon={true}
        comingSoonConfig={{
          icon: <Calendar size={48} color="#F5A623" />,
          title: "Scheduled Jobs",
          description: "Create automated processing schedules to run your jobs at specific times. Set up recurring tasks and let Shrinked handle the timing.",
          buttonText: "NOTIFY ME",
          buttonAction: () => setNotifyModalOpened(true)
        }}
      />
      <NotifyModal
        opened={notifyModalOpened}
        onClose={() => setNotifyModalOpened(false)}
      />
    </div>
  );
}