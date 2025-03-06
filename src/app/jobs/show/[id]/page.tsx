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
// Replace Tabler icons with Lucide
import { 
  ArrowLeft, 
  Share,
  MoreVertical,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
// Import centralized auth utilities
import { useAuth, API_CONFIG } from "@/utils/authUtils";

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
  };
}

interface ProcessingDocument {
  _id: string;
  output: {
    title?: string;
    abstract?: string;
    contributors?: string;
    introduction?: string;
    conclusion?: string;
    passages?: string[];
    references?: Array<{ item: string }>;
    chapters?: Array<{ title: string }>;
  };
}

export default function JobShow() {
  const params = useParams();
  const { list } = useNavigation();
  const jobId = params.id as string;
  const { data: identity, refetch: identityRefetch } = useGetIdentity<Identity>();
  const [activeTab, setActiveTab] = useState("preview");
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingDoc, setProcessingDoc] = useState<ProcessingDocument | null>(null);

  // Use enhanced useAuth hook with all required methods
  const { refreshToken, handleAuthError, getAccessToken, fetchWithAuth } = useAuth();

  // Fetch job details with simplified auth handling
  const { queryResult } = useShow<Job>({
    resource: "jobs",
    id: jobId,
    queryOptions: {
      enabled: !!jobId && !!identity?.token,
      onSuccess: (data) => {
        console.log("Show query success:", data);
        // Extract processingDocId only once when data is loaded
        const processingStep = data.data?.steps?.find(step => step.name === "PLATOGRAM_PROCESSING");
        if (processingStep?.data?.resultId) {
          setProcessingDocId(processingStep.data.resultId);
        } else {
          setErrorMessage("No processing document ID found in job steps.");
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

  // Improve the processing document fetch function
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
      
      // Use fetchWithAuth to handle token management automatically
      const response = await fetchWithAuth(
        `${API_CONFIG.API_URL}/processing/${processingDocId}/document`
      );

      if (!response.ok) {
        throw new Error(`Fetch failed with status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle numeric overflow issue (if this is the source of the error)
      // This ensures safe handling of very large numbers in the JSON data
      const sanitizedData = JSON.parse(
        JSON.stringify(data, (key, value) => {
          // Convert extremely large numbers to strings to prevent overflow
          if (typeof value === 'number' && !Number.isSafeInteger(value)) {
            return value.toString();
          }
          return value;
        })
      );
      
      setProcessingDoc(sanitizedData);
    } catch (error) {
      console.error("Failed to fetch document:", error);
      setErrorMessage(`Error loading document: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingDoc(false);
    }
  }, [processingDocId, fetchWithAuth]);

  // Simplify the useEffect with clearer conditions
  useEffect(() => {
    // Only fetch if we have an ID and no document yet (or need to refresh)
    if (processingDocId && !isLoadingDoc && (!processingDoc || processingDoc._id !== processingDocId)) {
      getProcessingDocument();
    }
  }, [processingDocId, isLoadingDoc, processingDoc, getProcessingDocument]);

  // Add a simpler manual refetch function that just clears the doc
  const manualRefetch = () => {
    setErrorMessage(null);
    setProcessingDoc(null); // This will trigger the useEffect to fetch again
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
    const parts = link.split("/");
    return parts[parts.length - 1] || "";
  };

  const { data, isLoading, isError } = queryResult;
  const record = data?.data;
  const isDocLoading = isLoading || isLoadingDoc;

  console.log("Fetched record:", record);
  console.log("Processing document:", processingDoc);
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

  const combinedData = {
    title: processingDoc?.output?.title || record?.output?.title || record?.jobName,
    abstract: processingDoc?.output?.abstract || record?.output?.abstract || "",
    contributors: processingDoc?.output?.contributors || record?.output?.contributors || "",
    introduction: processingDoc?.output?.introduction || record?.output?.introduction || "",
    conclusion: processingDoc?.output?.conclusion || record?.output?.conclusion || "",
    passages: processingDoc?.output?.passages || record?.output?.passages || [],
    references: processingDoc?.output?.references || record?.output?.references || [],
    chapters: processingDoc?.output?.chapters || record?.output?.chapters || [],
  };

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
            {record?.jobName || 'Untitled Job'}
          </Text>
          <Text c="dimmed" mt="xs">
            {record?.link ? getFilenameFromLink(record.link) : 'No source file'}
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
                Markdown/JSON
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
                <div style={{ backgroundColor: 'white', color: 'black', padding: '32px', borderRadius: 8 }}>
                  <LoadingOverlay visible={true} />
                  <div style={{ height: '300px' }}></div>
                </div>
              ) : errorMessage || !processingDoc ? (
                <Box p="lg" bg="white" c="black" style={{ borderRadius: 8 }}>
                  <Text>
                    Processed document data not available. {errorMessage && `Error: ${errorMessage}`}
                    <Button 
                      leftSection={<RefreshCw size={16} />} 
                      onClick={manualRefetch} 
                      mt="md"
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
                      Retry
                    </Button>
                  </Text>
                </Box>
              ) : (
                <div style={{ 
                  backgroundColor: 'white', 
                  padding: '32px', 
                  borderRadius: 8,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  height: '700px'
                }}>
                  {/* Placeholder for PDF view */}
                  <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Text size="xl" c="gray.6">Document preview removed temporarily</Text>
                  </div>
                </div>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="markdown" pt="md">
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
                    width: '100%'
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
          <Text>{record?.status ? formatText(record.status) : 'Unknown'}</Text>
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