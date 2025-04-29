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

interface CapsuleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  promptData: {
    summary: string;
    extraction: string;
    classification: string;
  };
  onPromptChange: (key: string, value: string) => void;
  onSave: () => void;
  saveStatus: string;
}

/**
 * Modal component for editing capsule prompts with Textarea inputs
 */
const CapsuleSettingsModal: React.FC<CapsuleSettingsModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  promptData,
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
        {/* Custom header with title and close button */}
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
        
        {/* Subtitle with instructions similar to Logic modal */}
        <Text size="md" mb="lg" style={{ 
          color: '#A1A1A1', 
          fontSize: '14px',
          fontFamily: 'inherit'
        }}>
          Edit the prompts used for this capsule&apos;s content generation
        </Text>
        
        {/* Loading overlay */}
        <Box style={{ position: 'relative', minHeight: '300px' }}>
          <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
          
          {/* Summary prompt */}
          <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
            Summary Prompt
          </Text>
          <Textarea
            placeholder="Enter prompt for summary generation"
            value={promptData.summary}
            onChange={(e) => onPromptChange('summary', e.target.value)}
            mb="lg"
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
                // Custom scrollbar styling
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
          
          {/* Extraction prompt */}
          <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
            Extraction Prompt
          </Text>
          <Textarea
            placeholder="Enter prompt for data extraction"
            value={promptData.extraction}
            onChange={(e) => onPromptChange('extraction', e.target.value)}
            mb="lg"
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
                // Custom scrollbar styling
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
          
          {/* Classification prompt */}
          <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
            Classification Prompt
          </Text>
          <Textarea
            placeholder="Enter prompt for classification"
            value={promptData.classification}
            onChange={(e) => onPromptChange('classification', e.target.value)}
            mb="lg"
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
                // Custom scrollbar styling
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
          
          {/* Save status message */}
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
          
          {/* Save and Cancel Buttons */}
          <Group position="right" mt="xl">
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