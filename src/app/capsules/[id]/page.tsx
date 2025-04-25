"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Collapse,
  Skeleton
} from '@mantine/core';
import { 
  ArrowLeft, 
  Share,
  RefreshCw,
  Download,
  Pencil,
  Plus,
  Trash
} from 'lucide-react';
import { useParams } from "next/navigation";
import { useAuth, API_CONFIG } from "@/utils/authUtils";
import DocumentMarkdownRenderer from "@/components/DocumentMarkdownRenderer";
import { useDisclosure } from '@mantine/hooks';
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
  
  const { refreshToken, handleAuthError, getAccessToken, fetchWithAuth, ensureValidToken } = useAuth();
  
  const { queryResult } = useShow<Capsule>({
    resource: "capsules",
    id: capsuleId,
    queryOptions: {
      enabled: !!capsuleId && !!identity?.token,
      staleTime: 30000,
      onSuccess: (data) => {
        console.log("Capsule data loaded:", data);
      },
      onError: (error) => {
        console.error("Error loading capsule:", error);
        handleAuthError(error);
        setErrorMessage("Failed to load capsule details: " + (error.message || "Unknown error"));
      }
    },
    meta: {
      headers: { 'Authorization': `Bearer ${getAccessToken() || identity?.token || ''}` },
      url: `/api/capsules-proxy/${capsuleId}` // Use the unified proxy
    }
  });
  
  const { data, isLoading, isError } = queryResult;
  const record = data?.data;
  
  const [activeTab, setActiveTab] = useState("preview");
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  
  const handleRegenerateCapsule = useCallback(async () => {
    if (!capsuleId) return;
    
    try {
      setIsRegenerating(true);
      setErrorMessage(null);
      
      const token = await ensureValidToken();
      if (!token) throw new Error('Authentication failed - unable to get valid token');
      
      const response = await fetch(`/api/capsules-proxy/${capsuleId}/regenerate`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to regenerate capsule: ${response.status}`);
      }
      
      // After successful regeneration, refresh the data
      queryResult.refetch();
      
      // Set some success message or update UI as needed
      console.log("Capsule regenerated successfully");
      
    } catch (error) {
      console.error("Failed to regenerate capsule:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
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
      
      const token = await ensureValidToken();
      if (!token) throw new Error('Authentication failed - unable to get valid token');
      
      const response = await fetch(`/api/capsules-proxy/${capsuleId}/files`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileIds })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add files to capsule: ${response.status}`);
      }
      
      // After successfully adding files, regenerate the capsule
      await handleRegenerateCapsule();
      
      // Refresh the data to show the newly added files
      queryResult.refetch();
      
    } catch (error) {
      console.error("Failed to add files:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsAddingFiles(false);
    }
  }, [capsuleId, ensureValidToken, handleRegenerateCapsule, queryResult]);

  const handleRemoveFile = useCallback(async (fileId: string) => {
    if (!capsuleId || !fileId) return;
    
    try {
      setErrorMessage(null);
      
      const token = await ensureValidToken();
      if (!token) throw new Error('Authentication failed - unable to get valid token');
      
      const response = await fetch(`/api/capsules-proxy/${capsuleId}/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to remove file: ${response.status}`);
      }
      
      // After successful removal, refresh the data
      queryResult.refetch();
      
    } catch (error) {
      console.error("Failed to remove file:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }, [capsuleId, ensureValidToken, queryResult]);

  const handleDownloadMarkdown = useCallback(async () => {
    if (!record?.output?.content) return;
    
    try {
      // Create a blob from the markdown content
      const blob = new Blob([record.output.content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${record.name || 'capsule'}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download markdown:", error);
      setErrorMessage(`Error downloading markdown: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [record]);

  const renderSkeletonLoader = () => (
    <Flex style={{ flex: 1, overflow: 'hidden' }}>
      <Box style={{ flex: 1, padding: '24px' }}>
        <Box style={{ maxWidth: '750px', margin: '0 auto' }}>
          <Skeleton height={20} width="100px" mb="lg" />
          <Skeleton height={40} width="70%" mb="xs" />
          <Skeleton height={16} width="50%" mb="lg" />
          <Skeleton height={40} width="100%" mb="md" />
          <Skeleton height={200} width="100%" />
        </Box>
      </Box>
      <Box style={{ 
        width: '384px', 
        borderLeft: '1px solid #2B2B2B', 
        padding: '1.5rem',
        backgroundColor: '#000000'
      }}>
        <Skeleton height={20} width="80%" mb="md" />
        <Skeleton height={16} width="60%" mb="xs" />
        <Skeleton height={16} width="40%" mb="md" />
        <Skeleton height={16} width="70%" mb="xs" />
        <Skeleton height={16} width="50%" mb="md" />
        <Skeleton height={100} width="100%" />
      </Box>
    </Flex>
  );

  const renderPreviewContent = () => {
    if (isLoading || isLoadingContent) {
      return (
        <Box style={{ position: 'relative', minHeight: '300px' }}>
          <LoadingOverlay visible={true} />
        </Box>
      );
    }

    if (errorMessage) {
      return (
        <Alert 
          icon={<RefreshCw size={16} />}
          color="red" 
          title="Error"
          mb="md"
        >
          {errorMessage}
          <Button 
            leftSection={<RefreshCw size={16} />}
            mt="sm"
            onClick={() => queryResult.refetch()}
            variant="light"
            size="sm"
          >
            Try again
          </Button>
        </Alert>
      );
    }

    if (record?.output?.content) {
      return (
        <DocumentMarkdownRenderer 
          markdown={record.output.content}
          isLoading={false}
          errorMessage={null}
          onRefresh={() => queryResult.refetch()}
          processingStatus={record.status}
        />
      );
    }

    if (record?.status === 'processing') {
      return (
        <Alert 
          color="yellow"
          title="Processing"
          mb="md"
        >
          Your capsule is being processed. This may take a few minutes.
          <Button 
            leftSection={<RefreshCw size={16} />}
            mt="sm"
            onClick={() => queryResult.refetch()}
            variant="light"
            size="sm"
          >
            Check Status
          </Button>
        </Alert>
      );
    }

    return (
      <Alert 
        color="blue"
        title="No Content"
        mb="md"
      >
        This capsule does not have any content yet. Add files to your capsule and generate content.
        <Button 
          leftSection={<Plus size={16} />}
          mt="sm"
          onClick={handleAddFile}
          variant="light"
          size="sm"
        >
          Add Files
        </Button>
      </Alert>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!identity?.token) {
    return (
      <Box>
        <LoadingOverlay visible />
        <Text>Authentication required</Text>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        backgroundColor: '#0a0a0a', 
        color: '#ffffff' 
      }}>
        <Flex 
          justify="space-between" 
          align="center" 
          p="sm" 
          style={{ 
            borderBottom: '1px solid #2b2b2b', 
            flexShrink: 0,
            backgroundColor: '#000000'
          }}
        >
          <Text 
            size="sm" 
            fw={500} 
            style={{ 
              fontFamily: GeistMono.style.fontFamily, 
              letterSpacing: '0.5px' 
            }}
          >
            CAPSULE DETAILS
          </Text>
          <Button 
            variant="subtle" 
            leftSection={<ArrowLeft size={14} />}
            onClick={() => list('capsules')}
            styles={{
              root: {
                fontFamily: GeistMono.style.fontFamily,
                fontSize: '14px',
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#1a1a1a',
                },
              },
            }}
          >
            BACK
          </Button>
        </Flex>
        {renderSkeletonLoader()}
      </Box>
    );
  }

  if (isError || !capsuleId) {
    return (
      <Box p="md">
        <Box mb="md" p="md" style={{ backgroundColor: '#252525', borderRadius: 8 }}>
          <Group>
            <RefreshCw size={20} color="red" />
            <Text c="red">Unable to load capsule details. Please try again.</Text>
          </Group>
        </Box>
        <Button
          variant="outline"
          leftSection={<ArrowLeft size={16} />}
          onClick={() => list('capsules')}
          styles={{
            root: {
              backgroundColor: '#131313',
              borderColor: '#202020',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#202020',
              },
            },
          }}
        >
          Back to Capsules
        </Button>
      </Box>
    );
  }
  
  return (
    <Box style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#0a0a0a', 
      color: '#ffffff' 
    }}>
      <Flex 
        justify="space-between" 
        align="center" 
        p="sm" 
        style={{ 
          borderBottom: '1px solid #2b2b2b', 
          flexShrink: 0,
          backgroundColor: '#000000'
        }}
      >
        <Text 
          size="sm" 
          fw={500} 
          style={{ 
            fontFamily: GeistMono.style.fontFamily, 
            letterSpacing: '0.5px' 
          }}
        >
          CAPSULE DETAILS
        </Text>
        <Group gap="xs">
          <Button 
            variant="subtle" 
            leftSection={<ArrowLeft size={14} />}
            onClick={() => list('capsules')}
            styles={{
              root: {
                fontFamily: GeistMono.style.fontFamily,
                fontSize: '14px',
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#1a1a1a',
                },
              },
            }}
          >
            BACK
          </Button>
          <Button 
            variant="subtle"
            leftSection={<RefreshCw size={14} />}
            onClick={handleRegenerateCapsule}
            loading={isRegenerating}
            styles={{
              root: {
                fontFamily: GeistMono.style.fontFamily,
                fontSize: '14px',
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#1a1a1a',
                },
              },
            }}
          >
            REGENERATE
          </Button>
          <Button 
            variant="filled"
            leftSection={<Download size={14} />}
            onClick={handleDownloadMarkdown}
            disabled={!record?.output?.content}
            styles={{
              root: {
                fontFamily: GeistMono.style.fontFamily,
                fontSize: '14px',
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '8px 16px',
                backgroundColor: '#F5A623',
                color: '#000000',
                '&:hover': {
                  backgroundColor: '#E09612',
                },
              },
            }}
          >
            DOWNLOAD
          </Button>
        </Group>
      </Flex>

      <Flex style={{ flex: 1, overflow: 'hidden' }}>
        <Box style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          backgroundColor: '#0a0a0a'
        }}>
          <Box style={{ 
            maxWidth: '750px', 
            margin: '0 auto', 
            padding: '24px' 
          }}>
            <Box mb="lg">
              <Badge 
                size="sm"
                variant="filled"
                styles={{
                  root: {
                    backgroundColor: '#2B2B2B',
                    color: '#A1A1A1',
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    fontFamily: GeistMono.style.fontFamily,
                    marginBottom: '8px',
                  }
                }}
              >
                Capsule
              </Badge>
              <Text 
                size="28px" 
                fw={600} 
                style={{ 
                  fontFamily: 'Geist, sans-serif',
                  lineHeight: 1.2
                }}
              >
                {record?.name || 'Untitled Capsule'}
              </Text>
              <Text c="dimmed" mt="xs" size="sm">
                Created {formatDate(record?.createdAt)}
              </Text>
            </Box>

            <Tabs value={activeTab} onChange={(value) => setActiveTab(value || "preview")}>
              <Tabs.List style={{ backgroundColor: 'transparent', borderBottom: '1px solid #202020' }}>
                <Tabs.Tab 
                  value="preview"
                  styles={{
                    tab: {
                      backgroundColor: 'transparent',
                      color: '#a1a1a1',
                      '&[data-active]': {
                        borderBottom: '2px solid #ffffff',
                        color: '#ffffff',
                      },
                    },
                  }}
                >
                  Preview
                </Tabs.Tab>
                <Tabs.Tab 
                  value="json"
                  styles={{
                    tab: {
                      backgroundColor: 'transparent',
                      color: '#a1a1a1',
                      '&[data-active]': {
                        borderBottom: '2px solid #ffffff',
                        color: '#ffffff',
                      },
                    },
                  }}
                >
                  JSON
                </Tabs.Tab>
                <Tabs.Tab 
                  value="files" 
                  styles={{
                    tab: {
                      backgroundColor: 'transparent',
                      color: '#a1a1a1',
                      '&[data-active]': {
                        borderBottom: '2px solid #ffffff',
                        color: '#ffffff',
                      },
                    },
                  }}
                >
                  Files
                </Tabs.Tab>
              </Tabs.List>
              
              <Tabs.Panel value="preview" pt="md">
                {renderPreviewContent()}
              </Tabs.Panel>

              <Tabs.Panel value="json" pt="md">
                <Box style={{ 
                  backgroundColor: '#131313', 
                  padding: '16px', 
                  borderRadius: 8,
                  width: '100%'
                }}>
                  <Code
                    block
                    style={{
                      backgroundColor: '#1a1a1a',
                      color: '#e0e0e0',
                      padding: '16px',
                      borderRadius: '8px',
                      overflow: 'auto',
                      maxHeight: '70vh',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      lineHeight: 1.5,
                      border: '1px solid #333',
                      width: '100%',
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {record ? JSON.stringify(record, null, 2) : 'No content available'}
                  </Code>
                </Box>
              </Tabs.Panel>

              <Tabs.Panel value="files" pt="md">
                <Box style={{ 
                  backgroundColor: '#131313', 
                  padding: '16px', 
                  borderRadius: 8,
                  width: '100%'
                }}>
                  <Text mb="md">Files in this capsule:</Text>
                  
                  {record?.files && record.files.length > 0 ? (
                    <Box>
                      {record.files.map((file) => (
                        <Flex 
                          key={file._id} 
                          justify="space-between" 
                          align="center"
                          p="sm"
                          mb="xs"
                          style={{
                            backgroundColor: '#1a1a1a',
                            borderRadius: '4px',
                            border: '1px solid #2b2b2b'
                          }}
                        >
                          <Box>
                            <Text size="sm">{file.title}</Text>
                            <Text size="xs" c="dimmed">Added {formatDate(file.createdAt)}</Text>
                          </Box>
                          <ActionIcon 
                            variant="subtle" 
                            color="red" 
                            onClick={() => handleRemoveFile(file._id)}
                          >
                            <Trash size={16} />
                          </ActionIcon>
                        </Flex>
                      ))}
                    </Box>
                  ) : (
                    <Text c="dimmed">No files added to this capsule yet.</Text>
                  )}
                  
                  <Button 
                    leftSection={<Plus size={16} />}
                    mt="md"
                    onClick={handleAddFile}
                    styles={{
                      root: {
                        backgroundColor: '#2b2b2b',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#3b3b3b',
                        },
                      },
                    }}
                  >
                    Add File
                  </Button>
                </Box>
              </Tabs.Panel>
            </Tabs>
          </Box>
        </Box>

        <Box style={{ 
          width: '384px', 
          borderLeft: '1px solid #2B2B2B', 
          padding: '1.5rem',
          backgroundColor: '#000000',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto'
        }}>
          <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Box>
              <Text c="dimmed" mb="xs" size="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
                Status
              </Text>
              <Text style={{ textTransform: 'capitalize' }}>
                {record?.status || 'Unknown'}
              </Text>
            </Box>
            <Box>
              <Text c="dimmed" mb="xs" size="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
                Last Updated
              </Text>
              <Text>{formatDate(record?.updatedAt)}</Text>
            </Box>
            <Box>
              <Text c="dimmed" mb="xs" size="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
                Files
              </Text>
              <Text>{record?.files?.length || 0}</Text>
            </Box>
            <Box>
              <Text c="dimmed" mb="xs" size="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
                Slug
              </Text>
              <Text>{record?.slug || 'N/A'}</Text>
            </Box>
          </Box>
          
          <Box style={{ marginTop: '2rem' }}>
            <Text c="dimmed" mb="md" size="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
              About Capsules
            </Text>
            <Box p="md" style={{ backgroundColor: '#1a1a1a', borderRadius: '4px' }}>
              <Text size="sm" mb="sm">
                Capsules help you organize and process multiple files together.
              </Text>
              <Text size="sm">
                Add documents to your capsule and generate comprehensive summaries, 
                analyses, or reports based on all the included content.
              </Text>
            </Box>
          </Box>
        </Box>
      </Flex>
      
      {/* File Selector Modal */}
      <FileSelector
        opened={isFileSelectorOpen}
        onClose={() => setIsFileSelectorOpen(false)}
        onSelect={handleFileSelect}
        capsuleId={capsuleId}
        existingFileIds={record?.files?.map(file => file._id) || []}
      />
    </Box>
  );
}