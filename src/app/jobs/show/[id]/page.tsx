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
  Code
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
import { useState, useEffect, useCallback } from "react";
import { useAuth, API_CONFIG } from "@/utils/authUtils";
import DocumentMarkdownRenderer from "@/components/DocumentMarkdownRenderer";

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
  // Fix for params possibly being null
  const jobId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";
  
  const { data: identity, refetch: identityRefetch } = useGetIdentity<Identity>();
  const [activeTab, setActiveTab] = useState("preview");
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingDoc, setProcessingDoc] = useState<ProcessingDocument | null>(null);
  const [uploadFileLink, setUploadFileLink] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);

  const { refreshToken, handleAuthError, getAccessToken, fetchWithAuth } = useAuth();

  // Fetch markdown content from backend endpoint
  const fetchMarkdownContent = useCallback(async () => {
    // Use processingDocId when available, not jobId
    if (!processingDocId && !jobId) return;
  
    try {
      // Try using processingDocId first if available, otherwise fall back to jobId
      const idToUse = processingDocId || jobId;
      console.log('Attempting to fetch markdown with ID:', idToUse);
      
      const response = await fetchWithAuth(
        `${API_CONFIG.API_URL}/pdf/${idToUse}/markdown?includeReferences=true`
      );
  
      if (!response.ok) {
        throw new Error(`Markdown fetch failed with status: ${response.status}`);
      }
  
      // The response should be the markdown text directly
      const markdown = await response.text();
      setMarkdownContent(markdown);
      console.log('Fetched markdown content successfully using ID:', idToUse);
    } catch (error) {
      console.error("Failed to fetch markdown:", error);
      setErrorMessage(`Error loading markdown: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [processingDocId, jobId, fetchWithAuth]);

  // Fetch the processing document with only the required fields
  const getProcessingDocument = useCallback(async () => {
    if (!processingDocId) {
      setErrorMessage("Missing required data to fetch document");
      return;
    }
  
    if (!navigator.onLine) {
      setErrorMessage("You appear to be offline. Please check your internet connection.");
      return;
    }
  
    try {
      setIsLoadingDoc(true);
      setErrorMessage(null);
      
      console.log('Fetching processing document with ID:', processingDocId);
      
      // Using fields parameter to only request necessary fields
      const fields = '_id,title,status,createdAt,output';
      const response = await fetchWithAuth(
        `${API_CONFIG.API_URL}/processing/${processingDocId}?fields=${fields}`
      );
  
      if (!response.ok) {
        throw new Error(`Fetch failed with status: ${response.status}`);
      }
  
      const data = await response.json();
      
      const sanitizedData = JSON.parse(
        JSON.stringify(data, (key, value) => {
          if (typeof value === 'number' && !Number.isSafeInteger(value)) {
            return value.toString();
          }
          return value;
        })
      );
      
      setProcessingDoc(sanitizedData);
  
      // Don't fetch markdown here - let the effect handle it
    } catch (error) {
      console.error("Failed to fetch document:", error);
      setErrorMessage(`Error loading document: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingDoc(false);
    }
  }, [processingDocId, fetchWithAuth]);

  // Download PDF handler
  const handleDownloadPDF = useCallback(async () => {
    // Use processingDocId when available, not jobId
    if (!processingDocId && !jobId) return;
  
    try {
      // Try using processingDocId first if available, otherwise fall back to jobId
      const idToUse = processingDocId || jobId;
      console.log('Attempting to download PDF with ID:', idToUse);
      
      const response = await fetchWithAuth(
        `${API_CONFIG.API_URL}/pdf/${idToUse}/json?includeReferences=true`,
        { method: 'GET' }
      );
  
      if (!response.ok) {
        throw new Error(`PDF download failed with status: ${response.status}`);
      }
      
      // Convert response to blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `document-${idToUse}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      console.log('Downloaded PDF successfully using ID:', idToUse);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      setErrorMessage(`Error downloading PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [processingDocId, jobId, fetchWithAuth]);

  const { queryResult } = useShow<Job>({
    resource: "jobs",
    id: jobId,
    queryOptions: {
      enabled: !!jobId && !!identity?.token, // Only run when both jobId and token exist
      staleTime: 30000, // Cache results for 30 seconds to prevent frequent refetching
      onSuccess: (data) => {
        console.log("Show query success:", data);
        
        // Extract processingDocId from PLATOGRAM_PROCESSING step
        const processingStep = data.data?.steps?.find(step => 
          step.name === "PLATOGRAM_PROCESSING" || 
          step.name === "TEXT_PROCESSING"
        );
        
        if (processingStep?.data?.resultId) {
          console.log("Found processing resultId:", processingStep.data.resultId);
          setProcessingDocId(processingStep.data.resultId);
        } else {
          // Try alternative locations where resultId might be stored
          const alternativeLocations = [
            data.data?.output?.resultId,
            data.data?.resultId,
            // If we have steps with data fields, check all of them for resultId
            ...(data.data?.steps?.map(step => step.data?.resultId).filter(Boolean) || [])
          ];
          
          const foundResultId = alternativeLocations.find(id => id);
          
          if (foundResultId) {
            console.log("Found resultId in alternative location:", foundResultId);
            setProcessingDocId(foundResultId);
          } else {
            console.log("No resultId found in any location");
            setErrorMessage("No processing document ID found in job data.");
          }
        }
        
        // Extract link from UPLOAD_FILE or similar step
        const uploadStep = data.data?.steps?.find(step => 
          step.name === "UPLOAD_FILE" || 
          step.name === "FILE_UPLOAD" || 
          step.name === "CONVERT_FILE" ||
          step.name === "AUDIO_TRANSCRIPTION"
        );
        
        const foundLink = uploadStep?.data?.output?.link || 
                         uploadStep?.data?.link || 
                         data.data?.link;
                        
        if (foundLink) {
          console.log("Found upload file link:", foundLink);
          setUploadFileLink(foundLink);
        } else {
          console.log("No upload file link found in steps or record");
        }
      },
      onError: (error) => {
        console.error("Show query error:", error);
        handleAuthError(error);
        setErrorMessage("Failed to load job details: " + (error.message || "Unknown error"));
      }
    },
    meta: {
      headers: {
        'Authorization': `Bearer ${getAccessToken() || identity?.token || ''}`
      }
    }
  });

  // Effect to load document data when ID changes or tab changes
  useEffect(() => {
    if (processingDocId && !isLoadingDoc && (!processingDoc || processingDoc._id !== processingDocId)) {
      getProcessingDocument();
    }
  }, [processingDocId, isLoadingDoc, processingDoc, getProcessingDocument]);

  // Effect to load markdown content when tab changes to preview
  useEffect(() => {
    if (activeTab === "preview" && !markdownContent && jobId) {
      // Only fetch markdown if we have a jobId and are in preview mode
      fetchMarkdownContent();
    }
  }, [activeTab, jobId, markdownContent, fetchMarkdownContent]);

  const manualRefetch = () => {
    setErrorMessage(null);
    
    // Clear content states
    setProcessingDoc(null);
    setMarkdownContent(null);
    
    if (processingDocId) {
      console.log("Manual refresh: fetching processing document");
      getProcessingDocument();
    }
    
    // Always fetch markdown when in preview tab and we have at least one ID
    if (activeTab === "preview" && (processingDocId || jobId)) {
      console.log("Manual refresh: fetching markdown content");
      fetchMarkdownContent();
    }
  };

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

  console.log("Fetched record:", record);
  console.log("Processing document:", processingDoc);
  console.log("Markdown content length:", markdownContent?.length || 0);
  console.log("Using token for processing document:", 
    getAccessToken()?.substring(0, 20) || identity?.token?.substring(0, 20) || 'none');

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
      <Box>
        <LoadingOverlay visible />
        <Text>Loading...</Text>
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

  // Use data from processingDoc when available, otherwise fall back to record
  const combinedData = processingDoc?.output || record?.output || {};

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#ffffff' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <Group gap="xs">
            <Button 
              variant="outline"
              leftSection={<Share size={16} />}
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
              Share
            </Button>
            <Button 
              variant="outline"
              leftSection={<Download size={16} />}
              onClick={handleDownloadPDF}
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
              Download PDF
            </Button>
            <Button 
              styles={{
                root: {
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  '&:hover': {
                    backgroundColor: '#d9d9d9',
                  },
                },
              }}
            >
              Use in a job
            </Button>
            <ActionIcon 
              variant="subtle" 
              styles={{
                root: {
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#202020',
                  },
                },
              }}
            >
              <MoreVertical size={20} />
            </ActionIcon>
          </Group>
        </div>

        <div style={{ padding: '24px' }}>
          <Text size="3xl" fw={700} style={{ fontFamily: 'serif' }}>
            {processingDoc?.title || record?.jobName || 'Untitled Job'}
          </Text>
          <Text c="dimmed" mt="xs">
            {uploadFileLink ? getFilenameFromLink(uploadFileLink) : 
             record?.link ? getFilenameFromLink(record.link) : 
             'No source file'}
          </Text>
        </div>

        <div style={{ padding: '24px', flex: 1 }}>
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
              {isDocLoading ? (
                <Box style={{ position: 'relative', minHeight: '300px' }}>
                  <LoadingOverlay visible={true} />
                </Box>
              ) : errorMessage ? (
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
              ) : markdownContent ? (
                // Pass the markdown content directly to the renderer
                <DocumentMarkdownRenderer 
                  markdown={markdownContent}
                  isLoading={false}
                  errorMessage={null}
                  onRefresh={manualRefetch}
                  processingStatus={processingDoc?.status || record?.status}
                />
              ) : processingDoc?.status?.toLowerCase() === 'processing' || 
                 processingDoc?.status?.toLowerCase() === 'in_progress' || 
                 processingDoc?.status?.toLowerCase() === 'pending' || 
                 record?.status?.toLowerCase() === 'processing' || 
                 record?.status?.toLowerCase() === 'in_progress' || 
                 record?.status?.toLowerCase() === 'pending' ? (
                // Show the processing state UI
                <DocumentMarkdownRenderer 
                  isLoading={false}
                  errorMessage={null}
                  onRefresh={manualRefetch}
                  processingStatus="processing"
                />
              ) : (
                <Alert 
                  icon={<AlertCircle size={16} />}
                  color="yellow"
                  title="No Content"
                  mb="md"
                >
                  No content available to display.
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
              )}
            </Tabs.Panel>

            <Tabs.Panel value="json" pt="md">
              <div style={{ 
                backgroundColor: 'white', 
                padding: '32px', 
                borderRadius: 8,
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
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
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="question" pt="md">
              <div style={{ padding: '16px', color: '#a1a1a1', borderRadius: 8 }}>
                Question interface would appear here
              </div>
            </Tabs.Panel>
          </Tabs>
        </div>
      </div>

      <div style={{ width: '384px', borderLeft: '1px solid #202020', padding: '1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Text c="dimmed" mb="xs">
            Created
          </Text>
          <Text>{identity?.name || 'Unknown User'}</Text>
          {processingDoc?.createdAt && (
            <Text size="sm" c="dimmed" mt="4px">
              {new Date(processingDoc.createdAt).toLocaleString()}
            </Text>
          )}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <Text c="dimmed" mb="xs">
            Duration
          </Text>
          <Text>{formatDuration(record?.totalDuration)}</Text>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <Text c="dimmed" mb="xs">
            Status
          </Text>
          <Text>
            {processingDoc?.status 
              ? formatText(processingDoc.status) 
              : record?.status 
                ? formatText(record.status) 
                : 'Unknown'}
          </Text>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <Text c="dimmed" mb="xs">
            Language
          </Text>
          <Text>
            {record?.lang === 'en' ? 'English' : 
             record?.lang === 'uk' ? 'Ukrainian' : 
             record?.lang || 'Unknown'}
          </Text>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <Text c="dimmed" mb="md">
            Logic steps / events
          </Text>

          <div style={{ position: 'relative' }}>
            <div style={{ 
              position: 'absolute', 
              left: '1rem', 
              top: '1rem', 
              bottom: '1rem', 
              width: '2px', 
              backgroundColor: '#202020' 
            }} />

            {record?.steps?.map((step, index) => {
              let bgOuterColor = '#202020';
              let bgInnerColor = '#2b2b2b';
              let bgCardColor = '#202020';
              
              if (step.status?.toLowerCase() === 'completed') {
                bgOuterColor = '#1a2516';
                bgInnerColor = '#102d1d';
                bgCardColor = '#2a392f';
              } else if (step.status?.toLowerCase().includes('error') || 
                         step.status?.toLowerCase().includes('failed')) {
                bgOuterColor = '#251313';
                bgInnerColor = '#3b1b1b';
                bgCardColor = '#3b1b1b';
              }
              
              return (
                <div key={index} style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div 
                      style={{ 
                        width: '32px', 
                        height: '32px',
                        backgroundColor: bgOuterColor, 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        position: 'relative', 
                        zIndex: 10 
                      }}
                    >
                      <div style={{ width: '16px', height: '16px', backgroundColor: bgInnerColor, borderRadius: '50%' }} />
                    </div>
                    <div 
                      style={{ 
                        marginLeft: '1rem', 
                        padding: '0.75rem', 
                        backgroundColor: bgCardColor, 
                        borderRadius: '8px', 
                        flex: 1
                      }}
                    >
                      <Text fw={500} c="white">
                        {formatText(step.name) || `Step ${index + 1}`}
                      </Text>
                      <Text c="dimmed" size="sm">
                        {step.status ? formatText(step.status) : 'No status'}
                      </Text>
                    </div>
                    {step.totalDuration && (
                      <Text style={{ marginLeft: '0.5rem', color: '#757575', fontSize: '0.875rem' }}>
                        {formatDuration(step.totalDuration)}
                      </Text>
                    )}
                  </div>
                </div>
              );
            })}
            
            {(!record?.steps || record.steps.length === 0) && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div 
                    style={{ 
                      width: '32px', 
                      height: '32px',
                      backgroundColor: '#202020', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      position: 'relative', 
                      zIndex: 10 
                    }}
                  >
                    <div style={{ width: '16px', height: '16px', backgroundColor: '#2b2b2b', borderRadius: '50%' }} />
                  </div>
                  <div 
                    style={{ 
                      marginLeft: '1rem', 
                      padding: '0.75rem', 
                      backgroundColor: '#202020', 
                      borderRadius: '8px', 
                      flex: 1
                    }}
                  >
                    <Text fw={500} c="white">
                      No steps available
                    </Text>
                    <Text c="dimmed" size="sm">
                      Processing information unavailable
                    </Text>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}