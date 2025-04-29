import React from 'react';
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
} from '@mantine/core';
import { X } from 'lucide-react';

interface Prompt {
  section: string;
  prompt: string;
  prefill?: string;
}

interface CapsuleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  prompts: Prompt[];
  onPromptChange: (section: string, value: string) => void;
  onSave: () => void;
  saveStatus: string;
}

const CapsuleSettingsModal: React.FC<CapsuleSettingsModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  prompts,
  onPromptChange,
  onSave,
  saveStatus
}) => {
  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      withCloseButton={false}
      title={null}
      centered
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
          maxWidth: '600px',
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
        
        <Text size="md" mb="lg" style={{ 
          color: '#A1A1A1', 
          fontSize: '14px',
          fontFamily: 'inherit'
        }}>
          Edit the admin prompts used for content generation
        </Text>
        
        <Box style={{ position: 'relative', minHeight: '300px' }}>
          <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
          
          {prompts.map((prompt) => (
            <Box key={prompt.section} mb="lg">
              <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
                {prompt.section.charAt(0).toUpperCase() + prompt.section.slice(1)} Prompt
              </Text>
              <Textarea
                placeholder={`Enter prompt for ${prompt.section}`}
                value={prompt.prompt}
                onChange={(e) => onPromptChange(prompt.section, e.target.value)}
                minRows={4}
                autosize
                maxRows={8}
                styles={{
                  input: {
                    backgroundColor: '#000000',
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
          ))}
          
          {prompts.length === 0 && !isLoading && (
            <Text size="sm" c="dimmed" mb="lg">
              No prompts available. Save to create new prompts.
            </Text>
          )}
          
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
          
          <Group justify="flex-end" mt="xl">
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
              onClick={onSave}
              loading={isLoading && saveStatus === 'Saving...'}
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
              Save
            </Button>
          </Group>
        </Box>
      </Box>
    </Modal>
  );
};

export default CapsuleSettingsModal;