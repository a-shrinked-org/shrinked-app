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
import { getDocumentOperations } from '@/providers/data-provider/shrinked-data-provider';

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
      headers: {
        'Authorization': `Bearer ${authUtils.getAccessToken() || identity?.token || ''}`
      },
      url: identity?.id ? `${API_CONFIG.API_URL}/processing/user/${identity.id}/documents?fields=${requestedFields}` : ""
    }
  });

  useEffect(() => {
    if (data?.data && data.data.length > 0) {
      documentOperations.fetchJobIdsForDocs(data.data)
        .then(mapping => setDocToJobMapping(mapping))
        .catch(err => console.error("Failed to fetch job mappings:", err));
    }
  }, [data, documentOperations]);

  useEffect(() => {
    if (error?.status === 401 || error?.status === 403) {
      authUtils.refreshToken().then(success => {
        if (success) refetch();
      });
    }
  }, [error, refetch]);

  useEffect(() => {
    if (identity?.id) refetch();
  }, [identity, refetch]);

  const handleViewDocument = (doc: ProcessedDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const jobId = docToJobMapping[doc._id] || doc._id;
    window.open(`/jobs/show/${jobId}`, '_blank');
  };

  const handleSendEmail = async (id: string, email?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const result = await documentOperations.sendDocumentEmail(id, email);
    if (result.success) {
      alert("Document sent successfully");
    } else {
      alert("Failed to send document: " + (result.error?.message || "Unknown error"));
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
        alert("Failed to delete document: " + (result.error?.message || "Unknown error"));
      }
    }
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