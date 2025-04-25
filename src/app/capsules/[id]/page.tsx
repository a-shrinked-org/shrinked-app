"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useNavigation, useShow, useGetIdentity } from "@refinedev/core";
import { 
  Text, 
  Box,
  Group,
  Button,
  Tabs,
  LoadingOverlay,
  ActionIcon,
  Badge,
  Alert,
  Code,
  Flex,
  Stack,
  Divider,
  Title
} from '@mantine/core';
import { 
  ArrowLeft, 
  RefreshCw,
  Download,
  Plus,
  Trash,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useParams } from "next/navigation";
import { useAuth } from "@/utils/authUtils";
import DocumentMarkdownWrapper from "@/components/DocumentMarkdownWrapper";
import { GeistMono } from 'geist/font/mono';
import FileSelector from '@/components/FileSelector';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
}

interface File {
  _id: string;
  title: string;
  createdAt: string;
}

interface Capsule {
  _id: string;
  name: string;
  slug: string;
  files: File[];
  userId: string;
  output?: {
    title?: string;
    abstract?: string;
    content?: string;
    references?: Array<{ item: string }>;
  };
  updatedAt: string;
  createdAt: string;
  status: string;
  summaryContext?: string; // Added summaryContext property
  highlights?: Array<{
    xml: string;
  }>;
}

export default function CapsuleView() {
  const params = useParams();
  const { list } = useNavigation();
  const capsuleId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";
  
  const { data: identity, refetch: identityRefetch } = useGetIdentity<Identity>();
  
  const { handleAuthError, getAccessToken, fetchWithAuth, ensureValidToken } = useAuth();
  
  // Fixed: useShow doesn't return refetch directly
  const { queryResult } = useShow<Capsule>({
    resource: "capsules",
    id: capsuleId,
    queryOptions: {
      enabled: !!capsuleId && !!identity?.token,
      staleTime: 30000,
      retry: false,
      refetchInterval: (data) => {
        // Poll for updates if the capsule is in processing state
        return data?.data?.status === 'PROCESSING' ? 5000 : false;
      },
      onSuccess: (data) => {
        console.log("[CapsuleView] Capsule data loaded:", data);
        if (data?.data?.status === 'COMPLETED' && isRegenerating) {
          setIsRegenerating(false);
        }
      },
      onError: (error) => {
        console.error("[CapsuleView] Error loading capsule:", error);
        handleAuthError(error);
        const message = error.status === 404 
          ? "Capsule not found. Please check the capsule ID or create a new one."
          : "Failed to load capsule details: " + (error.message || "Unknown error");
        setErrorMessage(message);
      }
    },
    meta: {
      headers: { 'Authorization': `Bearer ${getAccessToken() || identity?.token || ''}` },
      url: `/api/capsule/${capsuleId}`
    }
  });
  
  const { data, isLoading, isError, refetch } = queryResult;
  const record = data?.data;
  
  const [activeTab, setActiveTab] = useState("preview");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [lastFileIds, setLastFileIds] = useState<string[]>([]);
  const [addedFileIds, setAddedFileIds] = useState<string[]>([]);
  
  // Extract summary content from summaryContext if available
  const extractSummaryContent = (summaryContext?: string) => {
    if (!summaryContext) return null;
    
    // Extract content between <summary> tags
    // Fixed: Removed 's' flag from regex to be compatible with older JS versions
    const summaryMatch = summaryContext.match(/<summary>([\s\S]*?)<\/summary>/);
    return summaryMatch ? summaryMatch[1].trim() : null;
  };

  // Extract scratchpad content if available
  const extractScratchpadContent = (summaryContext?: string) => {
    if (!summaryContext) return null;
    
    // Extract content between <scratchpad> tags
    // Fixed: Removed 's' flag from regex to be compatible with older JS versions
    const scratchpadMatch = summaryContext.match(/<scratchpad>([\s\S]*?)<\/scratchpad>/);
    return scratchpadMatch ? scratchpadMatch[1].trim() : null;
  };
  
  // Poll for updates if in processing state
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (record?.status === 'PROCESSING') {
      intervalId = setInterval(() => {
        refetch();
      }, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [record?.status, refetch]);
  
  const handleRegenerateCapsule = useCallback(async () => {
    if (!capsuleId) return;
    
    try {
      setIsRegenerating(true);
      setErrorMessage(null);
      
      console.log(`[CapsuleView] Regenerating capsule: ${capsuleId}`);
      const token = await ensureValidToken();
      if (!token) throw new Error('Authentication failed - unable to get valid token');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(`/api/capsule/${capsuleId}/regenerate`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to regenerate capsule: ${response.status}`);
      }
      
      // Refresh data after a short delay to allow processing to start
      setTimeout(() => refetch(), 1000);
      console.log("[CapsuleView] Regenerate request sent successfully");
      
    } catch (error: any) {
      console.error("[CapsuleView] Failed to regenerate capsule:", error);
      const message = error instanceof Error 
        ? error.name === 'AbortError' 
          ? "Request timed out while regenerating capsule. Please try again."
          : error.message 
        : String(error);
      setErrorMessage(message);
      setIsRegenerating(false);
    }
  }, [capsuleId, ensureValidToken, refetch]);

  const handleAddFile = useCallback(() => {
    setIsFileSelectorOpen(true);
  }, []);
  
  const handleFileSelect = useCallback(async (fileIds: string[]) => {
    if (!capsuleId || fileIds.length === 0) return;
    
    try {
      setIsAddingFiles(true);
      setErrorMessage(null);
      setLastFileIds(fileIds);
      
      console.log(`[CapsuleView] Adding ${fileIds.length} files to capsule ${capsuleId}`);
      const token = await ensureValidToken();
      if (!token) throw new Error('Authentication failed - unable to get valid token');
      
      // Track which file IDs were successfully added
      const successfullyAddedIds: string[] = [];
      
      const BATCH_SIZE = 5;
      const batches = [];
      for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
        batches.push(fileIds.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`[CapsuleView] Processing ${batches.length} batches of files`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[CapsuleView] Sending batch ${i + 1}/${batches.length} with ${batch.length} files: ${JSON.stringify(batch)}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        const response = await fetch(`/api/capsule/${capsuleId}/files`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fileIds: batch }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to add files in batch ${i + 1}: ${response.status}`);
        }
        
        // Add successful file IDs to our tracking array
        successfullyAddedIds.push(...batch);
        
        console.log(`[CapsuleView] Batch ${i + 1}/${batches.length} added successfully`);
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Store the successfully added file IDs
      setAddedFileIds(successfullyAddedIds);
      
      // Refetch to update the file list
      refetch();
      
      // Start regeneration if files were added
      if (successfullyAddedIds.length > 0) {
        await handleRegenerateCapsule();
      }
      
      console.log("[CapsuleView] All files added successfully");
      
    } catch (error: any) {
      console.error("[CapsuleView] Failed to add files:", error);
      const message = error instanceof Error 
        ? error.name === 'AbortError' 
          ? "Request timed out while adding files. Try selecting fewer files or retry."
          : error.message 
        : String(error);
      setErrorMessage(message);
    } finally {
      setIsAddingFiles(false);
      setIsFileSelectorOpen(false);  // Close the file selector
    }
  }, [capsuleId, ensureValidToken, handleRegenerateCapsule, refetch]);

  const handleRetry = useCallback(() => {
    if (lastFileIds.length > 0) {
      handleFileSelect(lastFileIds);
    }
  }, [lastFileIds, handleFileSelect]);

  const handleRemoveFile = useCallback(async (fileId: string) => {
    if (!capsuleId || !fileId) return;
    
    try {
      setErrorMessage(null);
      
      console.log(`[CapsuleView] Removing file: ${fileId}`);
      const token = await ensureValidToken();
      if (!token) throw new Error('Authentication failed - unable to get valid token');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(`/api/capsule/${capsuleId}/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to remove file: ${response.status}`);
      }
      
      // Refresh data to update file list
      refetch();
      console.log("[CapsuleView] File removed successfully");
      
      // If we have at least one file left, regenerate the capsule
      if ((record?.files?.length || 0) > 1) {
        await handleRegenerateCapsule();
      }
      
    } catch (error: any) {
      console.error("[CapsuleView] Failed to remove file:", error);
      const message = error instanceof Error 
        ? error.name === 'AbortError' 
          ? "Request timed out while removing file. Please try again."
          : error.message 
        : String(error);
      setErrorMessage(message);
    }
  }, [capsuleId, ensureValidToken, refetch, record?.files?.length, handleRegenerateCapsule]);

  const handleDownloadMarkdown = useCallback(async () => {
    if (!record?.output?.content) return;
    
    try {
      console.log("[CapsuleView] Downloading markdown");
      const blob = new Blob([record.output.content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${record.name || 'capsule'}.md`;
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("[CapsuleView] Failed to download markdown:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }, [record]);

  const handleBackToList = useCallback(() => {
    list("capsules");
  }, [list]);

  if (isLoading) {
    return (
      <Box p="md">
        <LoadingOverlay visible={true} />
      </Box>
    );
  }

  if (isError || !record) {
    return (
      <Box p="md">
        <Alert 
          color="red" 
          title="Error Loading Capsule"
          icon={<AlertCircle size={16} />}
        >
          {errorMessage || "Failed to load capsule details. Please try again later."}
        </Alert>
        <Button mt="md" onClick={handleBackToList} leftSection={<ArrowLeft size={16} />}>
          Back to Capsules
        </Button>
      </Box>
    );
  }

  const hasFiles = record.files && record.files.length > 0;
  const hasOutput = record.output && record.output.content;
  const isProcessing = record.status === 'PROCESSING';
  
  // Extract summary and scratchpad content
  const summaryContent = extractSummaryContent(record.summaryContext);
  const scratchpadContent = extractScratchpadContent(record.summaryContext);
  
  return (
    <Box style={{ 
      backgroundColor: '#0a0a0a', 
      minHeight: '100vh', 
      padding: '24px'
    }}>
      <Group mb="xl" justify="space-between">
        <Group>
          <ActionIcon 
            size="lg" 
            variant="subtle" 
            onClick={handleBackToList}
            style={{ color: '#a0a0a0' }}
          >
            <ArrowLeft size={20} />
          </ActionIcon>
          <Text 
            size="xl" 
            fw={600}
            style={{ 
              fontFamily: GeistMono.style.fontFamily,
              letterSpacing: '0.5px'
            }}
          >
            {record.name || "Unnamed Capsule"}
          </Text>
          <Badge 
            color={
              record.status === 'COMPLETED' ? 'green' : 
              record.status === 'PROCESSING' ? 'yellow' : 
              record.status === 'PENDING' ? 'blue' : 
              'gray'
            }
            variant="filled"
            style={{ textTransform: 'uppercase' }}
          >
            {record.status || 'Unknown'}
          </Badge>
        </Group>
        
        <Group>
          <Button 
            variant="default" 
            leftSection={<Plus size={16} />} 
            onClick={handleAddFile} 
            loading={isAddingFiles}
            disabled={isRegenerating || isProcessing}
            styles={{
              root: {
                borderColor: '#2b2b2b',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2b2b2b',
                },
              },
            }}
          >
            Add Files
          </Button>
          <Button 
            variant="default" 
            leftSection={<RefreshCw size={16} />} 
            onClick={handleRegenerateCapsule}
            loading={isRegenerating || isProcessing}
            disabled={!hasFiles || isAddingFiles}
            styles={{
              root: {
                borderColor: '#2b2b2b',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2b2b2b',
                },
              },
            }}
          >
            {isProcessing ? 'Processing...' : 'Regenerate'}
          </Button>
          <Button 
            variant="default"
            leftSection={<Download size={16} />}
            onClick={handleDownloadMarkdown}
            disabled={!hasOutput || isProcessing || isRegenerating}
            styles={{
              root: {
                borderColor: '#2b2b2b',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2b2b2b',
                },
              },
            }}
          >
            Download
          </Button>
        </Group>
      </Group>
      
      {errorMessage && (
        <Alert 
          color="red" 
          title="Error" 
          mb="md"
          icon={<AlertCircle size={16} />}
        >
          {errorMessage}
          {errorMessage.includes("timed out") && lastFileIds.length > 0 && (
            <Button
              mt="sm"
              onClick={handleRetry}
              leftSection={<RefreshCw size={16} />}
              styles={{
                root: {
                  backgroundColor: '#F5A623',
                  color: '#000000',
                  '&:hover': { backgroundColor: '#E09612' },
                },
              }}
            >
              Retry
            </Button>
          )}
        </Alert>
      )}

      <Flex gap="xl">
        <Box 
          w={300} 
          style={{ 
            backgroundColor: '#131313', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid #2b2b2b'
          }}
        >
          <Text 
            fw={600} 
            mb="md"
            ta="center"
            style={{ 
              fontFamily: GeistMono.style.fontFamily,
              letterSpacing: '0.5px'
            }}
          >
            SOURCE FILES
          </Text>
          
          {hasFiles ? (
            <Stack gap="sm" style={{ 
              maxHeight: 'calc(100vh - 250px)',
              overflowY: 'auto'
            }}>
              {record.files.map((file) => (
                <Group key={file._id} justify="space-between" style={{ 
                  padding: '8px 12px', 
                  borderRadius: '4px', 
                  backgroundColor: '#1a1a1a',
                  // Highlight newly added files
                  border: addedFileIds.includes(file._id) ? '1px solid #F5A623' : '1px solid transparent'
                }}>
                  <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                    {file.title}
                  </Text>
                  <ActionIcon 
                    color="red" 
                    onClick={() => handleRemoveFile(file._id)}
                    disabled={isRegenerating || isAddingFiles || isProcessing}
                  >
                    <Trash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          ) : (
            <Alert color="blue" title="No Files Added">
              Add files to your capsule to get started.
            </Alert>
          )}
          
          <Button 
            fullWidth 
            mt="md" 
            leftSection={<Plus size={16} />} 
            onClick={handleAddFile}
            disabled={isRegenerating || isAddingFiles || isProcessing}
            loading={isAddingFiles}
            styles={{
              root: {
                backgroundColor: '#F5A623',
                color: '#000000',
                '&:hover': {
                  backgroundColor: '#E09612',
                },
              },
            }}
          >
            Add Files
          </Button>
        </Box>
        
        <Box style={{ flex: 1 }}>
          <Tabs 
            value={activeTab} 
            onChange={(value) => setActiveTab(value as string)}
            styles={{
              list: {
                borderBottom: '1px solid #2b2b2b',
              },
              tab: {
                color: '#a0a0a0',
                '&[data-active]': {
                  color: '#F5A623',
                },
              },
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="preview">Preview</Tabs.Tab>
              <Tabs.Tab value="summary" disabled={!summaryContent}>Summary</Tabs.Tab>
              <Tabs.Tab value="source">Source</Tabs.Tab>
            </Tabs.List>
            
            <Tabs.Panel value="preview">
              <Box p="md" style={{ 
                backgroundColor: '#131313', 
                borderRadius: '0 0 8px 8px', 
                minHeight: 'calc(100vh - 250px)',
                maxHeight: 'calc(100vh - 250px)',
                overflowY: 'auto',
                border: '1px solid #2b2b2b',
                borderTop: 'none'
              }}>
                {hasOutput ? (
                  <Box>
                    {record.output?.title && (
                      <Text size="xl" fw={700} mb="md">{record.output.title}</Text>
                    )}
                    
                    {record.output?.abstract && (
                      <Box mb="md" p="md" style={{ 
                        backgroundColor: '#1a1a1a', 
                        borderRadius: '4px',
                        border: '1px solid #2b2b2b' 
                      }}>
                        <Text fw={600} mb="xs">Abstract</Text>
                        <Text fz="sm">{record.output.abstract}</Text>
                      </Box>
                    )}
                    
                    {record.output?.content && (
                      <DocumentMarkdownWrapper 
                        markdown={record.output.content} 
                      />
                    )}
                    
                    {record.output?.references && record.output.references.length > 0 && (
                      <Box mt="xl" p="md" style={{ 
                        backgroundColor: '#1a1a1a', 
                        borderRadius: '4px',
                        border: '1px solid #2b2b2b' 
                      }}>
                        <Text fw={600} mb="md">References</Text>
                        <Stack gap="sm">
                          {record.output.references.map((ref, index) => (
                            <Text key={index} size="sm">{ref.item}</Text>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Stack align="center" justify="center" style={{ height: '100%', p: '20px' }}>
                    {isProcessing || isRegenerating ? (
                      <>
                        <Text mb="md" fw={600}>Generating content...</Text>
                        <Text ta="center" c="dimmed" mb="md">
                          We&apos;re processing your files and generating capsule content. 
                          This may take a few minutes.
                        </Text>
                        <LoadingOverlay visible={true} />
                      </>
                    ) : hasFiles ? (
                      <>
                        <Text mb="md" fw={600}>Ready to generate</Text>
                        <Text ta="center" c="dimmed" mb="xl">
                          You&apos;ve added files to your capsule. Click the &quot;Regenerate&quot; button 
                          to analyze them and generate content.
                        </Text>
                        <Button 
                          leftSection={<RefreshCw size={16} />}
                          onClick={handleRegenerateCapsule}
                          styles={{
                            root: {
                              backgroundColor: '#F5A623',
                              color: '#000000',
                              '&:hover': {
                                backgroundColor: '#E09612',
                              },
                            },
                          }}
                        >
                          Generate Capsule
                        </Button>
                      </>
                    ) : (
                      <>
                        <Text mb="md" fw={600}>No content yet</Text>
                        <Text ta="center" c="dimmed" mb="xl">
                          Add files to your capsule first, then generate content to see it here.
                        </Text>
                        <Button 
                          leftSection={<Plus size={16} />}
                          onClick={handleAddFile}
                          styles={{
                            root: {
                              backgroundColor: '#F5A623',
                              color: '#000000',
                              '&:hover': {
                                backgroundColor: '#E09612',
                              },
                            },
                          }}
                        >
                          Add Files
                        </Button>
                      </>
                    )}
                  </Stack>
                )}
              </Box>
            </Tabs.Panel>
            
            <Tabs.Panel value="summary">
              <Box p="md" style={{ 
                backgroundColor: '#131313', 
                borderRadius: '0 0 8px 8px', 
                minHeight: 'calc(100vh - 250px)',
                maxHeight: 'calc(100vh - 250px)',
                overflowY: 'auto',
                border: '1px solid #2b2b2b',
                borderTop: 'none'
              }}>
                {summaryContent ? (
                  <Box>
                    <Group mb="md" align="center">
                      <FileText size={20} />
                      <Title order={3}>Generated Summary</Title>
                    </Group>
                    
                    <DocumentMarkdownWrapper 
                      markdown={summaryContent} 
                    />
                    
                    {scratchpadContent && (
                      <>
                        <Divider my="lg" label="Analysis Process" labelPosition="center" />
                        <Box mt="md" p="md" style={{ 
                          backgroundColor: '#1a1a1a', 
                          borderRadius: '4px',
                          border: '1px solid #2b2b2b' 
                        }}>
                          <Title order={4} mb="md">Thinking Process</Title>
                          <Code 
                            block 
                            style={{ 
                              backgroundColor: '#0a0a0a',
                              color: '#a0a0a0',
                              fontFamily: GeistMono.style.fontFamily,
                              fontSize: '14px',
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.6
                            }}
                          >
                            {scratchpadContent}
                          </Code>
                        </Box>
                      </>
                    )}
                    
                    {record.highlights && record.highlights.length > 0 && (
                      <>
                        <Divider my="lg" label="Highlights" labelPosition="center" />
                        <Stack gap="md">
                          {record.highlights.map((highlight, index) => {
                            // Simple XML parsing to extract field name and content
                            // Fixed: Removed 's' flag from regex to be compatible with older JS versions
                            const nameMatch = highlight.xml.match(/<field_name>([\s\S]*?)<\/field_name>/);
                            const contentMatch = highlight.xml.match(/<field_content>([\s\S]*?)<\/field_content>/);
                            
                            if (!nameMatch || !contentMatch) return null;
                            
                            return (
                              <Box key={index} p="md" style={{ 
                                backgroundColor: '#1a1a1a', 
                                borderRadius: '4px',
                                border: '1px solid #2b2b2b' 
                              }}>
                                <Title order={4} mb="xs">{nameMatch[1]}</Title>
                                <DocumentMarkdownWrapper 
                                  markdown={contentMatch[1]} 
                                />
                              </Box>
                            );
                          })}
                        </Stack>
                      </>
                    )}
                  </Box>
                ) : (
                  <Text ta="center" c="dimmed">
                    No summary content available yet.
                  </Text>
                )}
              </Box>
            </Tabs.Panel>
            
            <Tabs.Panel value="source">
              <Box p="md" style={{ 
                backgroundColor: '#131313', 
                borderRadius: '0 0 8px 8px', 
                minHeight: 'calc(100vh - 250px)',
                maxHeight: 'calc(100vh - 250px)',
                overflowY: 'auto',
                border: '1px solid #2b2b2b',
                borderTop: 'none'
              }}>
                {hasOutput && record.output?.content ? (
                  <Code 
                    block 
                    style={{ 
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #2b2b2b',
                      color: '#d4d4d4',
                      minHeight: '500px',
                      fontFamily: GeistMono.style.fontFamily,
                      fontSize: '14px',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'break-word'
                    }}
                  >
                    {record.output.content}
                  </Code>
                ) : (
                  <Text ta="center" c="dimmed">
                    {isProcessing || isRegenerating ? 
                      "Content is being generated..." : 
                      "No content available yet. Generate content first to see the source markdown."}
                  </Text>
                )}
              </Box>
            </Tabs.Panel>
          </Tabs>
        </Box>
      </Flex>
      
      <FileSelector 
        opened={isFileSelectorOpen}
        onClose={() => setIsFileSelectorOpen(false)}
        onSelect={handleFileSelect}
        capsuleId={capsuleId}
        existingFileIds={record?.files?.map(f => f._id) || []}
      />
    </Box>
  );
}