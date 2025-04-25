"use client";

import React, { useState, useCallback } from "react";
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
  Stack
} from '@mantine/core';
import { 
  ArrowLeft, 
  RefreshCw,
  Download,
  Plus,
  Trash,
  AlertCircle
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
}

export default function CapsuleView() {
  const params = useParams();
  const { list } = useNavigation();
  const capsuleId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";
  
  const { data: identity, refetch: identityRefetch } = useGetIdentity<Identity>();
  
  const { handleAuthError, getAccessToken, fetchWithAuth, ensureValidToken } = useAuth();
  
  const { queryResult } = useShow<Capsule>({
    resource: "capsules",
    id: capsuleId,
    queryOptions: {
      enabled: !!capsuleId && !!identity?.token,
      staleTime: 30000,
      retry: false,
      refetchInterval: false,
      onSuccess: (data) => {
        console.log("[CapsuleView] Capsule data loaded:", data);
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
  
  const { data, isLoading, isError } = queryResult;
  const record = data?.data;
  
  const [activeTab, setActiveTab] = useState("preview");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [lastFileIds, setLastFileIds] = useState<string[]>([]);
  
  const handleRegenerateCapsule = useCallback(async () => {
    if (!capsuleId) return;
    
    try {
      setIsRegenerating(true);
      setErrorMessage(null);
      
      console.log(`[CapsuleView] Regenerating capsule: ${capsuleId}`);
      const token = await ensureValidToken();
      if (!token) throw new Error('Authentication failed - unable to get valid token');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
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
      
      queryResult.refetch();
      console.log("[CapsuleView] Capsule regenerated successfully");
      
    } catch (error) {
      console.error("[CapsuleView] Failed to regenerate capsule:", error);
      const message = error instanceof Error 
        ? error.name === 'AbortError' 
          ? "Request timed out while regenerating capsule. Please try again."
          : error.message 
        : String(error);
      setErrorMessage(message);
    } finally {
      setIsRegenerating(false);
    }
  }, [capsuleId, ensureValidToken, queryResult]);

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
      
      const BATCH_SIZE = 5; // Batch to reduce backend load
      const batches = [];
      for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
        batches.push(fileIds.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`[CapsuleView] Processing ${batches.length} batches of files`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[CapsuleView] Sending batch ${i + 1}/${batches.length} with ${batch.length} files: ${JSON.stringify(batch)}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
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
        
        console.log(`[CapsuleView] Batch ${i + 1}/${batches.length} added successfully`);
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay between batches
        }
      }
      
      await handleRegenerateCapsule();
      queryResult.refetch();
      console.log("[CapsuleView] All files added successfully");
      
    } catch (error) {
      console.error("[CapsuleView] Failed to add files:", error);
      const message = error instanceof Error 
        ? error.name === 'AbortError' 
          ? "Request timed out while adding files. Try selecting fewer files or retry."
          : error.message 
        : String(error);
      setErrorMessage(message);
    } finally {
      setIsAddingFiles(false);
    }
  }, [capsuleId, ensureValidToken, handleRegenerateCapsule, queryResult]);

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
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
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
      
      queryResult.refetch();
      console.log("[CapsuleView] File removed successfully");
      
    } catch (error) {
      console.error("[CapsuleView] Failed to remove file:", error);
      const message = error instanceof Error 
        ? error.name === 'AbortError' 
          ? "Request timed out while removing file. Please try again."
          : error.message 
        : String(error);
      setErrorMessage(message);
    }
  }, [capsuleId, ensureValidToken, queryResult]);

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
            disabled={isRegenerating}
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
            loading={isRegenerating}
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
            Regenerate
          </Button>
          <Button 
            variant="default"
            leftSection={<Download size={16} />}
            onClick={handleDownloadMarkdown}
            disabled={!hasOutput}
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
                  backgroundColor: '#1a1a1a'
                }}>
                  <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                    {file.title}
                  </Text>
                  <ActionIcon 
                    color="red" 
                    onClick={() => handleRemoveFile(file._id)}
                    disabled={isRegenerating || isAddingFiles}
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
            disabled={isRegenerating || isAddingFiles}
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
                    {isRegenerating ? (
                      <>
                        <Text mb="md" fw={600}>Generating content...</Text>
                        <Text ta="center" c="dimmed" mb="md">
                          We're processing your files and generating capsule content. 
                          This may take a few minutes.
                        </Text>
                        <LoadingOverlay visible={true} />
                      </>
                    ) : hasFiles ? (
                      <>
                        <Text mb="md" fw={600}>Ready to generate</Text>
                        <Text ta="center" c="dimmed" mb="xl">
                          You've added files to your capsule. Click the "Regenerate" button 
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
                    No content available yet. Generate content first to see the source markdown.
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