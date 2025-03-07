"use client";

import { useList, useGetIdentity, useDataProvider } from "@refinedev/core";
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
import { getDocumentOperations } from '@/providers/shrinked-data-provider';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
}

export default function ProcessingList() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const [docToJobMapping, setDocToJobMapping] = useState<Record<string, string>>({});
  const dataProvider = useDataProvider();
  const documentOperations = getDocumentOperations(dataProvider);
  
  // Only request the fields we need, reducing payload size
  const requestedFields = '_id,title,fileName,createdAt,status,output.title';
  
  // Only fetch data when identity is available
  const { data, isLoading, refetch, error } = useList<ProcessedDocument>({
    resource: identity?.id ? `processing/user/${identity.id}/documents` : "",
    queryOptions: {
      enabled: !!identity?.id,
    },
    pagination: {
      pageSize: 100,
    },
    meta: {
      headers: {
        'Authorization': `Bearer ${authUtils.getAccessToken() || identity?.token || ''}`
      },
      url: identity?.id ? `${API_CONFIG.API_URL}/processing/user/${identity.id}/documents?fields=${requestedFields}` : ""
    }
  });

  // Effect to fetch job IDs for documents using our provider
  useEffect(() => {
    if (data?.data && data.data.length > 0) {
      documentOperations.fetchJobIdsForDocs(data.data)
        .then(mapping => setDocToJobMapping(mapping));
    }
  }, [data, documentOperations]);

  // Error handling with token refresh
  useEffect(() => {
    if (error) {
      console.error("Error fetching documents:", error);
      
      if (error.status === 401 || error.status === 403) {
        console.log("Authentication error, attempting to refresh token");
        authUtils.refreshToken().then(success => {
          if (success) {
            console.log("Token refreshed successfully, retrying request");
            refetch();
          }
        });
      }
    }
  }, [error, refetch]);

  // Refetch when identity is loaded
  useEffect(() => {
    if (identity?.id) {
      console.log("Identity loaded, refetching data:", identity);
      refetch();
    }
  }, [identity, refetch]);

  const handleViewDocument = (doc: ProcessedDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Use the job ID from our mapping if available, otherwise fall back to document ID
    const jobId = docToJobMapping[doc._id] || doc._id;
    window.open(`/jobs/show/${jobId}`, '_blank');
  };

  const handleSendEmail = async (id: string, email?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const result = await documentOperations.sendDocumentEmail(id, email);
    if (result.success) {
      alert("Document sent successfully");
    } else {
      alert("Failed to send document. Please try again.");
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (confirm("Are you sure you want to delete this document?")) {
      const result = await documentOperations.deleteDocument(id);
      if (result.success) {
        alert("Document deleted successfully");
        refetch();
      } else {
        alert("Failed to delete document. Please try again.");
      }
    }
  };

  const handleRefresh = () => {
    refetch();
    setDocToJobMapping({});
  };

  // Loading state
  if (identityLoading || (isLoading && identity?.id)) {
    return (
      <Stack p="md" style={{ position: 'relative', minHeight: '200px' }}>
        <LoadingOverlay visible={true} />
      </Stack>
    );
  }

  // Auth check
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
    <DocumentsTable 
      data={data?.data || []}
      docToJobMapping={docToJobMapping}
      onView={handleViewDocument}
      onSendEmail={handleSendEmail}
      onDelete={handleDelete}
      formatDate={formatDate}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      error={error}
      title="Doc Store"
    />
  );
}