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
  File,
  Link2,
  Target // Added for purpose icon
} from 'lucide-react';
import { useParams } from "next/navigation";
import { useAuth } from "@/utils/authUtils";
import DocumentMarkdownWrapper from "@/components/DocumentMarkdownWrapper";
import { GeistMono } from 'geist/font/mono';
import FileSelector from '@/components/FileSelector';
import ReferenceEnrichmentModal from "@/components/ReferenceEnrichmentModal";
import CapsulePurposeModal from "@/components/CapsulePurposeModal"; // Added import

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

// Added PurposeCard interface
interface PurposeCard {
  id: string;
  name: string;
  description: string;
  prompt: string;
  section: string;
  isDefault?: boolean;
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
  // Added purpose override field
  purposeOverride?: {
    cardId: string;
    cardName: string;
    prompt: string;
    section: string;
  };
}

const REFRESH_INTERVAL_MS = 3000; // Adjusted to 3 seconds for faster polling
const FILE_BATCH_SIZE = 5;
const IS_DEV = process.env.NODE_ENV === 'development';
const MAX_FETCH_RETRIES = 3; // Limit retries to prevent loops

// Debounce utility
const debounce = <F extends (...args: any[]) => any>(func: F, wait: number) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return new Promise((resolve) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        resolve(func(...args));
      }, wait);
    });
  };
};

export default function CapsuleView() {
  const params = useParams();
  const { list } = useNavigation();
  const capsuleId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>({
    queryOptions: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: false,
      refetchOnWindowFocus: false,
    },
  });
  const { handleAuthError, fetchWithAuth, ensureValidToken } = useAuth();

  // State declarations
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [statusMonitorActive, setStatusMonitorActive] = useState(false);
  const [fetchRetries, setFetchRetries] = useState(0); // Track fetch attempts
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Prompts state for purpose modal
  const [summaryPrompt, setSummaryPrompt] = useState('');
  const [highlightsPrompt, setHighlightsPrompt] = useState('');
  const [testSummaryPrompt, setTestSummaryPrompt] = useState('');
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [enrichedContent, setEnrichedContent] = useState<string>('');

  // Added purpose modal state
  const [isPurposeModalOpen, setIsPurposeModalOpen] = useState(false);

  // Capsule query - Updated to use the proper API endpoint
  const { queryResult } = useShow<Capsule>({
    resource: "capsules",
    id: capsuleId,
    queryOptions: {
      enabled: !!capsuleId && !!identity?.token,
      staleTime: 30000,
      retry: 1,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      onError: (error) => {
        if (IS_DEV) console.error("[CapsuleView] Error loading capsule:", error);
        handleAuthError(error);
        setErrorMessage(formatErrorMessage(error));
      }
    },
  });

  const { data: capsuleData, isLoading, isError, refetch } = queryResult;
  const record = capsuleData?.data;

  // Debounced refetch
  const debouncedRefetch = useCallback(debounce(refetch, 500), [refetch]);

  // Status monitoring with improved logic
  const startStatusMonitoring = useCallback(() => {
    if (statusMonitorActive) {
      if (IS_DEV) console.log("[CapsuleView] Status monitoring already active, skipping");
      return;
    }

    const currentStatus = (record?.status || '').toLowerCase();
    const completedStatuses = ['completed', 'ready', 'failed'];

    // If already in a completed state and not regenerating, no need to monitor
    if (completedStatuses.includes(currentStatus) && !isRegenerating) {
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
        const refreshResult = await debouncedRefetch();
        const refreshedRecord = refreshResult?.data?.data;
        const refreshedStatus = refreshedRecord?.status?.toLowerCase();

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

          // Force a final refetch to ensure the context is updated
          await debouncedRefetch();

          notifications.show({
            title: 'Processing Complete',
            message: 'Capsule generation is complete.',
            color: 'green',
          });
        } else if (refreshedStatus === 'processing') {
          setIsRegenerating(true); // Ensure UI reflects processing state
        }
      } catch (error) {
        if (IS_DEV) console.error("[CapsuleView] Error checking status:", error);
        setErrorMessage(formatErrorMessage(error));
      }
    }, REFRESH_INTERVAL_MS);

    // Timeout to prevent infinite monitoring
    setTimeout(() => {
      if (statusMonitorActive) {
        if (IS_DEV) console.log("[CapsuleView] Status monitoring timed out");
        setStatusMonitorActive(false);
        setIsRegenerating(false);
        setIsAddingFiles(false);
        if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
        debouncedRefetch();
      }
    }, 90000); // 90 seconds timeout as a safeguard
  }, [record?.status, debouncedRefetch, statusMonitorActive, isRegenerating]);

  // File operations
  const fetchFileDetails = useCallback(async (fileIds: string[]) => {
    if (!fileIds?.length || !capsuleId || !identity?.id || isLoadingFiles) {
      if (IS_DEV) console.log("[CapsuleView] Skipping fetch: missing data or already loading");
      return;
    }

    const missingFileIds = fileIds.filter(id => !loadedFiles.some(file => file._id === id));
    if (!missingFileIds.length) {
      if (IS_DEV) console.log("[CapsuleView] All file IDs already loaded");
      return;
    }

    setIsLoadingFiles(true);
    if (IS_DEV) console.log(`[CapsuleView] Fetching details for ${missingFileIds.length} files`);

    try {
      // Primary endpoint: /processing/user/:userId/documents
      let response = await fetchWithAuth(`/api/processing-proxy/user/${identity.id}/documents`);
      if (!response.ok) throw new Error(`User documents fetch failed: ${response.status}`);

      let documents = await response.json();
      if (!Array.isArray(documents)) {
        if (IS_DEV) console.warn("[CapsuleView] Invalid documents response, not an array");
        documents = [];
      }

      let processedFiles = documents
        .filter((doc: any) => missingFileIds.includes(doc._id))
        .map((doc: any) => ({
          _id: doc._id,
          title: doc.title || doc.output?.title || doc.fileName || `File ${doc._id.slice(-6)}`,
          createdAt: doc.createdAt || new Date().toISOString(),
          fileName: doc.fileName || "",
          output: doc.output || {}
        }));

      if (processedFiles.length) {
        setLoadedFiles(prev => {
          const existingIds = prev.map(f => f._id);
          const newFiles = processedFiles.filter((f: FileData) => !existingIds.includes(f._id));
          return [...prev, ...newFiles];
        });
        if (IS_DEV) console.log("[CapsuleView] Loaded files from user documents endpoint");
        return;
      }

      // Fallback: /capsules/:id - using the proper API endpoint
      response = await fetchWithAuth(`/api/capsules/${capsuleId}`);
      if (!response.ok) throw new Error(`Capsule fetch failed: ${response.status}`);

      let data = await response.json();
      data = data?.data || data;

      if (data?.files?.length) {
        processedFiles = data.files
          .filter((file: any) => missingFileIds.includes(file._id))
          .map((file: any) => ({
            _id: file._id,
            title: file.output?.title || file.title || file.fileName || `File ${file._id.slice(-6)}`,
            createdAt: file.createdAt || new Date().toISOString(),
            fileName: file.fileName || "",
            output: file.output || {}
          }));

        if (processedFiles.length) {
          setLoadedFiles(prev => {
            const existingIds = prev.map(f => f._id);
            const newFiles = processedFiles.filter((f: FileData) => !existingIds.includes(f._id));
            return [...prev, ...newFiles];
          });
          if (IS_DEV) console.log("[CapsuleView] Loaded files from capsule endpoint");
          return;
        }
      }

      // No files found, use placeholders
      throw new Error("No file data found from any endpoint");
    } catch (error) {
      if (IS_DEV) console.error("[CapsuleView] Failed to fetch file details:", error);
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
      notifications.show({
        title: 'Error Loading Files',
        message: 'Could not load file details. Showing placeholders.',
        color: 'red',
      });
    } finally {
      setIsLoadingFiles(false);
      setFetchRetries(prev => prev + 1); // Increment retry count
    }
  }, [capsuleId, identity?.id, fetchWithAuth, loadedFiles, isLoadingFiles]);

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
        const fileInfo = fileData.find(f => f._id === id);
        return {
          _id: id,
          title: fileInfo?.title || fileInfo?.output?.title || fileInfo?.fileName || `File ${id.slice(-6)}`,
          createdAt: fileInfo?.createdAt || new Date().toISOString(),
          fileName: fileInfo?.fileName || "",
          output: fileInfo?.output || {}
        };
      });

      setLoadedFiles(prev => {
        const existingIds = prev.map(file => file._id);
        const filesToAdd = optimisticNewFiles.filter(file => !existingIds.includes(file._id));
        return [...prev, ...filesToAdd];
      });

      for (let i = 0; i < fileIds.length; i += FILE_BATCH_SIZE) {
        const batch = fileIds.slice(i, i + FILE_BATCH_SIZE);
        // Using the proper API endpoint from the documentation
        const response = await fetchWithAuth(`/api/capsules/${capsuleId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds: batch }),
        });
        if (!response.ok) throw new Error(`Failed to add batch: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // Using the proper regenerate endpoint
      await fetchWithAuth(`/api/capsules/${capsuleId}/regenerate`, { method: 'GET' });
      setTimeout(() => debouncedRefetch(), 750);

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
  }, [capsuleId, fetchWithAuth, debouncedRefetch, handleAuthError, startStatusMonitoring]);
  
  const handleContentEnrichment = useCallback((enrichedContent: string) => {
    console.log('SETTING enriched content:', enrichedContent.substring(0, 200));
    setEnrichedContent(enrichedContent);
  }, []);
  
  // Add this function to reset enriched content
  const handleResetEnrichedContent = useCallback(() => {
    console.log('RESETTING enriched content');
    setEnrichedContent('');
  }, []);

  const handleRemoveFile = useCallback(async (fileId: string) => {
    if (!capsuleId || !fileId) return;

    setShowDeleteConfirm(null);
    setErrorMessage(null);

    try {
      setIsRegenerating(true);
      startStatusMonitoring();

      setLoadedFiles(prev => prev.filter(f => f._id !== fileId));

      // Using the proper API endpoint from the documentation
      const response = await fetchWithAuth(`/api/capsules/${capsuleId}/files/${fileId}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) throw new Error(`Failed to remove file: ${response.status}`);

      const remainingFiles = (record?.files || loadedFiles).filter(f => f._id !== fileId);
      if (remainingFiles.length > 0) {
        await fetchWithAuth(`/api/capsules/${capsuleId}/regenerate`, { method: 'GET' });
      }
      setTimeout(() => debouncedRefetch(), 750);

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
  }, [capsuleId, fetchWithAuth, debouncedRefetch, handleAuthError, record?.files, loadedFiles, startStatusMonitoring]);

  // Regeneration with immediate UI feedback
  const handleRegenerateCapsule = useCallback(async () => {
    if (!capsuleId || isRegenerating) return;

    setErrorMessage(null);
    setIsRegenerating(true); // Immediately set to regenerating to show loading state

    try {
      // Using the proper API endpoint from the documentation
      const response = await fetchWithAuth(`/api/capsules/${capsuleId}/regenerate`, { method: 'GET' });
      if (!response.ok) throw new Error(`Failed to trigger regeneration: ${response.status}`);

      // Start monitoring after the request
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

  // Load prompts for purpose modal
  const loadPrompts = useCallback(async () => {
    if (!capsuleId) return;
    
    setIsLoadingPrompts(true);
    try {
      const response = await fetchWithAuth(`/api/admin/prompts?capsuleId=${capsuleId}`);
      if (!response.ok) throw new Error(`Failed to fetch prompts: ${response.status}`);

      const data = await response.json() as AdminPrompt[];
      setSummaryPrompt(data.find(p => p.section === 'capsule.summary')?.prompt || '');
      setHighlightsPrompt(data.find(p => p.section === 'capsule.highlights')?.prompt || '');
      setTestSummaryPrompt(data.find(p => p.section === 'capsule.testSummary')?.prompt || '');
    } catch (error) {
      if (IS_DEV) console.error('Failed to fetch prompts:', error);
      // Set default prompts if fetch fails
      setSummaryPrompt('Generate a comprehensive summary of the provided documents');
      setHighlightsPrompt('Extract key highlights and important points from documents');
      setTestSummaryPrompt('Create a test summary of the content');
    } finally {
      setIsLoadingPrompts(false);
    }
  }, [capsuleId, fetchWithAuth]);

  // Added purpose selection handlers
  const getCurrentPurposeName = useCallback(() => {
    if (record?.purposeOverride) {
      return record.purposeOverride.cardName;
    }
    return 'Summary'; // Default
  }, [record?.purposeOverride]);

  const getCurrentPurposeId = useCallback(() => {
    if (record?.purposeOverride) {
      return record.purposeOverride.cardId;
    }
    return 'summary'; // Default
  }, [record?.purposeOverride]);

  const handlePurposeSelect = useCallback(async (card: PurposeCard) => {
    try {
      setIsLoadingPrompts(true);
      
      if (card.isDefault && card.id === 'summary') {
        // For default summary, clear override (simulate API call)
        console.log('Clearing purpose override for default summary');
        // In real implementation: await fetchWithAuth(`/api/capsules/${capsuleId}/purpose`, { method: 'DELETE' });
        
        notifications.show({
          title: 'Purpose Updated',
          message: 'Using default summary purpose.',
          color: 'green',
        });
      } else if (!card.isDefault) {
        // For prototype cards, set override (simulate API call)
        console.log('Setting purpose override:', card.name);
        // In real implementation: 
        // await fetchWithAuth(`/api/capsules/${capsuleId}/purpose`, {
        //   method: 'PATCH',
        //   body: JSON.stringify({
        //     cardId: card.id,
        //     cardName: card.name,
        //     prompt: card.prompt,
        //     section: card.section
        //   })
        // });
        
        notifications.show({
          title: 'Purpose Updated',
          message: `Capsule purpose set to: ${card.name}`,
          color: 'green',
        });
      }
      
      // Refresh capsule data to get updated purpose
      setTimeout(() => debouncedRefetch(), 500);
      
    } catch (error) {
      if (IS_DEV) console.error('Failed to update purpose:', error);
      notifications.show({
        title: 'Error',
        message: formatErrorMessage(error),
        color: 'red',
      });
    } finally {
      setIsLoadingPrompts(false);
    }
  }, [capsuleId, fetchWithAuth, debouncedRefetch]);

  const handleOpenPurposeModal = useCallback(async () => {
    await loadPrompts();
    setIsPurposeModalOpen(true);
  }, [loadPrompts]);

  // Status effect to sync UI with capsule status
  useEffect(() => {
    if (!capsuleData?.data?.status || !identity?.token) return;

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
  }, [capsuleData?.data?.status, identity?.token, statusMonitorActive, isRegenerating, startStatusMonitoring]);

  // File effect with retry limit
  useEffect(() => {
    const fileIds = capsuleData?.data?.fileIds;
    if (
      !fileIds?.length ||
      isLoadingFiles ||
      fileIds.every(id => loadedFiles.some(file => file._id === id)) ||
      fetchRetries >= MAX_FETCH_RETRIES
    ) {
      if (fetchRetries >= MAX_FETCH_RETRIES) {
        if (IS_DEV) console.log("[CapsuleView] Max fetch retries reached, stopping");
      }
      return;
    }

    fetchFileDetails(fileIds);
  }, [capsuleData?.data?.fileIds, isLoadingFiles, loadedFiles, fetchRetries, fetchFileDetails]);

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

  // Handle new capsule creation (placeholder for future implementation)
  const handleCreateNewCapsule = useCallback(() => {
    // TODO: Implement capsule creation logic
    console.log("Create new capsule - to be implemented");
    notifications.show({
      title: 'Coming Soon',
      message: 'Capsule creation will be available soon.',
      color: 'blue',
    });
  }, []);

  // Render
  if (isLoading || identityLoading) {
    return (
      <Box style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        backgroundColor: '#0a0a0a', 
        color: '#ffffff' 
      }}>
        <LoadingOverlay visible={true} overlayProps={{ blur: 2 }} />
      </Box>
    );
  }

  if (isError || !record) {
    return (
      <Box style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        backgroundColor: '#0a0a0a', 
        color: '#ffffff' 
      }}>
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
  const hasContextSummary = !!extractContextSummary(record.summaryContext);
  
  const debugContent = enrichedContent || extractContextSummary(record?.summaryContext);
  console.log('PAGE DEBUG: Content being passed to renderer:', debugContent?.substring(0, 2000));
  
  // Check for malformed patterns
  const malformedInPage = debugContent?.match(/\*{3,}\[/g);
  if (malformedInPage) {
    console.error('PAGE ERROR: Malformed patterns found before renderer:', malformedInPage);
  } else {
    console.log('PAGE SUCCESS: Clean content being passed to renderer');
  }

  return (
    <Box style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#0a0a0a', 
      color: '#ffffff' 
    }}>
      {/* Unified Header */}
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
        <Group align="center">
          {/* Passive + icon for future capsule creation */}
          <ActionIcon 
            size="lg" 
            variant="subtle" 
            onClick={handleCreateNewCapsule}
            style={{ color: '#a0a0a0' }}
            title="Create new capsule"
          >
            <Plus size={20} />
          </ActionIcon>
          {/* Display actual capsule name from API */}
          <Text 
            size="sm" 
            fw={500} 
            style={{ 
              fontFamily: GeistMono.style.fontFamily, 
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}
          >
            {record.name || "Untitled Capsule"}
          </Text>
          <Badge
            variant="filled"
            color={isProcessing ? 'yellow' : record.status?.toLowerCase() === 'completed' || record.status?.toLowerCase() === 'ready' ? 'green' : 'gray'}
            style={{ textTransform: 'uppercase', fontSize: '11px', fontFamily: GeistMono.style.fontFamily }}
          >
            {isProcessing ? 'PROCESSING' : record.status || 'Unknown'}
          </Badge>
          {/* Added current purpose display */}
          <Badge
            variant="outline"
            color="orange"
            style={{ 
              textTransform: 'uppercase', 
              fontSize: '10px', 
              fontFamily: GeistMono.style.fontFamily,
              borderColor: '#F5A623',
              color: '#F5A623'
            }}
          >
            {getCurrentPurposeName()}
          </Badge>
        </Group>
        <Group gap="xs">
          <Button 
            variant="subtle" 
            leftSection={<Plus size={14} />}
            onClick={handleAddFile}
            disabled={isProcessing}
            loading={isAddingFiles}
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
            ADD CONTEXT
          </Button>
          {/* Added purpose selection button */}
          <Button 
            variant="subtle"
            leftSection={<Target size={14} />}
            onClick={handleOpenPurposeModal}
            disabled={isProcessing}
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
            PURPOSE
          </Button>
          {identity?.subscriptionPlan?.name?.toUpperCase() === 'ADMIN' && (
            <Button 
              variant="subtle"
              leftSection={<Link2 size={14} />}
              onClick={() => {
                handleResetEnrichedContent();
                setIsReferenceModalOpen(true);
              }}
              disabled={!hasContextSummary || isProcessing}
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
              REFS
            </Button>
          )}
        </Group>
      </Flex>

      {/* Main Content Area */}
      <Flex style={{ flex: 1, overflow: 'hidden' }}>
        {/* Main Content */}
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
            {errorMessage && (
              <Alert color="red" title="Action Required" mb="md" icon={<AlertCircle size={16} />} withCloseButton onClose={() => setErrorMessage(null)}>
                {errorMessage}
              </Alert>
            )}

            {/* Capsule Context Header with Actions */}
            <Flex justify="space-between" align="center" mb="md">
              <Text 
                size="lg" 
                fw={600} 
                style={{ 
                  color: '#F5A623',
                  fontFamily: 'Geist, sans-serif'
                }}
              >
                Capsule Context
              </Text>
              <Group gap="xs">
                <Button
                  variant="default"
                  leftSection={<RefreshCw size={16} />}
                  onClick={handleRegenerateCapsule}
                  loading={isProcessing}
                  disabled={!hasFiles || isAddingFiles}
                  styles={{ 
                    root: { 
                      borderColor: '#2b2b2b', 
                      color: '#ffffff', 
                      '&:hover': { backgroundColor: '#2b2b2b' }
                    }
                  }}
                >
                  Regenerate
                </Button>
                <Button
                  variant="default"
                  leftSection={<Download size={16} />}
                  onClick={handleDownloadMarkdown}
                  disabled={!hasContextSummary || isProcessing}
                  styles={{ 
                    root: { 
                      borderColor: '#2b2b2b', 
                      color: '#ffffff', 
                      '&:hover': { backgroundColor: '#2b2b2b' }
                    }
                  }}
                >
                  Download MD
                </Button>
              </Group>
            </Flex>

            {/* Content Area */}
            <Box style={{ 
              backgroundColor: '#131313', 
              minHeight: 'calc(100vh - 250px)', 
              maxHeight: 'calc(100vh - 250px)', 
              overflowY: 'auto', 
              border: '1px solid #2b2b2b', 
              borderRadius: '8px', 
              padding: '20px', 
              position: 'relative' 
            }}>
              {isProcessing ? (
                <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', minHeight: '200px' }}>
                  <LoadingOverlay visible={true} overlayProps={{ blur: 1, color: '#131313', opacity: 0.6 }} loaderProps={{ color: 'orange', type: 'dots' }} />
                  <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0', zIndex: 1 }}>Generating context...</Text>
                  <Text ta="center" c="dimmed" mb="md" style={{ zIndex: 1 }}>
                    Analyzing files and creating the capsule summary.
                  </Text>
                </Stack>
              ) : hasContextSummary ? (
                <DocumentMarkdownWrapper 
                  markdown={(enrichedContent || extractContextSummary(record.summaryContext)) ?? ""} 
                />
              ) : hasFiles ? (
                <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', padding: '20px', minHeight: '200px' }}>
                  <FileText size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
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
                  <FileText size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
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
        </Box>

        {/* Right Sidebar - Files */}
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
          <Text 
            c="dimmed" 
            mb="md" 
            size="xs" 
            style={{ 
              fontFamily: GeistMono.style.fontFamily,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Source Files ({displayFiles.length})
          </Text>
          
          {hasFiles ? (
            <Stack gap="sm" style={{ marginBottom: '1rem' }}>
              {displayFiles.map((file) => (
                <Box
                  key={file._id}
                  style={{
                    backgroundColor: '#131313',
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
                    <Box p="xs" style={{ backgroundColor: '#0a0a0a', borderTop: '1px solid #2b2b2b' }}>
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
            <Alert color="dark" variant="outline" title="No Files Added" icon={<FileText size={16} />} style={{ borderColor: '#2b2b2b', marginBottom: '1rem' }}>
              Add source documents to your capsule using the button above.
            </Alert>
          )}
        </Box>
      </Flex>

      {/* Modals */}
      <FileSelector
        opened={isFileSelectorOpen}
        onClose={() => setIsFileSelectorOpen(false)}
        onSelect={handleFileSelect}
        capsuleId={capsuleId}
        existingFileIds={record?.fileIds || []}
      />
      <ReferenceEnrichmentModal
        isOpen={isReferenceModalOpen}
        onClose={() => {
          setIsReferenceModalOpen(false);
        }}
        originalContent={extractContextSummary(record?.summaryContext) ?? ''}
        onContentUpdate={handleContentEnrichment}
      />
      {/* Added CapsulePurposeModal */}
      <CapsulePurposeModal
        isOpen={isPurposeModalOpen}
        onClose={() => setIsPurposeModalOpen(false)}
        isLoading={isLoadingPrompts}
        summary={summaryPrompt}
        highlights={highlightsPrompt}
        testSummary={testSummaryPrompt}
        onPurposeSelect={handlePurposeSelect}
        activePurpose={getCurrentPurposeId()}
        capsuleId={capsuleId}
      />
    </Box>
  );
}