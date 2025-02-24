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

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  userId?: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  userId: string;
}

export default function ApiKeysList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  
  const { data: identity } = useGetIdentity<Identity>();

  // Fetch API Keys manually 
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (!identity?.token) return;
      
      setIsLoadingKeys(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/api-keys`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${identity.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setApiKeys(data.data || data || []);
        } else {
          console.log('No API keys found or unauthorized');
          setApiKeys([]);
        }
      } catch (error) {
        console.error('Error fetching API keys:', error);
        setApiKeys([]);
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
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/api-keys`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${identity.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data || data || []);
      } else {
        console.log('No API keys found or unauthorized');
        setApiKeys([]);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setApiKeys([]);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!keyName || !identity?.userId || !identity?.token) {
      console.error("Missing required data for creating API key:", {
        keyName: !!keyName,
        userId: !!identity?.userId,
        token: !!identity?.token
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`Creating API key with userId: ${identity.userId}`);
      // Use the correct endpoint from Postman
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${identity.userId}/api-key`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${identity.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: keyName })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error creating API key (${response.status}):`, errorText);
        throw new Error(`Error creating API key: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log("API key created successfully:", result.key ? "[key hidden for security]" : "No key returned");
      setNewApiKey(result.key);
      setIsCreateModalOpen(false);
      setIsModalOpen(true);
      
      // Refresh the API keys list
      refreshApiKeys();
      
    } catch (error) {
      console.error("Error creating API key:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteApiKey = async (keyId: string) => {
    if (!identity?.token) return;
    
    try {
      // Use the correct endpoint from Postman
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/api-key/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${identity.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting API key: ${response.status}`);
      }
      
      // Refresh the API keys list
      refreshApiKeys();
      
    } catch (error) {
      console.error("Error deleting API key:", error);
    }
  };
  
  const closeSuccessModal = () => {
    setIsModalOpen(false);
    setNewApiKey(null);
    setKeyName("");
  };

  if (!identity?.token) {
    return (
      <Box p="md">
        <LoadingOverlay visible />
        <Text>Loading authentication...</Text>
      </Box>
    );
  }

  const canCreateKey = !!(keyName && identity?.userId && identity?.token);

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
                      <Code>{`${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 8)}`}</Code>
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
                      <RegenerateApiKeyButton 
                        keyId={key.id}
                        token={identity?.token || ""}
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
          {!identity?.userId && (
            <Alert color="red">
              Unable to create API keys: User ID is missing.
            </Alert>
          )}
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