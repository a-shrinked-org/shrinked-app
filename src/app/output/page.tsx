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
    console.log("Processing documents:", documents.length);
    return documents.map((doc, index) => {
      // Generate an index-based ID if none exists
      if (!doc._id) {
        doc._id = `doc-${index}`;
        console.log(`Created ID for document: ${doc._id}`);
      }
      
      // If document has a jobId, add it to the mapping
      if (doc.jobId && doc._id) {
        console.log(`Document ${doc._id} already has jobId: ${doc.jobId}`);
        setDocToJobMapping(prev => {
          const newMapping = { ...prev };
          newMapping[doc._id] = doc.jobId;
          return newMapping;
        });
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

  // Batch fetch job IDs for all documents
  useEffect(() => {
    if (data?.data && data.data.length > 0) {
      fetchAllJobIdsForTitles();
    }
  }, [data?.data]);

  // Fetch job IDs for titles
  const fetchAllJobIdsForTitles = async () => {
    if (!data?.data || data.data.length === 0) return;
    
    try {
      console.log("Fetching job IDs for all document titles...");
      const documents = data.data;
      
      // Create batches of requests (5 at a time)
      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < documents.length; i += batchSize) {
        batches.push(documents.slice(i, i + batchSize));
      }
      
      // Process each batch
      for (const batch of batches) {
        await Promise.all(batch.map(async (doc) => {
          if (!doc.title) return;
          
          // Try to find a job with this title
          try {
            const response = await fetch(`${API_CONFIG.API_URL}/jobs?title=${encodeURIComponent(doc.title)}`, {
              headers: authUtils.getAuthHeaders()
            });
            
            if (response.ok) {
              const jobsData = await response.json();
              if (jobsData && jobsData.data && jobsData.data.length > 0) {
                // Found a job with this title
                const jobId = jobsData.data[0]._id;
                console.log(`Found job ID ${jobId} for document title: ${doc.title.substring(0, 20)}...`);
                
                // Update the mapping
                setDocToJobMapping(prev => {
                  const newMapping = { ...prev };
                  newMapping[doc._id] = jobId;
                  return newMapping;
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching jobs for title "${doc.title.substring(0, 20)}..."`, error);
          }
        }));
      }
      
      console.log("Finished fetching job IDs for all document titles");
    } catch (error) {
      console.error("Error in batch fetch job IDs:", error);
    }
  };

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
    
    console.log("View document clicked for:", doc.title?.substring(0, 30));
    
    // First check if we already have a jobId in our mapping
    let jobId = docToJobMapping[doc._id];
    console.log("Job ID from mapping:", jobId);
    
    // If no jobId in mapping, try to find it by title
    if (!jobId && doc.title) {
      try {
        // Show loading indicator
        setLoadingDocId(doc._id);
        
        console.log(`Searching for job with title: ${doc.title.substring(0, 30)}...`);
        
        // Try to find a job with this title
        const response = await fetch(`${API_CONFIG.API_URL}/jobs?title=${encodeURIComponent(doc.title)}`, {
          headers: authUtils.getAuthHeaders()
        });
        
        if (response.ok) {
          const jobsData = await response.json();
          console.log("Jobs response:", jobsData);
          
          if (jobsData && jobsData.data && jobsData.data.length > 0) {
            // Found a job with this title
            jobId = jobsData.data[0]._id;
            console.log(`Found job ID ${jobId} for document title`);
            
            // Update the mapping for future use
            if (jobId) {
              setDocToJobMapping(prev => {
                const newMapping = { ...prev };
                newMapping[doc._id] = jobId;
                return newMapping;
              });
            }
          } else {
            console.log("No jobs found with matching title");
          }
        } else {
          console.error("Failed to fetch jobs by title:", response.status);
        }
      } catch (error) {
        console.error("Error fetching job by title:", error);
      } finally {
        setLoadingDocId(null);
      }
    }
    
    // If we have a jobId, open the job detail page
    if (jobId) {
      console.log(`Opening job ${jobId} for document`);
      const url = `/jobs/show/${jobId}`;
      console.log("Opening URL:", url);
      window.open(url, "_blank");
    } else {
      // If no job ID found, inform the user
      console.error("No job ID found for document");
      alert("Could not find associated job for this document. The job may not exist or you may not have access to it.");
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
  console.log("Job mapping:", docToJobMapping);

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