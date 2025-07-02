"use client";

import { useList, useGetIdentity, useNotification } from "@refinedev/core";
import React, { useEffect, useState, useCallback } from "react";
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
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

// Custom title renderer to only show title without description
const titleRenderer = (doc: ProcessedDocument) => {
  return (
    <div style={{ overflow: 'hidden' }}>
      <div style={{ 
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: 500,
        fontSize: '16px'
      }}>
        {doc.title || doc.output?.title || doc.fileName || 'Untitled Document'}
      </div>
    </div>
  );
};

export default function ProcessingList() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [docToDeleteId, setDocToDeleteId] = useState<string | null>(null);
  const { open } = useNotification();
  
  const { data, isLoading, refetch, error } = useList<ProcessedDocument>({
    resource: identity?.id ? `processing/user/${identity.id}/documents` : "",
    queryOptions: {
      enabled: !!identity?.id,
      // Add cache options
      cacheTime: 5000, // 5 seconds cache
      staleTime: 0, // Always consider data stale
    },
    pagination: {
      pageSize: 100,
    },
    meta: {
      headers: authUtils.getAuthHeaders()
    }
  });

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
      console.log("Fetching documents for user:", identity.id);
      refetch();
    }
  }, [identity, refetch, refreshCounter]); // Add refreshCounter to dependencies

  // Prepare documents with consistent data for the table
  const prepareDocuments = (documents: any[] = []): ProcessedDocument[] => {
    console.log("Raw documents from API:", documents);
    return documents.map((doc, index) => ({
      ...doc,
      _id: doc._id || `doc-${index}`, // Ensure each document has an ID
      createdAt: doc.createdAt || new Date().toISOString(),
      // Set title only, we'll use the titleRenderer to hide description
      title: doc.title || doc.output?.title || doc.fileName || 'Untitled Document',
      // Set status to undefined so that the circle will be white
      status: undefined
    }));
  };

  const handleViewDocument = async (doc: ProcessedDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    console.log("View document clicked:", doc);
    setLoadingDocId(doc._id);
    
    try {
      // Using the correct endpoint from Postman collection: /jobs/by-result/:id
      const response = await fetch(`${API_CONFIG.API_URL}/jobs/by-result/${doc._id}`, {
        headers: authUtils.getAuthHeaders()
      });
      
      console.log(`API response status for /jobs/by-result/${doc._id}:`, response.status);
      
      if (response.ok) {
        const jobData = await response.json();
        console.log("Job data response:", jobData);
        
        if (jobData && jobData._id) {
          // Found a job!
          console.log(`Found job ID ${jobData._id} for document ${doc._id}`);
          
          // Open the job detail page
          window.open(`/jobs/show/${jobData._id}`, "_blank");
          setLoadingDocId(null);
          return;
        } else {
          console.log("No job data found in response");
        }
      } else {
        console.error(`Error response from jobs/by-result/${doc._id}:`, response.status);
      }
      
      // If we get here, we weren't able to find a job
      alert("Could not find associated job for this document.");
      
    } catch (error) {
      console.error("Error finding job for document:", error);
      alert("Error finding job for this document.");
    } finally {
      setLoadingDocId(null);
    }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDocToDeleteId(id);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteDocument = useCallback(async () => {
    if (!docToDeleteId) return;

    try {
      const result = await documentOperations.deleteDocument(docToDeleteId, API_CONFIG.API_URL);
      if (result.success) {
        console.log("Document deleted successfully");
        setRefreshCounter(prev => prev + 1);
        open?.({ type: "success", message: "Document deleted successfully" });
      } else {
        console.error("Failed to delete document:", result.error?.message || "Unknown error");
        open?.({ type: "error", message: `Failed to delete document: ${result.error?.message || "Unknown error"}` });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      open?.({ type: "error", message: `Failed to delete document: ${error instanceof Error ? error.message : "Unknown error"}` });
    } finally {
      setIsConfirmModalOpen(false);
      setDocToDeleteId(null);
    }
  }, [docToDeleteId, open]);

  // Improved handleRefresh function - removed { force: true } parameter
  const handleRefresh = () => {
    console.log("Refresh button clicked in ProcessingList");
    // Call refetch without parameters to avoid type errors
    refetch();
    // Update counter to force re-render
    setRefreshCounter(prev => prev + 1);
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
  console.log("Prepared documents for table:", preparedData);

  return (
    <>
      <DocumentsTable<ProcessedDocument>
      key={`processing-list-${refreshCounter}`} // Key prop forces complete re-render when refreshCounter changes
      data={preparedData}
      onView={handleViewDocument}
      onDelete={handleDelete}
      formatDate={formatProcessingDate}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      error={error}
      title="DOC STORE"
      showStatus={false}
      titleRenderer={titleRenderer}
      loadingDocId={loadingDocId}
    />

    <ConfirmationModal
      opened={isConfirmModalOpen}
      onClose={() => setIsConfirmModalOpen(false)}
      onConfirm={confirmDeleteDocument}
      title="Confirm Deletion"
      message="Are you sure you want to delete this document? This action cannot be undone."
      confirmText="Delete"
    />
    </>
  );
}