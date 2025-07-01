import React, { useState, useEffect } from 'react';
import {
  Text,
  Box,
  Group,
  Button,
  LoadingOverlay,
  ActionIcon,
  Flex,
  TextInput,
  Textarea,
  Modal,
  Divider,
  ScrollArea,
} from '@mantine/core';
import { X } from 'lucide-react';
import { useAuth } from "@/utils/authUtils";
import { notifications } from '@mantine/notifications';

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
  summaryPrompt: string;
  highlightsPrompt: string;
  testSummaryPrompt: string;
  onSummaryChange: (value: string) => void;
  onHighlightsChange: (value: string) => void;
  onTestSummaryChange: (value: string) => void;
  onSave: () => void;
  saveStatus: string;
  onUpdateSuccess: () => void;
  onPromptUpdateSuccess: () => void; // Added to fix type error
  identity?: Identity;
}

const IS_DEV = process.env.NODE_ENV === 'development';

const CapsuleSettingsModal: React.FC<CapsuleSettingsModalProps> = ({
  isOpen,
  onClose,
  capsuleId,
  capsuleName,
  capsuleSlug,
  summaryPrompt,
  highlightsPrompt,
  testSummaryPrompt,
  onSummaryChange,
  onHighlightsChange,
  onTestSummaryChange,
  onSave,
  saveStatus,
  onUpdateSuccess,
  onPromptUpdateSuccess, // Added to props destructuring
  identity,
}) => {
  const { fetchWithAuth, handleAuthError } = useAuth();
  const [name, setName] = useState(capsuleName);
  const [slug, setSlug] = useState(capsuleSlug);

  useEffect(() => {
    setName(capsuleName);
    setSlug(capsuleSlug);
  }, [capsuleName, capsuleSlug]);

  const handleSaveClick = () => {
    onSave();
    if (saveStatus === 'Saved successfully') {
      notifications.show({
        title: 'Settings Updated',
        message: 'Capsule settings and prompts saved successfully.',
        color: 'green',
      });
      onUpdateSuccess();
      onPromptUpdateSuccess(); // Call the new prop to maintain compatibility
      onClose();
    } else if (saveStatus && saveStatus !== 'Saving...') {
      notifications.show({
        title: 'Error',
        message: saveStatus,
        color: 'red',
      });
    }
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

        {saveStatus && (
          <Text 
            size="sm" 
            c={saveStatus === 'Saved successfully' ? 'green' : 
               saveStatus === 'Saving...' ? 'orange' : 'red'} 
            mb="md"
          >
            {saveStatus}
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
            <LoadingOverlay visible={saveStatus === 'Saving...'} overlayProps={{ blur: 2 }} />
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
                  onChange={(e) => onSummaryChange(e.target.value)}
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
                        border: '0.5px solid #2B2 honing2B',
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
                  onChange={(e) => onHighlightsChange(e.target.value)}
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
                  onChange={(e) => onTestSummaryChange(e.target.value)}
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
          <Button
            variant="default"
            onClick={onClose}
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
          <Button
            onClick={handleSaveClick}
            loading={saveStatus === 'Saving...'}
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
            Save Settings
          </Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default CapsuleSettingsModal;