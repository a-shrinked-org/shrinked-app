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
  Settings,
  X,
  File
} from 'lucide-react';
import { useParams } from "next/navigation";
import { useAuth } from "@/utils/authUtils";
import DocumentMarkdownWrapper from "@/components/DocumentMarkdownWrapper";
import { GeistMono } from 'geist/font/mono';
import FileSelector from '@/components/FileSelector';
import CapsuleSettingsModal from '@/components/CapsuleSettingsModal';

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
  subscriptionPlan?: {
    name?: string;
  };
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
  const { handleAuthError, fetchWithAuth, ensureValidToken } = useAuth();

  // State declarations
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [addedFileIds, setAddedFileIds] = useState<string[]>([]);
  const [loadedFiles, setLoadedFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [retryParams, setRetryParams] = useState<{operation: string, params: any} | null>(null);
  const [statusMonitorActive, setStatusMonitorActive] = useState(false);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [promptsData, setPromptsData] = useState({
    summary: '',
    extraction: '',
    classification: ''
  });
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [promptSaveStatus, setPromptSaveStatus] = useState('');
  
  // Add these functions after your other useCallback functions
  const fetchCapsulePrompts = useCallback(async () => {
    if (!capsuleId) return;
    
    try {
      setIsLoadingPrompts(true);
      const response = await fetchWithAuth(`/api/capsule/${capsuleId}/prompts`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch prompts: ${response.status}`);
      }
      
      const data = await response.json();
      setPromptsData({
        summary: data.summary || '',
        extraction: data.extraction || '',
        classification: data.classification || ''
      });
    } catch (error) {
      console.error('[CapsuleView] Failed to fetch prompts:', error);
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
    } finally {
      setIsLoadingPrompts(false);
    }
  }, [capsuleId, fetchWithAuth, handleAuthError]);
  
  // Add this useEffect with other useEffects
  useEffect(() => {
    if (isSettingsModalOpen) {
      fetchCapsulePrompts();
    }
  }, [isSettingsModalOpen, fetchCapsulePrompts]);
  
  // Add a handler for prompt changes
  const handlePromptChange = useCallback((key: string, value: string) => {
    setPromptsData(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // First get queryResult and refetch
  const { queryResult } = useShow<Capsule>({
    resource: "capsules",
    id: capsuleId,
    queryOptions: {
      enabled: !!capsuleId && !!identity?.token,
      staleTime: 30000,
      retry: 1,
      refetchInterval: (query) => {
        const currentStatus = ((query?.data as any)?.data?.status || '').toLowerCase();
        return currentStatus === 'processing' ? REFRESH_INTERVAL_MS : false;
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

  // Now define startStatusMonitoring using refetch
  const startStatusMonitoring = useCallback(() => {
    // Clear any existing interval first
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
    
    // Make sure we're not starting monitoring when we're already in a completed state
    const currentStatus = (record?.status || '').toLowerCase();
    const completedStatuses = ['completed', 'ready', 'failed'];
    
    if (completedStatuses.includes(currentStatus) && !isRegenerating) {
      if (IS_DEV) console.log(`[CapsuleView] Not starting monitoring for already completed status: ${currentStatus}`);
      return; // Don't start monitoring for already completed statuses
    }
    
    if (IS_DEV) console.log("[CapsuleView] Starting status monitoring...");
    setStatusMonitorActive(true);
    setIsRegenerating(true); // Always ensure UI is showing loading state
    
    // Perform an immediate refresh to get status faster (reducing initial waiting time)
    refetch().then((refreshResult) => {
      // Check if we're already done
      const refreshedData = refreshResult?.data?.data;
      if (refreshedData && completedStatuses.includes(refreshedData.status?.toLowerCase())) {
        if (IS_DEV) console.log(`[CapsuleView] Initial check shows completed status: ${refreshedData.status}`);
        // Already completed, no need for monitoring
        setIsRegenerating(false);
        setIsAddingFiles(false);
        setStatusMonitorActive(false);
        return;
      }
    }).catch(err => {
      console.error("[CapsuleView] Error in initial status check:", err);
    });
    
    // Set up the interval - reduced from 3000ms to 1500ms for more responsive feedback
    statusCheckIntervalRef.current = setInterval(async () => {
      try {
        // Skip check if we've already detected completion
        if (!statusMonitorActive) {
          if (statusCheckIntervalRef.current) {
            clearInterval(statusCheckIntervalRef.current);
            statusCheckIntervalRef.current = null;
          }
          return;
        }
        
        if (IS_DEV) console.log("[CapsuleView] Checking capsule status...");
        const refreshResult = await refetch();
        
        // Make sure we're accessing the status correctly
        const capsuleData = refreshResult?.data?.data;
        if (!capsuleData || typeof capsuleData.status !== 'string') {
          console.warn("[CapsuleView] Invalid status in refresh result");
          return;
        }
        
        const refreshedStatus = capsuleData.status.toLowerCase();
        
        if (IS_DEV) console.log(`[CapsuleView] Status check: "${refreshedStatus}" (original: "${capsuleData.status}")`);
        
        // Update regenerating state based on status - using lowercase comparison
        if (refreshedStatus === 'processing') {
          if (!isRegenerating) {
            if (IS_DEV) console.log("[CapsuleView] Setting isRegenerating to true based on status");
            setIsRegenerating(true);
          }
        } else if (refreshedStatus === 'completed' || refreshedStatus === 'ready' || refreshedStatus === 'failed') {
          if (IS_DEV) console.log(`[CapsuleView] Processing complete, final status: ${refreshedStatus}`);
          setIsRegenerating(false);
          
          // Reset the isAddingFiles state to ensure Add Files button resets
          setIsAddingFiles(false);
          
          // Show notification on completion
          notifications.show({
            title: 'Processing Complete',
            message: 'Capsule generation is complete.',
            color: 'green',
          });
          
          // Stop monitoring immediately when we detect completion
          setStatusMonitorActive(false);
          if (statusCheckIntervalRef.current) {
            clearInterval(statusCheckIntervalRef.current);
            statusCheckIntervalRef.current = null;
          }
          
          // Do one final refresh to ensure we have latest data
          setTimeout(() => refetch(), 500);
        }
      } catch (error) {
        console.error("[CapsuleView] Error during status check:", error);
      }
    }, 1500); // Faster check interval (was 3000ms)
    
    // Safety cleanup - reduced from 120000ms to 90000ms
    setTimeout(() => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
      if (statusMonitorActive) {
        if (IS_DEV) console.log("[CapsuleView] Status monitoring timed out after 90 seconds");
        setStatusMonitorActive(false);
      }
      if (isRegenerating) {
        if (IS_DEV) console.log("[CapsuleView] Force resetting isRegenerating after timeout");
        setIsRegenerating(false);
        setIsAddingFiles(false);
        // Force one final refresh
        refetch();
      }
    }, 90000); // 1.5 minutes timeout (reduced from 2 minutes)
  }, [refetch, isRegenerating, statusMonitorActive, record?.status]);
  
  const saveCapsulePrompts = useCallback(async () => {
    if (!capsuleId) return;
    
    try {
      setIsLoadingPrompts(true);
      setPromptSaveStatus('Saving...');
      
      const response = await fetchWithAuth(`/api/capsules-proxy/${capsuleId}/prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(promptsData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save prompts: ${response.status}`);
      }
      
      setPromptSaveStatus('Saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPromptSaveStatus('');
      }, 3000);
      
      // After saving successfully, trigger regeneration
      const regenerateResponse = await fetchWithAuth(`/api/capsules-proxy/${capsuleId}/regenerate`, {
        method: 'GET',
      });
      
      if (!regenerateResponse.ok) {
        console.warn('[CapsuleView] Regeneration after saving prompts failed:', regenerateResponse.status);
      } else {
        // Start monitoring for the regeneration process
        setIsRegenerating(true);
        startStatusMonitoring();
        
        // Notify user
        notifications.show({
          title: 'Regenerating Capsule',
          message: 'Capsule is being regenerated with new prompts.',
          color: 'yellow',
        });
      }
      
    } catch (error) {
      console.error('[CapsuleView] Failed to save prompts:', error);
      setPromptSaveStatus('Failed to save');
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
    } finally {
      setIsLoadingPrompts(false);
    }
  }, [capsuleId, fetchWithAuth, handleAuthError, promptsData, startStatusMonitoring]);

  // Now implement the onSuccess callback with startStatusMonitoring
  useEffect(() => {
    if (capsuleData?.data) {
      const data = capsuleData;
      const currentStatus = (data.data.status || '').toLowerCase();
      
      // Start monitoring if capsule is processing but we're not monitoring yet
      if (currentStatus === 'processing' && !statusMonitorActive) {
        if (IS_DEV) console.log("[CapsuleView] Detected PROCESSING status, starting monitoring");
        setIsRegenerating(true);
        startStatusMonitoring();
      }
      
      // Stop regenerating if capsule is completed
      if ((currentStatus === 'completed' || currentStatus === 'ready') && isRegenerating) {
        if (IS_DEV) console.log(`[CapsuleView] Detected ${currentStatus.toUpperCase()} status, stopping regeneration`);
        setIsRegenerating(false);
        setIsAddingFiles(false);
        
        // Also make sure monitoring is stopped
        if (statusMonitorActive) {
          setStatusMonitorActive(false);
          if (statusCheckIntervalRef.current) {
            clearInterval(statusCheckIntervalRef.current);
            statusCheckIntervalRef.current = null;
          }
        }
      }
      
      // Trigger file detail fetching if needed
      if (data.data.fileIds && (!data.data.files || data.data.files.length === 0)) {
        if (!isLoadingFiles && loadedFiles.length === 0) {
          fetchFileDetails(data.data.fileIds);
        }
      }
    }
  }, [capsuleData, statusMonitorActive, isRegenerating, isLoadingFiles, loadedFiles.length, startStatusMonitoring, isAddingFiles]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
    };
  }, []);
  
  // Fetch file details with batching for better performance
  const fetchFileDetails = useCallback(async (fileIds: string[]) => {
    if (!fileIds || fileIds.length === 0 || !capsuleId) {
      if (IS_DEV) console.warn("[CapsuleView] Cannot fetch file details: Missing file IDs or capsule ID");
      return;
    }
  
    setIsLoadingFiles(true);
    if (IS_DEV) console.log(`[CapsuleView] Fetching details for ${fileIds.length} files for capsule ${capsuleId}`);
  
    try {
      // First try from the main capsule data
      const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}`);
  
      if (!response.ok) {
        throw new Error(`Failed to fetch capsule details: ${response.status}`);
      }
  
      const capsuleData = await response.json();
      const data = capsuleData?.data || capsuleData; // Handle both possible response structures
      
      if (data?.files && Array.isArray(data.files) && data.files.length > 0) {
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
        
        if (processedFiles.length > 0) {
          setLoadedFiles(processedFiles);
          if (IS_DEV) console.log("[CapsuleView] Successfully loaded file details:", processedFiles.length);
          setIsLoadingFiles(false);
          return;
        } else {
          if (IS_DEV) console.log("[CapsuleView] No matching files found in capsule data");
        }
      } else {
        if (IS_DEV) console.log("[CapsuleView] No files found in capsule data or invalid structure");
      }
  
      // If we get here, we need to try alternative approaches
      
      // Try direct file endpoint as a second option
      try {
        const filesResponse = await fetchWithAuth(`/api/capsules-direct/${capsuleId}/files`);
        
        if (filesResponse.ok) {
          const filesData = await filesResponse.json();
          
          if (Array.isArray(filesData)) {
            const filteredFiles = filesData
              .filter((file: any) => fileIds.includes(file._id))
              .map((file: any) => ({
                _id: file._id,
                title: file.output?.title || file.title || file.fileName || `File ${file._id.slice(-6)}`,
                createdAt: file.createdAt || new Date().toISOString(),
                fileName: file.fileName || "",
                output: file.output || {}
              }));
            
            if (filteredFiles.length > 0) {
              setLoadedFiles(filteredFiles);
              if (IS_DEV) console.log("[CapsuleView] Loaded file details from direct files endpoint:", filteredFiles.length);
              setIsLoadingFiles(false);
              return;
            }
          }
        }
      } catch (filesError) {
        console.warn("[CapsuleView] Error fetching from direct files endpoint:", filesError);
        // Continue to next approach
      }
      
      // Try from user's documents as a third option
      const token = await ensureValidToken();
      let userId = '';
      
      if (token) {
        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          userId = tokenPayload._id || tokenPayload.id || tokenPayload.userId || '';
        } catch (e) {
          console.warn("[CapsuleView] Could not extract user ID from token");
        }
      }
      
      if (!userId) {
        try {
          const profileResponse = await fetchWithAuth('/api/users-proxy/profile');
          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            userId = profile._id || profile.id || '';
          }
        } catch (profileError) {
          console.warn("[CapsuleView] Error fetching user profile:", profileError);
        }
      }
      
      if (userId) {
        try {
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
              
              if (filteredFiles.length > 0) {
                setLoadedFiles(filteredFiles);
                if (IS_DEV) console.log("[CapsuleView] Loaded file details from user documents:", filteredFiles.length);
                setIsLoadingFiles(false);
                return;
              }
            }
          }
        } catch (userFilesError) {
          console.warn("[CapsuleView] Error fetching user documents:", userFilesError);
        }
      }
      
      // If we get here, we've exhausted all options and need to use placeholders
      throw new Error("Unable to fetch file details from any source");
      
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
      
      // Show notification for fetch error
      notifications.show({
        title: 'Error Loading Files',
        message: 'Could not load complete file details. Using placeholders instead.',
        color: 'red',
      });
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
    startStatusMonitoring();
    setErrorMessage(null);
    
    // Show notification
    notifications.show({
      title: 'Processing Started',
      message: 'Capsule regeneration in progress.',
      color: 'yellow',
    });
    
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
      
      // Show error notification
      notifications.show({
        title: 'Regeneration Failed',
        message: formatErrorMessage(error),
        color: 'red',
      });
    }
  }, [capsuleId, fetchWithAuth, refetch, handleAuthError, startStatusMonitoring]);

  // Open file selector dialog
  const handleAddFile = useCallback(() => {
    setIsFileSelectorOpen(true);
  }, []);

  // Handle file selection with improved error handling and batching
  const handleFileSelect = useCallback(async (fileIds: string[], fileData: FileData[] = [], isRetry = false) => {
    if (!capsuleId || fileIds.length === 0) return;
    
    setIsAddingFiles(true);
    setErrorMessage(null);
    setAddedFileIds(fileIds); // Set this immediately for UI feedback
    
    if (!isRetry) {
      setRetryParams({
        operation: 'addFiles',
        params: { fileIds, fileData }
      });
    }
    
    // Show notification
    notifications.show({
      title: 'Adding Files',
      message: 'Adding files and regenerating capsule.',
      color: 'yellow',
    });
    
    try {
      if (IS_DEV) console.log(`[CapsuleView] Adding ${fileIds.length} files to capsule ${capsuleId}`);
      
      // IMPORTANT: Set regenerating state FIRST regardless of server response
      // This ensures UI shows loading state immediately
      setIsRegenerating(true);
      startStatusMonitoring();
      
      // Create optimistic update for files being added
      const optimisticNewFiles = fileIds.map(id => {
        // Look up this file in the provided fileData
        const fileInfo = fileData.find(f => f._id === id);
        
        // If we have file data, use it; otherwise create placeholder
        if (fileInfo) {
          return {
            _id: id,
            title: fileInfo.title || fileInfo.output?.title || fileInfo.fileName || `File ${id.slice(-6)}`,
            createdAt: fileInfo.createdAt || new Date().toISOString(),
            fileName: fileInfo.fileName || "",
            output: fileInfo.output || {}
          };
        } else {
          // Fallback to placeholder if no data is available
          return {
            _id: id,
            title: `File ${id.slice(-6)}`,
            createdAt: new Date().toISOString()
          };
        }
      });
      
      // Update local state immediately for better UX
      setLoadedFiles(prev => {
        // Only add files that aren't already in the list
        const existingIds = prev.map(file => file._id);
        const filesToAdd = optimisticNewFiles.filter(file => !existingIds.includes(file._id));
        return [...prev, ...filesToAdd];
      });
      
      // Process in batches for better reliability - sequential for more reliability
      for (let i = 0; i < fileIds.length; i += FILE_BATCH_SIZE) {
        const batch = fileIds.slice(i, i + FILE_BATCH_SIZE);
        try {
          if (IS_DEV) console.log(`[CapsuleView] Processing batch ${Math.floor(i/FILE_BATCH_SIZE)+1}/${Math.ceil(fileIds.length/FILE_BATCH_SIZE)} with ${batch.length} files`);
          
          const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}/files`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileIds: batch }),
          });
          
          if (!response.ok) {
            console.warn(`[CapsuleView] Batch ${Math.floor(i/FILE_BATCH_SIZE)+1} response not OK:`, response.status);
          } else {
            if (IS_DEV) console.log(`[CapsuleView] Batch ${Math.floor(i/FILE_BATCH_SIZE)+1} processed successfully`);
          }
        } catch (batchError) {
          console.warn(`[CapsuleView] Error processing batch ${Math.floor(i/FILE_BATCH_SIZE)+1}:`, batchError);
          // Continue with next batch despite errors
        }
        
        // Add a small delay between batches to reduce server load
        if (i + FILE_BATCH_SIZE < fileIds.length) {
          await new Promise(resolve => setTimeout(resolve, 250)); // Reduced from 500ms to 250ms
        }
      }
      
      // Explicitly trigger regeneration after all files added
      try {
        await fetchWithAuth(`/api/capsules-direct/${capsuleId}/regenerate`, {
          method: 'GET',
        });
        if (IS_DEV) console.log("[CapsuleView] Regenerate request sent after adding files");
      } catch (regenerateError) {
        console.error("[CapsuleView] Regeneration error after adding files:", regenerateError);
        // Continue anyway - the UI is already showing processing
      }
      
      // Do a final refresh sooner to make sure we have updated data
      setTimeout(() => refetch(), 750); // Reduced from 1500ms to 750ms
      
    } catch (error: any) {
      console.error("[CapsuleView] Failed to add files:", error);
      // Even on errors, don't reset isRegenerating - let the timeout handle it
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
      
      // Show error notification
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
  
  // Handle file removal with improved state management
  const handleRemoveFile = useCallback(async (fileIdToRemove: string) => {
    if (!capsuleId || !fileIdToRemove) return;
    
    // Determine current files for optimistic update
    const currentFiles = record?.files || loadedFiles;
    const remainingFileCount = currentFiles.filter(f => f._id !== fileIdToRemove).length;
    
    setShowDeleteConfirm(null); // Hide confirmation immediately
    setErrorMessage(null);
    
    // Show notification first
    notifications.show({
      title: 'Removing File',
      message: 'Removing file and updating capsule.',
      color: 'yellow',
    });
    
    // Store retry parameters
    setRetryParams({
      operation: 'removeFile',
      params: { fileId: fileIdToRemove }
    });
  
    try {
      if (IS_DEV) console.log(`[CapsuleView] Removing file ${fileIdToRemove} from capsule ${capsuleId}`);
      
      // IMPORTANT: Start status monitoring BEFORE making the API call
      // This ensures the UI immediately shows the loading state
      // and the monitoring will properly catch the state transitions
      setIsRegenerating(true);
      startStatusMonitoring();
      
      // Immediately update local state for optimistic UI
      setLoadedFiles(prev => prev.filter(f => f._id !== fileIdToRemove));
      
      // Use timeout with AbortController to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      // Make the API call to delete the file
      const response = await fetchWithAuth(`/api/capsules-direct/${capsuleId}/files/${fileIdToRemove}`, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok && response.status !== 204) {
        if (IS_DEV) console.warn(`[CapsuleView] Delete response not OK: ${response.status}`);
      } else {
        if (IS_DEV) console.log("[CapsuleView] File deleted successfully");
      }
      
      // If files remain, always trigger regeneration
      if (remainingFileCount > 0) {
        if (IS_DEV) console.log("[CapsuleView] Files remain, triggering regeneration");
        try {
          // Add a slight delay to ensure the deletion is processed before regeneration
          // but reduce it from 500ms to 250ms for faster response
          await new Promise(resolve => setTimeout(resolve, 250));
          
          await fetchWithAuth(`/api/capsules-direct/${capsuleId}/regenerate`, {
            method: 'GET',
          });
          if (IS_DEV) console.log("[CapsuleView] Regenerate request sent after file removal");
        } catch (regenerateError) {
          console.error("[CapsuleView] Regeneration error after file removal:", regenerateError);
          // Continue anyway - the UI is already showing processing
        }
      } else {
        // No files remain, so reset after a brief delay
        if (IS_DEV) console.log("[CapsuleView] No files remain, will reset UI soon");
        setTimeout(() => {
          setIsRegenerating(false);
        }, 1000); // Reduced from 2000ms to 1000ms
      }
      
      // Do a final refresh to make sure we have updated data
      setTimeout(() => refetch(), 750); // Reduced from 1500ms to 750ms
      
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
      setIsRegenerating(false);
      
      // Show error notification
      notifications.show({
        title: 'Error Removing File',
        message: formatErrorMessage(error),
        color: 'red',
      });
    }
  }, [capsuleId, fetchWithAuth, refetch, handleAuthError, record?.files, loadedFiles, startStatusMonitoring]);

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
      
      // Show notification
      notifications.show({
        title: 'Download Started',
        message: 'Downloading markdown summary.',
        color: 'green',
      });
    } catch (error) {
      console.error("[CapsuleView] Failed to download markdown:", error);
      setErrorMessage("Could not prepare download.");
      
      notifications.show({
        title: 'Download Failed',
        message: 'Could not prepare markdown for download.',
        color: 'red',
      });
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
        handleFileSelect(retryParams.params.fileIds, retryParams.params.fileData || [], true);
        break;
      case 'removeFile':
        handleRemoveFile(retryParams.params.fileId);
        break;
      default:
        if (IS_DEV) console.warn("[CapsuleView] Unknown retry operation:", retryParams.operation);
    }
  }, [retryParams, handleRegenerateCapsule, handleFileSelect, handleRemoveFile]);
  
  // Refresh files manually
  const handleRefreshFiles = useCallback(() => {
    if (record?.fileIds && record.fileIds.length > 0) {
      fetchFileDetails(record.fileIds);
      
      notifications.show({
        title: 'Refreshing Files',
        message: 'Refreshing file metadata.',
        color: 'blue',
      });
    }
  }, [record?.fileIds, fetchFileDetails]);
  
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
        const isProcessing = record.status?.toLowerCase() === 'processing' || isRegenerating;
        
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
                    isRegenerating ? 'yellow' :
                    record.status?.toLowerCase() === 'completed' || record.status?.toLowerCase() === 'ready' ? 'green' :
                    record.status?.toLowerCase() === 'processing' ? 'yellow' :
                    record.status?.toLowerCase() === 'pending' ? 'blue' :
                    record.status?.toLowerCase() === 'failed' ? 'red' : 'gray'
                  }
                  style={{ textTransform: 'uppercase', marginLeft: '8px' }}
                >
                  {isRegenerating ? 'PROCESSING' : record.status || 'Unknown'}
                </Badge>
              </Group>
        
              {/* Right Header: Action Buttons */}
              <Group>
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
                {/* Settings button only visible for ADMIN plan users */}
                {identity?.subscriptionPlan?.name?.toUpperCase() === 'ADMIN' && (
                  <Button
                    variant="default"
                    leftSection={<Settings size={16} />}
                    onClick={() => setIsSettingsModalOpen(true)}
                    disabled={isProcessing}
                    styles={{ root: { borderColor: '#2b2b2b', color: '#ffffff', '&:hover': { backgroundColor: '#2b2b2b' }}}}
                  >
                    Settings
                  </Button>
                )}
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
              onSelect={(fileIds, fileData) => handleFileSelect(fileIds, fileData)}
              capsuleId={capsuleId}
              existingFileIds={record?.fileIds || []}
            />
            <CapsuleSettingsModal
              isOpen={isSettingsModalOpen}
              onClose={() => setIsSettingsModalOpen(false)}
              isLoading={isLoadingPrompts}
              promptData={promptsData}
              onPromptChange={handlePromptChange}
              onSave={saveCapsulePrompts}
              saveStatus={promptSaveStatus}
            />
          </Box>
        );
      }