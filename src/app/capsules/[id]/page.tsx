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
  id?: string; // User ID from identity
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
  // Ensure capsuleId is extracted correctly, even if params.id is an array
  const capsuleId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";

  const { data: identity } = useGetIdentity<Identity>();

  const { handleAuthError, fetchWithAuth, ensureValidToken } = useAuth();

  const { queryResult } = useShow<Capsule>({
    resource: "capsules",
    id: capsuleId,
    queryOptions: {
      enabled: !!capsuleId && !!identity?.token,
      staleTime: 30000,
      retry: 1,
      refetchInterval: (query) => {
        const currentStatus = (query?.data as any)?.data?.status;
        return currentStatus === 'PROCESSING' ? REFRESH_INTERVAL_MS : false;
      },
      onSuccess: (data) => {
        if (IS_DEV) console.log("[CapsuleView] Capsule data loaded successfully");
        const capsuleData = data as any;
        if (capsuleData?.data?.status === 'COMPLETED' && isRegenerating) {
          setIsRegenerating(false);
        }
        
        // Trigger file detail fetching if needed
        if (capsuleData?.data?.fileIds && (!capsuleData.data.files || capsuleData.data.files.length === 0)) {
          if (!isLoadingFiles && loadedFiles.length === 0) {
            fetchFileDetails(capsuleData.data.fileIds);
          }
        }
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

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [addedFileIds, setAddedFileIds] = useState<string[]>([]);
  const [loadedFiles, setLoadedFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [retryParams, setRetryParams] = useState<{operation: string, params: any} | null>(null);
  
  // Fetch file details with batching for better performance
  const fetchFileDetails = useCallback(async (fileIds: string[]) => {
    if (!fileIds || fileIds.length === 0 || !capsuleId) {
      if (IS_DEV) console.warn("[CapsuleView] Cannot fetch file details: Missing file IDs or capsule ID");
      return;
    }
  
    setIsLoadingFiles(true);
    if (IS_DEV) console.log(`[CapsuleView] Fetching details for ${fileIds.length} files for capsule ${capsuleId}`);
  
    try {
      // First try from the main capsule data which already has files
      const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}`);
  
      if (!response.ok) {
        throw new Error(`Failed to fetch capsule details: ${response.status}`);
      }
  
      const capsuleData = await response.json();
      const data = capsuleData?.data || capsuleData; // Handle both possible response structures
      
      if (data?.files && Array.isArray(data.files)) {
        // Process files from the capsule response
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
        if (IS_DEV) console.log("[CapsuleView] Successfully loaded file details:", processedFiles.length);
        return;
      }
  
      // If we don't have files in capsule data, try a direct fetch from user's documents
      if (IS_DEV) console.log("[CapsuleView] No files found in capsule data, trying user documents");
      const token = await ensureValidToken();
      let userId = '';
      
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        userId = tokenPayload._id || tokenPayload.id || tokenPayload.userId || '';
      } catch (e) {
        console.warn("[CapsuleView] Could not extract user ID from token");
      }
      
      if (!userId) {
        const profileResponse = await fetchWithAuth('/api/users-proxy/profile');
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          userId = profile._id || profile.id || '';
        }
      }
      
      if (userId) {
        const filesResponse = await fetchWithAuth(`/api/processing-proxy/user/${userId}/documents`);
        
        if (filesResponse.ok) {
          const allUserFiles = await filesResponse.json();
          
          if (Array.isArray(allUserFiles)) {
            const filteredFiles = allUserFiles
              .filter((file: any) => fileIds.includes(file._id))
              .map((file: any) => ({
                _id: file._id,
                title: file.output?.title || file.title || file.fileName || `File ${file._id.slice(-6)}`,
                createdAt: file.createdAt || new Date().toISOString(),
                fileName: file.fileName || "",
                output: file.output || {}
              }));
            
            setLoadedFiles(filteredFiles);
            if (IS_DEV) console.log("[CapsuleView] Loaded file details from user documents:", filteredFiles.length);
            return;
          }
        }
      }
      
      // If we still don't have files, use placeholders
      throw new Error("No files found in capsule data or user documents");
      
    } catch (error: any) {
      console.error("[CapsuleView] Failed to fetch file details:", error);
      // Create placeholders as a fallback on error
      const placeholders = fileIds.map(id => ({
        _id: id,
        title: `File ${id.slice(-6)}`,
        createdAt: new Date().toISOString()
      }));
      setLoadedFiles(placeholders);
      
      if (IS_DEV) console.log("[CapsuleView] Created placeholder files due to fetch error");
    } finally {
      setIsLoadingFiles(false);
    }
  }, [capsuleId, fetchWithAuth, ensureValidToken]);

  // Trigger initial fetch if needed
  useEffect(() => {
    // Only fetch if we have fileIds, don't have embedded files, and haven't loaded files yet
    if (
      record?.fileIds && 
      (!record.files || record.files.length === 0) && 
      loadedFiles.length === 0 && 
      !isLoadingFiles
    ) {
      fetchFileDetails(record.fileIds);
    }
  }, [record?.fileIds, record?.files, loadedFiles.length, isLoadingFiles, fetchFileDetails]);

  // Helper function to extract summary
  const extractContextSummary = (summaryContext?: string): string | null => {
    if (!summaryContext) return null;
    const summaryMatch = summaryContext.match(/<summary>([\s\S]*?)<\/summary>/);
    return summaryMatch?.[1]?.trim() ?? summaryContext.trim();
  };

  // Handle regeneration of capsule with retry logic
  const handleRegenerateCapsule = useCallback(async (isRetry = false) => {
    if (!capsuleId) return;

    setIsRegenerating(true);
    setErrorMessage(null);
    
    if (!isRetry) {
      // Store parameters for potential retry
      setRetryParams({
        operation: 'regenerate',
        params: {}
      });
    }

    try {
      if (IS_DEV) console.log(`[CapsuleView] Regenerating capsule: ${capsuleId}`);
      
      const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}/regenerate`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `Failed to trigger regeneration: ${response.status}`);
      }

      if (IS_DEV) console.log("[CapsuleView] Regenerate request sent successfully");
      // Refresh data after a short delay to allow processing status to update
      setTimeout(() => refetch(), 1500);

    } catch (error: any) {
      console.error("[CapsuleView] Failed to regenerate capsule:", error);
      setErrorMessage(formatErrorMessage(error));
      setIsRegenerating(false);
      handleAuthError(error);
    }
  }, [capsuleId, fetchWithAuth, refetch, handleAuthError]);

  // Open file selector dialog
  const handleAddFile = useCallback(() => {
    setIsFileSelectorOpen(true);
  }, []);

  // Handle file selection with improved error handling and batching
  const handleFileSelect = useCallback(async (fileIds: string[], isRetry = false) => {
    if (!capsuleId || fileIds.length === 0) return;
    
    setIsAddingFiles(true);
    setErrorMessage(null);
    setAddedFileIds([]);
    
    if (!isRetry) {
      setRetryParams({
        operation: 'addFiles',
        params: { fileIds }
      });
    }
    
    // Capture initial state before making any changes
    const initialCapsuleState = await refetch();
    const initialFileIds = initialCapsuleState?.data?.data?.fileIds || [];
    
    try {
      if (IS_DEV) console.log(`[CapsuleView] Adding ${fileIds.length} files to capsule ${capsuleId}`);
    
      // Process in batches for better reliability
      const batches = [];
      for (let i = 0; i < fileIds.length; i += FILE_BATCH_SIZE) {
        batches.push(fileIds.slice(i, i + FILE_BATCH_SIZE));
      }
      
      const successfullyAddedIds: string[] = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (IS_DEV) console.log(`[CapsuleView] Processing batch ${i+1}/${batches.length} with ${batch.length} files`);
        
        try {
          const timeoutMs = 30000; // 30 seconds timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          
          const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}/files`, {
            method: 'POST',
            body: JSON.stringify({ fileIds: batch }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
    
          if (!response.ok) {
            // Try to get error details
            const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
            throw new Error(errorData.message || `Failed to add files in batch ${i+1}: ${response.status}`);
          }
          
          // Add successful file IDs
          successfullyAddedIds.push(...batch);
          if (IS_DEV) console.log(`[CapsuleView] Batch ${i+1}/${batches.length} added successfully`);
          
          // Small delay between batches
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error: any) {
          // Special handling for timeout errors
          if (error.name === 'AbortError') {
            console.warn(`[CapsuleView] Batch ${i+1} timed out, but may still have been processed`);
            // We'll check separately if files were added
          } else {
            console.error(`[CapsuleView] Error processing batch ${i+1}:`, error);
          }
        }
      }
      
      // Most important part: Check if files were actually added regardless of API response
      // Wait a bit for backend processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh to check actual state
      const updatedCapsule = await refetch();
      const updatedFileIds = updatedCapsule?.data?.data?.fileIds || [];
      
      // Check if file count increased OR any file IDs changed
      const fileCountIncreased = updatedFileIds.length > initialFileIds.length;
      const anyNewIdsAdded = fileIds.some(id => updatedFileIds.includes(id) && !initialFileIds.includes(id));
      const filesAdded = fileCountIncreased || anyNewIdsAdded;
      
      // Check if status changed to processing
      const statusChanged = updatedCapsule?.data?.data?.status === 'PROCESSING';
      
      if (filesAdded) {
        // Get the exact IDs that were added 
        const newlyAddedIds = updatedFileIds.filter(id => !initialFileIds.includes(id));
        setAddedFileIds(newlyAddedIds);
        
        if (IS_DEV) console.log(`[CapsuleView] Files successfully added: ${newlyAddedIds.length} new files`);
        
        // If status changed to processing, set the regenerating flag
        if (statusChanged) {
          setIsRegenerating(true);
          if (IS_DEV) console.log("[CapsuleView] Capsule status changed to PROCESSING, monitoring...");
          
          // Setup interval to check status until complete
          const statusCheckInterval = setInterval(async () => {
            try {
              const refreshResult = await refetch();
              const refreshedStatus = refreshResult?.data?.data?.status;
              
              if (IS_DEV) console.log(`[CapsuleView] Status check: ${refreshedStatus}`);
              
              if (refreshedStatus === 'COMPLETED' || refreshedStatus === 'FAILED') {
                clearInterval(statusCheckInterval);
                setIsRegenerating(false);
                if (IS_DEV) console.log(`[CapsuleView] Processing complete, final status: ${refreshedStatus}`);
              }
            } catch (error) {
              console.error("[CapsuleView] Error during status check:", error);
            }
          }, REFRESH_INTERVAL_MS);
          
          // Safety cleanup
          setTimeout(() => {
            clearInterval(statusCheckInterval);
            if (isRegenerating) {
              setIsRegenerating(false);
            }
          }, 120000);
        } else {
          // If status didn't change automatically, trigger manual regeneration
          if (IS_DEV) console.log("[CapsuleView] Status not changed to PROCESSING, triggering manual regeneration");
          try {
            await handleRegenerateCapsule();
          } catch (regenerateError) {
            console.error("[CapsuleView] Regeneration error:", regenerateError);
            // Files were added, so this is not a critical error
          }
        }
      } else if (successfullyAddedIds.length > 0) {
        // API seemed to succeed but files not actually added
        throw new Error("API reported success but files were not added. Please refresh and try again.");
      } else {
        throw new Error("Failed to add any files. Please try again.");
      }
    } catch (error: any) {
      console.error("[CapsuleView] Failed to add files:", error);
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
    } finally {
      setIsAddingFiles(false);
      setIsFileSelectorOpen(false);
    }
  }, [capsuleId, fetchWithAuth, refetch, handleRegenerateCapsule, handleAuthError, isRegenerating]);

  // Handle file removal with improved confirmation flow
  const handleRemoveFile = useCallback(async (fileIdToRemove: string) => {
    if (!capsuleId || !fileIdToRemove) return;
    
    // Determine current files for optimistic update
    const currentFiles = record?.files || loadedFiles;
    const remainingFileCount = currentFiles.filter(f => f._id !== fileIdToRemove).length;
    
    setShowDeleteConfirm(null); // Hide confirmation immediately
    setErrorMessage(null);
    
    setRetryParams({
      operation: 'removeFile',
      params: { fileId: fileIdToRemove }
    });
  
    try {
      if (IS_DEV) console.log(`[CapsuleView] Removing file ${fileIdToRemove} from capsule ${capsuleId}`);
      
      // Immediately update local state for optimistic UI
      setLoadedFiles(prev => prev.filter(f => f._id !== fileIdToRemove));
      
      // Capture state before deletion
      const initialCapsule = await refetch();
      const initialFileIds = initialCapsule?.data?.data?.fileIds || [];
      
      // Use timeout with AbortController to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}/files/${fileIdToRemove}`, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // If deletion seems to have failed, check if the file was actually deleted
      if (!response.ok && response.status !== 204) {
        // Wait a bit before checking
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check actual state to see if deletion happened despite error
        const checkCapsule = await refetch();
        const currentFileIds = checkCapsule?.data?.data?.fileIds || [];
        
        // If file still exists, it's a real error
        if (currentFileIds.includes(fileIdToRemove)) {
          const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
          throw new Error(errorData.message || `Failed to remove file: ${response.status}`);
        }
        
        // Otherwise, deletion succeeded despite the error response
        if (IS_DEV) console.log("[CapsuleView] File removed successfully despite error response");
      } else {
        if (IS_DEV) console.log("[CapsuleView] File removed successfully");
      }
      
      // Refresh to get updated status
      const updatedCapsule = await refetch();
      
      // Check if status changed to processing
      const statusChanged = updatedCapsule?.data?.data?.status === 'PROCESSING';
      
      if (statusChanged) {
        setIsRegenerating(true);
        
        // Setup interval to check status until complete
        const statusCheckInterval = setInterval(async () => {
          try {
            const refreshResult = await refetch();
            const refreshedStatus = refreshResult?.data?.data?.status;
            
            if (refreshedStatus === 'COMPLETED' || refreshedStatus === 'FAILED') {
              clearInterval(statusCheckInterval);
              setIsRegenerating(false);
            }
          } catch (error) {
            console.error("[CapsuleView] Error during status check:", error);
          }
        }, REFRESH_INTERVAL_MS);
        
        // Safety cleanup
        setTimeout(() => {
          clearInterval(statusCheckInterval);
          if (isRegenerating) {
            setIsRegenerating(false);
          }
        }, 120000);
      } else if (remainingFileCount > 0) {
        // If status didn't change but files remain, trigger manual regeneration
        try {
          await handleRegenerateCapsule();
        } catch (regenerateError) {
          console.error("[CapsuleView] Regeneration error after file removal:", regenerateError);
          // Not critical since file was successfully removed
        }
      }
    } catch (error: any) {
      console.error("[CapsuleView] Failed to remove file:", error);
      
      // Restore local state if file removal failed
      setLoadedFiles(prev => {
        const fileStillExists = prev.some(file => file._id === fileIdToRemove);
        if (!fileStillExists) {
          const fileToRestore = record?.files?.find(f => f._id === fileIdToRemove) || 
                               {_id: fileIdToRemove, title: `File ${fileIdToRemove.slice(-6)}`, createdAt: new Date().toISOString()};
          return [...prev, fileToRestore];
        }
        return prev;
      });
      
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
    }
  }, [capsuleId, fetchWithAuth, refetch, handleRegenerateCapsule, record?.files, loadedFiles, handleAuthError, isRegenerating]);

  // Download markdown summary
  const handleDownloadMarkdown = useCallback(() => {
    const summary = extractContextSummary(record?.summaryContext);
    if (!summary || !record) return;

    try {
      if (IS_DEV) console.log("[CapsuleView] Preparing markdown download");
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
      console.error("[CapsuleView] Failed to download markdown:", error);
      setErrorMessage("Could not prepare download.");
    }
  }, [record]);

  // Navigation back to list
  const handleBackToList = useCallback(() => {
    list("capsules");
  }, [list]);
  
  // Handle retry operation
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
      default:
        if (IS_DEV) console.warn("[CapsuleView] Unknown retry operation:", retryParams.operation);
    }
  }, [retryParams, handleRegenerateCapsule, handleFileSelect, handleRemoveFile]);

  // Helper to format date strings
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

  // --- Render Logic ---

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
        <Alert
          color="red"
          title="Error Loading Capsule"
          icon={<AlertCircle size={16} />}
          mb="md"
        >
          {errorMessage || "Could not load capsule details. Please check the ID or try again."}
        </Alert>
        <Button onClick={handleBackToList} leftSection={<ArrowLeft size={16} />}>
          Back to Capsules List
        </Button>
      </Box>
    );
  }

  // Determine which files to display (prefer record.files if available)
  const displayFiles = record.files && record.files.length > 0 ? record.files : loadedFiles;
  const hasFiles = displayFiles.length > 0;
  const isProcessing = record.status === 'PROCESSING' || isRegenerating;

  const contextSummary = extractContextSummary(record.summaryContext);
  const hasContextSummary = !!contextSummary;

  return (
    // Main container styling
    <Box style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '24px' }}>
      {/* Header Section */}
      <Group mb="xl" justify="space-between" align="center">
        {/* Left Header: Back button, Title, Status */}
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
               record.status === 'COMPLETED' ? 'green' :
               record.status === 'PROCESSING' ? 'yellow' :
               record.status === 'PENDING' ? 'blue' :
               record.status === 'FAILED' ? 'red' :
               'gray'
             }
             style={{ textTransform: 'uppercase', marginLeft: '8px' }}
           >
            {record.status || 'Unknown'}
          </Badge>
        </Group>

        {/* Right Header: Action Buttons */}
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
            {isProcessing ? 'Processing...' : 'Regenerate'}
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

      {/* General Error Alert */}
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

      {/* Main Content Layout */}
      <Flex gap="xl">
        {/* Left Panel: Source Files */}
        <Box
          w={330}
          style={{ backgroundColor: '#131313', padding: '16px', borderRadius: '8px', border: '1px solid #2b2b2b' }}
        >
          <Title order={4} mb="md" ta="center" style={{ fontFamily: GeistMono.style.fontFamily, letterSpacing: '0.5px', color: '#a0a0a0' }}>
            SOURCE FILES
          </Title>

          {/* File List or Placeholder */}
          {hasFiles ? (
            <Stack gap="sm" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              {displayFiles.map((file) => (
                <Box
                  key={file._id}
                  style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: '6px',
                    border: addedFileIds.includes(file._id) ? '1px solid #F5A623' : '1px solid #2b2b2b',
                    overflow: 'hidden',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  {/* File Header: Title and Delete Button */}
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
          
                  {/* Delete Confirmation */}
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
          
                   {/* File Footer: Date (only show if not confirming delete) */}
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
             // Show loading specifically for files if they are being fetched
             <Box style={{ padding: '20px', textAlign: 'center' }}>
                 <LoadingOverlay visible={true} overlayProps={{ blur: 1 }} loaderProps={{size: 'sm'}} />
                 <Text size="sm" c="dimmed">Loading file details...</Text>
             </Box>
          ) : (
            // Placeholder when no files are added
            <Alert color="dark" variant="outline" title="No Files Added" icon={<FileText size={16}/>} style={{borderColor: '#2b2b2b'}}>
              Add source documents to your capsule using the button below.
            </Alert>
          )}

          {/* Add Files Button (at bottom of panel) */}
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

        {/* Right Panel: Context Summary */}
        <Box style={{ flex: 1 }}>
          {/* Context Header */}
           <Box style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px', borderBottom: '1px solid #2b2b2b', paddingBottom: '10px', color: '#F5A623' }}>
              Capsule Context
           </Box>

          {/* Context Content Area */}
          <Box style={{ backgroundColor: '#131313', minHeight: 'calc(100vh - 250px)', maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', border: '1px solid #2b2b2b', borderRadius: '8px', padding: '20px', position: 'relative' }}>
            {isProcessing ? (
                 // Loading state while processing/regenerating
                 <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', minHeight: '200px' }}>
                    <LoadingOverlay visible={true} overlayProps={{ blur: 1, color: '#131313', opacity: 0.6 }} loaderProps={{ color: 'orange', type: 'dots' }} />
                    <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0', zIndex: 1 }}>Generating context...</Text>
                    <Text ta="center" c="dimmed" mb="md" style={{zIndex: 1}}>
                       Analyzing files and creating the capsule summary. This might take a moment.
                    </Text>
                 </Stack>
            ) : hasContextSummary ? (
                // Display generated context
                <DocumentMarkdownWrapper markdown={contextSummary} />
            ) : hasFiles ? (
                 // State when files are present but no summary yet (needs regeneration)
                <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', padding: '20px', minHeight: '200px' }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
                    <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0' }}>Ready to Generate</Text>
                    <Text ta="center" c="dimmed" mb="xl">
                        Click the &quot;Regenerate&quot; button to analyze the added files and create the context summary.
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
                 // State when no files and no summary (needs files added)
                 <Stack align="center" justify="center" style={{ height: '100%', color: '#a0a0a0', padding: '20px', minHeight: '200px' }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
                    <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0' }}>No Content Yet</Text>
                    <Text ta="center" c="dimmed" mb="xl">
                        Add files to your capsule first, then generate a summary to see the context here.
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

      {/* File Selector Modal */}
      <FileSelector
        opened={isFileSelectorOpen}
        onClose={() => setIsFileSelectorOpen(false)}
        onSelect={handleFileSelect}
        capsuleId={capsuleId}
        // Pass only the IDs of files already associated with the capsule
        existingFileIds={record?.fileIds || []}
      />
    </Box>
  );
}