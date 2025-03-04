"use client";

import { useNavigation, useShow, useGetIdentity, useCustom } from "@refinedev/core";
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
  IconAlertCircle
} from '@tabler/icons-react';
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// Configure react-pdf worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
    references?: Array<any>;
    pdfUrl?: string;
  };
}

interface ProcessingDocument {
  _id: string;
  title?: string;
  abstract?: string;
  contributors?: string;
  introduction?: string;
  conclusion?: string;
  passages?: string[];
  references?: Array<any>;
  pdfUrl?: string;
}

export default function JobShow() {
  const params = useParams();
  const { list } = useNavigation();
  const jobId = params.id as string;
  const { data: identity } = useGetIdentity<Identity>();
  const [activeTab, setActiveTab] = useState("preview");
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  
  // Fetch job details
  const { queryResult } = useShow<Job>({
    resource: "jobs",
    id: jobId,
    queryOptions: {
      enabled: !!jobId && !!identity?.token,
      onSuccess: (data) => {
        console.log("Show query success:", data);
        
        // Extract processing document ID from the PLATOGRAM_PROCESSING step
        const processingStep = data.data?.steps?.find(step => step.name === "PLATOGRAM_PROCESSING");
        if (processingStep && processingStep.data?.resultId) {
          setProcessingDocId(processingStep.data.resultId);
        }
      },
      onError: (error) => {
        console.error("Show query error:", error);
      }
    },
    meta: {
      headers: identity?.token ? {
        'Authorization': `Bearer ${identity.token}`
      } : undefined
    }
  });
  
  // Fetch processing document data when processingDocId is available
  const { data: processingData, isLoading: isProcessingLoading } = useCustom<ProcessingDocument>({
    url: `${process.env.NEXT_PUBLIC_API_URL}/processing/${processingDocId}/document`,
    method: "get",
    queryOptions: {
      enabled: !!processingDocId && !!identity?.token,
      onSuccess: (data) => {
        console.log("Processing document loaded:", data);
      },
      onError: (error) => {
        console.error("Processing document error:", error);
      }
    },
    meta: {
      headers: identity?.token ? {
        'Authorization': `Bearer ${identity.token}`
      } : undefined
    }
  });
  
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
  const processingDoc = processingData?.data;
  const isDocLoading = isLoading || (!!processingDocId && isProcessingLoading);

  // Log data to debug
  console.log("Fetched record:", record);
  console.log("Processing document:", processingDoc);

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

  // Combine job record data with processing document data
  const combinedData = {
    title: processingDoc?.title || record?.jobName,
    abstract: processingDoc?.abstract || "",
    contributors: processingDoc?.contributors || "",
    pdfUrl: processingDoc?.pdfUrl || "",
    introduction: processingDoc?.introduction || "",
    conclusion: processingDoc?.conclusion || "",
    passages: processingDoc?.passages || [],
    references: processingDoc?.references || []
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#ffffff' }}>
      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
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

        {/* Document title */}
        <div style={{ padding: '24px' }}>
          <Text size="3xl" fw={700} style={{ fontFamily: 'serif' }}>
            {combinedData.title || 'Untitled Document'}
          </Text>
          <Text c="dimmed" mt="xs">
            {getFilenameFromLink(record?.link) || 'No source file'}
          </Text>
        </div>

        {/* Tabs and content */}
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
              ) : (
                <div style={{ backgroundColor: 'white', color: 'black', padding: '32px', borderRadius: 8 }}>
                  <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
                    {combinedData.pdfUrl ? (
                      <Document file={combinedData.pdfUrl} loading={<Text>Loading PDF...</Text>}>
                        <Page pageNumber={1} width={800} />
                      </Document>
                    ) : (
                      <>
                        <Text size="3xl" fw={700} style={{ fontFamily: 'serif', marginBottom: '1.5rem' }}>
                          {combinedData.title || 'Untitled Document'}
                        </Text>
                        <Text size="xl" fw={600} style={{ fontFamily: 'serif', marginBottom: '0.5rem' }}>
                          Origin
                        </Text>
                        <Text style={{ color: '#3b1b1b', marginBottom: '1rem' }}>
                          <a href={record?.link} style={{ color: 'blue', textDecoration: 'underline', wordBreak: 'break-all' }}>
                            {record?.link || 'No source link available'}
                          </a>
                        </Text>
                        <Text size="xl" fw={600} style={{ fontFamily: 'serif', marginBottom: '0.5rem' }}>
                          Abstract
                        </Text>
                        <Text mb="md" style={{ textAlign: 'justify' }}>
                          {combinedData.abstract || 'No abstract available.'}
                        </Text>
                        <Text size="xl" fw={600} style={{ fontFamily: 'serif', marginBottom: '0.5rem' }}>
                          Contributors, Acknowledgements, Mentions
                        </Text>
                        {combinedData.contributors ? (
                          typeof combinedData.contributors === 'string' && combinedData.contributors.includes('<') ? (
                            <div 
                              style={{ paddingLeft: '1.5rem', listStyle: 'disc' }}
                              dangerouslySetInnerHTML={{ __html: combinedData.contributors }} 
                            />
                          ) : (
                            <ul style={{ paddingLeft: '1.5rem', listStyle: 'disc' }}>
                              {(typeof combinedData.contributors === 'string' ? 
                                combinedData.contributors.split(',').map(contributor => contributor.trim()) : 
                                [combinedData.contributors]
                              ).map((contributor, idx) => (
                                <li key={idx}>{contributor}</li>
                              ))}
                            </ul>
                          )
                        ) : (
                          <Text>No contributors information available.</Text>
                        )}
                      </>
                    )}
                  </div>
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

      {/* Right sidebar */}
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
      
        {/* Rest of your component... */}
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