import React, { useState, useCallback, useEffect } from 'react';
import {
  Text,
  Box,
  Group,
  Button,
  ActionIcon,
  Flex,
  TextInput,
  Modal,
  Divider,
  ScrollArea,
  Alert,
  Badge,
  Stack,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { X, Link, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface ReferenceEnrichmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalContent: string;
  onContentUpdate: (enrichedContent: string) => void;
}

const ReferenceEnrichmentModal: React.FC<ReferenceEnrichmentModalProps> = ({
  isOpen,
  onClose,
  originalContent,
  onContentUpdate
}) => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [foundReferences, setFoundReferences] = useState<string[]>([]);
  const [enrichedContent, setEnrichedContent] = useState('');

  const resetState = useCallback(() => {
    setFoundReferences([]);
    setEnrichedContent('');
  }, []);

  const extractReferencesFromContent = useCallback((content: string): string[] => {
    // Match patterns like [[306]], [306], and **306(url) but avoid double-matching
    const refs = new Set<string>();
    
    // First, find double bracket patterns [[306]]
    const doubleBracketMatches = Array.from(content.matchAll(/\[\[(\d+)\]\]/g));
    for (const match of doubleBracketMatches) {
      refs.add(match[1]);
    }
    
    // Then find single bracket patterns [306], but exclude those already found in double brackets
    const singleBracketMatches = Array.from(content.matchAll(/\[(\d+)\]/g));
    for (const match of singleBracketMatches) {
      // Check if this position is not part of a double bracket pattern
      const matchStart = match.index || 0;
      const beforeChar = content.charAt(matchStart - 1);
      const afterChar = content.charAt(matchStart + match[0].length);
      
      // Only add if it's not surrounded by additional brackets (not part of [[306]])
      if (beforeChar !== '[' && afterChar !== ']') {
        refs.add(match[1]);
      }
    }
    
    return Array.from(refs).sort((a, b) => parseInt(a) - parseInt(b));
  }, []);

  const enrichContentWithReferences = useCallback((
    content: string, 
    pdfUrl: string
  ): string => {
    let enrichedContent = content;
  
    // 🧼 Step 1: Strip bold/italic around references like **[[306]]**, __[306]__, etc.
    enrichedContent = enrichedContent.replace(/__\[\[(\d+)\]\]__/g, '[[$1]]');
    enrichedContent = enrichedContent.replace(/\*\*\[(\d+)\]\*\*/g, '[$1]');
    enrichedContent = enrichedContent.replace(/__\[(\d+)\]__/g, '[$1]');
  
    // 🧼 Step 2: Replace double-bracket references with proper markdown
    enrichedContent = enrichedContent.replace(/\[\[(\d+)\]\]/g, (match, refNum) => {
      return `*[${refNum}](${pdfUrl}#ts-${refNum})*`;
    });
  
    // 🧼 Step 3: Replace remaining standalone [306] references (not part of [[306]])
    enrichedContent = enrichedContent.replace(/(?<!\[)\[(\d+)\](?!\])/g, (match, refNum) => {
      return `*[${refNum}](${pdfUrl}#ts-${refNum})*`;
    });
  
    return enrichedContent;
  }, []);

  const handleProcessReferences = useCallback(() => {
    if (!pdfUrl.trim()) {
      notifications.show({
        title: 'Missing PDF URL',
        message: 'Please enter a PDF URL to create reference links.',
        color: 'yellow',
      });
      return;
    }

    if (!originalContent.trim()) {
      notifications.show({
        title: 'No Content',
        message: 'No content available to process.',
        color: 'yellow',
      });
      return;
    }

    // Find references in content
    const foundRefs = extractReferencesFromContent(originalContent);
    setFoundReferences(foundRefs);
    
    if (foundRefs.length === 0) {
      notifications.show({
        title: 'No References Found',
        message: 'No reference patterns like [306] or [[306]] found in content.',
        color: 'yellow',
      });
      return;
    }

    // Enrich content with links
    const enriched = enrichContentWithReferences(originalContent, pdfUrl);
    setEnrichedContent(enriched);

    // DEBUG: Check for malformed patterns in output
    const malformedPatterns = enriched.match(/\*{3,}\[/g);
    if (malformedPatterns) {
      console.error('MODAL ERROR: Found malformed patterns:', malformedPatterns);
      console.error('Sample enriched content:', enriched.substring(0, 300));
    } else {
      console.log('MODAL SUCCESS: Clean output produced');
    }

    notifications.show({
      title: 'References Processed',
      message: `Converted ${foundRefs.length} references to clickable links.`,
      color: 'green',
    });
  }, [pdfUrl, originalContent, extractReferencesFromContent, enrichContentWithReferences]);

  const handleApplyEnrichment = useCallback(() => {
    if (!enrichedContent) {
      notifications.show({
        title: 'No Enrichment',
        message: 'No references processed yet.',
        color: 'yellow',
      });
      return;
    }

    onContentUpdate(enrichedContent);
    
    notifications.show({
      title: 'Content Updated',
      message: 'Reference links have been added to your content.',
      color: 'green',
    });
    
    onClose();
  }, [enrichedContent, onContentUpdate, onClose]);

  const handleClose = useCallback(() => {
    resetState();
    setPdfUrl('');
    onClose();
  }, [resetState, onClose]);

  useEffect(() => {
    if (isOpen) {
      resetState();
      // Auto-scan for references when modal opens
      const foundRefs = extractReferencesFromContent(originalContent);
      setFoundReferences(foundRefs);
    }
  }, [isOpen, resetState, originalContent, extractReferencesFromContent]);

  const hasFoundReferences = foundReferences.length > 0;
  const hasEnrichedContent = !!enrichedContent;

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
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
            Add Reference Links
          </Text>
          <ActionIcon 
            onClick={handleClose} 
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
          Convert reference patterns like [[306]] into clickable PDF links
        </Text>
        
        <ScrollArea h={400} scrollbarSize={6} scrollHideDelay={500} type="auto" offsetScrollbars>
          {/* PDF URL Input */}
          <Box mb="lg">
            <Text size="sm" mb="xs" style={{ color: '#F5A623', fontWeight: 500 }}>
              PDF Source URL
            </Text>
            <TextInput
              placeholder="https://pdf.shrinked.ai/your-document.pdf"
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              leftSection={<Link size={16} />}
              styles={{
                input: {
                  backgroundColor: '#000000',
                  borderColor: '#2B2B2B',
                  color: '#ffffff',
                  borderWidth: '0.5px',
                  padding: '12px 16px',
                  paddingLeft: '40px',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  '&:focus': {
                    borderColor: '#F5A623',
                  },
                }
              }}
            />
          </Box>

          {/* Content Analysis */}
          <Box mb="lg">
            <Divider 
              my="md" 
              label="References Found" 
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
            
            {hasFoundReferences ? (
              <Box>
                <Text size="sm" mb="xs" c="dimmed">
                  Found {foundReferences.length} reference{foundReferences.length !== 1 ? 's' : ''} in content:
                </Text>
                <Group gap="xs" mb="md">
                  {foundReferences.slice(0, 15).map(ref => (
                    <Badge key={ref} variant="outline" color="gray" size="sm">
                      [{ref}]
                    </Badge>
                  ))}
                  {foundReferences.length > 15 && (
                    <Badge variant="outline" color="dimmed" size="sm">
                      +{foundReferences.length - 15} more
                    </Badge>
                  )}
                </Group>
              </Box>
            ) : originalContent ? (
              <Alert color="blue" variant="light" icon={<FileText size={16} />}>
                No reference patterns like [306] or [[306]] found in content
              </Alert>
            ) : (
              <Alert color="yellow" variant="light" icon={<AlertCircle size={16} />}>
                No content available to scan
              </Alert>
            )}
          </Box>

          {/* Preview of enriched content */}
          {hasEnrichedContent && (
            <Box mb="lg">
              <Divider 
                my="md" 
                label="Preview" 
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
              
              <Box
                p="sm"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2b2b2b',
                  borderRadius: '6px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}
              >
                <Text size="xs" c="dimmed" mb="xs">
                  Preview of enriched content (markdown):
                </Text>
                <pre 
                  style={{ 
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: '#e0e0e0',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace'
                  }}
                >
                  {enrichedContent.substring(0, 1500) + '...'}
                </pre>
              </Box>
            </Box>
          )}
        </ScrollArea>
        
        <Group justify="flex-end" mt="lg" gap="sm">
          <Button
            variant="default"
            onClick={handleClose}
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
            onClick={handleProcessReferences}
            disabled={!pdfUrl.trim() || !originalContent.trim() || !hasFoundReferences}
            leftSection={<Link size={16} />}
            styles={{
              root: {
                backgroundColor: '#2B82F6',
                color: '#ffffff',
                height: '44px',
                '&:hover': {
                  backgroundColor: '#1C64D8',
                },
              },
            }}
          >
            Create Links
          </Button>
          
          {hasEnrichedContent && (
            <Button
              onClick={handleApplyEnrichment}
              leftSection={<CheckCircle size={16} />}
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
              Apply Links
            </Button>
          )}
        </Group>
      </Box>
    </Modal>
  );
};

export default ReferenceEnrichmentModal;