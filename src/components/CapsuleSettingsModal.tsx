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
  // Find specific prompts
  const summaryPrompt = prompts.find(p => p.section === 'capsule.summary');
  const highlightsPrompt = prompts.find(p => p.section === 'capsule.highlights');
  const testSummaryPrompt = prompts.find(p => p.section === 'capsule.testSummary');
  
  // Prepare list of prompts by type for organization
  const capsulePrompts = prompts.filter(p => p.section.startsWith('capsule.') && 
    p.section !== 'capsule.summary' && 
    p.section !== 'capsule.highlights' && 
    p.section !== 'capsule.testSummary');
  
  const otherPrompts = prompts.filter(p => !p.section.startsWith('capsule.'));

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
            {/* Summary Prompt Section */}
            {summaryPrompt && (
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
                
                <Box mb="lg">
                  <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
                    Summary Prompt
                  </Text>
                  <Textarea
                    placeholder="Generate a comprehensive summary of the provided documents. Focus on extracting key insights, main arguments, and significant findings."
                    value={summaryPrompt.prompt}
                    onChange={(e) => onPromptChange('capsule.summary', e.target.value)}
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
                  
                  <Box mt="sm">
                    <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
                      Summary Prefill
                    </Text>
                    <Textarea
                      placeholder="# Executive Summary"
                      value={summaryPrompt.prefill || ''}
                      onChange={(e) => onPromptChange('capsule.summary.prefill', e.target.value)}
                      minRows={2}
                      autosize
                      maxRows={4}
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
                      Prefill text that will be added at the beginning of the summary (often used for headings)
                    </Text>
                  </Box>
                </Box>
              </Box>
            )}
            
            {/* Highlights Prompt Section */}
            {highlightsPrompt && (
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
                
                <Box mb="lg">
                  <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
                    Highlights Prompt
                  </Text>
                  <Textarea
                    placeholder="Extract the most important highlights from the documents."
                    value={highlightsPrompt.prompt}
                    onChange={(e) => onPromptChange('capsule.highlights', e.target.value)}
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
                  
                  {highlightsPrompt.prefill !== undefined && (
                    <Box mt="sm">
                      <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
                        Highlights Prefill
                      </Text>
                      <Textarea
                        placeholder="# Key Highlights"
                        value={highlightsPrompt.prefill || ''}
                        onChange={(e) => onPromptChange('capsule.highlights.prefill', e.target.value)}
                        minRows={2}
                        autosize
                        maxRows={4}
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
                  )}
                </Box>
              </Box>
            )}
            
            {/* Test Summary Prompt Section */}
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
              
              <Box mb="lg">
                <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
                  Test Summary Prompt
                </Text>
                <Textarea
                  placeholder="Generate a test summary to verify functionality."
                  value={testSummaryPrompt?.prompt || ''}
                  onChange={(e) => onPromptChange('capsule.testSummary', e.target.value)}
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
                
                {testSummaryPrompt?.prefill !== undefined && (
                  <Box mt="sm">
                    <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
                      Test Summary Prefill
                    </Text>
                    <Textarea
                      placeholder="# Test Summary"
                      value={testSummaryPrompt.prefill || ''}
                      onChange={(e) => onPromptChange('capsule.testSummary.prefill', e.target.value)}
                      minRows={2}
                      autosize
                      maxRows={4}
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
                      This prompt is used for testing summaries with specific parameters like language
                    </Text>
                  </Box>
                )}
                <Text size="xs" mt="xs" style={{ color: '#666666' }}>
                  Test summary allows you to test specific summary configurations, e.g., non-English summaries
                </Text>
              </Box>
            </Box>
            
            {/* Other Capsule Prompts */}
            {capsulePrompts.length > 0 && (
              <>
                <Divider 
                  my="md" 
                  label="Other Capsule Prompts" 
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
                
                {capsulePrompts.map((prompt) => (
                  <Box key={prompt.section} mb="lg">
                    <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
                      {prompt.section.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Text>
                    <Textarea
                      placeholder={`Enter prompt for ${prompt.section}`}
                      value={prompt.prompt}
                      onChange={(e) => onPromptChange(prompt.section, e.target.value)}
                      minRows={3}
                      autosize
                      maxRows={6}
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
                    
                    {prompt.prefill !== undefined && (
                      <Box mt="sm">
                        <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
                          Prefill
                        </Text>
                        <Textarea
                          placeholder="# Prefill Content"
                          value={prompt.prefill || ''}
                          onChange={(e) => onPromptChange(`${prompt.section}.prefill`, e.target.value)}
                          minRows={2}
                          autosize
                          maxRows={4}
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
                    )}
                  </Box>
                ))}
              </>
            )}
            
            {/* Non-Capsule Prompts */}
            {otherPrompts.length > 0 && (
              <>
                <Divider 
                  my="md" 
                  label="Other Prompts" 
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
                
                {otherPrompts.map((prompt) => (
                  <Box key={prompt.section} mb="lg">
                    <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
                      {prompt.section.charAt(0).toUpperCase() + prompt.section.slice(1)}
                    </Text>
                    <Textarea
                      placeholder={`Enter prompt for ${prompt.section}`}
                      value={prompt.prompt}
                      onChange={(e) => onPromptChange(prompt.section, e.target.value)}
                      minRows={3}
                      autosize
                      maxRows={6}
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
              </>
            )}
            
            {/* No prompts fallback */}
            {prompts.length === 0 && !isLoading && (
              <Text size="sm" c="dimmed" mb="lg" ta="center">
                No prompts available. Create new prompts below and save to begin.
              </Text>
            )}
            
            {/* Create New Summary Prompt button */}
            {!summaryPrompt && !isLoading && (
              <Box mb="lg">
                <Text fw={500} size="sm" mb="xs" c="#F5A623">
                  Create Capsule Summary Prompt
                </Text>
                <Textarea
                  placeholder="Generate a comprehensive summary of the provided documents. Focus on extracting key insights, main arguments, and significant findings."
                  value=""
                  onChange={(e) => onPromptChange('capsule.summary', e.target.value)}
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
                    }
                  }}
                />
                <Text size="xs" mt="xs" style={{ color: '#666666' }}>
                  This prompt instructs the AI how to generate the summary from source documents
                </Text>
              </Box>
            )}
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
              Save & Regenerate
            </Button>
          </Group>
        </Box>
      </Box>
    </Modal>
  );
};

export default CapsuleSettingsModal;