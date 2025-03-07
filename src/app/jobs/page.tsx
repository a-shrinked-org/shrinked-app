"use client";

import { useList, useNavigation, useGetIdentity, useDataProvider } from "@refinedev/core";
import React, { useState, useCallback, useEffect } from "react";
import { 
  Stack, 
  Button, 
  Group, 
  Title, 
  Modal, 
  Text, 
  LoadingOverlay, 
  Badge, 
  Alert,
  Select
} from '@mantine/core';
import { 
  Eye, 
  Info, 
  RefreshCw, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth, API_CONFIG } from "@/utils/authUtils";
import DocumentsTable, { ProcessedDocument } from '@/components/shared/DocumentsTable';
import { getDocumentOperations } from '@/providers/data-provider/shrinked-data-provider';

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

const getStatusColor = (status: string) => {
  if (!status) return 'gray';
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'completed': return 'green';
    case 'in_progress': case 'processing': return 'blue';
    case 'failed': case 'error': return 'red';
    case 'pending': case 'queued': return 'yellow';
    default: return 'gray';
  }
};

const formatScenarioName = (scenario: string) => {
  if (!scenario) return 'Unknown';
  if (scenario.includes('SINGLE_FILE_DEFAULT') || scenario.includes('PLATOGRAM')) {
    return 'Default';
  }
  return scenario.replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date);
};

export default function JobList() {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusResult, setStatusResult] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const { show, create } = useNavigation();
  const { getAuthHeaders, refreshToken, fetchWithAuth } = useAuth();
  const dataProvider = useDataProvider();
  const documentOperations = getDocumentOperations(dataProvider);

  const { data, isLoading, refetch, error } = useList<Job>({
    resource: "jobs",
    queryOptions: {
      enabled: !!identity?.token,
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
      if (!navigator.onLine) {
        console.error("Offline detected");
      } else if (error.status === 521 || error.status === 522 || error.status === 523) {
        console.error("Server unreachable");
      } else if (error.status === 401 || error.status === 403) {
        refreshToken().then(success => {
          if (success) refetch();
        });
      }
    }
  }, [error, refetch]);

  useEffect(() => {
    if (identity?.token) refetch();
  }, [identity, refetch]);

  const handleViewDocument = (job: Job) => {
    show("jobs", job._id);
  };

  const handleSendEmail = async (id: string, email?: string) => {
    const result = await documentOperations.sendDocumentEmail(id, email);
    if (result.success) {
      alert("Job sent successfully");
    } else {
      alert("Failed to send job: " + (result.error?.message || "Unknown error"));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this job?")) {
      const result = await documentOperations.deleteDocument(id);
      if (result.success) {
        alert("Job deleted successfully");
        refetch();
      } else {
        alert("Failed to delete job: " + (result.error?.message || "Unknown error"));
      }
    }
  };

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
      title: `${job.jobName} (ID: ${job._id.substring(0, 8)}...)`,
      createdAt: job.createdAt,
      status: job.status,
      fileName: job.jobName,
      jobName: job.jobName,
      scenario: job.scenario,
      lang: job.lang,
      isPublic: job.isPublic,
      createPage: job.createPage,
      link: job.link,
    }));
  };

  const extraColumns = [
    {
      header: "Logic",
      accessor: (doc: Job) => formatScenarioName(doc.scenario || '')
    },
    {
      header: "Public",
      accessor: (doc: Job) => (
        <Badge color={doc.isPublic ? "green" : "gray"} variant="light">
          {doc.isPublic ? "Yes" : "No"}
        </Badge>
      )
    },
    {
      header: "Page",
      accessor: (doc: Job) => (
        <Badge color={doc.createPage ? "green" : "gray"} variant="light">
          {doc.createPage ? "Yes" : "No"}
        </Badge>
      )
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
      <DocumentsTable
        data={formatJobData(data?.data || [])}
        onView={handleViewDocument}
        onSendEmail={handleSendEmail}
        onDelete={handleDelete}
        formatDate={formatDate}
        isLoading={isLoading}
        onRefresh={refetch}
        error={error}
        title="Jobs List"
        extraColumns={extraColumns}
      />
      
      <Stack gap="md" p="md">
        <Group justify="space-between">
          <Button variant="light" onClick={checkStatus} leftSection={<Info size={16} />}>
            Check Server Status
          </Button>
          <Group>
            <Button 
              variant="light"
              disabled={!canPreviousPage}
              onClick={() => setPageIndex(pageIndex - 1)}
              leftSection={<ChevronLeft size={18} />}
            >
              Previous
            </Button>
            <Text>
              Page <strong>{pageIndex + 1} of {pageCount || 1}</strong>
            </Text>
            <Button
              variant="light"
              disabled={!canNextPage}
              onClick={() => setPageIndex(pageIndex + 1)}
              rightSection={<ChevronRight size={18} />}
            >
              Next
            </Button>
            <Select
              value={pageSize.toString()}
              onChange={(value) => setPageSize(Number(value))}
              data={['10', '20', '30', '40', '50'].map(size => ({
                value: size,
                label: `${size} records per page`,
              }))}
            />
            <Button onClick={() => create("jobs")}>
              Create Job
            </Button>
          </Group>
        </Group>

        <Modal
          opened={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          title="Server Status"
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
              >
                Refresh Status
              </Button>
            </>
          )}
        </Modal>
      </Stack>
    </>
  );
}