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

// Helper function to format the date consistently across the application
const formatProcessingDate = (dateString: string) => {
  if (!dateString) return "";
  
  try {
    // Parse the date string to ensure consistency
    const date = new Date(dateString);
    
    // Format as "MMM DD" (e.g., "MAR 04")
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${month} ${day}`;
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString; // Return original if parsing fails
  }
};

export default function ProcessingList() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const [docToJobMapping, setDocToJobMapping] = useState<Record<string, string>>({});
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  
  // Updated to include all required fields
  const requestedFields = '_id,title,createdAt,description,output,fileName,jobId,status';
  
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

  // Process documents to ensure they have the required fields
  const processDocuments = (documents: any[] = []): ProcessedDocument[] => {
    return documents.map((doc) => {
      // Handle documents without _id (should be rare)
      if (!doc._id) {
        console.warn("Document without _id found:", doc);
      }
      
      // If document has a jobId, add it to the mapping
      if (doc.jobId && doc._id) {
        setDocToJobMapping(prev => ({
          ...prev,
          [doc._id]: doc.jobId
        }));
      }
      
      return {
        ...doc,
        createdAt: doc.createdAt || new Date().toISOString()
      } as ProcessedDocument;
    });
  };

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

  // Prepare documents with consistent data for the table
  const prepareDocuments = (documents: any[] = []): ProcessedDocument[] => {
    return processDocuments(documents).map(doc => ({
      ...doc,
      // Ensure each document has a proper title and description for two-line display
      title: doc.title || doc.output?.title || doc.fileName || 'Untitled Document',
      description: doc.description || doc.output?.description || 'No description available',
    }));
  };

  const handleViewDocument = async (doc: ProcessedDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // First check if we already have a jobId either from the doc or our mapping
    let jobId = docToJobMapping[doc._id] || doc.jobId;
    
    // If we don't have a jobId yet, fetch it only for this document
    if (!jobId && doc._id) {
      try {
        // Show loading indicator for this specific document
        setLoadingDocId(doc._id);
        
        // Fetch the job ID for just this one document
        const mapping = await documentOperations.fetchJobIdsForDocs([doc], API_CONFIG.API_URL);
        jobId = mapping[doc._id];
        
        // Update our mapping with the new job ID for future reference
        if (jobId) {
          setDocToJobMapping(prev => ({
            ...prev,
            [doc._id]: jobId
          }));
        }
      } catch (error) {
        console.error(`Error fetching job ID for document ${doc._id}:`, error);
        alert("Could not retrieve job details for this document");
        return;
      } finally {
        // Hide loading indicator
        setLoadingDocId(null);
      }
    }
    
    // If we have a jobId, open the job detail page
    if (jobId) {
      console.log(`Opening job ${jobId} for document ${doc._id}`);
      window.open(`/jobs/show/${jobId}`, '_blank');
    } else {
      // If we still couldn't get a jobId, inform the user
      alert("Could not find associated job for this document");
    }
  };

  const handleSendEmail = async (id: string, email?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const result = await documentOperations.sendDocumentEmail(id, API_CONFIG.API_URL, email);
      if (result.success) {
        alert("Document sent successfully");
      } else {
        alert("Failed to send document: " + (result.error?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Failed to send document: Unknown error");
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        const result = await documentOperations.deleteDocument(id, API_CONFIG.API_URL);
        if (result.success) {
          alert("Document deleted successfully");
          refetch();
        } else {
          alert("Failed to delete document: " + (result.error?.message || "Unknown error"));
        }
      } catch (error) {
        console.error("Error deleting document:", error);
        alert("Failed to delete document: Unknown error");
      }
    }
  };

  const handleRefresh = () => {
    refetch();
    // Clear the job mapping to force fresh fetching
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

  const preparedData = prepareDocuments(data?.data || []);

  return (
    <DocumentsTable<ProcessedDocument>
      data={preparedData}
      docToJobMapping={docToJobMapping}
      onView={handleViewDocument}
      onSendEmail={handleSendEmail}
      onDelete={handleDelete}
      formatDate={formatProcessingDate}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      error={error}
      title="DOC STORE"
      showStatus={false}
      loadingDocId={loadingDocId} // Pass the loading doc ID to show loading state
    />
  );
}