"use client";

import { useGetIdentity } from "@refinedev/core";
import React, { useState, useEffect } from "react";
import { 
  Table, 
  Button, 
  Group, 
  Title, 
  Box,
  Stack,
  Modal,
  Text,
  TextInput,
  LoadingOverlay,
  ActionIcon,
  CopyButton,
  Alert,
  Code
} from '@mantine/core';
import { IconTrash, IconCopy, IconCheck, IconPlus, IconKey } from '@tabler/icons-react';
import { RegenerateApiKeyButton } from '@/components/RegenerateApiKeyButton';
import { ApiKeyService, ApiKey } from '@/services/api-key-service';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  userId?: string;
}

export default function ApiKeysList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { data: identity, isLoading: isIdentityLoading } = useGetIdentity<Identity>();
  
  // Try to get userId from localStorage if not available in identity
  const userId = React.useMemo(() => {
    if (identity?.userId) return identity.userId;
    
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          if (userData.id) return userData.id;
        } catch (e) {
          console.error("Error parsing user data from localStorage", e);
        }
      }
    }
    return null;
  }, [identity?.userId]);

  // Log identity data for debugging
  useEffect(() => {
    if (identity) {
      console.log("Identity from useGetIdentity:", { 
        email: identity.email, 
        userId: identity.userId || "Missing in identity", 
        token: identity.token ? "Present" : "Missing" 
      });
      console.log("userId from calculation:", userId || "Missing");
    }
  }, [identity, userId]);

  // Fetch API Keys
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (!identity?.token) {
        console.log("No token available, skipping API keys fetch");
        return;
      }
  
      setIsLoadingKeys(true);
      setError(null);
  
      try {
        console.log("Fetching API keys from profile...");
        
        // Fetch user profile instead of calling a separate API for keys
        const userProfile = await ApiKeyService.getUserProfile(identity.token);
  
        // Extract API keys from the profile
        const fetchedApiKeys = userProfile.apiKeys || [];
  
        console.log("API keys fetched successfully:", fetchedApiKeys.length, "keys");
        setApiKeys(fetchedApiKeys);
      } catch (error) {
        console.error('Error fetching API keys:', error);
        setApiKeys([]);
        setError("Error fetching API keys. Please try again later.");
      } finally {
        setIsLoadingKeys(false);
      }
    };
  
    if (identity?.token) {
      fetchApiKeys();
    }
  }, [identity?.token]);

  const refreshApiKeys = async () => {
    if (!identity?.token) return;
  
    setIsLoadingKeys(true);
    setError(null);
  
    try {
      // Fetch user profile again to update API keys
      const userProfile = await ApiKeyService.getUserProfile(identity.token);
      setApiKeys(userProfile.apiKeys || []);
    } catch (error) {
      console.error('Error refreshing API keys:', error);
      setApiKeys([]);
      setError("Error refreshing API keys. Please try again later.");
    } finally {
      setIsLoadingKeys(false);
    }
  };
  
  const handleCreateApiKey = async () => {
    if (!keyName) return;
  
    const effectiveUserId = userId || identity?.userId;
  
    if (!effectiveUserId || !identity?.token) {
      console.error("Missing required data for creating API key:", {
        keyName: !!keyName,
        userId: !!effectiveUserId,
        token: !!identity?.token
      });
      setError("Cannot create API key: User ID is missing");
      return;
    }
  
    setIsLoading(true);
    setError(null);
  
    try {
      console.log(`Creating API key for userId: ${effectiveUserId}`);
  
      // Create API key through the profile API
      const newKey = await ApiKeyService.createApiKey(identity.token, effectiveUserId, keyName);
  
      console.log("API key created successfully:", newKey ? "Result received" : "No result returned");
  
      setNewApiKey(newKey.key);
      setIsCreateModalOpen(false);
      setIsModalOpen(true);
  
      // Refresh the API keys list
      refreshApiKeys();
    } catch (error) {
      console.error("Error creating API key:", error);
      setError(`Error creating API key: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteApiKey = async (keyId: string) => {
    if (!identity?.token) return;
  
    try {
      // Use the API to delete the key from the user's profile
      await ApiKeyService.deleteApiKey(identity.token, keyId);
  
      // Refresh the API keys list
      refreshApiKeys();
    } catch (error) {
      console.error("Error deleting API key:", error);
      setError(`Error deleting API key: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const closeSuccessModal = () => {
    setIsModalOpen(false);
    setNewApiKey(null);
    setKeyName("");
  };

  if (isIdentityLoading) {
    return (
      <Box p="md">
        <LoadingOverlay visible />
        <Text>Loading authentication...</Text>
      </Box>
    );
  }

  if (!identity?.token) {
    return (
      <Box p="md">
        <Alert color="red" title="Authentication Required">
          You must be logged in to manage API keys.
        </Alert>
      </Box>
    );
  }

  // Check if we can create keys (need key name and token)
  const canCreateKey = !!(keyName && identity?.token);

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <Title order={2}>API Keys</Title>
        <Button 
          leftSection={<IconPlus size={16} />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create API Key
        </Button>
      </Group>

      {error && (
        <Alert color="red" title="Error" mb="md" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      <Box style={{ overflowX: 'auto' }}>
        <LoadingOverlay visible={isLoadingKeys} />
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ background: 'none', fontWeight: 500, color: '#666', padding: '12px 16px', textTransform: 'uppercase', fontSize: '12px' }}>
                NAME
              </Table.Th>
              <Table.Th style={{ background: 'none', fontWeight: 500, color: '#666', padding: '12px 16px', textTransform: 'uppercase', fontSize: '12px' }}>
                API KEY
              </Table.Th>
              <Table.Th style={{ background: 'none', fontWeight: 500, color: '#666', padding: '12px 16px', textTransform: 'uppercase', fontSize: '12px' }}>
                CREATED AT
              </Table.Th>
              <Table.Th style={{ background: 'none', fontWeight: 500, color: '#666', padding: '12px 16px', textTransform: 'uppercase', fontSize: '12px' }}>
                ACTIONS
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {!isLoadingKeys && apiKeys.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4} align="center">
                  <Text p="md">No API keys found. Create one to get started.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              apiKeys.map((key) => (
                <Table.Tr key={key.id}>
                  <Table.Td>
                    <Group>
                      <IconKey size={16} />
                      <Text>{key.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group>
                      <Code>{key.key.length > 16 ? 
                        `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 8)}` : 
                        key.key}</Code>
                      <CopyButton value={key.key} timeout={2000}>
                        {({ copied, copy }) => (
                          <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy} variant="subtle">
                            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          </ActionIcon>
                        )}
                      </CopyButton>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {new Intl.DateTimeFormat('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit'
                    }).format(new Date(key.createdAt))}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {/* Updated property name from apiKeyId to keyId */}
                      <RegenerateApiKeyButton 
                        keyId={key.id} 
                        token={identity.token || ""} 
                        onSuccess={refreshApiKeys}
                      />
                      <ActionIcon 
                        color="red" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteApiKey(key.id);
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Box>

      {/* Create API Key Modal */}
      <Modal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create API Key"
      >
        <LoadingOverlay visible={isLoading} />
        <Stack gap="md">
          <Text size="sm">
            Give your API key a name to help you identify it later.
          </Text>
          <TextInput
            label="API Key Name"
            placeholder="e.g., Development, Production"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateApiKey} disabled={!canCreateKey}>Create</Button>
          </Group>
        </Stack>
      </Modal>

      {/* API Key Created Success Modal */}
      <Modal
        opened={isModalOpen}
        onClose={closeSuccessModal}
        title="Save your API key"
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
            I&apos;ve saved my API key
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
