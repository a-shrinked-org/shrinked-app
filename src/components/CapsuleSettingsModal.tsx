import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  Box,
  Group,
  Button,
  LoadingOverlay,
  ActionIcon,
  Flex,
  Textarea,
  Modal,
  Divider,
  ScrollArea,
  TextInput,
} from '@mantine/core';
import { X } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from "@/utils/authUtils";

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
  subscriptionPlan?: { name?: string };
}

interface CapsuleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  capsuleId: string;
  capsuleName: string;
  capsuleSlug: string;
  onUpdateSuccess: () => void;
  onPromptUpdateSuccess: () => void;
  identity?: Identity;
}

const IS_DEV = process.env.NODE_ENV === 'development';

const CapsuleSettingsModal: React.FC<CapsuleSettingsModalProps> = ({
  isOpen,
  onClose,
  capsuleId,
  capsuleName,
  capsuleSlug,
  onUpdateSuccess,
  onPromptUpdateSuccess,
  identity,
}) => {
  const { fetchWithAuth, handleAuthError } = useAuth();
  const [name, setName] = useState(capsuleName);
  const [slug, setSlug] = useState(capsuleSlug);
  const [summaryPrompt, setSummaryPrompt] = useState('');
  const [highlightsPrompt, setHighlightsPrompt] = useState('');
  const [testSummaryPrompt, setTestSummaryPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(capsuleName);
    setSlug(capsuleSlug);
  }, [capsuleName, capsuleSlug]);

  const loadPrompts = useCallback(async () => {
    if (!capsuleId || !identity?.id) return;
    
    setIsLoadingPrompts(true);
    try {
      const response = await fetchWithAuth(`/api/admin/prompts?capsuleId=${capsuleId}`);
      if (!response.ok) throw new Error(`Failed to fetch prompts: ${response.status}`);

      const data = await response.json();
      setSummaryPrompt(data.find((p: any) => p.section === 'capsule.summary')?.prompt || '');
      setHighlightsPrompt(data.find((p: any) => p.section === 'capsule.highlights')?.prompt || '');
      setTestSummaryPrompt(data.find((p: any) => p.section === 'capsule.testSummary')?.prompt || '');
    } catch (error) {
      if (IS_DEV) console.error('Failed to fetch prompts:', error);
      setSummaryPrompt('Generate a comprehensive summary of the provided documents');
      setHighlightsPrompt('Extract key highlights and important points from documents');
      setTestSummaryPrompt('Create a test summary of the content');
    } finally {
      setIsLoadingPrompts(false);
    }
  }, [capsuleId, identity?.id, fetchWithAuth]);

  

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const capsuleUpdatePromise = fetchWithAuth(`/api/capsule/${capsuleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });

      const promises = [capsuleUpdatePromise];

      if (identity?.subscriptionPlan?.name?.toUpperCase() === 'ADMIN') {
        const promptsToUpdate = [
          { section: 'capsule.summary', prompt: summaryPrompt },
          { section: 'capsule.highlights', prompt: highlightsPrompt },
          { section: 'capsule.testSummary', prompt: testSummaryPrompt },
        ];
        promises.push(fetchWithAuth(`/api/admin/prompts/upsert`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompts: promptsToUpdate }),
        }));
      }

      const responses = await Promise.all(promises);

      for (const response of responses) {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to update: ${response.status}`);
        }
      }

      notifications.show({
        title: 'Settings Updated',
        message: 'Capsule settings and prompts saved successfully.',
        color: 'green',
      });
      onUpdateSuccess();
      onPromptUpdateSuccess(); // Notify parent to refetch prompts
      onClose();
    } catch (error) {
      if (IS_DEV) console.error('Failed to update settings:', error);
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
      notifications.show({
        title: 'Error',
        message: formatErrorMessage(error),
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  };
  

  

  useEffect(() => {
    if (isOpen && identity?.subscriptionPlan?.name?.toUpperCase() === 'ADMIN') {
      loadPrompts();
    }
  }, [isOpen, identity?.subscriptionPlan?.name, loadPrompts]);

  const formatErrorMessage = (error: any): string => {
    if (!error) return "An unknown error occurred";
    const status = error?.status ?? error?.statusCode ?? error?.response?.status;
    const message = error?.message || "An unexpected error occurred";
    if (status === 401 || status === 403) return "Your session has expired. Please log in again.";
    if (status >= 500) return "The server encountered an error. Please try again later.";
    return message;
  };

  

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      withCloseButton={false}
      title={null}
      centered
      size="lg"
      styles={{
        body: {
          backgroundColor: '#000000',
          color: '#ffffff',
          padding: '22px 30px',
        },
        inner: {
          padding: 0,
        },
        content: {
          maxWidth: '700px',
          borderRadius: '10px',
          border: '0.5px solid #2B2B2B',
          overflow: 'hidden',
        },
      }}
    >
      <Box>
        <Flex justify="space-between" align="center" mb="16px">
          <Text fw={500} size="md">
            Capsule Settings
          </Text>
          <ActionIcon
            onClick={onClose}
            variant="transparent"
            color="#ffffff"
            style={{ marginRight: '-10px', marginTop: '-10px' }}
          >
            <X size={18} />
          </ActionIcon>
        </Flex>

        {errorMessage && (
          <Text color="red" size="sm" mb="md">
            {errorMessage}
          </Text>
        )}

        <TextInput
          label="Capsule Name"
          placeholder="Enter capsule name"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          mb="md"
          styles={{
            label: { color: '#A1A1A1' },
            input: {
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              border: '1px solid #2B2B2B',
              '&:focus-within': {
                borderColor: '#F5A623',
              },
            },
          }}
        />

        <TextInput
          label="Capsule Slug"
          placeholder="Enter capsule slug"
          value={slug}
          onChange={(event) => setSlug(event.currentTarget.value)}
          mb="lg"
          styles={{
            label: { color: '#A1A1A1' },
            input: {
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              border: '1px solid #2B2B2B',
              '&:focus-within': {
                borderColor: '#F5A623',
              },
            },
          }}
        />

        {identity?.subscriptionPlan?.name?.toUpperCase() === 'ADMIN' && (
          <Box mb="lg">
            <Text fw={500} size="md" mb="md">Default Prompts (Admin Only)</Text>
            <LoadingOverlay visible={isLoadingPrompts} overlayProps={{ blur: 2 }} />
            <ScrollArea h={300} scrollbarSize={6} scrollHideDelay={500} type="auto" offsetScrollbars>
              <Box mb="md">
                <Divider 
                  my="md" 
                  label="Capsule Summary Prompt" 
                  labelPosition="center"
                  styles={{
                    label: { 
                      color: '#F5A623', 
                      fontSize: '14px',
                      fontWeight: 500
                    },
                    root: {
                      borderColor: '#2B2B2B'
                    }
                  }}
                />
                <Textarea
                  placeholder="Generate a comprehensive summary of the provided documents."
                  value={summaryPrompt}
                  onChange={(e) => setSummaryPrompt(e.target.value)}
                  minRows={4}
                  autosize
                  maxRows={8}
                  styles={{
                    input: {
                      backgroundColor: '#1a1a1a',
                      borderColor: '#2B2B2B',
                      color: '#ffffff',
                      borderWidth: '0.5px',
                      padding: '12px 16px',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      '&:focus': {
                        borderColor: '#F5A623',
                      },
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#000000',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#0C0C0C',
                        borderRadius: '3px',
                        border: '0.5px solid #2B2B2B',
                      },
                    }
                  }}
                />
              </Box>
              <Box mb="md">
                <Divider 
                  my="md" 
                  label="Capsule Highlights Prompt" 
                  labelPosition="center"
                  styles={{
                    label: {
                      color: '#F5A623',
                      fontSize: '14px',
                      fontWeight: 500
                    },
                    root: {
                      borderColor: '#2B2B2B'
                    }
                  }}
                />
                <Textarea
                  placeholder="Extract key highlights and important points from documents."
                  value={highlightsPrompt}
                  onChange={(e) => setHighlightsPrompt(e.target.value)}
                  minRows={4}
                  autosize
                  maxRows={8}
                  styles={{
                    input: {
                      backgroundColor: '#1a1a1a',
                      borderColor: '#2B2B2B',
                      color: '#ffffff',
                      borderWidth: '0.5px',
                      padding: '12px 16px',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      '&:focus': {
                        borderColor: '#F5A623',
                      },
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#000000',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#0C0C0C',
                        borderRadius: '3px',
                        border: '0.5px solid #2B2B2B',
                      },
                    }
                  }}
                />
              </Box>
              <Box mb="md">
                <Divider 
                  my="md" 
                  label="Test Summary Prompt" 
                  labelPosition="center"
                  styles={{
                    label: {
                      color: '#F5A623',
                      fontSize: '14px',
                      fontWeight: 500
                    },
                    root: {
                      borderColor: '#2B2B2B'
                    }
                  }}
                />
                <Textarea
                  placeholder="Generate a test summary to verify functionality and language support."
                  value={testSummaryPrompt}
                  onChange={(e) => setTestSummaryPrompt(e.target.value)}
                  minRows={4}
                  autosize
                  maxRows={8}
                  styles={{
                    input: {
                      backgroundColor: '#1a1a1a',
                      borderColor: '#2B2B2B',
                      color: '#ffffff',
                      borderWidth: '0.5px',
                      padding: '12px 16px',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      '&:focus': {
                        borderColor: '#F5A623',
                      },
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#000000',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#0C0C0C',
                        borderRadius: '3px',
                        border: '0.5px solid #2B2B2B',
                      },
                    }
                  }}
                />
                <Text size="xs" mt="xs" style={{ color: '#666666' }}>
                  Test summary allows you to test specific summary configurations, e.g., non-English summaries
                </Text>
              </Box>
            </ScrollArea>
          </Box>
        )}

        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={onClose}
            styles={{
              root: {
                borderColor: '#2b2b2b',
                color: '#ffffff',
                height: '44px',
                '&:hover': {
                  backgroundColor: '#2b2b2b',
                },
              }
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}
            styles={{
              root: {
                backgroundColor: '#F5A623',
                color: '#000000',
                height: '44px',
                '&:hover': {
                  backgroundColor: '#E09612',
                },
              },
            }}
          >
            Save Changes
          </Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default CapsuleSettingsModal;