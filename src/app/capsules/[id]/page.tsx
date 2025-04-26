"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useNavigation, useShow, useGetIdentity } from "@refinedev/core";
import { 
  Text, 
  Box,
  Group,
  Button,
  LoadingOverlay,
  ActionIcon,
  Badge,
  Alert,
  Flex,
  Stack,
  Title,
  Divider
} from '@mantine/core';
import { 
  ArrowLeft, 
  RefreshCw,
  Download,
  Plus,
  Trash,
  AlertCircle,
  FileText,
  File
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
  fileIds?: string[]; 
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
  summaryContext?: string;
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
  
  const { queryResult } = useShow<Capsule>({
    resource: "capsules",
    id: capsuleId,
    queryOptions: {
      enabled: !!capsuleId && !!identity?.token,
      staleTime: 30000,
      retry: false,
      refetchInterval: (data) => {
        return data?.data?.status === 'PROCESSING' ? 5000 : false;
      },
      onSuccess: (data) => {
        console.log("[CapsuleView] Capsule data loaded:", data);
        if (data?.data?.status === 'COMPLETED' && isRegenerating) {
          setIsRegenerating(false);
        }
        
        if (data?.data?.summaryContext && data?.data?.fileIds && 
            (!data?.data?.files || data?.data?.files.length === 0)) {
          fetchFileDetails(data.data.fileIds);
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
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [lastFileIds, setLastFileIds] = useState<string[]>([]);
  const [addedFileIds, setAddedFileIds] = useState<string[]>([]);
  const [loadedFiles, setLoadedFiles] = useState<File[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Fetch file details if we have fileIds but no files
  const fetchFileDetails = async (fileIds: string[]) => {
    if (!fileIds || fileIds.length === 0) return;
    
    try {
      setIsLoadingFiles(true);
      console.log(`[CapsuleView] Fetching details for ${fileIds.length} files`);
      
      const token = await ensureValidToken();
      if (!token) throw new Error('Authentication failed - unable to get valid token');
      
      // Extract user ID for API call
      let userId = '';
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        userId = tokenPayload._id || tokenPayload.id || tokenPayload.userId || '';
      } catch (e) {
        console.warn('Could not extract user ID from token');
      }
      
      // If we couldn't extract the userId, try to get it from the profile
      if (!userId) {
        try {
          const response = await fetch(`/api/users/profile`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          
          if (response.ok) {
            const profile = await response.json();
            userId = profile._id || profile.id || '';
          }
        } catch (error) {
          console.error("Failed to get user profile:", error);
        }
      }
      
      if (!userId) {
        // If we still don't have a userId, try using the userId from the record
        userId = record?.userId || '';
      }
      
      if (!userId) {
        throw new Error('Could not determine user ID for file lookup');
      }
      
      // Try fetching documents using the processing endpoint first
      try {
        const response = await fetch(`/api/processing/user/${userId}/documents`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (response.ok) {
          const allDocs = await response.json();
          // Filter to just the files we need
          if (Array.isArray(allDocs)) {
            const matchingFiles = allDocs.filter(doc => fileIds.includes(doc._id));
            if (matchingFiles.length > 0) {
              setLoadedFiles(matchingFiles);
              return; // Success - exit early
            }
          }
        }
      } catch (error) {
        console.error("[CapsuleView] Error fetching from processing API:", error);
      }
      
      // First approach didn't work - try direct IDs approach
      try {
        const idsParam = fileIds.join(',');
        const response = await fetch(`/api/processing/files?ids=${idsParam}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (response.ok) {
          const filesData = await response.json();
          if (filesData && Array.isArray(filesData)) {
            setLoadedFiles(filesData);
            return; // Success - exit early
          }
        }
      } catch (error) {
        console.error("[CapsuleView] Error fetching files by ID:", error);
      }
      
      // Last resort - create placeholder files
      console.log("[CapsuleView] Creating placeholder files for display");
      const placeholders = fileIds.map(id => ({
        _id: id,
        title: `File ${id.substring(id.length - 6)}`,
        createdAt: new Date().toISOString()
      }));
      setLoadedFiles(placeholders);
      
    } catch (error: any) {
      console.error("[CapsuleView] Failed to fetch file details:", error);
      // Not setting error message to avoid UI disruption
    } finally {
      setIsLoadingFiles(false);
    }
  };
  
  // Extract only the context summary content, ignoring scratchpad
  const extractContextSummary = (summaryContext?: string) => {
    if (!summaryContext) return null;
    
    // Look for content between <summary> tags
    const summaryMatch = summaryContext.match(/<summary>([\s\S]*?)<\/summary>/);
    
    if (summaryMatch && summaryMatch[1]) {
      // Look for # Context Buffer Summary section within the summary content
      const contextContent = summaryMatch[1].trim();
      return contextContent; 
    }
    
    return null;
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
      setShowDeleteConfirm(null);
      
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
    if (!record?.summaryContext) return;
    
    try {
      console.log("[CapsuleView] Downloading markdown");
      let content = "";
      
      const contextSummary = extractContextSummary(record.summaryContext);
      if (contextSummary) {
        content = contextSummary;
      } else {
        throw new Error("No content available to download");
      }
      
      const blob = new Blob([content], { type: 'text/markdown' });
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

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

  // Get files either from record.files or loadedFiles
  const displayFiles = record.files && record.files.length > 0 
    ? record.files 
    : loadedFiles;
    
  const hasFiles = displayFiles && displayFiles.length > 0;
  const isProcessing = record.status === 'PROCESSING';
  
  // Extract context summary content
  const contextSummary = extractContextSummary(record.summaryContext);
  const hasContextSummary = !!contextSummary;
  
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
              record.status === 'COMPLETED' || record.status === 'ready' ? 'green' : 
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
            disabled={!hasContextSummary || isProcessing || isRegenerating}
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
          w={330} 
          style={{ 
            backgroundColor: '#131313', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid #2b2b2b'
          }}
        >
          <Title 
            order={4}
            mb="md"
            ta="center"
            style={{ 
              fontFamily: GeistMono.style.fontFamily,
              letterSpacing: '0.5px'
            }}
          >
            SOURCE FILES
          </Title>
          
          {hasFiles ? (
            <Stack gap="md" style={{ 
              maxHeight: 'calc(100vh - 250px)',
              overflowY: 'auto'
            }}>
              {displayFiles.map((file) => (
                <Box
                  key={file._id}
                  style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: '6px',
                    border: addedFileIds.includes(file._id) ? '1px solid #F5A623' : '1px solid #2b2b2b',
                    overflow: 'hidden'
                  }}
                >
                  <Group 
                    justify="space-between"
                    p="sm" 
                    style={{ 
                      borderBottom: showDeleteConfirm === file._id ? '1px solid #2b2b2b' : 'none'
                    }}
                  >
                    <Group>
                      <File size={16} style={{ opacity: 0.7 }} />
                      <Text size="sm" lineClamp={1} style={{ maxWidth: '180px' }}>
                        {file.title}
                      </Text>
                    </Group>
                    {showDeleteConfirm !== file._id && (
                      <ActionIcon 
                        color="red" 
                        variant="subtle"
                        onClick={() => setShowDeleteConfirm(file._id)}
                        disabled={isRegenerating || isAddingFiles || isProcessing}
                      >
                        <Trash size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                  
                  {showDeleteConfirm === file._id && (
                    <Group p="xs" justify="space-between" gap="xs" style={{ backgroundColor: '#151515' }}>
                      <Text size="xs" c="dimmed">Delete this file?</Text>
                      <Group gap="xs">
                        <Button 
                          size="xs" 
                          variant="outline" 
                          color="gray"
                          onClick={() => setShowDeleteConfirm(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="xs" 
                          color="red"
                          onClick={() => handleRemoveFile(file._id)}
                        >
                          Delete
                        </Button>
                      </Group>
                    </Group>
                  )}
                  
                  <Text 
                    size="xs" 
                    c="dimmed" 
                    p="xs" 
                    style={{ 
                      backgroundColor: '#151515',
                      borderTop: '1px solid #2b2b2b',
                      display: showDeleteConfirm === file._id ? 'none' : 'block'
                    }}
                  >
                    {formatDate(file.createdAt)}
                  </Text>
                </Box>
              ))}
            </Stack>
          ) : record.fileIds && record.fileIds.length > 0 ? (
            <Box>
              {isLoadingFiles ? (
                <LoadingOverlay visible={true} />
              ) : (
                <Alert color="blue" title="Files Available">
                  {record.fileIds.length} file(s) attached to this capsule.
                </Alert>
              )}
            </Box>
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
          <Box style={{ 
            fontSize: '1.2rem', 
            fontWeight: 600, 
            marginBottom: '10px',
            borderBottom: '1px solid #2b2b2b',
            paddingBottom: '10px',
            color: '#F5A623'
          }}>
            Context
          </Box>
          
          <Box style={{ 
            backgroundColor: '#131313', 
            borderRadius: '0 0 8px 8px', 
            minHeight: 'calc(100vh - 250px)',
            maxHeight: 'calc(100vh - 250px)',
            overflowY: 'auto',
            border: '1px solid #2b2b2b',
            padding: '20px'
          }}>
            {record.summaryContext ? (
              <Box>
                <DocumentMarkdownWrapper 
                  markdown={contextSummary || record.summaryContext.replace(/<scratchpad>[\s\S]*?<\/scratchpad>/, "")} 
                />
                
                {record.highlights && record.highlights.length > 0 && (
                  <>
                    <Divider my="lg" label="Highlights" labelPosition="center" />
                    <Stack gap="md">
                      {record.highlights.map((highlight, index) => {
                        // Simple XML parsing to extract field name and content
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
              <Stack align="center" justify="center" style={{ height: '100%', p: '20px' }}>
                {isProcessing || isRegenerating ? (
                  <>
                    <Text mb="md" fw={600}>Generating context summary...</Text>
                    <Text ta="center" c="dimmed" mb="md">
                      We&apos;re processing your files and generating a capsule summary. 
                      This may take a few minutes.
                    </Text>
                    <LoadingOverlay visible={true} />
                  </>
                ) : hasFiles ? (
                  <>
                    <Text mb="md" fw={600}>Ready to generate</Text>
                    <Text ta="center" c="dimmed" mb="xl">
                      You&apos;ve added files to your capsule. Click the &quot;Regenerate&quot; button 
                      to analyze them and generate a summary.
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
                      Generate Summary
                    </Button>
                  </>
                ) : (
                  <>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
                    <Text mb="md" fw={600}>No content yet</Text>
                    <Text ta="center" c="dimmed" mb="xl">
                      Add files to your capsule first, then generate a summary to see it here.
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
        </Box>
      </Flex>
      
      <FileSelector 
        opened={isFileSelectorOpen}
        onClose={() => setIsFileSelectorOpen(false)}
        onSelect={handleFileSelect}
        capsuleId={capsuleId}
        existingFileIds={record?.files?.map(f => f._id) || record?.fileIds || []}
      />
    </Box>
  );
}