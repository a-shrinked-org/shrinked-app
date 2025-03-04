"use client";

import { useNavigation, useShow, useGetIdentity } from "@refinedev/core";
import { 
  Stack, 
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
import { useState } from "react";
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
  }>;
  endTime?: string;
  startTime?: string;
  totalDuration?: number;
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

export default function JobShow() {
  const params = useParams();
  const { list } = useNavigation();
  const jobId = params.id as string;
  const { data: identity } = useGetIdentity<Identity>();
  const [activeTab, setActiveTab] = useState("preview");
  
  const { queryResult } = useShow<Job>({
    resource: "jobs",
    id: jobId,
    queryOptions: {
      enabled: !!jobId && !!identity?.token,
      onSuccess: (data) => {
        console.log("Show query success:", data);
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

  // Log data to debug
  console.log("Fetched record:", record);

  if (!identity?.token) {
    return (
      <Box className="relative min-h-[200px]">
        <LoadingOverlay visible />
        <Text>Authentication required</Text>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box className="relative min-h-[200px]">
        <LoadingOverlay visible />
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (isError || !jobId) {
    return (
      <Box p="md">
        <Box mb="md" p="md" bg="#252525" style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
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

  return (
    <Box className="min-h-screen" style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}>
      {/* Main content area */}
      <Box flex={1} display="flex" flexDirection="column">
        {/* Header */}
        <Box p="md" display="flex" justify="space-between" align="center">
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
            <Button 
              variant="subtle" 
              size="xs" 
              radius="xl" 
              styles={{
                root: {
                  color: '#ffffff',
                  backgroundColor: '#131313',
                  '&:hover': {
                    backgroundColor: '#202020',
                  },
                },
              }}
            >
              <IconDotsVertical size={20} />
            </Button>
          </Group>
        </Box>

        {/* Document title */}
        <Box p="lg">
          <Text size="3xl" fw={700} style={{ fontFamily: 'serif' }}>
            {record?.output?.title || record?.jobName || 'Untitled Document'}
          </Text>
          <Text c="dimmed" mt="xs">
            {getFilenameFromLink(record?.link) || 'No source file'}
          </Text>
        </Box>

        {/* Tabs and content */}
        <Box p="lg" flex={1}>
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value || "preview")}>
            <Tabs.List bg="transparent" style={{ borderBottom: '1px solid #202020' }}>
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
                    style={{ backgroundColor: '#291e3f', color: '#9e8bc3', '&:hover': { backgroundColor: '#291e3f' } }}
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
              <Box bg="white" c="black" p="lg" style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                <Box maw="3xl" mx="auto">
                  {record?.output?.pdfUrl ? (
                    <Document file={record.output.pdfUrl} loading={<Text>Loading PDF...</Text>}>
                      <Page pageNumber={1} width={800} />
                    </Document>
                  ) : (
                    <>
                      <Text size="3xl" fw={700} style={{ fontFamily: 'serif', marginBottom: '1.5rem' }}>
                        {record?.output?.title || record?.jobName || 'Untitled Document'}
                      </Text>
                      <Text size="xl" fw={600} style={{ fontFamily: 'serif', marginBottom: '0.5rem' }}>
                        Origin
                      </Text>
                      <Text c="#3b1b1b" mb="md">
                        <a href={record?.link} style={{ color: 'blue.7', textDecoration: 'underline', wordBreak: 'break-all' }}>
                          {record?.link || 'No source link available'}
                        </a>
                      </Text>
                      <Text size="xl" fw={600} style={{ fontFamily: 'serif', marginBottom: '0.5rem' }}>
                        Abstract
                      </Text>
                      <Text mb="md" style={{ textAlign: 'justify' }}>
                        {record?.output?.abstract || 'No abstract available.'}
                      </Text>
                      <Text size="xl" fw={600} style={{ fontFamily: 'serif', marginBottom: '0.5rem' }}>
                        Contributors, Acknowledgements, Mentions
                      </Text>
                      {record?.output?.contributors ? (
                        typeof record.output.contributors === 'string' && record.output.contributors.includes('<') ? (
                          <Box 
                            pl="md" 
                            component="ul" 
                            style={{ listStyle: 'disc' }}
                            dangerouslySetInnerHTML={{ __html: record.output.contributors }} 
                          />
                        ) : (
                          <Box component="ul" pl="md" style={{ listStyle: 'disc' }}>
                            {(record.output.contributors.split(',').map(contributor => contributor.trim())).map((contributor, idx) => (
                              <Text component="li" key={idx}>{contributor}</Text>
                            ))}
                          </Box>
                        )
                      ) : (
                        <Text>No contributors information available.</Text>
                      )}
                    </>
                  )}
                </Box>
              </Box>
            </Tabs.Panel>

            <Tabs.Panel value="markdown" pt="md">
              <Box p="md" c="dimmed" style={{ borderRadius: 8 }}>
                <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '70vh' }}>
                  {JSON.stringify(record?.output, null, 2) || 'No markdown content available'}
                </pre>
              </Box>
            </Tabs.Panel>

            <Tabs.Panel value="question" pt="md">
              <Box p="md" c="dimmed" style={{ borderRadius: 8 }}>
                Question interface would appear here
              </Box>
            </Tabs.Panel>
          </Tabs>
        </Box>
      </Box>

      {/* Right sidebar */}
      <Box w={384} style={{ borderLeft: '1px solid #202020', padding: '1.5rem' }}>
        <Box mb="xl">
          <Text c="dimmed" mb="xs">
            Created
          </Text>
          <Text>{identity?.name || 'Unknown User'}</Text>
        </Box>

        <Box mb="xl">
          <Text c="dimmed" mb="xs">
            Duration
          </Text>
          <Text>{formatDuration(record?.totalDuration)}</Text>
        </Box>

        <Box mb="xl">
          <Text c="dimmed" mb="xs">
            Extra
          </Text>
          <Text>Data Response</Text>
        </Box>

        <Box mb="xl">
          <Text c="dimmed" mb="xs">
            Extra 2
          </Text>
          <Text>Data Response 2</Text>
        </Box>

        <Box mb="md">
          <Text c="dimmed" mb="md">
            Logic steps / events
          </Text>

          <Box style={{ position: 'relative' }}>
            <Box style={{ position: 'absolute', left: '1rem', top: '1rem', bottom: '1rem', width: 2, backgroundColor: '#202020' }} />

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
                <Box key={index} mb="xl">
                  <Group align="flex-start">
                    <Box 
                      w={32} 
                      h={32} 
                      style={{ 
                        backgroundColor: bgOuterColor, 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        position: 'relative', 
                        zIndex: 10 
                      }}
                    >
                      <Box w={16} h={16} style={{ backgroundColor: bgInnerColor, borderRadius: '50%' }} />
                    </Box>
                    <Box 
                      ml="md" 
                      p="sm" 
                      style={{ 
                        backgroundColor: bgCardColor, 
                        borderRadius: 8, 
                        flex: 1, 
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' 
                      }}
                    >
                      <Text fw={500} c="white">
                        {formatText(step.name) || `Step ${index + 1}`}
                      </Text>
                      <Text c="dimmed" size="sm">
                        {step.status ? formatText(step.status) : 'No status'}
                      </Text>
                    </Box>
                    {step.duration && (
                      <Text ml="xs" c="dimmed" size="sm">
                        {formatDuration(step.duration)}
                      </Text>
                    )}
                  </Group>
                </Box>
              );
            })}
            
            {(!record?.steps || record.steps.length === 0) && (
              <Box mb="xl">
                <Group align="flex-start">
                  <Box 
                    w={32} 
                    h={32} 
                    style={{ 
                      backgroundColor: '#202020', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      position: 'relative', 
                      zIndex: 10 
                    }}
                  >
                    <Box w={16} h={16} style={{ backgroundColor: '#2b2b2b', borderRadius: '50%' }} />
                  </Box>
                  <Box 
                    ml="md" 
                    p="sm" 
                    style={{ 
                      backgroundColor: '#202020', 
                      borderRadius: 8, 
                      flex: 1, 
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' 
                    }}
                  >
                    <Text fw={500} c="white">
                      No steps available
                    </Text>
                    <Text c="dimmed" size="sm">
                      Processing information unavailable
                    </Text>
                  </Box>
                </Group>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}