import React from 'react';
import {
  Modal,
  Button,
  Group,
  Text,
  Stack,
  Box
} from '@mantine/core';
import { GeistMono } from 'geist/font/mono';

interface ConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export default function ConfirmationModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
}: ConfirmationModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      styles={{
        header: { backgroundColor: '#000000', color: '#ffffff', borderBottom: '1px solid #2b2b2b' },
        body: { backgroundColor: '#000000', color: '#ffffff' },
        close: { color: '#ffffff' },
      }}
    >
      <Stack gap="md">
        <Text size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>
          {message}
        </Text>
        <Group justify="flex-end">
          <Button
            variant="outline"
            onClick={onClose}
            styles={{
              root: {
                borderColor: '#2b2b2b',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#1a1a1a',
                },
              },
            }}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            styles={{
              root: {
                backgroundColor: '#F5A623',
                color: '#000000',
                fontFamily: GeistMono.style.fontFamily,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                '&:hover': {
                  backgroundColor: '#E09612',
                },
              },
            }}
          >
            {confirmText}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
