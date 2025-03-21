"use client";

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
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth, API_CONFIG } from "@/utils/authUtils";
import DocumentMarkdownRenderer from "@/components/DocumentMarkdownRenderer";
import { GeistMono } from 'geist/font/mono';
import { debounce } from 'lodash';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
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
  steps?: Array<{
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
  }>;
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
  const [activeTab, setActiveTab] = useState("preview");
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingDoc, setProcessingDoc] = useState<ProcessingDocument | null>(null);
  const [uploadFileLink, setUploadFileLink] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  
  const isLoadingMarkdown = useRef(false);
  const isFetchingProcessingDoc = useRef(false);

  const { refreshToken, handleAuthError, getAccessToken, fetchWithAuth, ensureValidToken } = useAuth();

  useEffect(() => {
    if (processingDocId) {
      setDocumentId(processingDocId);
    }
  }, [processingDocId]);

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

  const handleDownloadPDF = useCallback(async () => {
    if (!documentId) return;
    try {
      console.log('Attempting to download PDF with ID:', documentId);
      const response = await fetch(`/api/pdf/${documentId}/pdf?includeReferences=true`);
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
  }, [documentId]);

  const { queryResult } = useShow<Job>({
    resource: "jobs",
    id: jobId,
    queryOptions: {
      enabled: !!jobId && !!identity?.token,
      staleTime: 30000,
      onSuccess: (data) => {
        console.log("Show query success:", data);
        const resultId = extractResultId(data.data);
        if (resultId) {
          console.log("Found resultId:", resultId);
          setProcessingDocId(resultId);
        } else {
          console.log("No resultId found");
          setErrorMessage("No processing document ID found in job data.");
        }
        const uploadStep = data.data?.steps?.find(step => 
          step.name === "UPLOAD_FILE" || 
          step.name === "FILE_UPLOAD" || 
          step.name === "CONVERT_FILE" ||
          step.name === "AUDIO_TRANSCRIPTION"
        );
        const foundLink = uploadStep?.data?.output?.link || uploadStep?.data?.link || data.data?.link;
        if (foundLink) {
          console.log("Found upload file link:", foundLink);
          setUploadFileLink(foundLink);
        } else {
          console.log("No upload file link found");
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

  useEffect(() => {
    if (processingDocId && !isLoadingDoc && (!processingDoc || processingDoc._id !== processingDocId) && !isFetchingProcessingDoc.current) {
      getProcessingDocument();
    }
  }, [processingDocId, isLoadingDoc, processingDoc, getProcessingDocument]);

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

  const getProcessingStatus = () => {
    const processingStep = queryResult.data?.data?.steps?.find(step => 
      step.name === "PLATOGRAM_PROCESSING" || step.name === "TEXT_PROCESSING"
    );
    return processingStep?.status?.toLowerCase() || processingDoc?.status?.toLowerCase() || queryResult.data?.data?.status?.toLowerCase();
  };

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
    if (!durationInMs) return "N/A";
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

  const { data, isLoading, isError } = queryResult;
  const record = data?.data;
  const isDocLoading = isLoading || isLoadingDoc;

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

  const combinedData = processingDoc?.output || record?.output || {};

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
                Logic steps / events
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
                  const isCompleted = step.status?.toLowerCase() === 'completed';
                  const isError = step.status?.toLowerCase().includes('error') || 
                                  step.status?.toLowerCase().includes('failed');
                  const isProcessing = step.name === "PROCESSING" || step.name === "PLATOGRAM_PROCESSING";
                  const isCollapsible = isProcessing && step.data && Object.keys(step.data).length > 0;
                  const isLastStep = index === (record?.steps?.length || 0) - 1;
                  
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
                            {step.totalDuration && (
                              <Text 
                                style={{ 
                                  color: '#2B2B2B', 
                                  fontSize: '12px',
                                  fontFamily: GeistMono.style.fontFamily,
                                }}
                              >
                                {formatDuration(step.totalDuration)}
                              </Text>
                            )}
                            <Box style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%',
                              backgroundColor: isCompleted ? '#3DC28B' : 
                                              isError ? '#FF4F56' : 
                                              '#F5A623'
                            }} />
                          </Group>
                        </Flex>
                        {isCollapsible && (
                          <Collapse in={true}>
                            <Box mt="md" pl="md" style={{ borderLeft: '1px solid #2B2B2B' }}>
                              <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>
                                {JSON.stringify(step.data, null, 2)}
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
    </Box>
  );
}