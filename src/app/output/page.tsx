"use client";

import { useList, useGetIdentity } from "@refinedev/core";
import React, { useEffect, useState } from "react";
import { 
  Stack, 
  LoadingOverlay, 
  Alert 
} from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import { authUtils, API_CONFIG } from "@/utils/authUtils";
import DocumentsTable, { ProcessedDocument } from '@/components/shared/DocumentsTable';
import { formatDate } from '@/utils/formatting';
import { documentOperations } from '@/providers/data-provider/shrinked-data-provider';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
}

export default function ProcessingList() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const [docToJobMapping, setDocToJobMapping] = useState<Record<string, string>>({});
  
  const requestedFields = '_id,title,fileName,createdAt,status,output.title';
  
  const { data, isLoading, refetch, error } = useList<ProcessedDocument>({
    resource: identity?.id ? `processing/user/${identity.id}/documents` : "",
    queryOptions: {
      enabled: !!identity?.id,
    },
    pagination: {
      pageSize: 100,
    },
    meta: {
      headers: authUtils.getAuthHeaders(), // Use authUtils.getAuthHeaders
      url: identity?.id ? `${API_CONFIG.API_URL}/processing/user/${identity.id}/documents?fields=${requestedFields}` : ""
    }
  });

  useEffect(() => {
    console.log("Raw data from useList in ProcessingList:", data); // Debug raw data
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      documentOperations.fetchJobIdsForDocs(data.data, API_CONFIG.API_URL)
        .then(mapping => {
          console.log("Doc to Job mapping:", mapping);
          setDocToJobMapping(mapping);
        })
        .catch(err => console.error("Failed to fetch job mappings:", err));
    } else {
      console.log("No valid data.data array found:", data);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      console.error("Error fetching documents:", error);
      authUtils.handleAuthError(error); // Use authUtils error handling
      if (error.status === 401 || error.status === 403) {
        authUtils.refreshToken().then(success => {
          if (success) refetch();
        });
      }
    }
  }, [error, refetch]);

  useEffect(() => {
    if (identity?.id) {
      console.log("Refetching with user ID:", identity.id);
      refetch();
    }
  }, [identity, refetch]);

  const handleRowClick = (doc: ProcessedDocument) => {
    const jobId = docToJobMapping[doc._id] || doc._id;
    window.open(`/jobs/show/${jobId}`, '_blank');
  };

  const handleRefresh = () => {
    refetch();
    setDocToJobMapping({});
  };

  if (identityLoading || (isLoading && identity?.id)) {
    return (
      <Stack p="md" style={{ position: 'relative', minHeight: '200px' }}>
        <LoadingOverlay visible={true} />
      </Stack>
    );
  }

  if (!identity?.id) {
    return (
      <Stack p="md">
        <Alert 
          icon={<AlertCircle size={16} />}
          title="Authentication Required" 
          color="red"
        >
          You must be logged in to view documents.
        </Alert>
      </Stack>
    );
  }

  return (
    <DocumentsTable<ProcessedDocument>
      data={data?.data || []}
      docToJobMapping={docToJobMapping}
      onRowClick={handleRowClick}
      formatDate={formatDate} // Use unified formatDate
      isLoading={isLoading}
      onRefresh={handleRefresh}
      error={error}
      title="Doc Store"
    />
  );
}