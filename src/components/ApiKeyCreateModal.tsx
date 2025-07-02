import React, { useState } from "react";
import {
  Modal,
  TextInput,
  Button,
  Stack,
  Group,
  Alert,
  CopyButton,
  Code,
  Box,
  Text,
} from "@mantine/core";
import { AlertCircle, Copy, Check } from "lucide-react";
import { useGetIdentity } from "@refinedev/core";
import { ApiKeyService, ApiKey } from "@/services/api-key-service";
import { useAuth } from "@/utils/authUtils";
import { IconWrapper } from "@/utils/ui-utils";
import { GeistMono } from "geist/font/mono";
import { Identity } from "@/@types/logic";

interface ApiKeyCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApiKeyCreateModal({
  opened,
  onClose,
  onSuccess,
}: ApiKeyCreateModalProps) {
  const { data: identity } = useGetIdentity<Identity>();
  const { handleAuthError } = useAuth();
  const [keyName, setKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      const newKey = await ApiKeyService.createApiKey(keyName, identity.id);
      setNewApiKey(newKey.key);
      setKeyName(""); // Clear input after successful creation
      onSuccess(); // Notify parent component
    } catch (error: any) {
      console.error("[ApiKeyCreateModal] Error creating API key:", error);
      setErrorMessage(`Error creating API key: ${error.message || "Unknown error"}`);
      handleAuthError(error); // Use central error handler
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setKeyName("");
    setNewApiKey(null);
    setErrorMessage(null);
    setIsLoading(false);
    onClose();
  };

  return (
    <Modal
        opened={opened}
        onClose={handleCloseModal}
        title={newApiKey ? "API Key Created" : "Create New API Key"}
        centered
        styles={{
          header: { backgroundColor: "#000000", color: "#ffffff" },
          body: { backgroundColor: "#000000", color: "#ffffff" },
          close: { color: "#ffffff" },
        }}
      >
        <Stack gap="md">
          {!newApiKey ? (
            <>
              <TextInput
                label="API Key Name"
                placeholder="e.g., Development, Production"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                required
                styles={{
                  input: {
                    backgroundColor: "#0d0d0d",
                    borderColor: "#2b2b2b",
                    color: "#ffffff",
                  },
                  label: {
                    color: "#ffffff",
                    fontFamily: GeistMono.style.fontFamily,
                  },
                }}
              />
              {errorMessage && (
                <Alert
                  icon={<AlertCircle size={16} />}
                  title="Error"
                  color="red"
                  styles={{ title: { fontFamily: GeistMono.style.fontFamily } }}
                >
                  {errorMessage}
                </Alert>
              )}
              <Group justify="flex-end">
                <Button
                  onClick={handleCreateApiKey}
                  disabled={!keyName || isLoading}
                  loading={isLoading}
                  styles={{
                    root: {
                      backgroundColor: "#F5A623",
                      color: "#000000",
                      fontFamily: GeistMono.style.fontFamily,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      "&:hover": {
                        backgroundColor: "#E09612",
                      },
                    },
                  }}
                >
                  Create Key
                </Button>
              </Group>
            </>
          ) : (
            <>
              <Alert
                title="Important!"
                color="red"
                mb="md"
                styles={{ title: { fontFamily: GeistMono.style.fontFamily } }}
              >
                Keep a record of the key below. You won&apos;t be able to view it again.
              </Alert>
              <Box p="md" style={{ backgroundColor: "#1a1a1a", borderRadius: "4px" }}>
                <Group justify="apart">
                  <Code
                    style={{
                      fontSize: "14px",
                      wordBreak: "break-all",
                      backgroundColor: "#1a1a1a",
                      color: "#ffffff",
                    }}
                  >
                    {newApiKey}
                  </Code>
                  <CopyButton value={newApiKey} timeout={2000}>
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        color={copied ? "teal" : "blue"}
                        onClick={copy}
                        leftSection={
                          copied ? (
                            <IconWrapper icon={Check} size={16} />
                          ) : (
                            <IconWrapper icon={Copy} size={16} />
                          )
                        }
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
                Include it in the{" "}
                <Code style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                  x-api-key
                </Code>{" "}
                header in your requests.
              </Text>
              <Group justify="center" mt="md">
                <Button
                  onClick={handleCloseModal}
                  styles={{
                    root: {
                      backgroundColor: "#F5A623",
                      color: "#000000",
                      fontFamily: GeistMono.style.fontFamily,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: 400, // Changed to regular
                      "&:hover": {
                        backgroundColor: "#E09612",
                      },
                    },
                  }}
                >
                  I&apos;ve saved my API key
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
  );
}
