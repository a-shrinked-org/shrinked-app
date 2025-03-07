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
  
  const requestedFields = '_id,title,createdAt';
  
  const { data, isLoading, refetch, error } = useList<ProcessedDocument>({
    resource: identity?.id ? `processing/user/${identity.id}/documents` : "",
    queryOptions: {
      enabled: !!identity?.id,
    },
    pagination: {
      pageSize: 100,
    },
    meta: {
      headers: authUtils.getAuthHeaders(),
      url: identity?.id ? `${API_CONFIG.API_URL}/processing/user/${identity.id}/documents?fields=${requestedFields}` : ""
    }
  });

  useEffect(() => {
    console.log("Raw data from useList in ProcessingList:", data);
    if (data?.data && Array.isArray(data.data)) {
      const validDocs = data.data.filter(doc => doc && doc._id && doc.createdAt) as ProcessedDocument[];
      console.log("Filtered valid documents:", validDocs);
      if (validDocs.length > 0) {
        documentOperations.fetchJobIdsForDocs(validDocs, API_CONFIG.API_URL)
          .then(mapping => {
            console.log("Doc to Job mapping:", mapping);
            setDocToJobMapping(mapping);
          })
          .catch(err => console.error("Failed to fetch job mappings:", err));
      } else {
        console.log("No valid documents with _id and createdAt found");
      }
    } else {
      console.log("No valid data.data array found:", data);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      console.error("Error fetching documents:", error);
      authUtils.handleAuthError(error);
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

  const handleViewDocument = (doc: ProcessedDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const jobId = docToJobMapping[doc._id] || doc._id;
    window.open(`/jobs/show/${jobId}`, '_blank');
  };

  const handleSendEmail = async (id: string, email?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const result = await documentOperations.sendDocumentEmail(id, API_CONFIG.API_URL, email);
    if (result.success) {
      alert("Document sent successfully");
    } else {
      alert("Failed to send document: " + (result.error?.message || "Unknown error"));
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to delete this document?")) {
      const result = await documentOperations.deleteDocument(id, API_CONFIG.API_URL);
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
    <DocumentsTable<ProcessedDocument>
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
      showStatus={false}
    />
  );
}