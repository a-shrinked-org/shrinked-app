"use client";

import { useList, useGetIdentity, useNotification } from "@refinedev/core";
import React, { useState, useEffect, useCallback } from "react";
import {
  Stack,
  Button,
  Text,
  LoadingOverlay,
  Alert,
  Box,
} from "@mantine/core";
import { AlertCircle } from 'lucide-react';
import { authUtils } from "@/utils/authUtils";
import DocumentsTable, { ProcessedDocument } from '@/components/shared/DocumentsTable';
import { formatDate } from '@/utils/formatting';
import { ApiKeyService, ApiKey } from "@/services/api-key-service";
import { GeistMono } from 'geist/font/mono';
import { Identity } from "@/@types/logic";
import ApiKeyCreateModal from '@/components/ApiKeyCreateModal';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

interface ExtendedApiKey extends ProcessedDocument {
  keyName?: string;
  keyValue?: string;
  customStatus?: string;
  displayToken?: React.ReactNode; // New field for the formatted token
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [apiKeyToDeleteId, setApiKeyToDeleteId] = useState<string | null>(null);
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

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log("[ApiKeysList] handleDelete called for ID:", id);
    setApiKeyToDeleteId(id);
    setIsConfirmModalOpen(true);
  };

  const { open } = useNotification();

  const confirmDeleteApiKey = async () => {
    console.log("[ApiKeysList] confirmDeleteApiKey called. apiKeyToDeleteId:", apiKeyToDeleteId);
    if (!apiKeyToDeleteId) return;

    try {
      console.log("[ApiKeysList] Deleting API key:", apiKeyToDeleteId);
      const success = await ApiKeyService.deleteApiKey(apiKeyToDeleteId);
      if (success) {
        setRefreshCounter(prev => prev + 1);
        open?.({ type: "success", message: "API key deleted successfully" });
      } else {
        open?.({ type: "error", message: "Failed to delete API key" });
      }
    } catch (error: any) {
      console.error("[ApiKeysList] Error deleting API key:", error);
      open?.({ type: "error", message: `Failed to delete API key: ${error.message || "Unknown error"}` });
    } finally {
      setIsConfirmModalOpen(false);
      setApiKeyToDeleteId(null);
    }
  };

  const handleRefresh = useCallback(() => {
    console.log("[ApiKeysList] Refreshing API keys");
    refetch();
    setRefreshCounter(prev => prev + 1);
    setErrorMessage(null);
  }, [refetch]);

  const handleApiKeyCreated = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
    setErrorMessage(null);
  }, []);

  const formatApiKeyData = (apiKeys: ApiKey[]): ExtendedApiKey[] => {
    return apiKeys.map(key => ({
      _id: key.id,
      title: (key.name || 'UNNAMED API KEY').toUpperCase(),
      fileName: key.key.length > 16 ? 
        `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 8)}` : 
        key.key,
      createdAt: key.createdAt || new Date().toISOString(),
      status: 'completed', // Set status to 'completed' for green dot
      customStatus: 'API KEY',
      output: { 
        title: (key.name || 'UNNAMED API KEY').toUpperCase(),
        description: ''
      },
      keyName: key.name,
      keyValue: key.key,
      description: '',
      displayToken: (
        <Box
          style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '4px',
            padding: '4px 8px',
            display: 'inline-block',
            fontFamily: GeistMono.style.fontFamily,
            fontSize: '12px',
            color: '#ffffff',
          }}
        >
          {key.key.substring(0, 4)}...{key.key.substring(key.key.length - 4)}
        </Box>
      ),
    }));
  };

  const extraColumns = [
    {
      header: "Token",
      accessor: (doc: ExtendedApiKey) => doc.displayToken,
    },
  ];

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
    <>
      <DocumentsTable<ExtendedApiKey>
        key={`api-keys-${refreshCounter}`}
        data={formatApiKeyData(data?.data || [])}
        onDelete={handleDelete}
        formatDate={formatDate}
        isLoading={isLoadingKeys}
        onRefresh={handleRefresh}
        error={error}
        title="API Keys"
        noDataMessage="No API keys found."
        onAddNew={() => setIsCreateModalOpen(true)}
        titleRenderer={titleRenderer}
        statusRenderer={renderApiKeyStatus}
        buttonText="CREATE NEW KEY"
        extraColumns={extraColumns}
      />

      <ApiKeyCreateModal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleApiKeyCreated}
      />

      <ConfirmationModal
        opened={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteApiKey}
        title="Confirm Deletion"
        message="Are you sure you want to delete this API key? This action cannot be undone."
        confirmText="Delete"
      />
    </>
  );
}