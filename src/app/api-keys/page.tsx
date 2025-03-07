"use client";

import { useGetIdentity, useList } from "@refinedev/core";
import React, { useState, useEffect } from "react";
import {
  Stack,
  Button,
  Group,
  Modal,
  Text,
  TextInput,
  LoadingOverlay,
  ActionIcon,
  CopyButton,
  Alert,
  Box,
  Code,
} from "@mantine/core";
import {
  Trash,
  Copy,
  Check,
  Plus,
  Key,
  AlertCircle,
} from 'lucide-react';
import { authUtils, API_CONFIG } from "@/utils/authUtils";
import { IconWrapper } from "@/utils/ui-utils";
import DocumentsTable, { ProcessedDocument } from '@/components/shared/DocumentsTable';
import { formatDate } from '@/utils/formatting';
import { documentOperations } from '@/providers/data-provider/shrinked-data-provider';
import { ApiKeyService, ApiKey } from "@/services/api-key-service";

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  userId?: string;
}

interface ExtendedApiKey extends ProcessedDocument {
  keyName?: string;
  keyValue?: string;
}

export default function ApiKeysList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: identity, isLoading: isIdentityLoading } = useGetIdentity<Identity>();

  const userId = React.useMemo(() => {
    if (identity?.userId) return identity.userId;
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          return userData.id || userData.userId || userData._id;
        } catch (e) {
          console.error("Error parsing user data from localStorage", e);
        }
      }
    }
    return null;
  }, [identity?.userId]);

  const requestedFields = 'id,name,key,createdAt';
  
  const { data, isLoading: isLoadingKeys, refetch, error } = useList<ApiKey>({
    resource: userId ? `api-keys/user/${userId}` : "",
    queryOptions: {
      enabled: !!userId && !!authUtils.isAuthenticated(),
    },
    pagination: {
      pageSize: 100,
    },
    meta: {
      headers: {
        'Authorization': `Bearer ${authUtils.getAccessToken() || identity?.token || ''}`
      },
      url: userId ? `${API_CONFIG.API_URL}/api-keys/user/${userId}?fields=${requestedFields}` : ""
    }
  });

  useEffect(() => {
    if (error) {
      console.error("Error fetching API keys:", error);
      if (error.status === 401 || error.status === 403) {
        authUtils.refreshToken().then(success => {
          if (success) refetch();
        });
      }
    }
  }, [error, refetch]);

  useEffect(() => {
    if (userId && authUtils.isAuthenticated()) {
      refetch();
    }
  }, [userId, refetch]);

  const handleViewDocument = (apiKey: ExtendedApiKey) => {
    console.log("Viewing API key:", apiKey);
  };

  const handleSendEmail = async (id: string, email?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const result = await documentOperations.sendDocumentEmail(id, API_CONFIG.API_URL, email);
    if (result.success) {
      alert("API key details sent successfully");
    } else {
      alert("Failed to send API key details: " + (result.error?.message || "Unknown error"));
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to delete this API key?")) {
      const result = await documentOperations.deleteDocument(id, API_CONFIG.API_URL);
      if (result.success) {
        alert("API key deleted successfully");
        refetch();
      } else {
        alert("Failed to delete API key: " + (result.error?.message || "Unknown error"));
      }
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleCreateApiKey = async () => {
    if (!keyName || !userId) return;

    setIsLoading(true);
    try {
      const newKey = await ApiKeyService.createApiKey(userId, keyName);
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
      title: key.name || 'Unnamed API Key',
      fileName: key.key.length > 16 ? 
        `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 8)}` : 
        key.key,
      createdAt: key.createdAt || new Date().toISOString(),
      status: 'active',
      output: { title: key.name },
      keyName: key.name,
      keyValue: key.key
    }));
  };

  if (isIdentityLoading || (isLoadingKeys && userId)) {
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
        data={formatApiKeyData(data?.data || [])}
        onView={handleViewDocument}
        onSendEmail={handleSendEmail}
        onDelete={handleDelete}
        formatDate={formatDate}
        isLoading={isLoadingKeys}
        onRefresh={handleRefresh}
        error={error}
        title="API Keys"
      />

      <Group p="md" justify="flex-end">
        <Button 
          leftSection={<Plus size={16} />} 
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create API Key
        </Button>
      </Group>

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
          Include it in the <Code>x-api-key</Code> header in your requests.
        </Text>
        
        <Group justify="center" mt="xl">
          <Button onClick={closeSuccessModal}>
            I&apos;ve saved my API key
          </Button>
        </Group>
      </Modal>
    </>
  );
}