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
      url: identity?.id ? `${API_CONFIG.API_URL}/processing/user/${identity.id}/documents` : ""
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
  }, [identity, refetch]);

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
    <DocumentsTable<ProcessedDocument>
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
      // Email functionality is completely removed by not providing onSendEmail
    />
  );
}