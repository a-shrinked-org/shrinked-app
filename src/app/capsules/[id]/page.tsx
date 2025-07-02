"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  Tabs,
  Code,
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
  Target,
  ChevronsUpDown,
  Check,
  Settings
} from 'lucide-react';
import { Loader } from '@mantine/core';
import CliLoadingAnimation from '@/components/CliLoadingAnimation';
import { Select } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/utils/authUtils";
import DocumentMarkdownWrapper from "@/components/DocumentMarkdownWrapper";
import { GeistMono } from 'geist/font/mono';
import FileSelector from '@/components/FileSelector';
import ReferenceEnrichmentModal from "@/components/ReferenceEnrichmentModal";
import CapsulePurposeModal from "@/components/CapsulePurposeModal";
import CapsuleSettingsModal from "@/components/CapsuleSettingsModal";
import stringSimilarity from 'string-similarity';
import { Identity } from "@/@types/logic";

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



interface FileData {
  _id: string;
  title: string;
  createdAt: string;
  fileName?: string;
  output?: { title?: string };
  size?: number;
  contentType?: string;
}

interface AdminPrompt {
  section: string;
  prompt: string;
  prefill?: string;
}

import { prototypeCards, PurposeCard } from "@/providers/data-provider/cards";

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
  highlights?: string;
  summary?: string;
  testSummary?: string;
  overridePrompt?: string;
  __v?: number;
}

const REFRESH_INTERVAL_MS = 3000;
const FILE_BATCH_SIZE = 5;
const IS_DEV = process.env.NODE_ENV === 'development';
const MAX_FETCH_RETRIES = 3;

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
  const router = useRouter();
  useNavigation();
  const capsuleId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>({
    queryOptions: {
      staleTime: 5 * 60 * 1000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
    },
  });
  const { handleAuthError, fetchWithAuth, ensureValidToken } = useAuth();

  // State declarations
  const [activeTab, setActiveTab] = useState("preview");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [statusMonitorActive, setStatusMonitorActive] = useState(false);
  const [fetchRetries, setFetchRetries] = useState(0);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Prompts state for purpose modal
  const [summaryPrompt, setSummaryPrompt] = useState('');
  const [highlightsPrompt, setHighlightsPrompt] = useState('');
  const [testSummaryPrompt, setTestSummaryPrompt] = useState('');
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [enrichedContent, setEnrichedContent] = useState<string>('');

  // Purpose modal state
  const [isPurposeModalOpen, setIsPurposeModalOpen] = useState(false);
  const [optimisticPurposeId, setOptimisticPurposeId] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Capsule dropdown state
  const [availableCapsules, setAvailableCapsules] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingCapsules, setIsLoadingCapsules] = useState(false);
  const [isCapsuleDropdownOpen, { toggle: toggleCapsuleDropdown }] = useDisclosure(false);

  // Capsule query
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
  const debouncedRefetch = useMemo(() => debounce(refetch, 500), [refetch]);

  

  // Default cards using backend data
  const defaultCards: PurposeCard[] = useMemo(() => [
    {
      id: 'summary',
      name: 'Summary',
      description: 'Generate a comprehensive summary of the provided documents',
      prompt: summaryPrompt || 'Generate a comprehensive summary of the provided documents',
      section: 'capsule.summary',
      isDefault: true
    },
    {
      id: 'highlights',
      name: 'Highlights',
      description: 'Extract key highlights and important points from documents',
      prompt: highlightsPrompt || 'Extract key highlights and important points from documents',
      section: 'capsule.highlights',
      isDefault: true
    }
  ], [summaryPrompt, highlightsPrompt]);

 // Enhanced normalization function
 const normalizeText = (text: string): string => {
   if (!text) return '';
   return text
     .replace(/\r\n|\r/g, '\n')      // Normalize line endings to \n
     .replace(/[ \t]+/g, ' ')       // Collapse horizontal whitespace
     .replace(/\n+/g, '\n')         // Collapse multiple newlines
     .trim()
     .toLowerCase();
 };
 
 
 
 const parseOverridePrompt = useCallback((overridePrompt?: string) => {
   if (!overridePrompt) return null;
 
   const normalizedOverride = normalizeText(overridePrompt);
   const allCards = [...defaultCards, ...prototypeCards];
 
   // First, try exact match (after normalization)
   const exactMatch = allCards.find(card => {
     const normalizedCardPrompt = normalizeText(card.prompt);
     return normalizedCardPrompt === normalizedOverride;
   });
 
   if (exactMatch) {
     return {
       cardId: exactMatch.id,
       cardName: exactMatch.name,
       prompt: exactMatch.prompt,
       section: exactMatch.section
     };
   }

   // If exact match fails, try phrase matching for legacy/special cases
   const phraseMatch = allCards.find(card => {
     const overrideText = normalizedOverride;
 
     // Enhanced checks for narrative-analyst
     if (card.id === 'narrative-analyst') {
       const hasKeyPhrases =
         overrideText.includes('paul graham') &&
         overrideText.includes('tech newsletter') &&
         overrideText.includes('tbpn') &&
         overrideText.includes('timestamp references') &&
         overrideText.includes('1200-1600 words');
       return hasKeyPhrases;
     }
 
     // Add checks for other cards
     if (card.id === 'competitor-analysis') {
       return overrideText.includes('competitor analysis') &&
              overrideText.includes('market positioning');
     }
 
     if (card.id === 'linkedin-connection') {
       return overrideText.includes('linkedin connection') &&
              overrideText.includes('prospect research');
     }
 
     return false;
   });
 
   if (phraseMatch) {
     return {
       cardId: phraseMatch.id,
       cardName: phraseMatch.name,
       prompt: phraseMatch.prompt,
       section: phraseMatch.section
     };
   }
 
   // If no match, treat as custom
   return {
     cardId: 'custom',
     cardName: 'Custom Prompt',
     prompt: overridePrompt,
     section: 'capsule.custom'
   };
 }, [defaultCards]);

  // Updated helper functions
  const getCurrentPurposeName = useCallback(() => {
    const overrideData = parseOverridePrompt(record?.overridePrompt);
    if (overrideData) {
      return overrideData.cardName;
    }
    return 'Summary (Default)'; // Default
  }, [record?.overridePrompt, parseOverridePrompt]);

  const getCurrentPurposeId = useCallback(() => {
    const overrideData = parseOverridePrompt(record?.overridePrompt);
    if (overrideData) {
      return overrideData.cardId;
    }
    return 'summary'; // Default
  }, [record?.overridePrompt, parseOverridePrompt]);
  
  const resetGeneratedContent = useCallback(() => {
    console.log('Main: Resetting generated content');
    setEnrichedContent('');
  }, [setEnrichedContent]);
  
  const handlePurposeSelect = useCallback(async (card: PurposeCard) => {
    console.log('Main: Purpose selected:', card.name);
  }, []);
  
  // Status monitoring with improved logic
  const startStatusMonitoring = useCallback(() => {
    if (statusMonitorActive) {
      if (IS_DEV) console.log("[CapsuleView] Status monitoring already active, skipping");
      return;
    }

    const currentStatus = (record?.status || '').toLowerCase();
    const completedStatuses = ['completed', 'ready', 'failed'];

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

          await debouncedRefetch();

          notifications.show({
            title: 'Processing Complete',
            message: 'Capsule generation is complete.',
            color: 'green',
          });
        } else if (refreshedStatus === 'processing') {
          setIsRegenerating(true);
        }
      } catch (error) {
        if (IS_DEV) console.error("[CapsuleView] Error checking status:", error);
        setErrorMessage(formatErrorMessage(error));
      }
    }, REFRESH_INTERVAL_MS);

    setTimeout(() => {
      if (statusMonitorActive) {
        if (IS_DEV) console.log("[CapsuleView] Status monitoring timed out");
        setStatusMonitorActive(false);
        setIsRegenerating(false);
        setIsAddingFiles(false);
        if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
        debouncedRefetch();
      }
    }, 90000);
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
          output: doc.output || {},
          size: doc.size || 0,
          contentType: doc.contentType || 'application/octet-stream'
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

      response = await fetchWithAuth(`/api/capsule/${capsuleId}`);
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
            output: file.output || {},
            size: file.size || 0,
            contentType: file.contentType || 'application/octet-stream'
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

      throw new Error("No file data found from any endpoint");
    } catch (error) {
      if (IS_DEV) console.error("[CapsuleView] Failed to fetch file details:", error);
      const placeholders = missingFileIds.map(id => ({
        _id: id,
        title: `File ${id.slice(-6)}`,
        createdAt: new Date().toISOString(),
        size: 0,
        contentType: 'application/octet-stream'
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
      setFetchRetries(prev => prev + 1);
    }
  }, [capsuleId, identity?.id, fetchWithAuth, isLoadingFiles, loadedFiles]);

  const handleAddFile = useCallback(() => {
    setIsFileSelectorOpen(true);
  }, []);

  const handleFileSelect = useCallback(async (fileIds: string[], fileData: FileData[] = []) => {
    if (!capsuleId || !fileIds.length) return;

    setIsAddingFiles(true);
    setErrorMessage(null);

    // Optimistically update UI
    const optimisticNewFiles = fileIds.map(id => {
      const fileInfo = fileData.find(f => f._id === id);
      return {
        _id: id,
        title: fileInfo?.title || fileInfo?.output?.title || fileInfo?.fileName || `File ${id.slice(-6)}`,
        createdAt: fileInfo?.createdAt || new Date().toISOString(),
        fileName: fileInfo?.fileName || "",
        output: fileInfo?.output || {},
        size: fileInfo?.size || 0,
        contentType: fileInfo?.contentType || 'application/octet-stream'
      };
    });

    setLoadedFiles(prev => {
      const existingIds = prev.map(file => file._id);
      const filesToAdd = optimisticNewFiles.filter(file => !existingIds.includes(file._id));
      return [...prev, ...filesToAdd];
    });

    setIsRegenerating(true);
    startStatusMonitoring(); // Start monitoring immediately

    try {
      // Send API calls without awaiting them to avoid blocking UI
      const addFilePromises = [];
      for (let i = 0; i < fileIds.length; i += FILE_BATCH_SIZE) {
        const batch = fileIds.slice(i, i + FILE_BATCH_SIZE);
        addFilePromises.push(
          fetchWithAuth(`/api/capsule/${capsuleId}/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileIds: batch }),
          }).then(response => {
            if (!response.ok) throw new Error(`Failed to add batch: ${response.status}`);
          }).catch(error => {
            if (IS_DEV) console.error("[CapsuleView] Failed to add files batch:", error);
            notifications.show({
              title: 'Error Adding Files',
              message: formatErrorMessage(error),
              color: 'red',
            });
            handleAuthError(error);
          })
        );
        await new Promise(resolve => setTimeout(resolve, 250)); // Small delay between batches
      }

      await Promise.all(addFilePromises); // Wait for all batches to be sent

      // Trigger regeneration, but don't block on its response
      fetchWithAuth(`/api/capsule/${capsuleId}/regenerate`, { method: 'GET' })
        .then(response => {
          if (!response.ok) throw new Error(`Failed to trigger regeneration: ${response.status}`);
          notifications.show({
            title: 'Files Added',
            message: 'Files added and regeneration started.',
            color: 'green',
          });
        })
        .catch(error => {
          if (IS_DEV) console.error("[CapsuleView] Failed to trigger regeneration after adding files:", error);
          notifications.show({
            title: 'Error Triggering Regeneration',
            message: formatErrorMessage(error),
            color: 'red',
          });
          handleAuthError(error);
        });

    } catch (error) {
      if (IS_DEV) console.error("[CapsuleView] General error in handleFileSelect:", error);
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
      setIsRegenerating(false); // Stop regenerating state if initial setup fails
    } finally {
      setIsAddingFiles(false);
      setIsFileSelectorOpen(false);
    }
  }, [capsuleId, fetchWithAuth, handleAuthError, startStatusMonitoring]);
  
  const handleContentEnrichment = useCallback((enrichedContent: string) => {
    console.log('SETTING enriched content:', enrichedContent.substring(0, 200));
    setEnrichedContent(enrichedContent);
  }, []);

  const handleResetEnrichedContent = useCallback(() => {
    console.log('RESETTING enriched content');
    setEnrichedContent('');
  }, []);

  const handleRemoveFile = useCallback(async (fileId: string) => {
    if (!capsuleId || !fileId) return;

    setShowDeleteConfirm(null);
    setErrorMessage(null);

    // Optimistically update UI
    setLoadedFiles(prev => prev.filter(f => f._id !== fileId));

    setIsRegenerating(true);

    try {
      const response = await fetchWithAuth(`/api/capsule/${capsuleId}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to remove file: ${response.status}`);
      }

      notifications.show({
        title: 'File Removed',
        message: 'File removal initiated.',
        color: 'green',
      });

      await refetch(); // Explicitly refetch after successful deletion

    } catch (error) {
      if (IS_DEV) console.error("[CapsuleView] Failed to remove file:", error);
      // Revert optimistic update if API call fails
      setLoadedFiles(prev => {
        const file = record?.files?.find(f => f._id === fileId) || {
          _id: fileId,
          title: `File ${fileId.slice(-6)}`,
          createdAt: new Date().toISOString(),
          size: 0,
          contentType: 'application/octet-stream'
        };
        return prev.some(f => f._id === fileId) ? prev : [...prev, file];
      });
      setErrorMessage(formatErrorMessage(error));
      handleAuthError(error);
      setIsRegenerating(false); // Stop regenerating state if initial setup fails
      notifications.show({
        title: 'Error Removing File',
        message: formatErrorMessage(error),
        color: 'red',
      });
    }
  }, [capsuleId, fetchWithAuth, handleAuthError, record?.files, loadedFiles, refetch]);

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
      setSummaryPrompt('Generate a comprehensive summary of the provided documents');
      setHighlightsPrompt('Extract key highlights and important points from documents');
      setTestSummaryPrompt('Create a test summary of the content');
    } finally {
      setIsLoadingPrompts(false);
    }
  }, [capsuleId, fetchWithAuth]);

  // Regeneration with immediate UI feedback
  const handleRegenerateCapsule = useCallback(async () => {
    if (!capsuleId || isRegenerating) return;

    setErrorMessage(null);
    setIsRegenerating(true);
    setEnrichedContent(''); // Clear content immediately

    try {
      // Ensure prompts are loaded before triggering regeneration
      if (!summaryPrompt || !highlightsPrompt) {
        if (IS_DEV) console.log("[CapsuleView] Prompts not loaded, fetching them now...");
        await loadPrompts();
      }

      const response = await fetchWithAuth(`/api/capsule/${capsuleId}/regenerate`, { method: 'GET' });
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
  }, [capsuleId, fetchWithAuth, handleAuthError, startStatusMonitoring, isRegenerating, setEnrichedContent, summaryPrompt, highlightsPrompt, loadPrompts]);

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

  // Fetch all capsules for the dropdown
  useEffect(() => {
    const fetchAllCapsules = async () => {
      if (!identity?.id) return;

      setIsLoadingCapsules(true);
      try {
        const response = await fetchWithAuth(`/api/capsules-proxy`);
        if (!response.ok) throw new Error(`Failed to fetch capsules: ${response.status}`);
        const data = await response.json();
        const formattedCapsules = data.map((cap: any) => ({
          value: cap._id,
          label: cap.name,
        }));
        setAvailableCapsules(formattedCapsules);
        if (IS_DEV) console.log("[CapsuleView] Fetched capsules:", formattedCapsules);
      } catch (error) {
        if (IS_DEV) console.error("[CapsuleView] Failed to fetch all capsules:", error);
        notifications.show({
          title: 'Error',
          message: 'Failed to load capsules list.',
          color: 'red',
        });
      } finally {
        setIsLoadingCapsules(false);
      }
    };

    fetchAllCapsules();
  }, [identity?.id, fetchWithAuth]);

  // Helpers
  const extractContextSummary = (summaryContext?: string): string | null => {
    if (!summaryContext) return null;
    const summaryMatch = summaryContext.match(/<summary>([\s\S]*?)<\/summary>/);
    return summaryMatch?.[1]?.trim() ?? summaryContext.trim();
  };

// Add extractHighlightsContent for safe handling
const extractHighlightsContent = (highlights?: string): string | null => {
  if (!highlights || typeof highlights !== 'string' || highlights.trim() === '') return null;
  return highlights.trim();
};

  

  const handleDownloadMarkdown = useCallback(() => {
    const contentToDownload = enrichedContent || extractHighlightsContent(record?.highlights) || extractContextSummary(record?.summaryContext);
    if (!contentToDownload || !record) return;

    try {
      const blob = new Blob([contentToDownload], { type: 'text/markdown;charset=utf-8' });
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
  }, [record, enrichedContent]);

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

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (createdAt: string, updatedAt: string) => {
    const created = new Date(createdAt);
    const updated = new Date(updatedAt);
    const diffMs = updated.getTime() - created.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${diffMinutes}M ${diffSeconds}S`;
  };

  const handleCreateNewCapsule = useCallback(async () => {
    if (!identity?.id) {
      notifications.show({
        title: 'Error',
        message: 'User not authenticated.',
        color: 'red',
      });
      return;
    }
  
    const newCapsuleName = generateNerdyCapsuleName();
    
    try {
      setIsLoadingCapsules(true); // Show loading state
      
      const response = await fetchWithAuth(`/api/capsules-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCapsuleName }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create capsule: ${response.status}`);
      }
  
      const newCapsule = await response.json();
      
      // Update available capsules list with the new capsule
      const newCapsuleOption = {
        value: newCapsule._id,
        label: newCapsule.name,
      };
      
      setAvailableCapsules(prev => [...prev, newCapsuleOption]);
      
      notifications.show({
        title: 'Capsule Created',
        message: `New capsule '${newCapsule.name}' created successfully.`, 
        color: 'green',
      });
      
      // Navigate to the new capsule
      router.push(`/capsules/${newCapsule._id}`);
      
    } catch (error) {
      if (IS_DEV) console.error("[CapsuleView] Failed to create new capsule:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create capsule';
      setErrorMessage(errorMessage);
      handleAuthError(error);
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setIsLoadingCapsules(false);
    }
  }, [identity?.id, fetchWithAuth, handleAuthError, setAvailableCapsules, router]);
  
  // Improved generateNerdyCapsuleName function
  const generateNerdyCapsuleName = (): string => {
    const prefixes = ["QUANTUM", "NEURAL", "CRYPTO", "NEXUS", "CYBER", "MATRIX", "FLUX", "VOID", "PLASMA", "ATOM"];
    const suffixes = ["CORE", "ENGINE", "VAULT", "NEXUS", "HUB", "NODE", "GRID", "ARRAY", "MATRIX", "SPHERE"];
    
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const randomId = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    
    return `CAPSULE-${randomPrefix}-${randomSuffix}-${randomId}`;
  };
  
  // Enhanced handleCapsuleChange to ensure smooth navigation
  const handleCapsuleChange = useCallback((value: string | null) => {
    if (value && value !== capsuleId) {
      // Find the capsule name for logging
      const selectedCapsule = availableCapsules.find(cap => cap.value === value);
      if (IS_DEV) {
        console.log(`[CapsuleView] Switching to capsule: ${selectedCapsule?.label || value}`);
      }
      
      router.push(`/capsules/${value}`);
    }
  }, [capsuleId, availableCapsules, router]);
  
  // Make sure to display the current capsule name properly
  const getCurrentCapsuleName = () => {
    const currentCapsule = availableCapsules.find(cap => cap.value === capsuleId);
    return currentCapsule?.label || record?.name || 'Unknown Capsule';
  };
  
  // Additional fix: Ensure the select value is properly mapped
  const getSelectValue = () => {
    // Make sure we have a valid capsuleId that exists in availableCapsules
    const exists = availableCapsules.some(cap => cap.value === capsuleId);
    return exists ? capsuleId : null;
  };

  // Ensure debugContent is always a string
  const debugContent = enrichedContent || extractHighlightsContent(record?.highlights) || extractContextSummary(record?.summaryContext) || '';
console.log('PAGE DEBUG: Content being passed to renderer:', typeof debugContent === 'string' ? debugContent.substring(0, 2000) : 'Invalid content type: ' + typeof debugContent);

  const malformedInPage = debugContent.match(/\*{3,}\[/g);
  if (malformedInPage) {
    console.error('PAGE ERROR: Malformed patterns found before renderer:', malformedInPage);
  } else {
    console.log('PAGE SUCCESS: Clean content being passed to renderer');
  }

  if (identityLoading || isLoading) {
    return (
      <Box style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <LoadingOverlay visible={true} overlayProps={{ blur: 2 }} />
        <Text ta="center" pt="xl" c="dimmed">Loading capsule details...</Text>
      </Box>
    );
  }

  // Not Authenticated State
  if (!identity?.token) {
     return (
      <Box style={{ padding: '24px' }}>
          <Alert
            icon={<AlertCircle size={16} />}
            color="red"
            title="Authentication Required"
          >
            Please log in to manage your capsules.
          </Alert>
      </Box>
    );
  }

  // Handle error state after loading, or if record is explicitly null/undefined
  if (isError || !record) {
    return (
      <Box style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Alert color="red" title="Error Loading Capsule" icon={<AlertCircle size={16} />} mb="md">
          {errorMessage || "Could not load capsule details. The capsule might not exist or you don't have access."}
        </Alert>
        <Button onClick={() => router.push("/capsules")} leftSection={<ArrowLeft size={16} />}>
          Back to Capsules List
        </Button>
      </Box>
    );
  }

  const displayFiles = record.files?.length ? record.files : loadedFiles;
  const hasFiles = displayFiles.length > 0;
  const isProcessing = record.status?.toLowerCase() === 'processing' || isRegenerating;
  const hasContentForDisplay = !!(record.highlights || extractContextSummary(record.summaryContext));

  return (
    <Box style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#0a0a0a', 
      color: '#ffffff' 
    }}>
      {/* Header */}
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
          <ActionIcon 
            size="lg" 
            variant="subtle" 
            onClick={handleCreateNewCapsule}
            style={{ color: '#a0a0a0' }}
            title="Create new capsule"
          >
            <Plus size={20} />
          </ActionIcon>
          <Select
            value={capsuleId}
            onChange={handleCapsuleChange}
            data={availableCapsules}
            searchable={false}
            readOnly={false}
            rightSection={<ChevronsUpDown size={14} style={{ color: '#a0a0a0' }} />}
            styles={{
              root: {
                width: 'auto',
                maxWidth: '300px', // Added maxWidth to prevent overly long names
                position: 'relative',
              },
              wrapper: {
                width: 'auto',
              },
              input: {
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontFamily: GeistMono.style.fontFamily,
                fontSize: '14px',
                fontWeight: 500,
                padding: '0 24px 0 0', // Adjusted padding to accommodate chevron
                height: 'auto',
                minHeight: 'auto',
                lineHeight: 1,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                '&:focus': {
                  outline: 'none',
                },
                '&::placeholder': {
                  color: '#a0a0a0',
                },
                textOverflow: 'ellipsis', // Handle long names
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              },
              section: {
                color: '#a0a0a0',
                width: 'auto',
                marginRight: '6px', // Position chevron 6px from text
                position: 'static', // Remove absolute positioning
              },
              dropdown: {
                backgroundColor: '#000000',
                border: '1px solid #2b2b2b',
                width: 'auto',
                minWidth: 'max-content',
                maxHeight: '300px',
                overflowY: 'auto',
              },
              option: {
                color: '#ffffff',
                fontSize: '14px',
                fontFamily: GeistMono.style.fontFamily,
                padding: '8px 12px',
                '&[data-selected]': {
                  backgroundColor: '#202020',
                  color: '#F5A623',
                },
                '&:hover:not([data-disabled])': {
                  backgroundColor: '#1c1c1c',
                },
              },
            }}
            placeholder={isLoadingCapsules ? "Loading..." : "Select Capsule"}
            disabled={isLoadingCapsules}
            renderOption={({ option, checked }) => (
              <Group justify="space-between" style={{ width: '100%' }}>
                <Text 
                  style={{ 
                    fontFamily: GeistMono.style.fontFamily,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {option.label}
                </Text>
                {checked && <Check size={14} color="#F5A623" />}
              </Group>
            )}
          />
        </Group>
        <Group gap="xs">
          <Button 
            variant="subtle"
            leftSection={isRegenerating ? <Loader size={14} color="white" /> : <RefreshCw size={14} />}
            onClick={handleRegenerateCapsule}
            disabled={isProcessing}
            loading={false}
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
              disabled={!hasContentForDisplay || isProcessing}
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
          {identity?.subscriptionPlan?.name?.toUpperCase() === 'ADMIN' && (
            <ActionIcon 
              size="lg" 
              variant="subtle" 
              onClick={() => setIsSettingsModalOpen(true)}
              style={{ color: '#a0a0a0' }}
              title="Capsule settings"
            >
              <Settings size={20} />
            </ActionIcon>
          )}
          <Button 
            variant="filled"
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
                backgroundColor: '#F5A623',
                color: '#000000',
                '&:hover': {
                  backgroundColor: '#E09612',
                },
              },
            }}
          >
            ADD CONTEXT
          </Button>
        </Group>
      </Flex>

      {/* Main Content */}
      <Flex style={{ flex: 1, overflow: 'hidden' }}>
        {/* Left Panel - Scrollable */}
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

            {/* Title Section */}
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
                Beta
              </Badge>
              <Text 
                size="28px" 
                fw={600} 
                style={{ 
                  fontFamily: 'Geist, sans-serif',
                  lineHeight: 1.2
                }}
              >
                {record.name}
              </Text>
              <Text c="dimmed" mt="xs" size="sm">
                {record.slug}
              </Text>
            </Box>

            {/* Capsule Parameters - Above Context Block */}
            <Box mb="lg" style={{ maxWidth: '600px' }}>
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
                Capsule Parameters
              </Text>
              <Flex 
                gap="xl"
                style={{ fontSize: '14px' }}
                wrap="wrap"
              >
                <Box>
                  <Text 
                    size="xs" 
                    c="dimmed" 
                    style={{ 
                      fontFamily: GeistMono.style.fontFamily,
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}
                  >
                    Created
                  </Text>
                  <Text style={{ fontFamily: GeistMono.style.fontFamily }}>
                    {new Date(record.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }).toUpperCase()}
                  </Text>
                </Box>
                
                <Box>
                  <Text 
                    size="xs" 
                    c="dimmed" 
                    style={{ 
                      fontFamily: GeistMono.style.fontFamily,
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}
                  >
                    Duration
                  </Text>
                  <Text style={{ fontFamily: GeistMono.style.fontFamily }}>
                    {formatDuration(record.createdAt, record.updatedAt)}
                  </Text>
                </Box>
                
                <Box>
                  <Text 
                    size="xs" 
                    c="dimmed" 
                    style={{ 
                      fontFamily: GeistMono.style.fontFamily,
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}
                  >
                    Files
                  </Text>
                  <Text style={{ fontFamily: GeistMono.style.fontFamily }}>
                    {displayFiles.length}
                  </Text>
                </Box>
                
                <Box>
                  <Text 
                    size="xs" 
                    c="dimmed" 
                    style={{ 
                      fontFamily: GeistMono.style.fontFamily,
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}
                  >
                    Purpose
                  </Text>
                  <Text style={{ fontFamily: GeistMono.style.fontFamily }}>
                    {getCurrentPurposeName().toUpperCase()}
                  </Text>
                </Box>
              </Flex>
            </Box>

            {/* Tabs Section - Match Job Page Design */}
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
                  value="markdown"
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
                  Markdown
                </Tabs.Tab>
              </Tabs.List>
              
              <Tabs.Panel value="preview" pt="md">
                {isProcessing ? (
                  <Stack align="center" justify="center" style={{ height: '300px', color: '#a0a0a0', padding: '20px', backgroundColor: 'transparent' }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
                    <Text mb="md" fw={600} size="lg" style={{ color: '#e0e0e0' }}>Processing...</Text>
                    <Text ta="center" c="dimmed" mb="xl">
                      Analyzing files and creating the capsule summary.
                    </Text>
                  </Stack>
                ) : hasContentForDisplay ? (
                  <DocumentMarkdownWrapper
                    markdown={enrichedContent || extractHighlightsContent(record?.highlights) || extractContextSummary(record?.summaryContext) || ''}
                  />
                ) : hasFiles ? (
                  <Stack align="center" justify="center" style={{ height: '300px', color: '#a0a0a0', padding: '20px', backgroundColor: 'transparent' }}>
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
                  <Stack align="center" justify="center" style={{ height: '300px', color: '#a0a0a0', padding: '20px', backgroundColor: 'transparent' }}>
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
                {hasContentForDisplay && (
                  <ActionIcon
                    size="lg"
                    variant="subtle"
                    onClick={handleDownloadMarkdown}
                    disabled={isProcessing}
                    style={{ color: '#a0a0a0', marginTop: '16px' }}
                    title="Download markdown"
                  >
                    <Download size={20} />
                  </ActionIcon>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="markdown" pt="md">
                {hasContentForDisplay ? (
                  <Code
                    block
                    style={{
                      backgroundColor: '#1a1a1a',
                      color: '#e0e0e0',
                      padding: '16px',
                      borderRadius: '8px',
                      overflow: 'auto',
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
                    {enrichedContent || extractHighlightsContent(record?.highlights) || extractContextSummary(record?.summaryContext) || 'No markdown content available'}
                  </Code>
                ) : (
                  <Text c="dimmed" ta="center" mt="xl">
                    No markdown content available yet
                  </Text>
                )}
              </Tabs.Panel>
            </Tabs>
          </Box>
        </Box>

        {/* Right Panel - Simplified */}
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
          {/* Capsule Status */}
          <Box style={{ marginBottom: '2rem' }}>
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
              Status
            </Text>
            <Box style={{ 
              backgroundColor: '#0a0a0a',
              border: '1px solid #2B2B2B',
              borderRadius: '4px',
              padding: '12px'
            }}>
              <Flex align="center" gap="xs">
                <Box style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%',
                  backgroundColor: isProcessing ? '#F5A623' : 
                                  record.status?.toLowerCase() === 'completed' || record.status?.toLowerCase() === 'ready' ? '#3DC28B' : 
                                  record.status?.toLowerCase() === 'failed' ? '#FF4F56' : '#F5A623'
                }} />
                <Text size="sm" style={{ textTransform: 'capitalize' }}>
                  {isProcessing ? 'Processing' : record.status || 'Unknown'}
                </Text>
              </Flex>
            </Box>
          </Box>

          {/* Source Files */}
          <Box>
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
                      backgroundColor: '#0a0a0a',
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
                      <Box p="xs" style={{ backgroundColor: '#131313', borderTop: '1px solid #2b2b2b' }}>
                        <Flex justify="space-between" align="center">
                          <Text size="xs" c="dimmed">{formatFileSize(file.size || 0)}</Text>
                          <Text size="xs" c="dimmed">{formatDate(file.createdAt)}</Text>
                        </Flex>
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            ) : isLoadingFiles ? (
              <Stack gap="sm" style={{ marginBottom: '1rem' }}>
                {[...Array(3)].map((_, index) => (
                  <Box
                    key={index}
                    style={{
                      backgroundColor: '#0a0a0a',
                      borderRadius: '6px',
                      border: '1px solid #2b2b2b',
                      overflow: 'hidden',
                      padding: '12px',
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <Group gap="xs" align="center">
                        <Box style={{ width: '16px', height: '16px', backgroundColor: '#2b2b2b', borderRadius: '4px' }} />
                        <Box style={{ width: '120px', height: '16px', backgroundColor: '#2b2b2b', borderRadius: '4px' }} />
                      </Group>
                      <Box style={{ width: '24px', height: '24px', backgroundColor: '#2b2b2b', borderRadius: '4px' }} />
                    </Group>
                    <Flex justify="space-between" align="center" mt="xs">
                      <Box style={{ width: '60px', height: '12px', backgroundColor: '#2b2b2b', borderRadius: '4px' }} />
                      <Box style={{ width: '80px', height: '12px', backgroundColor: '#2b2b2b', borderRadius: '4px' }} />
                    </Flex>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Alert color="dark" variant="outline" title="No Files Added" icon={<FileText size={16} />} style={{ borderColor: '#2b2b2b', marginBottom: '1rem' }}>
                Add source documents to your capsule using the button above.
              </Alert>
            )}
          </Box>
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
        originalContent={extractHighlightsContent(record?.highlights) || extractContextSummary(record?.summaryContext) || ''}
        onContentUpdate={handleContentEnrichment}
      />
      <CapsulePurposeModal
        isOpen={isPurposeModalOpen}
        onClose={() => {
          setIsPurposeModalOpen(false);
          setOptimisticPurposeId(null);
        }}
        isLoading={isLoadingPrompts}
        summary={summaryPrompt}
        highlights={highlightsPrompt}
        testSummary={testSummaryPrompt}
        activePurpose={optimisticPurposeId || getCurrentPurposeId()}
        capsuleId={capsuleId}
        onContentReset={resetGeneratedContent}
        fetchWithAuth={fetchWithAuth}
        refetch={refetch}
        notifications={notifications}
        formatErrorMessage={formatErrorMessage}
      />
      <CapsuleSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        capsuleId={capsuleId}
        capsuleName={record?.name || ''}
        capsuleSlug={record?.slug || ''}
        onUpdateSuccess={refetch}
        onPromptUpdateSuccess={loadPrompts}
        identity={identity}
      />
    </Box>
  );
}