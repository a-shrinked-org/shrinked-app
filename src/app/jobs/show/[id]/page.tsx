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
  MoreVertical,
  AlertCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { useParams } from "next/navigation";
import { useAuth, API_CONFIG } from "@/utils/authUtils";
import DocumentMarkdownRenderer from "@/components/DocumentMarkdownRenderer";
import { useDisclosure } from '@mantine/hooks';
import ShareDialog from "@/components/ShareDialog"; 
import { GeistMono } from 'geist/font/mono';
import { debounce } from 'lodash';
import '@/styles/blink.css';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
}

interface JobStep {
  name: string;
  status: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  totalDuration?: number;
  data?: {
    resultId?: string;
    link?: string;
    output?: {
      link?: string;
    };
    [key: string]: any;
  };
  _id?: string;
}

interface Job {
  _id: string;
  jobName: string;
  scenario: string;
  lang: string;
  isPublic: boolean;
  createPage: boolean;
  link: string;
  status: string;
  createdAt: string;
  steps?: JobStep[];
  endTime?: string;
  startTime?: string;
  totalDuration?: number;
  totalTokenUsage?: number;
  output?: {
    title?: string;
    abstract?: string;
    contributors?: string;
    introduction?: string;
    conclusion?: string;
    passages?: string[];
    references?: Array<{ item: string }>;
    chapters?: Array<{ title: string }>;
    resultId?: string;
  };
  resultId?: string;
}

interface ProcessingDocument {
  _id: string;
  title?: string;
  status?: string;
  createdAt?: string;
  output?: {
    title?: string;
    abstract?: string;
    contributors?: string;
    introduction?: string;
    conclusion?: string;
    passages?: string[];
    references?: Array<{ item: string }>;
    chapters?: Array<{ title: string }>;
    resultId?: string;
  };
  resultId?: string;
}

export default function JobShow() {
  const params = useParams();
  const { list } = useNavigation();
  const jobId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";
  
  const { data: identity, refetch: identityRefetch } = useGetIdentity<Identity>();

  useEffect(() => {
    if (!identity) {
      identityRefetch();
    }
  }, [identity, identityRefetch]);
  
  const { refreshToken, handleAuthError, getAccessToken, fetchWithAuth, ensureValidToken } = useAuth();

  const { queryResult } = useShow<Job>({
    resource: "jobs",
    id: jobId,
    queryOptions: {
      enabled: !!jobId && !!identity?.token,
      staleTime: 30000,
      retry: 1, // Retry once on failure
      retryDelay: 1000, // Wait 1 second before retrying
      onSuccess: (data) => {
        console.log("Show query success:", data);
        const resultId = extractResultId(data.data);
        if (resultId) {
          console.log("Found resultId:", resultId);
          setProcessingDocId(resultId);
          getProcessingDocument();
          fetchMarkdownContent();
        } else {
          console.log("No resultId found for job:", data.data?.jobName);
          // Do not set error message here, let renderPreviewContent handle it based on status
        }
        const uploadStep = data.data?.steps?.find((step: JobStep) => 
          step.name === "UPLOAD_FILE" || 
          step.name === "FILE_UPLOAD" || 
          step.name === "CONVERT_FILE" ||
          step.name === "AUDIO_TRANSCRIPTION"
        );
        const foundLink = uploadStep?.data?.output?.link || uploadStep?.data?.link || data.data?.link;
        const foundMode = uploadStep?.data?.mode;
        if (foundLink) {
          console.log("Found upload file link:", foundLink);
          setUploadFileLink(foundLink);
        } else {
          console.log("No upload file link found");
        }
        if (foundMode) {
          console.log("Found upload file mode:", foundMode);
          setUploadFileMode(foundMode);
        } else {
          console.log("No upload file mode found");
        }
      },
      onError: (error) => {
        console.error("Show query error:", error);
        handleAuthError(error);
        setErrorMessage("Failed to load job details: " + (error.message || "Unknown error"));
      }
    },
    meta: {
      headers: { 'Authorization': `Bearer ${getAccessToken() || identity?.token || ''}` }
    }
  });

  const { refetch } = queryResult;

  const { data, isLoading, isError } = queryResult;
  const record = data?.data;
  
  const [activeTab, setActiveTab] = useState("preview");
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingDoc, setProcessingDoc] = useState<ProcessingDocument | null>(null);
  const [uploadFileLink, setUploadFileLink] = useState<string | null>(null);
  const [uploadFileMode, setUploadFileMode] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [liveDuration, setLiveDuration] = useState<number>(0);
  
  const extractResultId = useCallback((jobData: Job | null) => {
    if (!jobData) return null;
    const processingStep = jobData.steps?.find(step => 
      step.name === "PLATOGRAM_PROCESSING" || 
      step.name === "TEXT_PROCESSING"
    );
    return processingStep?.data?.resultId || jobData.output?.resultId || jobData.resultId || null;
  }, []);

  const fetchMarkdownContent = useCallback(async (forceRefresh = false) => {
    if (!documentId) return;
    if (!forceRefresh && markdownContent) return;
    if (isLoadingMarkdown.current) return;

    isLoadingMarkdown.current = true;
    setErrorMessage(null);
    setIsLoadingDoc(true);

    try {
      console.log('Fetching markdown with ID:', documentId);
      const token = await ensureValidToken();
      if (!token) throw new Error('Authentication failed - unable to get valid token');

      const response = await fetch(`/api/pdf/${documentId}/markdown?includeReferences=true`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const refreshSuccess = await refreshToken();
          if (refreshSuccess) {
            const newToken = getAccessToken();
            const retryResponse = await fetch(`/api/pdf/${documentId}/markdown?includeReferences=true`, {
              headers: { 'Authorization': `Bearer ${newToken || ''}` },
              cache: 'no-store'
            });
            if (!retryResponse.ok) throw new Error(`Markdown fetch failed with status: ${retryResponse.status}`);
            const markdown = await retryResponse.text();
            if (!markdown || markdown.trim() === '') throw new Error('No content available yet');
            setMarkdownContent(markdown);
            console.log('Fetched markdown after token refresh:', documentId);
          }
        } else if (response.status === 404) {
          throw new Error('Content not available yet');
        } else {
          throw new Error(`Markdown fetch failed with status: ${response.status}`);
        }
      } else {
        const markdown = await response.text();
        if (!markdown || markdown.trim() === '') throw new Error('No content available yet');
        setMarkdownContent(markdown);
        console.log('Fetched markdown successfully:', documentId);
      }
    } catch (error) {
      console.error("Failed to fetch markdown:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      isLoadingMarkdown.current = false;
      setIsLoadingDoc(false);
    }
  }, [documentId, markdownContent, refreshToken, getAccessToken, ensureValidToken]);

  const getProcessingDocument = useCallback(async () => {
    if (!processingDocId) return;
    if (!navigator.onLine) {
      setErrorMessage("You appear to be offline. Please check your internet connection.");
      return;
    }
    if (isFetchingProcessingDoc.current) return;

    isFetchingProcessingDoc.current = true;
    try {
      setIsLoadingDoc(true);
      setErrorMessage(null);
      console.log('Fetching processing document with ID:', processingDocId);
      const fields = '_id,title,status,createdAt,output';
      const response = await fetch(`/api/jobs-proxy/${processingDocId}/processing?fields=${fields}`);
      if (!response.ok) throw new Error(`Fetch failed with status: ${response.status}`);
      const data = await response.json();
      const sanitizedData = JSON.parse(
        JSON.stringify(data, (key, value) => {
          if (typeof value === 'number' && !Number.isSafeInteger(value)) return value.toString();
          return value;
        })
      );
      setProcessingDoc(sanitizedData);
    } catch (error) {
      console.error("Failed to fetch document:", error);
      setErrorMessage(`Error loading document: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingDoc(false);
      isFetchingProcessingDoc.current = false;
    }
  }, [processingDocId]);

  const getProcessingStatusDefinition = (): string | undefined => {
    const processingStep = queryResult.data?.data?.steps?.find((step: JobStep) => 
      step.name === "PLATOGRAM_PROCESSING" || step.name === "TEXT_PROCESSING"
    );
    return processingStep?.status?.toLowerCase() || processingDoc?.status?.toLowerCase() || queryResult.data?.data?.status?.toLowerCase();
  };

  const getProcessingStatus: () => string | undefined = useCallback(getProcessingStatusDefinition, [queryResult.data, processingDoc]);

  useEffect(() => {
    const status = getProcessingStatus();
    if (status === 'processing' || status === 'in_progress' || status === 'pending') {
      const interval = setInterval(() => {
        refetch();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [getProcessingStatus, refetch]);
  
  const isLoadingMarkdown = useRef(false);
  const isFetchingProcessingDoc = useRef(false);
  
  const [shareDialogOpened, { open: openShareDialog, close: closeShareDialog }] = useDisclosure(false);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Calculate combinedData using useMemo to avoid dependency issues
  const combinedData = React.useMemo(() => {
    return processingDoc?.output || record?.output || {};
  }, [processingDoc, record]);

  const isDocLoading = isLoading || isLoadingDoc;

  

  const handleDownloadPDF = useCallback(async () => {
    if (!documentId) return;
    try {
      console.log('Attempting to download PDF with ID:', documentId);
      const token = await ensureValidToken();
      if (!token) throw new Error('Authentication failed - unable to get valid token');

      const response = await fetchWithAuth(`/api/jobs-proxy/exportdoc/${documentId}?includeReferences=true`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`PDF download failed with status: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `document-${documentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      console.log('Downloaded PDF successfully:', documentId);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      setErrorMessage(`Error downloading PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [documentId, ensureValidToken, fetchWithAuth]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    const processingStep = record?.steps?.find(step => 
      step.status?.toLowerCase() === 'processing' || 
      step.status?.toLowerCase() === 'in_progress' ||
      step.status?.toLowerCase() === 'pending'
    );

    if (processingStep && processingStep.startTime) {
      const startTime = new Date(processingStep.startTime).getTime();
      setLiveDuration(Date.now() - startTime);
      interval = setInterval(() => {
        setLiveDuration(Date.now() - startTime);
      }, 1000);
    } else {
      setLiveDuration(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [record?.steps]);

  useEffect(() => {
    const processingStep = queryResult.data?.data?.steps?.find(step => 
      step.name === "PLATOGRAM_PROCESSING" || step.name === "TEXT_PROCESSING"
    );
    const status = processingStep?.status?.toLowerCase() || processingDoc?.status?.toLowerCase() || queryResult.data?.data?.status?.toLowerCase();
    if (documentId && status === 'completed' && !markdownContent && !isLoadingMarkdown.current) {
      console.log("Processing complete, fetching markdown content on mount");
      fetchMarkdownContent();
    }
  }, [documentId, queryResult.data, processingDoc, markdownContent, fetchMarkdownContent]);
  
  const handleShareDocument = useCallback(async () => {
    if (!processingDocId) {
      setErrorMessage("No document ID found to share");
      return;
    }
  
    try {
      // If we already have a link, just open the share dialog
      if (record?.link && record.link.includes('/docs/')) {
        setSharedUrl(record.link);
        openShareDialog();
        return;
      }
      
      // Otherwise, create a new shared document
      setIsSharing(true);
      setErrorMessage(null);
  
      // Get a title for the slug
      const title = processingDoc?.title || 
                    record?.output?.title || 
                    record?.jobName || 
                    'document';
      
      // Create a slug from the title
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || processingDocId;
  
      // Prepare the content payload
      const content = {
        title: title,
        origin: uploadFileLink || '',
        abstract: combinedData.abstract || '',
        contributors: combinedData.contributors || '',
        chapters: Array.isArray(combinedData.chapters) 
          ? combinedData.chapters.map(ch => `- ${ch.title}`).join('\n') 
          : (combinedData.chapters || ''),
        introduction: combinedData.introduction || '',
        passages: Array.isArray(combinedData.passages) 
          ? combinedData.passages.join('\n\n') 
          : (combinedData.passages || ''),
        conclusion: combinedData.conclusion || '',
        references: Array.isArray(combinedData.references) 
          ? combinedData.references.map(ref => ref.item).join('\n') 
          : (combinedData.references || '')
      };
  
      // Send the request to create a shared document
      const response = await fetchWithAuth('/api/share-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slug,
          content,
          jobId: jobId // Include the job ID for updating the job record
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to share document: ${response.status}`);
      }
  
      const result = await response.json();
  
      if (result.status === 'created' && result.link) {
        // Set the shared URL and open the dialog
        setSharedUrl(result.link);
        openShareDialog();
        
        // Update the job data in our state if possible
        if (queryResult.refetch) {
          queryResult.refetch();
        }
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to share document:", error);
      setErrorMessage(`Error sharing document: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSharing(false);
    }
  }, [
    processingDocId, 
    record, 
    processingDoc, 
    uploadFileLink, 
    jobId, 
    fetchWithAuth, 
    queryResult, 
    openShareDialog,
    combinedData
  ]);

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
    const status = getProcessingStatus();

    if (isDocLoading) {
      return (
        <Box style={{ position: 'relative', minHeight: '300px' }}>
          <LoadingOverlay visible={true} />
        </Box>
      );
    }

    if (errorMessage) {
      return (
        <Alert 
          icon={<AlertCircle size={16} />}
          color="red" 
          title="Error"
          mb="md"
        >
          {errorMessage}
          <Button 
            leftSection={<RefreshCw size={16} />}
            mt="sm"
            onClick={manualRefetch}
            variant="light"
            size="sm"
          >
            Try again
          </Button>
        </Alert>
      );
    }

    if (markdownContent && markdownContent.trim() !== '') {
      return (
        <DocumentMarkdownRenderer 
          markdown={markdownContent}
          isLoading={false}
          errorMessage={null}
          onRefresh={manualRefetch}
          processingStatus={status}
        />
      );
    }

    if (status === 'processing' || status === 'in_progress' || status === 'pending') {
      return (
        <DocumentMarkdownRenderer 
          isLoading={false}
          errorMessage={null}
          onRefresh={manualRefetch}
          processingStatus={status}
        />
      );
    }

    if (status === 'error' || status === 'failed') {
      return (
        <Alert 
          icon={<AlertCircle size={16} />}
          color="red"
          title="Processing Failed"
          mb="md"
        >
          The document processing failed. Please try again or contact support.
          <Button 
            leftSection={<RefreshCw size={16} />}
            mt="sm"
            onClick={manualRefetch}
            variant="light"
            size="sm"
          >
            Retry
          </Button>
        </Alert>
      );
    }

    return (
      <Alert 
        icon={<AlertCircle size={16} />}
        color="yellow"
        title="Content Unavailable"
        mb="md"
      >
        No content is available yet. The document may still be processing or failed to process.
        <Button 
          leftSection={<RefreshCw size={16} />}
          mt="sm"
          onClick={manualRefetch}
          variant="light"
          size="sm"
        >
          Refresh
        </Button>
      </Alert>
    );
  };

  const manualRefetch = useCallback(() => {
    setErrorMessage(null);
    setMarkdownContent(null);
    if (processingDocId) {
      console.log("Manual refresh: fetching processing document");
      getProcessingDocument();
    }
    if (documentId) {
      console.log("Manual refresh: fetching markdown content");
      fetchMarkdownContent(true);
    }
  }, [documentId, processingDocId, getProcessingDocument, fetchMarkdownContent]);

  const formatDuration = (durationInMs?: number) => {
    if (durationInMs === undefined || durationInMs === null) return "N/A";
    const totalSeconds = Math.floor(durationInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatText = (text: string) => {
    return text
      ?.toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || '';
  };

  const getFilenameFromLink = (link?: string) => {
    if (!link) return "";
    try {
      const url = new URL(link);
      const pathname = url.pathname;
      const parts = pathname.split('/');
      return parts[parts.length - 1] || "";
    } catch (e) {
      const parts = link.split("/");
      return parts[parts.length - 1] || "";
    }
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
            JOB DETAILS
          </Text>
          <Group gap="xs">
            <Button 
              variant="subtle" 
              leftSection={<ArrowLeft size={14} />}
              onClick={() => list('jobs')}
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
              leftSection={<Share size={14} />}
              onClick={handleShareDocument}
              loading={isSharing}
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
              SHARE
            </Button>
            <Button 
              variant="filled"
              leftSection={<Download size={14} />}
              disabled
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
        {renderSkeletonLoader()}
      </Box>
    );
  }

  if (isError || !jobId) {
    return (
      <Box p="md">
        <Box mb="md" p="md" style={{ backgroundColor: '#252525', borderRadius: 8 }}>
          <Group>
            <AlertCircle size={20} color="red" />
            <Text c="red">Unable to load job details. Please try again.</Text>
          </Group>
        </Box>
        <Button
          variant="outline"
          leftSection={<ArrowLeft size={16} />}
          onClick={() => list('jobs')}
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
          Back to Jobs
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
          JOB DETAILS
        </Text>
        <Group gap="xs">
          <Button 
            variant="subtle" 
            leftSection={<ArrowLeft size={14} />}
            onClick={() => list('jobs')}
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
            leftSection={<Share size={14} />}
            onClick={handleShareDocument}
            loading={isSharing}
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
            SHARE
          </Button>
          <Button 
            variant="filled"
            leftSection={<Download size={14} />}
            onClick={handleDownloadPDF}
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

      {isDocLoading ? renderSkeletonLoader() : (
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
                  {record?.isPublic ? 'Public' : 'Private'}
                </Badge>
                <Text 
                  size="28px" 
                  fw={600} 
                  style={{ 
                    fontFamily: 'Geist, sans-serif',
                    lineHeight: 1.2
                  }}
                >
                  {processingDoc?.title || record?.jobName || 'Untitled Job'}
                </Text>
                <Text c="dimmed" mt="xs" size="sm">
                  {uploadFileLink ? getFilenameFromLink(uploadFileLink) : 
                   record?.link ? getFilenameFromLink(record.link) : 
                   'No source file'}
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
                    value="question" 
                    disabled
                    rightSection={
                      <Badge 
                        style={{ backgroundColor: '#291e3f', color: '#9e8bc3' }}
                        size="xs"
                      >
                        Coming soon
                      </Badge>
                    }
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
                    Ask a question
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
                      {processingDoc ? JSON.stringify(processingDoc, null, 2) : 'No content available'}
                    </Code>
                  </Box>
                </Tabs.Panel>

                <Tabs.Panel value="question" pt="md">
                  <Box style={{ padding: '16px', color: '#a1a1a1', borderRadius: 8 }}>
                    Question interface would appear here
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
                  Duration
                </Text>
                <Text>{formatDuration(record?.totalDuration)}</Text>
              </Box>
              <Box>
                <Text c="dimmed" mb="xs" size="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
                  Tokens
                </Text>
                <Text>{record?.totalTokenUsage || 'N/A'}</Text>
              </Box>
              {record?.steps?.find(step => step.name === "UPLOAD_FILE")?.data?.lang && (
                <Box>
                  <Text c="dimmed" mb="xs" size="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
                    Language
                  </Text>
                  <Text>
                    {record.steps.find(step => step.name === "UPLOAD_FILE")?.data?.lang === 'en' ? 'English' : 
                     record.steps.find(step => step.name === "UPLOAD_FILE")?.data?.lang === 'uk' ? 'Ukrainian' : 
                     record.steps.find(step => step.name === "UPLOAD_FILE")?.data?.lang || 'Unknown'}
                  </Text>
                </Box>
              )}
            </Box>
            
            <Box style={{ marginTop: '2rem' }}>
              <Text c="dimmed" mb="md" size="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
                Logic
              </Text>
              <Box style={{ position: 'relative' }}>
                <Box style={{ 
                  position: 'absolute', 
                  left: '24px', 
                  top: '24px', 
                  bottom: record?.steps && record.steps.length > 0 ? '24px' : '0', 
                  width: '1px', 
                  backgroundColor: '#2B2B2B' 
                }} />
                {record?.steps?.map((step, index) => {
                  const isProcessingStep = step.status?.toLowerCase() === 'processing' || step.status?.toLowerCase() === 'in_progress' || step.status?.toLowerCase() === 'pending';
                  const displayDuration = isProcessingStep ? liveDuration : step.totalDuration;
                  const isLastStep = index === (record?.steps?.length || 0) - 1;
                  const isCompleted = step.status?.toLowerCase() === 'completed';
                  const isError = step.status?.toLowerCase() === 'error' || step.status?.toLowerCase() === 'failed';
                  const isCollapsible = step.data && Object.keys(step.data).length > 0;

                  return (
                    <Box key={index} style={{ marginBottom: '1rem', position: 'relative' }}>
                      <Box style={{ 
                        backgroundColor: '#000000',
                        border: '1px solid #2B2B2B',
                        borderRadius: '4px',
                        padding: '12px',
                        marginLeft: '48px',
                        position: 'relative'
                      }}>
                        <Box style={{ 
                          position: 'absolute',
                          left: '-24px',
                          top: '50%',
                          width: '24px',
                          height: '1px',
                          backgroundColor: '#2B2B2B'
                        }} />
                        <Box style={{ 
                          position: 'absolute',
                          left: '-24px',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#000000',
                          border: '1px solid #2B2B2B',
                          zIndex: 2
                        }} />
                        {!isLastStep && (
                          <Box style={{ 
                            position: 'absolute',
                            left: '-24px',
                            top: 'calc(50% + 4px)',
                            height: '48px',
                            width: '1px',
                            backgroundColor: '#2B2B2B',
                            transform: 'translateX(-50%)',
                            zIndex: 1
                          }} />
                        )}
                        <Flex justify="space-between" align="center">
                          <Text 
                            style={{ 
                              fontFamily: GeistMono.style.fontFamily, 
                              fontSize: '14px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                          >
                            {formatText(step.name)}
                          </Text>
                          <Group gap="sm">
                            <Text 
                              style={{ 
                                color: '#2B2B2B', 
                                fontSize: '12px',
                                fontFamily: GeistMono.style.fontFamily,
                              }}
                            >
                              {formatDuration(displayDuration)}
                            </Text>
                            <Box style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%',
                              backgroundColor: isCompleted ? '#3DC28B' : 
                                              isError ? '#FF4F56' : 
                                              isProcessingStep ? '#FFFFFF' : '#F5A623',
                              animation: isProcessingStep ? 'blink 1s infinite' : 'none',
                            }} />
                          </Group>
                        </Flex>
                        {isCollapsible && (
                          <Collapse in={true}>
                            <Box mt="md" pl="md" style={{ borderLeft: '1px solid #2B2B2B' }}>
                              <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>
                                {JSON.stringify(step.data, (key, value) => {
                                  if (key === 'link' || key === 'mode') {
                                    return undefined;
                                  }
                                  return value;
                                }, 2)}
                              </Text>
                            </Box>
                          </Collapse>
                        )}
                      </Box>
                    </Box>
                  );
                })}
                {(!record?.steps || record.steps.length === 0) && (
                  <Box style={{ marginBottom: '1rem', position: 'relative' }}>
                    <Box style={{ 
                      backgroundColor: '#000000',
                      border: '1px solid #2B2B2B',
                      borderRadius: '4px',
                      padding: '12px',
                      marginLeft: '48px',
                      position: 'relative'
                    }}>
                      <Box style={{ 
                        position: 'absolute',
                        left: '-48px',
                        top: '50%',
                        width: '48px',
                        height: '1px',
                        backgroundColor: '#2B2B2B'
                      }} />
                      <Box style={{ 
                        position: 'absolute',
                        left: '-48px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#000000',
                        border: '1px solid #2B2B2B'
                      }} />
                      <Box style={{ 
                        position: 'absolute',
                        left: '-1px',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#000000',
                        border: '1px solid #2B2B2B'
                      }} />
                      <Text 
                        style={{ 
                          fontFamily: GeistMono.style.fontFamily, 
                          fontSize: '14px',
                          color: '#A1A1A1',
                        }}
                      >
                        No steps available
                      </Text>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Flex>
      )}
      <ShareDialog 
        opened={shareDialogOpened}
        onClose={closeShareDialog}
        shareUrl={sharedUrl}
        documentTitle={processingDoc?.title || record?.jobName || 'Untitled Document'}
      />
    </Box>
  );
}