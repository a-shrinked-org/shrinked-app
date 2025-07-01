"use client";

import { useList, useGetIdentity } from "@refinedev/core";
import React, { useState, useEffect } from "react";
import {
  Stack,
  Button,
  Group,
  Text,
  TextInput,
  LoadingOverlay,
  CopyButton,
  Alert,
  Box,
  Code,
  Paper,
} from "@mantine/core";
import { Trash, Copy, Check, AlertCircle } from 'lucide-react';
import { authUtils } from "@/utils/authUtils";
import { IconWrapper } from "@/utils/ui-utils";
import DocumentsTable, { ProcessedDocument } from '@/components/shared/DocumentsTable';
import { formatDate } from '@/utils/formatting';
import { ApiKeyService, ApiKey } from "@/services/api-key-service";
import { GeistMono } from 'geist/font/mono';
import { Identity } from "@/@types/logic";

interface ExtendedApiKey extends ProcessedDocument {
  keyName?: string;
  keyValue?: string;
  customStatus?: string;
}

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

const renderApiKeyStatus = (doc: ExtendedApiKey) => {
  return (
    <Box style={{ 
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      paddingLeft: '4px'
    }}>
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
  const { data: identity } = useGetIdentity<Identity>();
  const [keyName, setKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading: isLoadingKeys, refetch, error } = useList<ApiKey>({
    resource: "api-keys",
    queryOptions: {
      enabled: !!authUtils.isAuthenticated(),
      cacheTime: 5000,
      staleTime: 0,
    },
    pagination: {
      pageSize: 100,
    },
    meta: {
      headers: authUtils.getAuthHeaders(),
    },
  });

  useEffect(() => {
    console.log("[ApiKeysList] Fetching API keys with resource: api-keys");
    if (error) {
      console.error("[ApiKeysList] Error fetching API keys:", error);
      authUtils.handleAuthError(error);
      if (error.status === 401 || error.status === 403) {
        authUtils.refreshToken().then(success => {
          if (success) refetch();
        });
      }
      setErrorMessage(`Failed to fetch API keys: ${error.message || "Unknown error"}`);
    }
  }, [error, refetch]);

  useEffect(() => {
    if (authUtils.isAuthenticated()) {
      console.log("[ApiKeysList] Triggering refetch for API keys");
      refetch();
    }
  }, [refetch, refreshCounter]);

  const handleViewDocument = (apiKey: ExtendedApiKey) => {
    console.log("[ApiKeysList] Viewing API key:", apiKey);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to delete this API key?")) {
      try {
        console.log("[ApiKeysList] Deleting API key:", id);
        const success = await ApiKeyService.deleteApiKey(id);
        if (success) {
          setRefreshCounter(prev => prev + 1);
          setErrorMessage(null);
        }
      } catch (error: any) {
        console.error("[ApiKeysList] Error deleting API key:", error);
        setErrorMessage(`Failed to delete API key: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleRefresh = () => {
    console.log("[ApiKeysList] Refreshing API keys");
    refetch();
    setRefreshCounter(prev => prev + 1);
    setErrorMessage(null);
  };

  const handleCreateApiKey = async () => {
    if (!keyName) {
      setErrorMessage("API key name is required.");
      return;
    }
    if (!identity?.id) {
      setErrorMessage("User not authenticated.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      console.log("[ApiKeysList] Creating API key:", { name: keyName, userId: identity.id });
      const newKey = await ApiKeyService.createApiKey(keyName, identity.id);
      setNewApiKey(newKey.key);
      setRefreshCounter(prev => prev + 1);
      setKeyName("");
    } catch (error: any) {
      console.error("[ApiKeysList] Error creating API key:", error);
      setErrorMessage(`Error creating API key: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatApiKeyData = (apiKeys: ApiKey[]): ExtendedApiKey[] => {
    return apiKeys.map(key => ({
      _id: key.id,
      title: (key.name || 'UNNAMED API KEY').toUpperCase(),
      fileName: key.key.length > 16 ? 
        `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 8)}` : 
        key.key,
      createdAt: key.createdAt || new Date().toISOString(),
      status: 'active',
      customStatus: 'API KEY',
      output: { 
        title: (key.name || 'UNNAMED API KEY').toUpperCase(),
        description: ''
      },
      keyName: key.name,
      keyValue: key.key,
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
          styles={{ title: { fontFamily: GeistMono.style.fontFamily } }}
        >
          You must be logged in to manage API keys.
        </Alert>
      </Stack>
    );
  }

  return (
    <Box style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '24px', 
      backgroundColor: '#0a0a0a', 
      color: '#ffffff',
      minHeight: '100vh'
    }}>
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
      <Text
        size="lg"
        fw={500}
        mb="md"
        style={{ fontFamily: GeistMono.style.fontFamily, textTransform: 'uppercase', letterSpacing: '0.5px' }}
      >
        API Keys
      </Text>

      <Paper
        withBorder
        radius="md"
        p="lg"
        bg="#0a0a0a"
        mb="lg"
        style={{ borderColor: "#2B2B2B" }}
      >
        <Text size="sm" mb="md" style={{ fontFamily: GeistMono.style.fontFamily }}>
          Create a new API key
        </Text>
        <Stack gap="md">
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
                fontFamily: GeistMono.style.fontFamily,
              },
            }}
          />
          <Group justify="flex-end">
            <Button 
              onClick={handleCreateApiKey} 
              disabled={!keyName || isLoading}
              styles={{
                root: {
                  backgroundColor: '#F5A623',
                  color: '#000000',
                  fontFamily: GeistMono.style.fontFamily,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  '&:hover': {
                    backgroundColor: '#E09612',
                  },
                },
              }}
            >
              Create Key
            </Button>
          </Group>
        </Stack>
      </Paper>

      {errorMessage && (
        <Alert
          icon={<AlertCircle size={16} />}
          title="Error"
          color="red"
          mb="lg"
          styles={{ title: { fontFamily: GeistMono.style.fontFamily } }}
        >
          {errorMessage}
        </Alert>
      )}

      {newApiKey && (
        <Paper
          withBorder
          radius="md"
          p="lg"
          bg="#0a0a0a"
          mb="lg"
          style={{ borderColor: "#2B2B2B" }}
        >
          <Alert
            title="Important!"
            color="red"
            mb="md"
            styles={{ title: { fontFamily: GeistMono.style.fontFamily } }}
          >
            Keep a record of the key below. You won&apos;t be able to view it again.
          </Alert>
          <Box p="md" style={{ backgroundColor: '#1a1a1a', borderRadius: '4px' }}>
            <Group justify="apart">
              <Code style={{ fontSize: '14px', wordBreak: 'break-all', backgroundColor: '#1a1a1a', color: '#ffffff' }}>
                {newApiKey}
              </Code>
              <CopyButton value={newApiKey} timeout={2000}>
                {({ copied, copy }) => (
                  <Button 
                    size="xs"
                    color={copied ? 'teal' : 'blue'} 
                    onClick={copy}
                    leftSection={copied ? <IconWrapper icon={Check} size={16} /> : <IconWrapper icon={Copy} size={16} />}
                    styles={{ root: { fontFamily: GeistMono.style.fontFamily } }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </Box>
          <Text size="sm" mt="lg" style={{ fontFamily: GeistMono.style.fontFamily }}>
            You can use this API key to authenticate with the Shrinked API.
            Include it in the <Code style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>x-api-key</Code> header in your requests.
          </Text>
          <Group justify="center" mt="md">
            <Button 
              onClick={() => setNewApiKey(null)}
              styles={{
                root: {
                  backgroundColor: '#F5A623',
                  color: '#000000',
                  fontFamily: GeistMono.style.fontFamily,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  '&:hover': {
                    backgroundColor: '#E09612',
                  },
                },
              }}
            >
              I&apos;ve saved my API key
            </Button>
          </Group>
        </Paper>
      )}

      <DocumentsTable<ExtendedApiKey>
        key={`api-keys-${refreshCounter}`}
        data={formatApiKeyData(data?.data || [])}
        onView={handleViewDocument}
        onDelete={handleDelete}
        formatDate={formatDate}
        isLoading={isLoadingKeys}
        onRefresh={handleRefresh}
        error={error}
        title="Existing API Keys"
        noDataMessage="No API keys found."
        onAddNew={handleCreateApiKey}
        titleRenderer={titleRenderer}
        statusRenderer={renderApiKeyStatus}
        buttonText="CREATE KEY"
      />
    </Box>
  );
}