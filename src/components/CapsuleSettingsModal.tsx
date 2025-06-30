import React, { useState, useEffect } from 'react';
import {
  Text,
  Box,
  Group,
  Button,
  LoadingOverlay,
  ActionIcon,
  Flex,
  Modal,
  TextInput,
} from '@mantine/core';
import { X } from 'lucide-react';
import { useAuth } from "@/utils/authUtils";
import { notifications } from '@mantine/notifications';

interface CapsuleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  capsuleId: string;
  capsuleName: string;
  capsuleSlug: string;
  onUpdateSuccess: () => void;
}

const IS_DEV = process.env.NODE_ENV === 'development';

const CapsuleSettingsModal: React.FC<CapsuleSettingsModalProps> = ({
  isOpen,
  onClose,
  capsuleId,
  capsuleName,
  capsuleSlug,
  onUpdateSuccess,
}) => {
  const { fetchWithAuth, handleAuthError } = useAuth();
  const [name, setName] = useState(capsuleName);
  const [slug, setSlug] = useState(capsuleSlug);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(capsuleName);
    setSlug(capsuleSlug);
  }, [capsuleName, capsuleSlug]);

  const formatErrorMessage = (error: any): string => {
    if (!error) return "An unknown error occurred";
    const status = error?.status ?? error?.statusCode ?? error?.response?.status;
    const message = error?.message || "An unexpected error occurred";
    if (status === 401 || status === 403) return "Your session has expired. Please log in again.";
    if (status === 404) return "The requested resource was not found.";
    if (status >= 500) return "The server encountered an error. Please try again later.";
    return message;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetchWithAuth(`/api/capsule/${capsuleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update capsule: ${response.status}`);
      }

      notifications.show({
        title: 'Capsule Updated',
        message: 'Capsule settings saved successfully.',
        color: 'green',
      });
      onUpdateSuccess();
      onClose();
    } catch (error) {
      if (IS_DEV) console.error('Failed to update capsule settings:', error);
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
      notifications.show({
        title: 'Error',
        message: formatErrorMessage(error),
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      withCloseButton={false}
      title={null}
      centered
      size="lg"
      styles={{
        body: {
          backgroundColor: '#000000',
          color: '#ffffff',
          padding: '22px 30px',
        },
        inner: {
          padding: 0,
        },
        content: {
          maxWidth: '700px',
          borderRadius: '10px',
          border: '0.5px solid #2B2B2B',
          overflow: 'hidden',
        },
      }}
    >
      <Box>
        <Flex justify="space-between" align="center" mb="16px">
          <Text fw={500} size="md">
            Capsule Settings
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

        {errorMessage && (
          <Text color="red" size="sm" mb="md">
            {errorMessage}
          </Text>
        )}

        <TextInput
          label="Capsule Name"
          placeholder="Enter capsule name"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          mb="md"
          styles={{
            label: { color: '#A1A1A1' },
            input: {
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              border: '1px solid #2B2B2B',
              '&:focus-within': {
                borderColor: '#F5A623',
              },
            },
          }}
        />

        <TextInput
          label="Capsule Slug"
          placeholder="Enter capsule slug"
          value={slug}
          onChange={(event) => setSlug(event.currentTarget.value)}
          mb="lg"
          styles={{
            label: { color: '#A1A1A1' },
            input: {
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              border: '1px solid #2B2B2B',
              '&:focus-within': {
                borderColor: '#F5A623',
              },
            },
          }}
        />

        <Group justify="flex-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Save Changes
          </Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default CapsuleSettingsModal;
