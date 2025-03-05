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
  Badge
} from '@mantine/core';
import { 
  IconArrowLeft, 
  IconShare,
  IconDotsVertical,
  IconAlertCircle,
  IconRefresh
} from '@tabler/icons-react';
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/utils/authUtils";
import { PDFViewer, Document, Page, Text as PDFText, View, StyleSheet } from '@react-pdf/renderer';

// Define PDF styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
    textAlign: 'justify',
  },
});

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

// PDF Document Component
const MyDocument = ({ data }: { data: ProcessingDocument['output'] }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <PDFText style={styles.title}>{data.title || 'Untitled Document'}</PDFText>
      
      <PDFText style={styles.sectionTitle}>Abstract</PDFText>
      <PDFText style={styles.text}>{data.abstract || 'No abstract available.'}</PDFText>

      <PDFText style={styles.sectionTitle}>Introduction</PDFText>
      <PDFText style={styles.text}>{data.introduction || 'No introduction available.'}</PDFText>

      <PDFText style={styles.sectionTitle}>Chapters</PDFText>
      {data.chapters?.map((chapter, index) => (
        <PDFText key={index} style={styles.text}>{chapter.title}</PDFText>
      )) || <PDFText style={styles.text}>No chapters available.</PDFText>}

      <PDFText style={styles.sectionTitle}>Passages</PDFText>
      {data.passages?.map((passage, index) => (
        <PDFText key={index} style={styles.text}>{passage}</PDFText>
      )) || <PDFText style={styles.text}>No passages available.</PDFText>}

      <PDFText style={styles.sectionTitle}>Conclusion</PDFText>
      <PDFText style={styles.text}>{data.conclusion || 'No conclusion available.'}</PDFText>

      <PDFText style={styles.sectionTitle}>References</PDFText>
      {data.references?.map((ref, index) => (
        <PDFText key={index} style={styles.text}>{ref.item}</PDFText>
      )) || <PDFText style={styles.text}>No references available.</PDFText>}

      <PDFText style={styles.sectionTitle}>Contributors, Acknowledgements, Mentions</PDFText>
      <PDFText style={styles.text}>{data.contributors || 'No contributors information available.'}</PDFText>
    </Page>
  </Document>
);

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
  
  const { refreshToken, handleAuthError } = useAuth();

  // Fetch job details
  const { queryResult } = useShow<Job>({
    resource: "jobs",
    id: jobId,
    queryOptions: {
      enabled: !!jobId && !!identity?.token,
      onSuccess: (data) => {
        console.log("Show query success:", data);
        const processingStep = data.data?.steps?.find(step => step.name === "PLATOGRAM_PROCESSING");
        if (processingStep) {
          console.log("Found PLATOGRAM_PROCESSING step:", processingStep);
          const resultId = processingStep.data?.resultId;
          if (resultId) {
            console.log("Extracted processingDocId (resultId):", resultId);
            setProcessingDocId(resultId);
          } else {
            console.log("No resultId found in PLATOGRAM_PROCESSING step data");
            setProcessingDocId(null);
            setErrorMessage("No processing document ID found in job steps.");
          }
          console.log("Step _id (not used):", processingStep._id);
        } else {
          console.log("No PLATOGRAM_PROCESSING step found");
          setProcessingDocId(null);
          setErrorMessage("No processing step found in job.");
        }
      },
      onError: (error) => {
        console.error("Show query error:", error);
        setErrorMessage("Failed to load job details: " + (error.message || "Unknown error"));
        handleAuthError(error);
      }
    },
    meta: {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || identity?.token || ''}`
      }
    }
  });

  // Fetch processing document
  const getProcessingDocument = useCallback(async (attempt = 0) => {
    const MAX_ATTEMPTS = 3;
    if (attempt >= MAX_ATTEMPTS) {
      console.log(`Max fetch attempts (${MAX_ATTEMPTS}) reached`);
      setErrorMessage(`Failed to load document after ${MAX_ATTEMPTS} attempts. Please try again.`);
      return;
    }

    if (!processingDocId || !identity?.token) {
      console.log("Missing processingDocId or token, skipping fetch");
      setErrorMessage("Missing required data to fetch document");
      return;
    }

    try {
      setIsLoadingDoc(true);
      const token = localStorage.getItem('accessToken') || identity?.token;
      console.log(`Fetching document attempt ${attempt + 1} with token prefix:`, token.substring(0, 20) + "...");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/processing/${processingDocId}/document`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        console.log(`Attempt ${attempt + 1} failed with ${response.status}. Refreshing token...`);
        const success = await refreshToken();
        if (success) {
          await identityRefetch();
          const newToken = localStorage.getItem('accessToken');
          if (newToken) {
            console.log("Token refreshed, retrying...");
            return await getProcessingDocument(attempt + 1);
          }
        }
        throw new Error("Token refresh failed");
      }

      if (!response.ok) {
        throw new Error(`Fetch failed with status: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Document fetched successfully:", data);
      setProcessingDoc(data);
      setErrorMessage(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Attempt ${attempt + 1} failed:`, error);
      setErrorMessage(`Failed to load document: ${errorMessage}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await getProcessingDocument(attempt + 1);
    } finally {
      setIsLoadingDoc(false);
    }
  }, [processingDocId, identity?.token, refreshToken, identityRefetch]);

  useEffect(() => {
    if (processingDocId && identity?.token && !processingDoc && !isLoadingDoc) {
      console.log("New processingDocId detected, starting fetch:", processingDocId);
      getProcessingDocument(0);
    }
  }, [processingDocId, identity?.token, processingDoc, isLoadingDoc, getProcessingDocument]);

  const manualRefetch = () => {
    console.log("Manual refetch triggered");
    getProcessingDocument(0);
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
    localStorage.getItem('accessToken')?.substring(0, 20) || identity?.token?.substring(0, 20) || 'none');

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
            <IconAlertCircle size={20} color="red" />
            <Text c="red">Unable to load job details. Please try again.</Text>
          </Group>
        </Box>
        <Button
          variant="outline"
          leftSection={<IconArrowLeft size={16} />}
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
            leftSection={<IconArrowLeft size={16} />}
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
              leftSection={<IconShare size={16} />}
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
              <IconDotsVertical size={20} />
            </ActionIcon>
          </Group>
        </div>

        <div style={{ padding: '24px' }}>
          <Text size="3xl" fw={700} style={{ fontFamily: 'serif' }}>
            {combinedData.title || 'Untitled Document'}
          </Text>
          <Text c="dimmed" mt="xs">
            {getFilenameFromLink(record?.link) || 'No source file'}
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
                      leftSection={<IconRefresh size={16} />} 
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
                <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: 8 }}>
                  <PDFViewer style={{ width: '100%', height: '500px' }}>
                    <MyDocument data={combinedData} />
                  </PDFViewer>
                </div>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="markdown" pt="md">
              <div style={{ padding: '16px', color: '#a1a1a1', borderRadius: 8 }}>
                <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '70vh' }}>
                  {JSON.stringify(processingDoc || {}, null, 2) || 'No markdown content available'}
                </pre>
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