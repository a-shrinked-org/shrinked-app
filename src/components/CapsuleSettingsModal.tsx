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
  Divider,
  ScrollArea,
} from '@mantine/core';
import { X } from 'lucide-react';

interface CapsuleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  summary: string;
  highlights: string;
  testSummary: string;
  onSummaryChange: (value: string) => void;
  onHighlightsChange: (value: string) => void;
  onTestSummaryChange: (value: string) => void;
  onSave: () => void;
  saveStatus: string;
}

const CapsuleSettingsModal: React.FC<CapsuleSettingsModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  summary,
  highlights,
  testSummary,
  onSummaryChange,
  onHighlightsChange,
  onTestSummaryChange,
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
        
        <Text size="md" mb="lg" style={{ 
          color: '#A1A1A1', 
          fontSize: '14px',
          fontFamily: 'inherit'
        }}>
          Edit the admin prompts used for content generation
        </Text>
        
        <Box style={{ position: 'relative' }}>
          <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
          
          <ScrollArea h={450} scrollbarSize={6} scrollHideDelay={500} type="auto" offsetScrollbars>
            {/* Capsule Summary Prompt */}
            <Box mb="lg">
              <Divider 
                my="md" 
                label="Capsule Summary" 
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
                value={summary}
                onChange={(e) => onSummaryChange(e.target.value)}
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
            
            {/* Highlights Prompt */}
            <Box mb="lg">
              <Divider 
                my="md" 
                label="Capsule Highlights" 
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
                placeholder="Extract key highlights from the documents."
                value={highlights}
                onChange={(e) => onHighlightsChange(e.target.value)}
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
            
            {/* Test Summary Prompt */}
            <Box mb="lg">
              <Divider 
                my="md" 
                label="Test Summary" 
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
                value={testSummary}
                onChange={(e) => onTestSummaryChange(e.target.value)}
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
              <Text size="xs" mt="xs" style={{ color: '#666666' }}>
                Test summary allows you to test specific summary configurations, e.g., non-English summaries
              </Text>
            </Box>
          </ScrollArea>
          
          {saveStatus && (
            <Text 
              size="sm" 
              c={saveStatus === 'Saved successfully' ? 'green' : 
                 saveStatus === 'Saving...' ? 'orange' : 'red'} 
              mb="md"
              mt="md"
            >
              {saveStatus}
            </Text>
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
              Save Settings
            </Button>
          </Group>
        </Box>
      </Box>
    </Modal>
  );
};

export default CapsuleSettingsModal;