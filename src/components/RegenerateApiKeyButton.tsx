import React, { useState } from 'react';
import { 
  ActionIcon, 
  Tooltip, 
  Modal, 
  Text, 
  Group, 
  Button, 
  Box,
  Alert,
  Code,
  CopyButton,
  LoadingOverlay
} from '@mantine/core';
import { IconRefresh, IconCopy, IconCheck } from '@tabler/icons-react';
import { useGetIdentity } from "@refinedev/core";

// Update interface to match how it's being used in page.tsx
interface RegenerateApiKeyButtonProps {
  apiKeyId: string;
  onSuccess?: () => void;
}

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  userId?: string;
}

export const RegenerateApiKeyButton: React.FC<RegenerateApiKeyButtonProps> = ({ 
  apiKeyId,  // Now using apiKeyId
  onSuccess 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get the identity to retrieve the token
  const { data: identity } = useGetIdentity<Identity>();

  const handleRegenerateApiKey = async () => {
    if (!identity?.token) {
      console.error("No authentication token available");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Using the correct endpoint from Postman collection with apiKeyId
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/api-key/${apiKeyId}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${identity.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error regenerating API key: ${response.status}`);
      }
      
      const result = await response.json();
      setNewApiKey(result.key);
      setIsConfirmModalOpen(false);
      setIsModalOpen(true);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error regenerating API key:", error);
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
      <Tooltip label="Regenerate API Key">
        <ActionIcon 
          color="blue" 
          onClick={(e) => {
            e.stopPropagation();
            setIsConfirmModalOpen(true);
          }}
        >
          <IconRefresh size={16} />
        </ActionIcon>
      </Tooltip>

      {/* Confirm Regenerate Modal */}
      <Modal
        opened={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Regenerate API Key"
      >
        <LoadingOverlay visible={isLoading} />
        <Text mb="md">
          Are you sure you want to regenerate this API key? This will invalidate the existing key and create a new one.
        </Text>
        <Text mb="lg" c="red" fw={500}>
          This action cannot be undone. All applications using this key will need to be updated.
        </Text>
        <Group justify="flex-end">
          <Button variant="light" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
          <Button color="red" onClick={handleRegenerateApiKey}>Regenerate</Button>
        </Group>
      </Modal>

      {/* API Key Regenerated Success Modal */}
      <Modal
        opened={isModalOpen}
        onClose={closeSuccessModal}
        title="Save your new API key"
        size="lg"
      >
        <Alert title="Important!" color="red" mb="md">
          Keep a record of the key below. You won&apos;t be able to view it again.
        </Alert>
        
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
                  leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Box>
        
        <Text size="sm" mt="lg">
          You can use this API key to authenticate with the Shrinked API.
          To use it, include it in the <Code>x-api-key</Code> header in your requests.
        </Text>
        
        <Group justify="center" mt="xl">
          <Button onClick={closeSuccessModal}>
            I&apos;ve saved my new API key
          </Button>
        </Group>
      </Modal>
    </>
  );
};