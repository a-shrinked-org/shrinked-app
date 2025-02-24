"use client";

import { useNavigation, useGetIdentity } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { ColumnDef, flexRender } from "@tanstack/react-table";
import React, { useState, useEffect, useCallback } from "react";
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
  Badge,
  CopyButton,
  Alert,
  Code
} from '@mantine/core';
import { IconTrash, IconCopy, IconCheck, IconPlus, IconKey, IconRefresh } from '@tabler/icons-react';
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
  
  const { data: identity } = useGetIdentity<Identity>();

  // Define columns outside of useTable to avoid circular references
  const columns = React.useMemo<ColumnDef<ApiKey>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "NAME",
        size: 200,
        cell: function render({ getValue }) {
          return (
            <Group>
              <IconKey size={16} />
              <Text>{getValue<string>()}</Text>
            </Group>
          );
        }
      },
      {
        id: "key",
        accessorKey: "key",
        header: "API KEY",
        size: 400,
        cell: function render({ getValue }) {
          const key = getValue<string>();
          // Only show first and last 8 characters
          const maskedKey = `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
          
          return (
            <Group>
              <Code>{maskedKey}</Code>
              <CopyButton value={key} timeout={2000}>
                {({ copied, copy }) => (
                  <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy} variant="subtle">
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </ActionIcon>
                )}
              </CopyButton>
            </Group>
          );
        }
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "CREATED AT",
        size: 120,
        cell: function render({ getValue }) {
          const date = new Date(getValue<string>());
          return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
          }).format(date);
        }
      },
      {
        id: "actions",
        header: "ACTIONS",
        size: 120,
        cell: function render({ row }) {
          return (
            <Group gap="xs">
              <ActionIcon 
                color="red" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteApiKey(row.original.id);
                }}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          );
        }
      }
    ],
    []
  );
  
  const {
    getHeaderGroups,
    getRowModel,
    refineCore: { tableQueryResult },
  } = useTable<ApiKey>({
    columns,
    refineCoreProps: {
      resource: "api-keys",
      queryOptions: {
        enabled: !!identity?.token,
        retry: false, // Don't retry on failure to prevent multiple 404s
        onError: (error) => {
          // Handle error silently, since it's expected if user has no API keys yet
          console.log("API Keys query error, likely no keys yet:", error);
        }
      },
      meta: {
        headers: identity?.token ? {
          'Authorization': `Bearer ${identity.token}`
        } : undefined
      }
    }
  });

  // Get the actual row renderer function to use with the Regenerate button
  const getRowActions = useCallback((row: any) => {
    return (
      <Group gap="xs">
        <RegenerateApiKeyButton 
          keyId={row.original.id}
          token={identity?.token || ""}
          onSuccess={() => tableQueryResult.refetch()}
        />
        <ActionIcon 
          color="red" 
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteApiKey(row.original.id);
          }}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    );
  }, [identity?.token, tableQueryResult]);

  const handleCreateApiKey = async () => {
    if (!keyName) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${identity?.userId}/api-key`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${identity?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: keyName })
      });
      
      if (!response.ok) {
        throw new Error(`Error creating API key: ${response.status}`);
      }
      
      const result = await response.json();
      setNewApiKey(result.key);
      setIsCreateModalOpen(false);
      setIsModalOpen(true);
      
      // Refresh table data
      tableQueryResult.refetch();
      
    } catch (error) {
      console.error("Error creating API key:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/api-key/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${identity?.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting API key: ${response.status}`);
      }
      
      // Refresh table data
      tableQueryResult.refetch();
      
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
        <LoadingOverlay visible={tableQueryResult.isLoading} />
        <Table highlightOnHover>
          <Table.Thead>
            {getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th 
                    key={header.id}
                    style={{ 
                      background: 'none',
                      fontWeight: 500,
                      color: '#666',
                      padding: '12px 16px',
                      textTransform: 'uppercase',
                      fontSize: '12px'
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {tableQueryResult.isError || !tableQueryResult.data || getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4} align="center">
                  <Text p="md">No API keys found. Create one to get started.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              getRowModel().rows.map((row) => (
                <Table.Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    if (cell.column.id === 'actions') {
                      return (
                        <Table.Td key={cell.id}>
                          {getRowActions(row)}
                        </Table.Td>
                      );
                    }
                    return (
                      <Table.Td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Td>
                    );
                  })}
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