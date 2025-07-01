"use client";

import { useList } from "@refinedev/core";
import React, { useState, useEffect } from "react";
import {
  Stack,
  Button,
  Group,
  Modal,
  Text,
  TextInput,
  LoadingOverlay,
  CopyButton,
  Alert,
  Box,
  Code,
} from "@mantine/core";
import {
  Trash,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { authUtils, API_CONFIG } from "@/utils/authUtils";
import { IconWrapper } from "@/utils/ui-utils";
import DocumentsTable, { ProcessedDocument } from '@/components/shared/DocumentsTable';
import { formatDate } from '@/utils/formatting';
import { ApiKeyService, ApiKey } from "@/services/api-key-service";
import { GeistMono } from 'geist/font/mono';

interface ExtendedApiKey extends ProcessedDocument {
  keyName?: string;
  keyValue?: string;
  customStatus?: string;
}

// Custom title renderer to only show title without description
const titleRenderer = (doc: ExtendedApiKey) => {
  return (
    <div style={{ overflow: 'hidden' }}>
      <div style={{ 
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: 500,
        fontSize: '16px'
      }}>
        {doc.title || doc.output?.title || doc.fileName || 'Unnamed API Key'}
      </div>
    </div>
  );
};

// Custom status renderer for API keys
const renderApiKeyStatus = (doc: ExtendedApiKey) => {
  return (
    <Box style={{ 
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      paddingLeft: '4px'
    }}>
      {/* Status text */}
      <Text size="sm" style={{ 
        color: '#ffffff',
        fontFamily: GeistMono.style.fontFamily,
        letterSpacing: '0.5px'
      }}>
        ACTIVE
      </Text>
    </Box>
  );
};

export default function ApiKeysList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Add refresh counter state to force re-renders
  const [refreshCounter, setRefreshCounter] = useState(0);

  const { data, isLoading: isLoadingKeys, refetch, error } = useList<ApiKey>({
    resource: "api-keys-proxy",
    queryOptions: {
      enabled: !!authUtils.isAuthenticated(),
      // Add cache options for better refresh behavior
      cacheTime: 5000, // 5 seconds cache
      staleTime: 0, // Always consider data stale
    },
    pagination: {
      pageSize: 100,
    },
    meta: {
      headers: authUtils.getAuthHeaders()
    }
  });

  useEffect(() => {
    if (error) {
      console.error("Error fetching API keys:", error);
      authUtils.handleAuthError(error);
      if (error.status === 401 || error.status === 403) {
        authUtils.refreshToken().then(success => {
          if (success) refetch();
        });
      }
    }
  }, [error, refetch]);

  useEffect(() => {
    if (authUtils.isAuthenticated()) {
      refetch();
    }
  }, [refetch, refreshCounter]); // Add refreshCounter to dependencies

  const handleViewDocument = (apiKey: ExtendedApiKey) => {
    console.log("Viewing API key:", apiKey);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to delete this API key?")) {
      try {
        const success = await ApiKeyService.deleteApiKey(id);
        if (success) {
          alert("API key deleted successfully");
          refetch();
        }
      } catch (error: any) {
        console.error("Error deleting API key:", error);
        alert(`Failed to delete API key: ${error.message || "Unknown error"}`);
      }
    }
  };

  // Improved handleRefresh function
  const handleRefresh = () => {
    console.log("Refresh button clicked in API Keys page");
    // Call refetch without parameters to avoid type errors
    refetch();
    // Update counter to force re-render
    setRefreshCounter(prev => prev + 1);
  };

  const handleCreateApiKey = async () => {
    if (!keyName) return;

    setIsLoading(true);
    try {
      const newKey = await ApiKeyService.createApiKey(keyName);
      setNewApiKey(newKey.key);
      setIsCreateModalOpen(false);
      setIsModalOpen(true);
      refetch();
    } catch (error) {
      console.error("Error creating API key:", error);
      alert(`Error creating API key: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const closeSuccessModal = () => {
    setIsModalOpen(false);
    setNewApiKey(null);
    setKeyName("");
  };

  const formatApiKeyData = (apiKeys: ApiKey[]): ExtendedApiKey[] => {
    return apiKeys.map(key => ({
      _id: key.id,
      // Change title to all caps
      title: (key.name || 'UNNAMED API KEY').toUpperCase(),
      fileName: key.key.length > 16 ? 
        `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 8)}` : 
        key.key,
      createdAt: key.createdAt || new Date().toISOString(),
      // Use "active" for the status field which controls the circle color
      status: 'active',
      // Add custom status for rendering
      customStatus: 'API KEY',
      output: { 
        title: (key.name || 'UNNAMED API KEY').toUpperCase(),
        // Remove description by setting to empty string
        description: ''
      },
      keyName: key.name,
      keyValue: key.key,
      // Explicitly set description to empty to ensure it doesn't show
      description: ''
    }));
  };

  if (isLoadingKeys && authUtils.isAuthenticated()) {
    return (
      <Stack p="md" style={{ position: 'relative', minHeight: '200px' }}>
        <LoadingOverlay visible={true} />
      </Stack>
    );
  }

  if (!authUtils.isAuthenticated()) {
    return (
      <Stack p="md">
        <Alert 
          icon={<AlertCircle size={16} />}
          title="Authentication Required" 
          color="red"
        >
          You must be logged in to manage API keys.
        </Alert>
      </Stack>
    );
  }

  return (
    <>
      <DocumentsTable<ExtendedApiKey>
        key={`api-keys-${refreshCounter}`} // Add key to force re-render
        data={formatApiKeyData(data?.data || [])}
        onView={handleViewDocument}
        onDelete={handleDelete}
        formatDate={formatDate}
        isLoading={isLoadingKeys}
        onRefresh={handleRefresh}
        error={error}
        // Change title to all caps
        title="API KEYS"
        noDataMessage="No API keys found."
        onAddNew={() => setIsCreateModalOpen(true)}
        // Add titleRenderer to customize title display
        titleRenderer={titleRenderer}
        // Add custom status renderer
        statusRenderer={renderApiKeyStatus}
        buttonText="CREATE KEY"
      />

      <Modal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create API Key"
        styles={{
          header: { backgroundColor: '#000000', color: '#ffffff' },
          body: { backgroundColor: '#000000', color: '#ffffff' },
          close: { color: '#ffffff' },
        }}
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
            styles={{
              input: {
                backgroundColor: '#0d0d0d',
                borderColor: '#2b2b2b',
                color: '#ffffff',
              },
              label: {
                color: '#ffffff',
              },
            }}
          />
          <Group justify="flex-end" mt="md">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateModalOpen(false)}
              styles={{
                root: {
                  borderColor: '#2b2b2b',
                  color: '#ffffff',
                },
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateApiKey} 
              disabled={!keyName}
              styles={{
                root: {
                  backgroundColor: '#F5A623',
                  color: '#000000',
                  '&:hover': {
                    backgroundColor: '#E09612',
                  },
                },
              }}
            >
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={isModalOpen}
        onClose={closeSuccessModal}
        title="Save your API key"
        size="lg"
        styles={{
          header: { backgroundColor: '#000000', color: '#ffffff' },
          body: { backgroundColor: '#000000', color: '#ffffff' },
          close: { color: '#ffffff' },
        }}
      >
        <Alert title="Important!" color="red" mb="md">
          Keep a record of the key below. You won&apos;t be able to view it again.
        </Alert>
        
        <Box p="md" style={{ backgroundColor: '#1a1a1a', borderRadius: '4px' }}>
          <Group justify="apart">
            <Code style={{ fontSize: '14px', wordBreak: 'break-all', backgroundColor: '#1a1a1a', color: '#ffffff' }}>
              {newApiKey}
            </Code>
            <CopyButton value={newApiKey || ""} timeout={2000}>
              {({ copied, copy }) => (
                <Button 
                  size="xs"
                  color={copied ? 'teal' : 'blue'} 
                  onClick={copy}
                  leftSection={copied ? <IconWrapper icon={Check} size={16} /> : <IconWrapper icon={Copy} size={16} />}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Box>
        
        <Text size="sm" mt="lg">
          You can use this API key to authenticate with the Shrinked API.
          Include it in the <Code style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>x-api-key</Code> header in your requests.
        </Text>
        
        <Group justify="center" mt="xl">
          <Button 
            onClick={closeSuccessModal}
            styles={{
              root: {
                backgroundColor: '#F5A623',
                color: '#000000',
                '&:hover': {
                  backgroundColor: '#E09612',
                },
              },
            }}
          >
            I&apos;ve saved my API key
          </Button>
        </Group>
      </Modal>
    </>
  );
}