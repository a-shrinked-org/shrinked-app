import React, { useState } from 'react';
import { Button, Modal, Text, Stack, Group, LoadingOverlay, Code, CopyButton, Box, Alert } from '@mantine/core';
import { ApiKeyService } from '@/services/api-key-service';
import { RefreshCw, Check, Copy } from 'lucide-react';
import { useGetIdentity } from '@refinedev/core';
import { authUtils } from '@/utils/authUtils';

// Define the identity interface to match your system
interface Identity {
  token?: string;
  email?: string;
  name?: string;
  userId?: string;
}

interface RegenerateApiKeyButtonProps {
  apiKeyId: string;
  onSuccess?: () => void;
}

export const RegenerateApiKeyButton: React.FC<RegenerateApiKeyButtonProps> = ({ 
  apiKeyId, 
  onSuccess 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Properly type the identity data
  const { data: identity } = useGetIdentity<Identity>();

  const handleRegenerateApiKey = async () => {
    // Use centralized token management
    const token = authUtils.getAccessToken() || identity?.token;
    
    if (!token) {
      setError("Authentication required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const regeneratedKey = await ApiKeyService.regenerateApiKey(token, apiKeyId);
      setNewApiKey(regeneratedKey.key);
      setIsConfirmModalOpen(false);
      setIsModalOpen(true);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      console.error("Error regenerating API key:", error);
      setError(`Error regenerating API key: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const closeSuccessModal = () => {
    setIsModalOpen(false);
    setNewApiKey(null);
  };

  return (
    <>
      <Button 
        size="xs"
        variant="light"
        leftSection={<RefreshCw size={14} />}
        onClick={() => setIsConfirmModalOpen(true)}
      >
        Regenerate
      </Button>

      {/* Confirmation Modal */}
      <Modal
        opened={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Regenerate API Key"
      >
        <LoadingOverlay visible={isLoading} />
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to regenerate this API key? The current key will become invalid immediately.
          </Text>
          
          <Alert color="yellow" title="Warning">
            All applications using this key will need to be updated with the new key.
          </Alert>
          
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setIsConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleRegenerateApiKey}>
              Regenerate Key
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* New Key Modal */}
      <Modal
        opened={isModalOpen}
        onClose={closeSuccessModal}
        title="Save your new API key"
        size="lg"
      >
        <Alert title="Important!" color="red" mb="md">
          Keep a record of the new key below. You won&apos;t be able to view it again.
        </Alert>
        
        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}
        
        <Box p="md" bg="gray.1" style={{ borderRadius: '4px' }}>
          <Group justify="apart">
            <Code style={{ fontSize: '14px', wordBreak: 'break-all' }}>
              {newApiKey}
            </Code>
            <CopyButton value={newApiKey || ""} timeout={2000}>
              {({ copied, copy }) => (
                <Button 
                  size="xs"
                  color={copied ? 'teal' : 'blue'} 
                  onClick={copy}
                  leftSection={copied ? <Check size={16} /> : <Copy size={16} />}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Box>
        
        <Text size="sm" mt="lg">
          You will need to update all applications that use the old key.
        </Text>
        
        <Group justify="center" mt="xl">
          <Button onClick={closeSuccessModal}>
            I&apos;ve saved my API key
          </Button>
        </Group>
      </Modal>
    </>
  );
};