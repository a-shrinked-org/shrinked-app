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
  ScrollArea,
  Textarea,
  Modal,
  Divider,
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
  Settings,
  File
} from 'lucide-react';
import { useParams } from "next/navigation";
import { useAuth } from "@/utils/authUtils";
import DocumentMarkdownWrapper from "@/components/DocumentMarkdownWrapper";
import { GeistMono } from 'geist/font/mono';
import FileSelector from '@/components/FileSelector';
import CapsuleSettingsModal from "@/components/CapsuleSettingsModal";

// Error handling helper
const formatErrorMessage = (error: any): string => {
  if (!error) return "An unknown error occurred";
  const status = error?.status ?? error?.statusCode ?? error?.response?.status;
  const message = error?.message || "An unexpected error occurred";
  if (status === 401 || status === 403) return "Your session has expired. Please log in again.";
  if (status === 404) return "The requested resource was not found.";
  if (status >= 500) return "The server encountered an error. Please try again later.";
  return message;
};

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
  subscriptionPlan?: { name?: string };
}

interface FileData {
  _id: string;
  title: string;
  createdAt: string;
  fileName?: string;
  output?: { title?: string };
}

interface AdminPrompt {
  section: string;
  prompt: string;
  prefill?: string;
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
  highlights?: Array<{ xml: string }>;
  summary?: string;
  testSummary?: string;
}

const REFRESH_INTERVAL_MS = 10000; // 10 seconds
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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [statusMonitorActive, setStatusMonitorActive] = useState(false);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Settings modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [summaryPrompt, setSummaryPrompt] = useState('');
  const [highlightsPrompt, setHighlightsPrompt] = useState('');
  const [testSummaryPrompt, setTestSummaryPrompt] = useState('');
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  // Capsule query
  const { queryResult } = useShow<Capsule>({
    resource: "capsules",
    id: capsuleId,
    queryOptions: {
      enabled: !!capsuleId && !!identity?.token,
      staleTime: 30000,
      retry: 1,
      refetchInterval: false,
      onError: (error) => {
        if (IS_DEV) console.error("[CapsuleView] Error loading capsule:", error);
        handleAuthError(error);
        setErrorMessage(formatErrorMessage(error));
      }
    },
  });

  const { data: capsuleData, isLoading, isError, refetch } = queryResult;
  const record = capsuleData?.data;

  // Status monitoring
  const startStatusMonitoring = useCallback(() => {
    if (statusMonitorActive) return;

    const currentStatus = (record?.status || '').toLowerCase();
    const completedStatuses = ['completed', 'ready', 'failed'];

    if (completedStatuses.includes(currentStatus)) {
      if (IS_DEV) console.log(`[CapsuleView] Status ${currentStatus}, no monitoring needed`);
      setIsRegenerating(false);
      return;
    }

    if (IS_DEV) console.log("[CapsuleView] Starting status monitoring");
    setStatusMonitorActive(true);

    statusCheckIntervalRef.current = setInterval(async () => {
      if (!statusMonitorActive) {
        if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
        return;
      }

      try {
        const refreshResult = await refetch();
        const refreshedStatus = refreshResult?.data?.data?.status?.toLowerCase();

        if (!refreshedStatus) {
          if (IS_DEV) console.warn("[CapsuleView] Invalid status in refresh result");
          return;
        }

        if (completedStatuses.includes(refreshedStatus)) {
          if (IS_DEV) console.log(`[CapsuleView] Status ${refreshedStatus}, stopping monitoring`);
          setIsRegenerating(false);
          setIsAddingFiles(false);
          setStatusMonitorActive(false);
          if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);

          notifications.show({
            title: 'Processing Complete',
            message: 'Capsule generation is complete.',
            color: 'green',
          });
        }
      } catch (error) {
        if (IS_DEV) console.error("[CapsuleView] Error checking status:", error);
      }
    }, REFRESH_INTERVAL_MS);

    setTimeout(() => {
      if (statusMonitorActive) {
        if (IS_DEV) console.log("[CapsuleView] Status monitoring timed out");
        setStatusMonitorActive(false);
        setIsRegenerating(false);
        setIsAddingFiles(false);
        if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
      }
    }, 120000);
  }, [record?.status, refetch, statusMonitorActive]);

  // File operations
  const fetchFileDetails = useCallback(async (fileIds: string[]) => {
    if (!fileIds?.length || !capsuleId || isLoadingFiles) return;

    const missingFileIds = fileIds.filter(id => !loadedFiles.some(file => file._id === id));
    if (!missingFileIds.length) return;

    setIsLoadingFiles(true);
    try {
      const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}`);
      if (!response.ok) throw new Error(`Failed to fetch files: ${response.status}`);

      const data = await response.json();
      const capsuleData = data?.data || data;

      if (capsuleData?.files?.length) {
        const processedFiles = capsuleData.files
          .filter((file: any) => fileIds.includes(file._id))
          .map((file: any) => ({
            _id: file._id,
            title: file.output?.title || file.title || file.fileName || `File ${file._id.slice(-6)}`,
            createdAt: file.createdAt || new Date().toISOString(),
            fileName: file.fileName || "",
            output: file.output || {}
          }));

        setLoadedFiles(prev => {
          const existingIds = prev.map(f => f._id);
          const newFiles = processedFiles.filter((f: FileData) => !existingIds.includes(f._id));
          return [...prev, ...newFiles];
        });
      }
    } catch (error) {
      if (IS_DEV) console.error("Error fetching file details:", error);
      const placeholders = missingFileIds.map(id => ({
        _id: id,
        title: `File ${id.slice(-6)}`,
        createdAt: new Date().toISOString()
      }));
      setLoadedFiles(prev => {
        const existingIds = prev.map(f => f._id);
        const newPlaceholders = placeholders.filter(p => !existingIds.includes(p._id));
        return [...prev, ...newPlaceholders];
      });
    } finally {
      setIsLoadingFiles(false);
    }
  }, [capsuleId, fetchWithAuth, loadedFiles, isLoadingFiles]);

  const handleAddFile = useCallback(() => {
    setIsFileSelectorOpen(true);
  }, []);

  const handleFileSelect = useCallback(async (fileIds: string[], fileData: FileData[] = []) => {
    if (!capsuleId || !fileIds.length) return;

    setIsAddingFiles(true);
    setErrorMessage(null);

    try {
      setIsRegenerating(true);
      startStatusMonitoring();

      const optimisticNewFiles = fileIds.map(id => {
        const fileInfo = fileData.find(f => f._id === id) || {};
        return {
          _id: id,
          title: fileInfo.title || fileInfo.output?.title || fileInfo.fileName || `File ${id.slice(-6)}`,
          createdAt: fileInfo.createdAt || new Date().toISOString(),
          fileName: fileInfo.fileName || "",
          output: fileInfo.output || {}
        };
      });

      setLoadedFiles(prev => {
        const existingIds = prev.map(file => file._id);
        const filesToAdd = optimisticNewFiles.filter(file => !existingIds.includes(file._id));
        return [...prev, ...filesToAdd];
      });

      for (let i = 0; i < fileIds.length; i += FILE_BATCH_SIZE) {
        const batch = fileIds.slice(i, i + FILE_BATCH_SIZE);
        const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds: batch }),
        });
        if (!response.ok) throw new Error(`Failed to add batch: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      await fetchWithAuth(`/api/capsules-direct/${capsuleId}/regenerate`, { method: 'GET' });
      setTimeout(() => refetch(), 750);

      notifications.show({
        title: 'Files Added',
        message: 'Files added and regeneration started.',
        color: 'green',
      });
    } catch (error) {
      if (IS_DEV) console.error("[CapsuleView] Failed to add files:", error);
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
      setIsRegenerating(false);
      notifications.show({
        title: 'Error Adding Files',
        message: formatErrorMessage(error),
        color: 'red',
      });
    } finally {
      setIsAddingFiles(false);
      setIsFileSelectorOpen(false);
    }
  }, [capsuleId, fetchWithAuth, refetch, handleAuthError, startStatusMonitoring]);

  const handleRemoveFile = useCallback(async (fileId: string) => {
    if (!capsuleId || !fileId) return;

    setShowDeleteConfirm(null);
    setErrorMessage(null);

    try {
      setIsRegenerating(true);
      startStatusMonitoring();

      setLoadedFiles(prev => prev.filter(f => f._id !== fileId));

      const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}/files/${fileId}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) throw new Error(`Failed to remove file: ${response.status}`);

      const remainingFiles = (record?.files || loadedFiles).filter(f => f._id !== fileId);
      if (remainingFiles.length > 0) {
        await fetchWithAuth(`/api/capsules-direct/${capsuleId}/regenerate`, { method: 'GET' });
      }
      setTimeout(() => refetch(), 750);

      notifications.show({
        title: 'File Removed',
        message: 'File removed successfully.',
        color: 'green',
      });
    } catch (error) {
      if (IS_DEV) console.error("[CapsuleView] Failed to remove file:", error);
      setLoadedFiles(prev => {
        const file = record?.files?.find(f => f._id === fileId) || {
          _id: fileId,
          title: `File ${fileId.slice(-6)}`,
          createdAt: new Date().toISOString()
        };
        return prev.some(f => f._id === fileId) ? prev : [...prev, file];
      });
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
      setIsRegenerating(false);
      notifications.show({
        title: 'Error Removing File',
        message: formatErrorMessage(error),
        color: 'red',
      });
    }
  }, [capsuleId, fetchWithAuth, refetch, handleAuthError, record?.files, loadedFiles, startStatusMonitoring]);

  // Regeneration
  const handleRegenerateCapsule = useCallback(async () => {
    if (!capsuleId || isRegenerating) return;

    setErrorMessage(null);
    setIsRegenerating(true);

    try {
      const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}/regenerate`, { method: 'GET' });
      if (!response.ok) throw new Error(`Failed to trigger regeneration: ${response.status}`);

      startStatusMonitoring();
      notifications.show({
        title: 'Processing Started',
        message: 'Capsule regeneration in progress.',
        color: 'yellow',
      });
    } catch (error) {
      if (IS_DEV) console.error("[CapsuleView] Failed to regenerate capsule:", error);
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
      setIsRegenerating(false);
      notifications.show({
        title: 'Regeneration Failed',
        message: formatErrorMessage(error),
        color: 'red',
      });
    }
  }, [capsuleId, fetchWithAuth, handleAuthError, startStatusMonitoring, isRegenerating]);

  // Settings modal
  const handleOpenSettingsModal = useCallback(async () => {
    setIsLoadingPrompts(true);
    try {
      const response = await fetchWithAuth(`/api/admin/prompts?capsuleId=${capsuleId}`);
      if (!response.ok) throw new Error(`Failed to fetch prompts: ${response.status}`);

      const data = await response.json() as AdminPrompt[];
      setSummaryPrompt(data.find(p => p.section === 'capsule.summary')?.prompt || '');
      setHighlightsPrompt(data.find(p => p.section === 'capsule.highlights')?.prompt || '');
      setTestSummaryPrompt(data.find(p => p.section === 'capsule.testSummary')?.prompt || '');
      setIsSettingsModalOpen(true);
    } catch (error) {
      if (IS_DEV) console.error('Failed to fetch prompts:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load capsule settings',
        color: 'red',
      });
      setIsSettingsModalOpen(true);
    } finally {
      setIsLoadingPrompts(false);
    }
  }, [capsuleId, fetchWithAuth]);

  const handleSaveSettings = useCallback(async () => {
    setIsLoadingPrompts(true);
    try {
      const prompts: AdminPrompt[] = [
        { section: "capsule.summary", prompt: summaryPrompt, prefill: "" },
        { section: "capsule.highlights", prompt: highlightsPrompt, prefill: "" },
        { section: "capsule.testSummary", prompt: testSummaryPrompt, prefill: "" }
      ].filter(p => p.prompt.trim());

      if (!prompts.length) {
        notifications.show({ title: 'No Changes', message: 'No prompts to save.', color: 'yellow' });
        setIsSettingsModalOpen(false);
        return;
      }

      const response = await fetchWithAuth(`/api/admin/prompts/upsert?capsuleId=${capsuleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompts)
      });
      if (!response.ok) throw new Error(`Failed to save prompts: ${response.status}`);

      notifications.show({
        title: 'Settings Saved',
        message: 'Prompts updated successfully.',
        color: 'green',
      });
      setIsSettingsModalOpen(false);
    } catch (error) {
      if (IS_DEV) console.error('Failed to save settings:', error);
      notifications.show({
        title: 'Error',
        message: formatErrorMessage(error),
        color: 'red',
      });
    } finally {
      setIsLoadingPrompts(false);
    }
  }, [capsuleId, fetchWithAuth, summaryPrompt, highlightsPrompt, testSummaryPrompt]);

  // Status effect
  useEffect(() => {
    if (!capsuleData?.data?.status) return;

    const status = capsuleData.data.status.toLowerCase();
    const completedStatuses = ['completed', 'ready', 'failed'];

    if (status === 'processing' && !statusMonitorActive) {
      if (IS_DEV) console.log("[Effect] Processing detected, starting monitoring");
      setIsRegenerating(true);
      startStatusMonitoring();
    } else if (completedStatuses.includes(status) && (isRegenerating || statusMonitorActive)) {
      if (IS_DEV) console.log("[Effect] Terminal status detected, stopping monitoring");
      setIsRegenerating(false);
      setIsAddingFiles(false);
      setStatusMonitorActive(false);
      if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
    }
  }, [capsuleData?.data?.status, statusMonitorActive, isRegenerating, startStatusMonitoring]);

  // File effect
  useEffect(() => {
    const fileIds = capsuleData?.data?.fileIds;
    if (!fileIds?.length || isLoadingFiles || fileIds.every(id => loadedFiles.some(file => file._id === id))) return;

    const timeoutId = setTimeout(() => fetchFileDetails(fileIds), 300);
    return () => clearTimeout(timeoutId);
  }, [capsuleData?.data?.fileIds, isLoadingFiles, loadedFiles, fetchFileDetails]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
    };
  }, []);

  // Helpers
  const extractContextSummary = (summaryContext?: string): string | null => {
    if (!summaryContext) return null;
    const summaryMatch = summaryContext.match(/<summary>([\s\S]*?)<\/summary>/);
    return summaryMatch?.[1]?.trim() ?? summaryContext.trim();
  };

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
      notifications.show({
        title: 'Download Started',
        message: 'Downloading markdown summary.',
        color: 'green',
      });
    } catch (error) {
      if (IS_DEV) console.error("[CapsuleView] Failed to download markdown:", error);
      setErrorMessage("Could not prepare download.");
      notifications.show({
        title: 'Download Failed',
        message: 'Could not prepare markdown for download.',
        color: 'red',
      });
    }
  }, [record]);

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

  // Render
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
          {errorMessage || "Could not load capsule details."}
        </Alert>
        <Button onClick={() => list("capsules")} leftSection={<ArrowLeft size={16} />}>
          Back to Capsules List
        </Button>
      </Box>
    );
  }

  const displayFiles = record.files?.length ? record.files : loadedFiles;
  const hasFiles = displayFiles.length > 0;
  const isProcessing = record.status?.toLowerCase() === 'processing' || isRegenerating;
  const contextSummary = extractContextSummary(record.summaryContext);
  const hasContextSummary = !!contextSummary;

  return (
    <Box style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '24px' }}>
      <Group mb="xl" justify="space-between" align="center">
        <Group align="center">
          <ActionIcon size="lg" variant="subtle" onClick={() => list("capsules")} style={{ color: '#a0a0a0' }}>
            <ArrowLeft size={20} />
          </ActionIcon>
          <Title order={3} style={{ fontFamily: GeistMono.style.fontFamily, letterSpacing: '0.5px', color: '#ffffff' }}>
            {record.name || "Unnamed Capsule"}
          </Title>
          <Badge
            variant="filled"
            color={isProcessing ? 'yellow' : record.status?.toLowerCase() === 'completed' || record.status?.toLowerCase() === 'ready' ? 'green' : 'gray'}
            style={{ textTransform: 'uppercase', marginLeft: '8px' }}
          >
            {isProcessing ? 'PROCESSING' : record.status || 'Unknown'}
          </Badge>
        </Group>
        <Group>
          <Button
            variant="default"
            leftSection={<RefreshCw size={16} />}
            onClick={handleRegenerateCapsule}
            loading={isProcessing}
            disabled={!hasFiles || isAddingFiles}
            styles={{ root: { borderColor: '#2b2b2b', color: '#ffffff', '&:hover': { backgroundColor: '#2b2b2b' }}}}
          >
            Regenerate
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
          {identity?.subscriptionPlan?.name?.toUpperCase() === 'ADMIN' && (
            <Button
              variant="default"
              leftSection={<Settings size={16} />}
              onClick={handleOpenSettingsModal}
              disabled={isProcessing}
              styles={{ root: { borderColor: '#2b2b2b', color: '#ffffff', '&:hover': { backgroundColor: '#2b2b2b' }}}}
            >
              Settings
            </Button>
          )}
        </Group>
      </Group>

      {errorMessage && (
        <Alert color="red" title="Action Required" mb="md" icon={<AlertCircle size={16} />} withCloseButton onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <Flex gap="xl">
        <Box w={330} style={{ backgroundColor: '#131313', padding: '16px', borderRadius: '8px', border: '1px solid #2b2b2b' }}>
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
                      <Text size="xs" c="dimmed" ta="right">{formatDate(file.createdAt)}</Text>
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
              Add source documents to your capsule using the button below.
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

        <Box style={{ flex: 1 }}>
          <Box style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px', borderBottom: '1px solid #2b2b2b', paddingBottom: '10px', color: '#F5A623' }}>
            Capsule Context
          </Box>
          <Box style={{ backgroundColor: '#131313', minHeight: 'calc(100vh - 250px)', maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', border: '1px solid #2b2b2b', borderRadius: '8px', padding: '20px', position: 'relative' }}>
            {isProcessing ? (
              <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', minHeight: '200px' }}>
                <LoadingOverlay visible={true} overlayProps={{ blur: 1, color: '#131313', opacity: 0.6 }} loaderProps={{ color: 'orange', type: 'dots' }} />
                <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0', zIndex: 1 }}>Generating context...</Text>
                <Text ta="center" c="dimmed" mb="md" style={{ zIndex: 1 }}>
                  Analyzing files and creating the capsule summary.
                </Text>
              </Stack>
            ) : hasContextSummary ? (
              <DocumentMarkdownWrapper markdown={contextSummary} />
            ) : hasFiles ? (
              <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', padding: '20px', minHeight: '200px' }}>
                <FileText size={48} style={{ opacity: '0.3', marginBottom: '20px' }} />
                <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0' }}>Ready to Generate</Text>
                <Text ta="center" c="dimmed" mb="xl">
                  Click the {"Regenerate"} button to analyze files and create the summary.
                </Text>
                <Button
                  leftSection={<RefreshCw size={16} />}
                  onClick={handleRegenerateCapsule}
                  styles={{ root: { backgroundColor: '#F5A623', color: '#000000', '&:hover': { backgroundColor: '#E09612' }}}}
                  loading={isProcessing}
                >
                  Generate Summary
                </Button>
              </Stack>
            ) : (
              <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', padding: '20px', minHeight: '200px' }}>
                <FileText size={48} style={{ opacity: '0.3', marginBottom: '20px' }} />
                <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0' }}>No Content Yet</Text>
                <Text ta="center" c="dimmed" mb="xl">
                  Add files to your capsule to generate a summary.
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

      <FileSelector
        opened={isFileSelectorOpen}
        onClose={() => setIsFileSelectorOpen(false)}
        onSelect={handleFileSelect}
        capsuleId={capsuleId}
        existingFileIds={record?.fileIds || []}
      />
      <CapsuleSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isLoading={isLoadingPrompts}
        summary={summaryPrompt}
        highlights={highlightsPrompt}
        testSummary={testSummaryPrompt}
        onSummaryChange={setSummaryPrompt}
        onHighlightsChange={setHighlightsPrompt}
        onTestSummaryChange={setTestSummaryPrompt}
        onSave={handleSaveSettings}
        saveStatus=""
      />
    </Box>
  );
}