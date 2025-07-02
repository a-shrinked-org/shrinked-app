import { Modal, Button, Text, Group } from '@mantine/core';
import React from 'react';
import { UseFormReturn } from 'react-hook-form';

interface ConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  form?: UseFormReturn<any>;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'red',
  form,
}) => {
  const { handleSubmit, register } = form || {};

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      styles={{
        header: {
          backgroundColor: '#000000',
          color: '#ffffff',
          borderBottom: '1px solid #2B2B2B',
        },
        body: {
          backgroundColor: '#000000',
          color: '#ffffff',
        },
        content: {
          borderRadius: '10px',
          border: '0.5px solid #2B2B2B',
          overflow: 'hidden',
        },
      }}
    >
      <form onSubmit={handleSubmit ? handleSubmit(onConfirm) : (e) => { e.preventDefault(); onConfirm({}); }}>
        {message && <Text size="sm">{message}</Text>}
        {children}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            {cancelText}
          </Button>
          <Button color={confirmColor} type="submit">
            {confirmText}
          </Button>
        </Group>
      </form>
    </Modal>
  );
};