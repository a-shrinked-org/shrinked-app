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

// Generate a mock ID for documents that don't have one
const generateMockId = (doc: any, index: number): string => {
  // Either use an existing _id or generate a mock one based on title or index
  if (doc._id) return doc._id;
  
  // Try to create a somewhat stable ID based on title if available
  if (doc.title) {
    const titleHash = doc.title.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');
    return `mock-${titleHash}-${index}`;
  }
  
  // Fallback to just index
  return `mock-doc-${index}`;
};

export default function ProcessingList() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const [docToJobMapping, setDocToJobMapping] = useState<Record<string, string>>({});
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [rawDocuments, setRawDocuments] = useState<any[]>([]);
  const [isDirectLoading, setIsDirectLoading] = useState(false);
  
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

  console.log("Original API response:", data);

  // Direct fetch function to debug the API response
  const directFetchDocuments = async () => {
    if (!identity?.id) return;
    
    setIsDirectLoading(true);
    try {
      console.log("Directly fetching documents for user:", identity.id);
      const response = await fetch(
        `${API_CONFIG.API_URL}/processing/user/${identity.id}/documents?fields=${requestedFields}`,
        { headers: authUtils.getAuthHeaders() }
      );
      
      console.log("Direct API response status:", response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log("Direct API response data:", responseData);
        
        // Store the raw documents for reference
        if (responseData && responseData.data && Array.isArray(responseData.data)) {
          setRawDocuments(responseData.data);
        } else if (Array.isArray(responseData)) {
          setRawDocuments(responseData);
        } else {
          console.error("Unexpected API response format:", responseData);
        }
      } else {
        console.error("Direct API fetch failed:", response.statusText);
      }
    } catch (error) {
      console.error("Error in direct fetch:", error);
    } finally {
      setIsDirectLoading(false);
    }
  };

  // Fetch documents directly when component mounts
  useEffect(() => {
    if (identity?.id) {
      directFetchDocuments();
    }
  }, [identity?.id]);

  // Process documents to ensure they have the required fields
  const processDocuments = (documents: any[] = []): ProcessedDocument[] => {
    console.log("Processing documents:", documents.length);
    
    return documents.map((doc, index) => {
      // Generate a stable ID for documents that don't have one
      const docId = generateMockId(doc, index);
      console.log(`Document ${index}: title="${doc.title?.substring(0, 20)}...", ID=${docId}, has _id=${!!doc._id}, has jobId=${!!doc.jobId}`);
      
      // If document has a jobId, add it to the mapping
      if (doc.jobId && docId) {
        console.log(`Document ${docId} already has jobId: ${doc.jobId}`);
        setDocToJobMapping(prev => {
          const newMapping = { ...prev };
          newMapping[docId] = doc.jobId;
          return newMapping;
        });
      }
      
      // Ensure the document has an _id
      const processedDoc: ProcessedDocument = {
        ...doc,
        _id: docId,
        createdAt: doc.createdAt || new Date().toISOString()
      };
      
      return processedDoc;
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

  // Prepare documents with consistent data for the table
  const prepareDocuments = (documents: any[] = []): ProcessedDocument[] => {
    const processed = processDocuments(documents).map(doc => ({
      ...doc,
      // Ensure each document has a proper title and description for two-line display
      title: doc.title || doc.output?.title || doc.fileName || 'Untitled Document',
      description: doc.description || doc.output?.description || 'No description available',
    }));
    
    console.log("Final prepared documents:", processed);
    return processed;
  };

  // Debug function to test direct API call
  const testDocumentApi = async (docId: string) => {
    try {
      console.log(`Testing document API for ID: ${docId}`);
      const response = await fetch(`${API_CONFIG.API_URL}/processing/${docId}/document`, {
        headers: authUtils.getAuthHeaders()
      });
      console.log(`Document API response status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Document API response:", data);
        return data;
      }
    } catch (error) {
      console.error("Error in test document API:", error);
    }
    return null;
  };

  // Debug function to test direct job by result API call
  const testJobByResultApi = async (docId: string) => {
    try {
      console.log(`Testing job by result API for ID: ${docId}`);
      const response = await fetch(`${API_CONFIG.API_URL}/jobs/by-result/${docId}`, {
        headers: authUtils.getAuthHeaders()
      });
      console.log(`Job by result API response status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Job by result API response:", data);
        return data;
      }
    } catch (error) {
      console.error("Error in test job by result API:", error);
    }
    return null;
  };

  const handleViewDocument = async (doc: ProcessedDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    console.log("View document clicked for:", doc);
    
    // Test the document API directly
    await testDocumentApi(doc._id);
    
    // Test the job by result API directly
    const jobData = await testJobByResultApi(doc._id);
    
    // First check if we already have a jobId either from the doc or our mapping
    let jobId: string | undefined = docToJobMapping[doc._id] || doc.jobId;
    console.log("Initial jobId found:", jobId);
    
    // If we don't have a jobId yet, use the one we just fetched
    if (!jobId && jobData && jobData._id) {
      jobId = jobData._id;
      setDocToJobMapping(prev => {
        const newMapping = { ...prev };
        newMapping[doc._id] = jobId as string;
        return newMapping;
      });
    }
    
    // If we have a jobId, open the job detail page
    if (jobId) {
      console.log(`Opening job ${jobId} for document ${doc._id}`);
      const url = `/jobs/show/${jobId}`;
      console.log("Opening URL:", url);
      window.open(url, "_blank");
    } else {
      // If we still couldn't get a jobId, inform the user
      console.error("No job ID found for document:", doc._id);
      alert("Could not find associated job for this document. Check console for details.");
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
    directFetchDocuments();
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

  // Use raw documents if available, otherwise fall back to data from useList
  const documentsToUse = rawDocuments.length > 0 
    ? rawDocuments 
    : (data?.data || []);
  
  console.log("Documents to use:", documentsToUse);
  const preparedData = prepareDocuments(documentsToUse);
  console.log("Current job mapping:", docToJobMapping);

  return (
    <DocumentsTable<ProcessedDocument>
      data={preparedData}
      docToJobMapping={docToJobMapping}
      onView={handleViewDocument}
      onSendEmail={handleSendEmail}
      onDelete={handleDelete}
      formatDate={formatProcessingDate}
      isLoading={isLoading || isDirectLoading}
      onRefresh={handleRefresh}
      error={error}
      title="DOC STORE"
      showStatus={false}
      loadingDocId={loadingDocId}
    />
  );
}