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
  Code,
} from "@mantine/core";
// Replace Tabler icons with Lucide icons
import {
  Trash,
  Copy,
  Check,
  Plus,
  Key,
} from 'lucide-react';
import { RegenerateApiKeyButton } from "@/components/RegenerateApiKeyButton";
import { ApiKeyService, ApiKey } from "@/services/api-key-service";
// Import centralized auth utilities
import { authUtils, API_CONFIG } from "@/utils/authUtils";

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

  const { data: identity, isLoading: isIdentityLoading } =
    useGetIdentity<Identity>();

  const userId = React.useMemo(() => {
    if (identity?.userId) return identity.userId;

    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          if (userData.id || userData.userId || userData._id) {
            return userData.id || userData.userId || userData._id;
          }
        } catch (e) {
          console.error("Error parsing user data from localStorage", e);
        }
      }
    }
    return null;
  }, [identity?.userId]);

  useEffect(() => {
    if (identity) {
      console.log("Identity from useGetIdentity:", {
        email: identity.email,
        userId: identity.userId || "Missing in identity",
        token: identity.token ? "Present" : "Missing",
      });
      console.log("userId from calculation:", userId || "Missing");
    }
  }, [identity, userId]);

  useEffect(() => {
    const fetchApiKeys = async () => {
      // Use centralized token management
      const token = authUtils.getAccessToken() || identity?.token;
      
      if (!token) {
        console.log("No token available, skipping API keys fetch");
        return;
      }

      setIsLoadingKeys(true);
      setError(null);

      try {
        console.log("Fetching API keys...");
        const fetchedApiKeys = await ApiKeyService.getApiKeys(token);
        console.log("API keys fetched successfully:", fetchedApiKeys.length, "keys");
        setApiKeys(fetchedApiKeys);
      } catch (error) {
        console.error("Error fetching API keys:", error);
        
        // Try token refresh on auth errors
        if (error instanceof Error && error.message.includes("401") || error.message.includes("403")) {
          const refreshSuccess = await authUtils.refreshToken();
          if (refreshSuccess) {
            // Retry with new token
            const newToken = authUtils.getAccessToken();
            if (newToken) {
              try {
                const fetchedApiKeys = await ApiKeyService.getApiKeys(newToken);
                setApiKeys(fetchedApiKeys);
                return;
              } catch (retryError) {
                console.error("Error fetching API keys after token refresh:", retryError);
              }
            }
          }
        }
        
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
    // Use centralized token management
    const token = authUtils.getAccessToken() || identity?.token;
    
    if (!token) return;

    setIsLoadingKeys(true);
    setError(null);

    try {
      const fetchedApiKeys = await ApiKeyService.getApiKeys(token);
      setApiKeys(fetchedApiKeys);
    } catch (error) {
      console.error("Error refreshing API keys:", error);
      
      // Try token refresh on auth errors
      if (error instanceof Error && (error.message.includes("401") || error.message.includes("403"))) {
        const refreshSuccess = await authUtils.refreshToken();
        if (refreshSuccess) {
          // Retry with new token
          const newToken = authUtils.getAccessToken();
          if (newToken) {
            try {
              const fetchedApiKeys = await ApiKeyService.getApiKeys(newToken);
              setApiKeys(fetchedApiKeys);
              return;
            } catch (retryError) {
              console.error("Error fetching API keys after token refresh:", retryError);
            }
          }
        }
      }
      
      setApiKeys([]);
      setError("Error refreshing API keys. Please try again later.");
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!keyName) return;

    const effectiveUserId = userId || identity?.userId;
    // Use centralized token management
    const token = authUtils.getAccessToken() || identity?.token;

    if (!effectiveUserId || !token) {
      console.error("Missing required data for creating API key:", {
        keyName: !!keyName,
        userId: !!effectiveUserId,
        token: !!token,
      });
      setError("Cannot create API key: User ID is missing");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Creating API key for userId: ${effectiveUserId}`);
      const newKey = await ApiKeyService.createApiKey(token, effectiveUserId, keyName);
      console.log("API key created successfully:", newKey ? "Result received" : "No result returned");

      setNewApiKey(newKey.key);
      setIsCreateModalOpen(false);
      setIsModalOpen(true);

      refreshApiKeys();
    } catch (error) {
      console.error("Error creating API key:", error);
      
      // Try token refresh on auth errors
      if (error instanceof Error && (error.message.includes("401") || error.message.includes("403"))) {
        const refreshSuccess = await authUtils.refreshToken();
        if (refreshSuccess) {
          // Retry with new token
          try {
            const newToken = authUtils.getAccessToken();
            if (newToken && effectiveUserId) {
              const newKey = await ApiKeyService.createApiKey(newToken, effectiveUserId, keyName);
              setNewApiKey(newKey.key);
              setIsCreateModalOpen(false);
              setIsModalOpen(true);
              refreshApiKeys();
              return;
            }
          } catch (retryError) {
            console.error("Error creating API key after token refresh:", retryError);
          }
        }
      }
      
      setError(`Error creating API key: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    // Use centralized token management
    const token = authUtils.getAccessToken() || identity?.token;
    
    if (!token) return;

    try {
      await ApiKeyService.deleteApiKey(token, keyId);
      refreshApiKeys();
    } catch (error) {
      console.error("Error deleting API key:", error);
      
      // Try token refresh on auth errors
      if (error instanceof Error && (error.message.includes("401") || error.message.includes("403"))) {
        const refreshSuccess = await authUtils.refreshToken();
        if (refreshSuccess) {
          // Retry with new token
          const newToken = authUtils.getAccessToken();
          if (newToken) {
            try {
              await ApiKeyService.deleteApiKey(newToken, keyId);
              refreshApiKeys();
              return;
            } catch (retryError) {
              console.error("Error deleting API key after token refresh:", retryError);
            }
          }
        }
      }
      
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

  // Use centralized token management
  const token = authUtils.getAccessToken() || identity?.token;
  
  if (!token) {
    return (
      <Box p="md">
        <Alert color="red" title="Authentication Required">
          You must be logged in to manage API keys.
        </Alert>
      </Box>
    );
  }

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <Title order={2}>API Keys</Title>
        <Button leftSection={<Plus size={16} />} onClick={() => setIsCreateModalOpen(true)}>
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
                ACTIONS
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {!isLoadingKeys && apiKeys.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={3} align="center">
                  <Text p="md">No API keys found. Create one to get started.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              apiKeys.map((key) => (
                <Table.Tr key={key.id}>
                  <Table.Td>
                    <Group>
                      <Key size={16} />
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
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                          </ActionIcon>
                        )}
                      </CopyButton>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <RegenerateApiKeyButton
                        apiKeyId={key.id}
                        onSuccess={refreshApiKeys}
                      />
                      <ActionIcon 
                        color="red" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteApiKey(key.id);
                        }}
                      >
                        <Trash size={16} />
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
            <Button onClick={handleCreateApiKey} disabled={!keyName}>Create</Button>
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
                  leftSection={copied ? <Check size={16} /> : <Copy size={16} />}
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