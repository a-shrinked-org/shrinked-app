"use client";

import { useList, useNavigation, useGetIdentity } from "@refinedev/core";
import React, { useState, useCallback, useEffect } from "react";
import { 
  Stack, 
  Button, 
  Group, 
  Text, 
  LoadingOverlay, 
  Badge, 
  Alert,
  Select,
  Modal,
  Box,
  Flex
} from '@mantine/core';
import { 
  Info, 
  RefreshCw, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useAuth, authUtils, API_CONFIG } from "@/utils/authUtils";
import DocumentsTable, { ProcessedDocument, ExtraColumn } from '@/components/shared/DocumentsTable';
import { formatDate } from '@/utils/formatting';
import { GeistMono } from 'geist/font/mono';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
}

interface Job extends ProcessedDocument {
  jobName: string;
  scenario: string;
  lang: string;
  isPublic: boolean;
  createPage: boolean;
  link: string;
}

const formatScenarioName = (scenario: string) => {
  if (!scenario) return 'Default';
  if (scenario.includes('SINGLE_FILE_DEFAULT') || scenario.includes('PLATOGRAM')) {
    return 'Default';
  }
  return scenario.replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function JobList() {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusResult, setStatusResult] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  // Add refresh counter state
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const { show, create } = useNavigation();
  const { getAuthHeaders, refreshToken, fetchWithAuth } = useAuth();

  const { data, isLoading, refetch, error } = useList<Job>({
    resource: "jobs",
    queryOptions: {
      enabled: !!identity?.token,
      // Improve caching behavior
      cacheTime: 5000, // 5 seconds cache time
      staleTime: 0, // Always consider data stale
    },
    pagination: {
      current: pageIndex + 1,
      pageSize,
    },
    meta: {
      headers: getAuthHeaders(),
      url: `${API_CONFIG.API_URL}/jobs`
    }
  });

  const totalRecords = data?.total || 0;
  const pageCount = Math.ceil(totalRecords / pageSize);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  useEffect(() => {
    if (error) {
      console.error("Error fetching jobs:", error);
      authUtils.handleAuthError(error);
      if (error.status === 401 || error.status === 403) {
        refreshToken().then(success => {
          if (success) refetch();
        });
      }
    }
  }, [error, refetch, refreshToken]);

  useEffect(() => {
    if (identity?.token) refetch();
  }, [identity, refetch, refreshCounter]); // Add refreshCounter dependency

  const handleRowClick = (doc: Job) => {
    show("jobs", doc._id); // Navigate to /jobs/show/:id
  };

  const handleCreateJob = () => {
    create("jobs");
  };

  // Improved refresh handler
  const handleRefresh = useCallback(() => {
    console.log("Refresh button clicked in JobList");
    // Use force: true to bypass cache
    refetch({ force: true });
    // Update counter to force re-render
    setRefreshCounter(prev => prev + 1);
  }, [refetch]);

  const checkStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setStatusResult(null);
    setIsStatusModalOpen(true);
    try {
      const response = await fetchWithAuth(`${API_CONFIG.API_URL}/health`);
      const status = await response.text();
      setStatusResult(status || "Service is operational.");
    } catch (error) {
      setStatusResult(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsLoadingStatus(false);
    }
  }, [fetchWithAuth]);

  const formatJobData = (jobs: Job[]): Job[] => {
    return jobs.map(job => ({
      _id: job._id,
      title: job.jobName || 'Short Generated Summary Headline for a File',
      createdAt: job.createdAt,
      status: job.status,
      fileName: job.jobName,
      jobName: job.jobName,
      scenario: job.scenario,
      lang: job.lang,
      isPublic: job.isPublic,
      createPage: job.createPage,
      link: job.link,
      type: job.type || 'MP3',
      logic: formatScenarioName(job.scenario || ''),
      description: 'Here is a detailed burger recipe that you can follow to...'
    }));
  };

  const extraColumns: ExtraColumn<Job>[] = [
    {
      header: "Type",
      accessor: (doc: Job) => doc.type || 'MP3'
    },
    {
      header: "Logic",
      accessor: "logic",
      hideOnMobile: true
    }
  ];

  if (identityLoading || (isLoading && identity?.token)) {
    return (
      <Stack p="md">
        <LoadingOverlay visible />
        <Text>Loading authentication...</Text>
      </Stack>
    );
  }

  if (!identity?.token) {
    return (
      <Stack p="md">
        <Alert icon={<AlertCircle size={16} />} title="Authentication Required" color="red">
          You must be logged in to view jobs.
        </Alert>
      </Stack>
    );
  }

  return (
    <>
      <DocumentsTable<Job>
        key={`jobs-list-${refreshCounter}`} // Add key to force re-render
        data={formatJobData(data?.data || [])}
        onRowClick={handleRowClick}
        formatDate={formatDate}
        isLoading={isLoading}
        onRefresh={handleRefresh} // Use the new handler
        error={error}
        title={`JOBS LIST [${data?.data?.length || 0}]`}
        extraColumns={extraColumns}
        onAddNew={handleCreateJob}
      />
      
      {/* Pagination controls - using a more subtle style that doesn't interfere with the main table design */}
      {pageCount > 1 && (
        <Box style={{ 
          backgroundColor: '#000000', 
          padding: '16px', 
          borderTop: '1px solid #2b2b2b',
          margin: 0
        }}>
          <Flex justify="center" align="center" gap="md">
            <Button 
              variant="subtle"
              disabled={!canPreviousPage}
              onClick={() => setPageIndex(pageIndex - 1)}
              leftSection={<ChevronLeft size={16} />}
              styles={{
                root: {
                  color: '#a1a1a1',
                  '&:hover': {
                    backgroundColor: '#1a1a1a',
                  },
                },
              }}
            >
              Previous
            </Button>
            <Text c="#a1a1a1" size="sm">
              Page {pageIndex + 1} of {pageCount}
            </Text>
            <Button
              variant="subtle"
              disabled={!canNextPage}
              onClick={() => setPageIndex(pageIndex + 1)}
              rightSection={<ChevronRight size={16} />}
              styles={{
                root: {
                  color: '#a1a1a1',
                  '&:hover': {
                    backgroundColor: '#1a1a1a',
                  },
                },
              }}
            >
              Next
            </Button>
          </Flex>
        </Box>
      )}

      <Modal
        opened={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Server Status"
        styles={{
          header: { backgroundColor: '#000000', color: '#ffffff' },
          body: { backgroundColor: '#000000', color: '#ffffff' },
          close: { color: '#ffffff' },
        }}
      >
        {isLoadingStatus ? (
          <LoadingOverlay visible />
        ) : (
          <>
            <Text>{statusResult || "No status information available."}</Text>
            <Button 
              mt="md" 
              leftSection={<RefreshCw size={16} />}
              onClick={checkStatus}
              loading={isLoadingStatus}
              styles={{
                root: {
                  backgroundColor: 'transparent',
                  borderColor: '#2b2b2b',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#2b2b2b',
                  },
                },
              }}
            >
              Refresh Status
            </Button>
          </>
        )}
      </Modal>
    </>
  );
}