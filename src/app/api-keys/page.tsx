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
import {
  IconTrash,
  IconCopy,
  IconCheck,
  IconPlus,
  IconKey,
} from "@tabler/icons-react";
import { RegenerateApiKeyButton } from "@/components/RegenerateApiKeyButton";
import { ApiKeyService, ApiKey } from "@/services/api-key-service";

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
      const userStr = localStorage.getItem("user");
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
      if (!identity?.token) {
        console.log("No token available, skipping API keys fetch");
        return;
      }

      setIsLoadingKeys(true);
      setError(null);

      try {
        console.log("Fetching API keys...");
        const fetchedApiKeys = await ApiKeyService.getApiKeys(identity.token);
        console.log("API keys fetched successfully:", fetchedApiKeys.length, "keys");
        setApiKeys(fetchedApiKeys);
      } catch (error) {
        console.error("Error fetching API keys:", error);
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
      const fetchedApiKeys = await ApiKeyService.getApiKeys(identity.token);
      setApiKeys(fetchedApiKeys);
    } catch (error) {
      console.error("Error refreshing API keys:", error);
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
        token: !!identity?.token,
      });
      setError("Cannot create API key: User ID is missing");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Creating API key for userId: ${effectiveUserId}`);
      const newKey = await ApiKeyService.createApiKey(identity.token, effectiveUserId, keyName);
      console.log("API key created successfully:", newKey ? "Result received" : "No result returned");

      setNewApiKey(newKey.key);
      setIsCreateModalOpen(false);
      setIsModalOpen(true);

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
      await ApiKeyService.deleteApiKey(identity.token, keyId);
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

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <Title order={2}>API Keys</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setIsCreateModalOpen(true)}>
          Create API Key
        </Button>
      </Group>

      {error && <Alert color="red" title="Error">{error}</Alert>}

      {isLoadingKeys ? (
        <LoadingOverlay visible />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Key Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((apiKey) => (
              <tr key={apiKey.id}>
                <td>{apiKey.name}</td>
                <td>
                  <Group>
                    <CopyButton value={apiKey.key}>
                      {({ copied, copy }) => (
                        <ActionIcon onClick={copy}>
                          {copied ? <IconCheck /> : <IconCopy />}
                        </ActionIcon>
                      )}
                    </CopyButton>
                    <RegenerateApiKeyButton apiKeyId={apiKey.id} />
                    <ActionIcon onClick={() => handleDeleteApiKey(apiKey.id)} color="red">
                      <IconTrash />
                    </ActionIcon>
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal opened={isModalOpen} onClose={closeSuccessModal} title="API Key Created">
        <Text>Your new API key:</Text>
        <Code>{newApiKey}</Code>
      </Modal>
    </Stack>
  );
}
