"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
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

// Consistent error handling helper
const formatErrorMessage = (error: any): string => {
  if (!error) return "An unknown error occurred";
  
  const status = error?.status ?? error?.statusCode ?? error?.response?.status;
  let message = error?.message || "An unexpected error occurred";
  
  if (status === 401 || status === 403) {
    return "Your session has expired. Please log in again.";
  } else if (status === 404) {
    return "The requested resource was not found.";
  } else if (status >= 500) {
    return "The server encountered an error. Please try again later.";
  }
  
  return message;
};

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
}

interface FileData {
  _id: string;
  title: string;
  createdAt: string;
  fileName?: string;
  output?: {
    title?: string;
  };
}

interface Capsule {
  _id: string;
  name: string;
  slug: string;
  files: FileData[];
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

// Constants
const REFRESH_INTERVAL_MS = 5000;
const FILE_BATCH_SIZE = 5;
const IS_DEV = process.env.NODE_ENV === 'development';

export default function CapsuleView() {
  const params = useParams();
  const { list } = useNavigation();
  const capsuleId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";

  const { data: identity } = useGetIdentity<Identity>();
  const { handleAuthError, fetchWithAuth } = useAuth();

  // State declarations
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileFetchError, setFileFetchError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [retryParams, setRetryParams] = useState<{ operation: string, params: any } | null>(null);
  const [statusMonitorActive, setStatusMonitorActive] = useState(false);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch capsule data
  const { queryResult } = useShow<Capsule>({
    resource: "capsules",
    id: capsuleId,
    queryOptions: {
      enabled: !!capsuleId && !!identity?.token,
      staleTime: 30000,
      retry: 1,
      refetchInterval: (query) => {
        const currentStatus = (query?.data as any)?.data?.status;
        return !statusMonitorActive && currentStatus === 'PROCESSING' ? REFRESH_INTERVAL_MS : false;
      },
      onError: (error) => {
        console.error("[CapsuleView] Error loading capsule:", error);
        handleAuthError(error);
        setErrorMessage(formatErrorMessage(error));
      }
    },
  });

  const { data: capsuleData, isLoading, isError, refetch } = queryResult;
  const record = capsuleData?.data;

  // Status monitoring
  const startStatusMonitoring = useCallback(() => {
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
    }

    if (IS_DEV) console.log("[CapsuleView] Starting status monitoring...");
    setStatusMonitorActive(true);
    setIsRegenerating(true);

    statusCheckIntervalRef.current = setInterval(async () => {
      try {
        if (IS_DEV) console.log("[CapsuleView] Checking capsule status...");
        const refreshResult = await refetch();
        const capsuleData = refreshResult?.data?.data;

        if (!capsuleData || !capsuleData.status) {
          console.warn("[CapsuleView] Invalid status in refresh");
          return;
        }

        const refreshedStatus = capsuleData.status.toLowerCase();
        if (IS_DEV) console.log(`[CapsuleView] Status: ${refreshedStatus}`);

        if (refreshedStatus === 'completed' || refreshedStatus === 'failed') {
          if (IS_DEV) console.log("[CapsuleView] Processing complete, stopping monitoring");
          setIsRegenerating(false);
          setStatusMonitorActive(false);
          clearInterval(statusCheckIntervalRef.current);
          statusCheckIntervalRef.current = null;
          setTimeout(() => refetch(), 1000);
        }
      } catch (error) {
        console.error("[CapsuleView] Status check error:", error);
      }
    }, 3000);

    setTimeout(() => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
        setStatusMonitorActive(false);
        setIsRegenerating(false);
        refetch();
        if (IS_DEV) console.log("[CapsuleView] Status monitoring timed out");
      }
    }, 120000);
  }, [refetch]);

  // Monitor capsule status and fetch files
  useEffect(() => {
    if (capsuleData?.data) {
      const { status, fileIds, files } = capsuleData.data;
      if (status === 'PROCESSING' && !statusMonitorActive) {
        if (IS_DEV) console.log("[CapsuleView] Detected PROCESSING, starting monitoring");
        startStatusMonitoring();
      }
      if (status === 'COMPLETED' && isRegenerating) {
        if (IS_DEV) console.log("[CapsuleView] Detected COMPLETED, stopping regeneration");
        setIsRegenerating(false);
      }
      if (fileIds && (!files || files.length === 0) && !isLoadingFiles && loadedFiles.length === 0) {
        fetchFileDetails(fileIds);
      }
    }
  }, [capsuleData, statusMonitorActive, isRegenerating, isLoadingFiles, loadedFiles.length, startStatusMonitoring]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
    };
  }, []);

  // Fetch file details
  const fetchFileDetails = useCallback(async (fileIds: string[]) => {
    if (!fileIds?.length || !capsuleId) {
      if (IS_DEV) console.warn("[CapsuleView] Missing file IDs or capsule ID");
      return;
    }

    setIsLoadingFiles(true);
    setFileFetchError(null);
    if (IS_DEV) console.log(`[CapsuleView] Fetching ${fileIds.length} files`);

    try {
      const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch capsule: ${response.status}`);
      }

      const capsuleData = await response.json();
      const data = capsuleData?.data || capsuleData;

      if (data?.files?.length) {
        const processedFiles = data.files
          .filter((file: any) => fileIds.includes(file._id))
          .map((file: any) => ({
            _id: file._id,
            title: file.output?.title || file.title || file.fileName || `File ${file._id.slice(-6)}`,
            createdAt: file.createdAt || new Date().toISOString(),
            fileName: file.fileName || "",
            output: file.output || {}
          }));
        
        setLoadedFiles(processedFiles);
        if (IS_DEV) console.log("[CapsuleView] Loaded files:", processedFiles.length);
      } else {
        throw new Error("No files found in capsule data");
      }
    } catch (error: any) {
      console.error("[CapsuleView] Failed to fetch files:", error);
      setFileFetchError(formatErrorMessage(error));
      setLoadedFiles(fileIds.map(id => ({
        _id: id,
        title: `File ${id.slice(-6)}`,
        createdAt: new Date().toISOString()
      })));
    } finally {
      setIsLoadingFiles(false);
    }
  }, [capsuleId, fetchWithAuth]);

  // Trigger initial file fetch
  useEffect(() => {
    if (record?.fileIds && (!record.files || record.files.length === 0) && !isLoadingFiles && loadedFiles.length === 0) {
      fetchFileDetails(record.fileIds);
    }
  }, [record?.fileIds, record?.files, isLoadingFiles, loadedFiles.length, fetchFileDetails]);

  // Extract summary
  const extractContextSummary = (summaryContext?: string): string | null => {
    if (!summaryContext) return null;
    const summaryMatch = summaryContext.match(/<summary>([\s\S]*?)<\/summary>/);
    return summaryMatch?.[1]?.trim() ?? summaryContext.trim();
  };

  // Regenerate capsule
  const handleRegenerateCapsule = useCallback(async (isRetry = false) => {
    if (!capsuleId) return;

    setIsRegenerating(true);
    setErrorMessage(null);
    startStatusMonitoring();
    notifications.show({
      title: 'Processing Started',
      message: 'Capsule is regenerating.',
      color: 'yellow',
    });

    if (!isRetry) {
      setRetryParams({ operation: 'regenerate', params: {} });
    }

    try {
      const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}/regenerate`, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Failed to regenerate: ${response.status}`);
      }
      setTimeout(() => refetch(), 1500);
    } catch (error: any) {
      console.error("[CapsuleView] Regeneration failed:", error);
      setErrorMessage(formatErrorMessage(error));
      setIsRegenerating(false);
      handleAuthError(error);
    }
  }, [capsuleId, fetchWithAuth, refetch, handleAuthError, startStatusMonitoring]);

  // Add files
  const handleAddFile = useCallback(() => {
    setIsFileSelectorOpen(true);
  }, []);

  const handleFileSelect = useCallback(async (fileIds: string[], isRetry = false) => {
    if (!capsuleId || !fileIds.length) return;

    setIsAddingFiles(true);
    setErrorMessage(null);
    setIsRegenerating(true);
    notifications.show({
      title: 'Processing Started',
      message: 'Capsule is regenerating due to added files.',
      color: 'yellow',
    });

    if (!isRetry) {
      setRetryParams({ operation: 'addFiles', params: { fileIds } });
    }

    try {
      setLoadedFiles(prev => [
        ...prev,
        ...fileIds
          .filter(id => !prev.some(file => file._id === id))
          .map(id => ({
            _id: id,
            title: `File ${id.slice(-6)}`,
            createdAt: new Date().toISOString()
          }))
      ]);

      for (let i = 0; i < fileIds.length; i += FILE_BATCH_SIZE) {
        const batch = fileIds.slice(i, i + FILE_BATCH_SIZE);
        await fetchWithAuth(`/api/capsules-direct/${capsuleId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds: batch }),
        });
        if (i + FILE_BATCH_SIZE < fileIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      await fetchWithAuth(`/api/capsules-direct/${capsuleId}/regenerate`, { method: 'GET' });
      startStatusMonitoring();
      setTimeout(() => refetch(), 1500);
    } catch (error: any) {
      console.error("[CapsuleView] Failed to add files:", error);
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
    } finally {
      setIsAddingFiles(false);
      setIsFileSelectorOpen(false);
    }
  }, [capsuleId, fetchWithAuth, refetch, handleAuthError, startStatusMonitoring]);

  // Remove file
  const handleRemoveFile = useCallback(async (fileId: string) => {
    if (!capsuleId || !fileId) return;

    setShowDeleteConfirm(null);
    setErrorMessage(null);
    setIsRegenerating(true);
    notifications.show({
      title: 'Processing Started',
      message: 'Capsule is regenerating due to file removal.',
      color: 'yellow',
    });

    setRetryParams({ operation: 'removeFile', params: { fileId } });

    try {
      setLoadedFiles(prev => prev.filter(f => f._id !== fileId));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      await fetchWithAuth(`/api/capsules-direct/${capsuleId}/files/${fileId}`, {
        method: 'DELETE',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const remainingFiles = (record?.files || loadedFiles).filter(f => f._id !== fileId);
      if (remainingFiles.length > 0) {
        await fetchWithAuth(`/api/capsules-direct/${capsuleId}/regenerate`, { method: 'GET' });
        startStatusMonitoring();
      } else {
        setTimeout(() => setIsRegenerating(false), 2000);
      }
      setTimeout(() => refetch(), 1500);
    } catch (error: any) {
      console.error("[CapsuleView] Failed to remove file:", error);
      setLoadedFiles(prev => {
        if (!prev.some(f => f._id === fileId)) {
          const fileToRestore = record?.files?.find(f => f._id === fileId) || 
                               { _id: fileId, title: `File ${fileId.slice(-6)}`, createdAt: new Date().toISOString() };
          return [...prev, fileToRestore];
        }
        return prev;
      });
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
      setIsRegenerating(false);
    }
  }, [capsuleId, fetchWithAuth, refetch, handleAuthError, record?.files, loadedFiles, startStatusMonitoring]);

  // Download markdown
  const handleDownloadMarkdown = useCallback(() => {
    const summary = extractContextSummary(record?.summaryContext);
    if (!summary || !record) return;

    try {
      const blob = new Blob([summary], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${record.slug || record.name || 'capsule'}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[CapsuleView] Download failed:", error);
      setErrorMessage("Could not prepare download.");
    }
  }, [record]);

  // Navigation
  const handleBackToList = useCallback(() => {
    list("capsules");
  }, [list]);

  // Retry operation
  const handleRetry = useCallback(() => {
    if (!retryParams) return;

    setErrorMessage(null);
    switch (retryParams.operation) {
      case 'regenerate':
        handleRegenerateCapsule(true);
        break;
      case 'addFiles':
        handleFileSelect(retryParams.params.fileIds, true);
        break;
      case 'removeFile':
        handleRemoveFile(retryParams.params.fileId);
        break;
    }
  }, [retryParams, handleRegenerateCapsule, handleFileSelect, handleRemoveFile]);

  // Refresh files
  const handleRefreshFiles = useCallback(() => {
    if (record?.fileIds && !isLoadingFiles) {
      fetchFileDetails(record.fileIds);
    }
  }, [record?.fileIds, isLoadingFiles, fetchFileDetails]);

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Render Logic
  if (isLoading) {
    return (
      <Box p="md" style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={true} overlayProps={{ blur: 2 }} />
      </Box>
    );
  }

  if (isError || !record) {
    return (
      <Box p="md">
        <Alert color="red" title="Error Loading Capsule" icon={<AlertCircle size={16} />} mb="md">
          {errorMessage || "Could not load capsule details. Please check the ID or try again."}
        </Alert>
        <Button onClick={handleBackToList} leftSection={<ArrowLeft size={16} />}>
          Back to Capsules List
        </Button>
      </Box>
    );
  }

  const displayFiles = record.files && record.files.length > 0 ? record.files : loadedFiles;
  const hasFiles = displayFiles.length > 0;
  const isProcessing = record.status === 'PROCESSING' || isRegenerating;
  const contextSummary = extractContextSummary(record.summaryContext);
  const hasContextSummary = !!contextSummary;

  return (
    <Box style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '24px' }}>
      {/* Header */}
      <Group mb="xl" justify="space-between" align="center">
        <Group align="center">
          <ActionIcon size="lg" variant="subtle" onClick={handleBackToList} style={{ color: '#a0a0a0' }}>
            <ArrowLeft size={20} />
          </ActionIcon>
          <Title order={3} style={{ fontFamily: GeistMono.style.fontFamily, letterSpacing: '0.5px', color: '#ffffff' }}>
            {record.name || "Unnamed Capsule"}
          </Title>
          <Badge
            variant="filled"
            color={
              isRegenerating ? 'yellow' :
              record.status === 'COMPLETED' ? 'green' :
              record.status === 'PROCESSING' ? 'yellow' :
              record.status === 'PENDING' ? 'blue' :
              record.status === 'FAILED' ? 'red' : 'gray'
            }
            style={{ textTransform: 'uppercase', marginLeft: '8px' }}
          >
            {isRegenerating ? 'PROCESSING' : record.status || 'Unknown'}
          </Badge>
        </Group>
        <Group>
          <Button
            variant="default"
            leftSection={<Plus size={16} />}
            onClick={handleAddFile}
            loading={isAddingFiles}
            disabled={isProcessing}
            styles={{ root: { borderColor: '#2b2b2b', color: '#ffffff', '&:hover': { backgroundColor: '#2b2b2b' }}}}
          >
            Add Files
          </Button>
          <Button
            variant="default"
            leftSection={<RefreshCw size={16} />}
            onClick={() => handleRegenerateCapsule()}
            loading={isProcessing}
            disabled={!hasFiles || isAddingFiles}
            styles={{ root: { borderColor: '#2b2b2b', color: '#ffffff', '&:hover': { backgroundColor: '#2b2b2b' }}}}
          >
            Regenerate
          </Button>
          <Button
            variant="default"
            leftSection={<RefreshCw size={16} />}
            onClick={handleRefreshFiles}
            disabled={isLoadingFiles || isProcessing}
            styles={{ root: { borderColor: '#2b2b2b', color: '#ffffff', '&:hover': { backgroundColor: '#2b2b2b' }}}}
          >
            Refresh Files
          </Button>
          <Button
            variant="default"
            leftSection={<Download size={16} />}
            onClick={handleDownloadMarkdown}
            disabled={!hasContextSummary || isProcessing}
            styles={{ root: { borderColor: '#2b2b2b', color: '#ffffff', '&:hover': { backgroundColor: '#2b2b2b' }}}}
          >
            Download MD
          </Button>
        </Group>
      </Group>

      {/* General Error */}
      {errorMessage && (
        <Alert 
          color="red" 
          title="Action Required" 
          mb="md" 
          icon={<AlertCircle size={16} />} 
          withCloseButton 
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
          {retryParams && (
            <Button
              mt="sm"
              size="xs"
              leftSection={<RefreshCw size={14} />}
              onClick={handleRetry}
            >
              Retry Last Action
            </Button>
          )}
        </Alert>
      )}

      {/* File Fetch Error */}
      {fileFetchError && (
        <Alert
          color="red"
          title="Error Loading Files"
          icon={<AlertCircle size={16} />}
          mb="md"
          withCloseButton
          onClose={() => setFileFetchError(null)}
        >
          {fileFetchError}
          <Button
            mt="sm"
            size="xs"
            leftSection={<RefreshCw size={14} />}
            onClick={() => fetchFileDetails(record?.fileIds || [])}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Main Content */}
      <Flex gap="xl">
        {/* Source Files */}
        <Box
          w={330}
          style={{ backgroundColor: '#131313', padding: '16px', borderRadius: '8px', border: '1px solid #2b2b2b' }}
        >
          <Title order={4} mb="md" ta="center" style={{ fontFamily: GeistMono.style.fontFamily, letterSpacing: '0.5px', color: '#a0a0a0' }}>
            SOURCE FILES
          </Title>
          {hasFiles ? (
            <Stack gap="sm" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              {displayFiles.map((file) => (
                <Box
                  key={file._id}
                  style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: '6px',
                    border: '1px solid #2b2b2b',
                    overflow: 'hidden'
                  }}
                >
                  <Group justify="space-between" p="sm" style={{ borderBottom: showDeleteConfirm === file._id ? '1px solid #333' : 'none' }}>
                    <Group gap="xs" align="center">
                      <File size={16} style={{ opacity: 0.6, color: '#a0a0a0', flexShrink: 0 }} />
                      <Text size="sm" lineClamp={1} title={file.title || file.output?.title || file.fileName || `File ${file._id.slice(-6)}`} style={{ maxWidth: '180px', color: '#e0e0e0' }}>
                        {file.title || file.output?.title || file.fileName || `File ${file._id.slice(-6)}`}
                      </Text>
                    </Group>
                    {showDeleteConfirm !== file._id && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => setShowDeleteConfirm(file._id)}
                        disabled={isProcessing}
                        title="Remove file"
                      >
                        <Trash size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                  {showDeleteConfirm === file._id && (
                    <Box p="xs" style={{ backgroundColor: '#2a2a2a' }}>
                      <Group justify="space-between" gap="xs">
                        <Text size="xs" c="dimmed">Delete file?</Text>
                        <Group gap="xs">
                          <Button size="xs" variant="outline" color="gray" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                          <Button size="xs" color="red" onClick={() => handleRemoveFile(file._id)} loading={isProcessing}>Delete</Button>
                        </Group>
                      </Group>
                    </Box>
                  )}
                  {showDeleteConfirm !== file._id && (
                    <Box p="xs" style={{ backgroundColor: '#151515', borderTop: '1px solid #2b2b2b' }}>
                      <Text size="xs" c="dimmed" ta="right">
                        {formatDate(file.createdAt)}
                      </Text>
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          ) : isLoadingFiles ? (
            <Box style={{ padding: '20px', textAlign: 'center' }}>
              <LoadingOverlay visible={true} overlayProps={{ blur: 1 }} loaderProps={{ size: 'sm' }} />
              <Text size="sm" c="dimmed">Loading file details...</Text>
            </Box>
          ) : (
            <Alert color="dark" variant="outline" title="No Files Added" icon={<FileText size={16} />} style={{ borderColor: '#2b2b2b' }}>
              Add source documents to your capsule.
            </Alert>
          )}
          <Button
            fullWidth
            mt="md"
            leftSection={<Plus size={16} />}
            onClick={handleAddFile}
            disabled={isProcessing}
            loading={isAddingFiles}
            styles={{ root: { backgroundColor: '#F5A623', color: '#000000', '&:hover': { backgroundColor: '#E09612' }}}}
          >
            Add Files
          </Button>
        </Box>

        {/* Context Summary */}
        <Box style={{ flex: 1 }}>
          <Box style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px', borderBottom: '1px solid #2b2b2b', paddingBottom: '10px', color: '#F5A623' }}>
            Capsule Context
          </Box>
          <Box style={{ backgroundColor: '#131313', minHeight: 'calc(100vh - 250px)', maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', border: '1px solid #2b2b2b', borderRadius: '8px', padding: '20px', position: 'relative' }}>
            {isProcessing ? (
              <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', minHeight: '200px' }}>
                <LoadingOverlay visible={true} overlayProps={{ blur: 1, color: '#131313', opacity: 0.6 }} loaderProps={{ color: 'orange', type: 'dots' }} />
                <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0', zIndex: 1 }}>Generating context...</Text>
                <Text ta="center" c="dimmed" style={{ zIndex: 1 }}>
                  Analyzing files and creating the capsule summary.
                </Text>
              </Stack>
            ) : hasContextSummary ? (
              <DocumentMarkdownWrapper markdown={contextSummary} />
            ) : hasFiles ? (
              <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', padding: '20px', minHeight: '200px' }}>
                <FileText size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
                <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0' }}>Ready to Generate</Text>
                <Text ta="center" c="dimmed" mb="xl">
                  Click "Regenerate" to create the context summary.
                </Text>
                <Button
                  leftSection={<RefreshCw size={16} />}
                  onClick={() => handleRegenerateCapsule()}
                  styles={{ root: { backgroundColor: '#F5A623', color: '#000000', '&:hover': { backgroundColor: '#E09612' }}}}
                  loading={isProcessing}
                >
                  Generate Summary
                </Button>
              </Stack>
            ) : (
              <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', padding: '20px', minHeight: '200px' }}>
                <FileText size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
                <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0' }}>Capsule Empty</Text>
                <Text ta="center" c="dimmed" mb="xl">
                  This capsule has no files or context. Add files to start generating a summary.
                </Text>
                <Button
                  leftSection={<Plus size={16} />}
                  onClick={handleAddFile}
                  styles={{ root: { backgroundColor: '#F5A623', color: '#000000', '&:hover': { backgroundColor: '#E09612' }}}}
                  disabled={isProcessing}
                >
                  Add Files
                </Button>
              </Stack>
            )}
          </Box>
        </Box>
      </Flex>

      {/* File Selector */}
      <FileSelector
        opened={isFileSelectorOpen}
        onClose={() => setIsFileSelectorOpen(false)}
        onSelect={handleFileSelect}
        capsuleId={capsuleId}
        existingFileIds={record?.fileIds || []}
      />
    </Box>
  );
}