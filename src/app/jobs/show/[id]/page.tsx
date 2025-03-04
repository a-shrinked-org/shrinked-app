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
  Title,
  Badge
} from '@mantine/core';
import { 
  IconArrowLeft, 
  IconShare,
  IconDotsHorizontal,
  IconDownload,
  IconAlertCircle
} from '@tabler/icons-react';
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';

// Import the JobFlowDiagram component with dynamic loading for client-side rendering
const JobFlowDiagram = dynamic(
  () => import('@/components/JobFlowDiagram'),
  { ssr: false, loading: () => <div>Loading flow diagram...</div> }
);

interface Identity {
  token?: string;
  email?: string;
  name?: string;
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
  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'blue';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };
  
  const formatText = (text: string) => {
    return text
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDuration = (durationInMs?: number) => {
    if (!durationInMs) return "N/A";
    
    const totalSeconds = Math.floor(durationInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}m ${seconds}s`;
  };

  const { data, isLoading, isError } = queryResult;
  const record = data?.data;

  // Extract filename from link if available
  const getFilenameFromLink = (link?: string) => {
    if (!link) return "";
    const parts = link.split("/");
    return parts[parts.length - 1] || "";
  };

  // Authentication check after hooks
  if (!identity?.token) {
    return (
      <Box style={{ position: 'relative', minHeight: '200px' }}>
        <LoadingOverlay visible={true} />
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box style={{ position: 'relative', minHeight: '200px' }}>
        <LoadingOverlay visible={true} />
      </Box>
    );
  }

  if (isError || !jobId) {
    return (
      <Box p="md">
        <Box mb="md" p="md" style={{ background: '#252525', borderRadius: '4px' }}>
          <Group>
            <IconAlertCircle size={20} color="red" />
            <Text c="red">Unable to load job details. Please try again.</Text>
          </Group>
        </Box>
        <Button
          variant="outline"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => list('jobs')}
          style={{ background: '#131313', borderColor: '#202020', color: '#ffffff' }}
        >
          Back to Jobs
        </Button>
      </Box>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-[#ffffff]">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 flex justify-between items-center">
          <Button 
            variant="outline" 
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => list('jobs')}
            style={{ background: '#131313', borderColor: '#202020', color: '#ffffff' }}
          >
            Back to Jobs
          </Button>

          <div className="flex gap-2">
            <Button 
              variant="outline"
              leftSection={<IconShare size={16} />}
              style={{ background: '#131313', borderColor: '#202020', color: '#ffffff' }}
            >
              Share
            </Button>
            <Button style={{ background: 'white', color: 'black' }}>
              Use in a job
            </Button>
            <ActionIcon 
              variant="subtle" 
              style={{ color: '#ffffff' }}
            >
              <IconDotsHorizontal size={20} />
            </ActionIcon>
          </div>
        </div>

        {/* Document title */}
        <div className="px-8 py-4">
          <h1 className="text-3xl font-serif">{record?.output?.title || record?.jobName || 'Untitled Document'}</h1>
          <p className="text-[#a1a1a1] mt-1">
            {getFilenameFromLink(record?.link) || 'No source file'}
          </p>
        </div>

        {/* Tabs and content */}
        <div className="flex-1 px-8">
          <Tabs defaultValue="preview" className="w-full">
            <div className="border-b border-[#202020]">
              <Tabs.List style={{ background: 'transparent' }}>
                <Tabs.Tab 
                  value="preview"
                  style={{ 
                    background: 'transparent', 
                    borderBottom: activeTab === 'preview' ? '2px solid white' : 'none',
                    color: activeTab === 'preview' ? 'white' : '#a1a1a1',
                    borderRadius: 0,
                    padding: '8px 16px'
                  }}
                  onClick={() => setActiveTab('preview')}
                >
                  Preview
                </Tabs.Tab>
                <Tabs.Tab 
                  value="markdown"
                  style={{ 
                    background: 'transparent', 
                    borderBottom: activeTab === 'markdown' ? '2px solid white' : 'none',
                    color: activeTab === 'markdown' ? 'white' : '#a1a1a1',
                    borderRadius: 0,
                    padding: '8px 16px'
                  }}
                  onClick={() => setActiveTab('markdown')}
                >
                  Markdown/JSON
                </Tabs.Tab>
                <Tabs.Tab 
                  value="question"
                  style={{ 
                    background: 'transparent', 
                    borderBottom: activeTab === 'question' ? '2px solid white' : 'none',
                    color: '#a1a1a1',
                    borderRadius: 0,
                    padding: '8px 16px'
                  }}
                  disabled
                  onClick={() => setActiveTab('question')}
                >
                  Ask a question
                  <Badge 
                    ml="xs" 
                    style={{ background: '#291e3f', color: '#9e8bc3' }}
                    size="xs"
                  >
                    Coming soon
                  </Badge>
                </Tabs.Tab>
              </Tabs.List>
            </div>

            <Tabs.Panel value="preview" pt="md">
              <div className="bg-white text-black p-8 rounded">
                <div className="max-w-3xl mx-auto">
                  <h1 className="text-3xl font-serif mb-6">
                    {record?.output?.title || record?.jobName || 'Untitled Document'}
                  </h1>

                  <h2 className="text-xl font-serif mb-2">Origin</h2>
                  <p className="text-[#3b1b1b] mb-4">
                    <a href={record?.link} className="text-blue-700 underline break-all">
                      {record?.link || 'No source link available'}
                    </a>
                  </p>

                  <h2 className="text-xl font-serif mb-2">Abstract</h2>
                  <p className="mb-4 text-justify">
                    {record?.output?.abstract || 'No abstract available.'}
                  </p>

                  <h2 className="text-xl font-serif mb-2">Contributors, Acknowledgements, Mentions</h2>
                  <div dangerouslySetInnerHTML={{ __html: record?.output?.contributors || 'No contributors information available.' }} />
                </div>
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="markdown" pt="md">
              <div className="p-4 text-[#a1a1a1]">
                <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto' }}>
                  {JSON.stringify(record?.output, null, 2) || 'No markdown content available'}
                </pre>
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="question" pt="md">
              <div className="p-4 text-[#a1a1a1]">
                Question interface would appear here
              </div>
            </Tabs.Panel>
          </Tabs>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-96 border-l border-[#202020] p-6">
        <div className="mb-8">
          <h3 className="text-[#757575] mb-1">Created</h3>
          <p className="text-white">{identity?.name || 'Unknown User'}</p>
        </div>

        <div className="mb-8">
          <h3 className="text-[#757575] mb-1">Duration</h3>
          <p className="text-white">{formatDuration(record?.totalDuration)}</p>
        </div>

        <div className="mb-8">
          <h3 className="text-[#757575] mb-1">Status</h3>
          <p className="text-white">
            {record?.status ? formatText(record.status) : 'Unknown'}
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-[#757575] mb-1">Language</h3>
          <p className="text-white">
            {record?.lang === 'en' ? 'English' : 
             record?.lang === 'uk' ? 'Ukrainian' : 
             record?.lang || 'Unknown'}
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-[#757575] mb-4">Logic steps / events</h3>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-[#202020]"></div>

            {/* Steps */}
            {record?.steps?.map((step, index) => {
              // Determine step color based on status
              let bgColor = '#202020';
              let dotColor = '#2b2b2b';
              
              if (step.status?.toLowerCase() === 'completed') {
                bgColor = '#1a2516';
                dotColor = '#102d1d';
              } else if (step.status?.toLowerCase().includes('error') || 
                         step.status?.toLowerCase().includes('failed')) {
                bgColor = '#251313';
                dotColor = '#3b1b1b';
              }
              
              return (
                <div key={index} className="mb-8 relative">
                  <div className="flex items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10`} 
                         style={{ background: bgColor }}>
                      <div className={`w-4 h-4 rounded-full`} 
                           style={{ background: dotColor }}></div>
                    </div>
                    <div className="ml-4 rounded-lg p-3 flex-1" 
                         style={{ background: bgColor }}>
                      <p className="text-white font-medium">
                        {formatText(step.name) || `Step ${index + 1}`}
                      </p>
                      <p className="text-[#a1a1a1] text-sm">
                        {step.status ? formatText(step.status) : 'No status'}
                      </p>
                    </div>
                    {step.duration && (
                      <div className="ml-2 text-[#757575] text-sm">
                        {formatDuration(step.duration)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* If no steps are available, show placeholder */}
            {(!record?.steps || record.steps.length === 0) && (
              <div className="mb-8 relative">
                <div className="flex items-start">
                  <div className="bg-[#202020] w-8 h-8 rounded-full flex items-center justify-center z-10">
                    <div className="bg-[#2b2b2b] w-4 h-4 rounded-full"></div>
                  </div>
                  <div className="ml-4 bg-[#202020] rounded-lg p-3 flex-1">
                    <p className="text-white font-medium">No steps available</p>
                    <p className="text-[#a1a1a1] text-sm">Processing information unavailable</p>
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