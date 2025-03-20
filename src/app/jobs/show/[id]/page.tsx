"use client";

import { useShow, useGetIdentity } from "@refinedev/core";
import React, { useState, useEffect, useCallback } from "react";
import { 
  Stack, 
  Text, 
  Button, 
  Group, 
  Card, 
  LoadingOverlay, 
  Alert,
  Badge,
  Box,
  Tabs
} from '@mantine/core';
import { AlertCircle, ExternalLink, Download, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuth, authUtils, API_CONFIG } from "@/utils/authUtils";
import { useParams, useRouter } from 'next/navigation';
import { formatDate } from '@/utils/formatting';

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
  status: string;
  link: string;
  createdAt: string;
  type?: string;
  markdown?: string;
}

export default function JobDetail() {
  const [activeTab, setActiveTab] = useState<string | null>("details");
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoadingMarkdown, setIsLoadingMarkdown] = useState(false);
  const [markdownError, setMarkdownError] = useState<string | null>(null);
  
  const params = useParams();
  const router = useRouter();
  
  // Safely extract jobId with proper TypeScript null checking
  const jobId = params ? (
    typeof params.id === 'string' ? params.id : 
    Array.isArray(params.id) ? params.id[0] : 
    ""
  ) : "";
  
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const { getAuthHeaders, refreshToken, fetchWithAuth } = useAuth();

  // Use useShow instead of useOne to follow the same pattern as the job list
  const { 
    queryResult: { data, isLoading, error },
    refetch 
  } = useShow<Job>({
    resource: "jobs",
    id: jobId,
    queryOptions: {
      enabled: !!identity?.token && !!jobId,
    },
    meta: {
      headers: getAuthHeaders(),
    }
  });

  useEffect(() => {
    if (error) {
      console.error("Error fetching job details:", error);
      authUtils.handleAuthError(error);
      if (error.status === 401 || error.status === 403) {
        refreshToken();
      }
    }
  }, [error, refreshToken]);

  // Fetch markdown content separately
  const fetchMarkdown = useCallback(async () => {
    if (!jobId || !identity?.token) return;
    
    setIsLoadingMarkdown(true);
    setMarkdownError(null);
    
    try {
      console.log(`Attempting to fetch markdown with ID: ${jobId}`);
      
      // Use the auth proxy for PDF endpoint
      const response = await fetch(`/api/auth-proxy/pdf/${jobId}/markdown?includeReferences=true`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch markdown: ${response.status} ${response.statusText}`);
      }
      
      const markdownData = await response.text();
      setMarkdown(markdownData);
      console.log(`Markdown content length: ${markdownData.length}`);
    } catch (error) {
      console.error("Failed to fetch markdown:", error);
      setMarkdownError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsLoadingMarkdown(false);
    }
  }, [jobId, identity?.token, getAuthHeaders]);

  useEffect(() => {
    if (activeTab === "content" && !markdown && !isLoadingMarkdown && !markdownError) {
      fetchMarkdown();
    }
  }, [activeTab, markdown, isLoadingMarkdown, markdownError, fetchMarkdown]);

  // Handle tab change
  const handleTabChange = (value: string | null) => {
    setActiveTab(value);
    if (value === "content" && !markdown && !isLoadingMarkdown) {
      fetchMarkdown();
    }
  };

  if (identityLoading || (isLoading && identity?.token)) {
    return (
      <Stack p="md">
        <LoadingOverlay visible />
        <Text>Loading job details...</Text>
      </Stack>
    );
  }

  if (!identity?.token) {
    return (
      <Stack p="md">
        <Alert icon={<AlertCircle size={16} />} title="Authentication Required" color="red">
          You must be logged in to view job details.
        </Alert>
      </Stack>
    );
  }

  const job = data?.data;

  if (!job && !isLoading) {
    return (
      <Stack p="md">
        <Alert icon={<AlertCircle size={16} />} title="Job Not Found" color="yellow">
          The requested job could not be found or you do not have permission to view it.
        </Alert>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </Stack>
    );
  }

  return (
    <Stack p="md" spacing="lg">
      <Group position="apart" align="center">
        <Group>
          <Button 
            variant="subtle" 
            leftSection={<ArrowLeft size={16} />}
            onClick={() => router.push('/jobs')}
          >
            Back to Jobs
          </Button>
          <Text size="xl" fw={700}>Job Details</Text>
        </Group>
        <Button 
          variant="subtle" 
          leftSection={<RefreshCw size={16} />}
          onClick={() => {
            refetch();
            if (activeTab === "content") {
              fetchMarkdown();
            }
          }}
        >
          Refresh
        </Button>
      </Group>

      {job && (
        <>
          <Card withBorder shadow="sm">
            <Stack spacing="xs">
              <Group position="apart">
                <Text size="lg" fw={600}>{job.jobName || "Untitled Job"}</Text>
                <Badge 
                  color={job.status === "COMPLETED" ? "green" : job.status === "FAILED" ? "red" : "blue"}
                >
                  {job.status}
                </Badge>
              </Group>
              
              <Text size="sm" c="dimmed">Created: {formatDate(job.createdAt)}</Text>
              
              {job.link && (
                <Button 
                  component="a" 
                  href={job.link} 
                  target="_blank" 
                  variant="outline"
                  leftSection={<ExternalLink size={16} />}
                  size="sm"
                >
                  Open Result
                </Button>
              )}
            </Stack>
          </Card>

          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Tab value="details">Details</Tabs.Tab>
              <Tabs.Tab value="content">Content</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="details" pt="md">
              <Card withBorder shadow="sm">
                <Stack spacing="md">
                  <Group>
                    <Text fw={500}>Job ID:</Text>
                    <Text>{job._id}</Text>
                  </Group>
                  <Group>
                    <Text fw={500}>Type:</Text>
                    <Text>{job.type || "N/A"}</Text>
                  </Group>
                  <Group>
                    <Text fw={500}>Language:</Text>
                    <Text>{job.lang || "English"}</Text>
                  </Group>
                  <Group>
                    <Text fw={500}>Scenario:</Text>
                    <Text>{job.scenario || "Default"}</Text>
                  </Group>
                  <Group>
                    <Text fw={500}>Public:</Text>
                    <Text>{job.isPublic ? "Yes" : "No"}</Text>
                  </Group>
                  <Group>
                    <Text fw={500}>Create Page:</Text>
                    <Text>{job.createPage ? "Yes" : "No"}</Text>
                  </Group>
                </Stack>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="content" pt="md">
              {isLoadingMarkdown ? (
                <Box pos="relative" h={200}>
                  <LoadingOverlay visible />
                </Box>
              ) : markdownError ? (
                <Alert icon={<AlertCircle size={16} />} title="Error Loading Content" color="red">
                  {markdownError}
                  <Button mt="sm" onClick={fetchMarkdown} size="sm">Retry</Button>
                </Alert>
              ) : markdown ? (
                <Card withBorder shadow="sm">
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {markdown}
                  </pre>
                </Card>
              ) : (
                <Alert icon={<AlertCircle size={16} />} title="No Content Available" color="yellow">
                  No content is available for this job.
                </Alert>
              )}
            </Tabs.Panel>
          </Tabs>
        </>
      )}
    </Stack>
  );
}