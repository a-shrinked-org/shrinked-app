"use client";

import { useList, useGetIdentity, useNavigation } from "@refinedev/core";
import React, { useEffect, useState } from "react";
import { 
  Card, 
  Group, 
  Title, 
  Stack,
  Button,
  Text,
  LoadingOverlay,
  Table,
  ActionIcon,
  Tooltip,
  Alert
} from '@mantine/core';
import { 
  Eye, 
  Mail, 
  Trash,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { authUtils, API_CONFIG } from "@/utils/authUtils";

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
}

interface ProcessedDocument {
  _id: string;
  jobId?: string;
  title?: string;
  fileName?: string;
  createdAt: string;
  status?: string;
  output?: {
    title?: string;
  }
}

export default function ProcessingList() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const { show } = useNavigation();
  const [docToJobMapping, setDocToJobMapping] = useState<Record<string, string>>({});
  
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
      // Add the fields parameter to the request
      url: identity?.id ? `${API_CONFIG.API_URL}/processing/user/${identity.id}/documents?fields=${requestedFields}` : ""
    }
  });

  // Effect to log data and pre-fetch job IDs for the documents
  useEffect(() => {
    if (data?.data && data.data.length > 0) {
      console.log("Processing documents response:", data);
      
      // For each document, fetch the parent job ID
      const fetchJobIdsForDocs = async () => {
        const mapping: Record<string, string> = {};
        
        // Process documents in small batches to avoid too many concurrent requests
        const batchSize = 5;
        const docBatches = [];
        
        for (let i = 0; i < data.data.length; i += batchSize) {
          docBatches.push(data.data.slice(i, i + batchSize));
        }
        
        for (const batch of docBatches) {
          // Create a batch of promises for parallel execution
          const promises = batch.map(async (doc) => {
            try {
              const response = await authUtils.fetchWithAuth(
                `${API_CONFIG.API_URL}/jobs/by-result/${doc._id}`
              );
              
              if (response.ok) {
                const jobData = await response.json();
                if (jobData._id) {
                  mapping[doc._id] = jobData._id;
                  console.log(`Mapped document ${doc._id} to job ${jobData._id}`);
                }
              }
            } catch (error) {
              console.error(`Error fetching job ID for document ${doc._id}:`, error);
            }
          });
          
          // Wait for this batch to complete before moving to the next
          await Promise.all(promises);
        }
        
        setDocToJobMapping(mapping);
      };
      
      fetchJobIdsForDocs();
    }
  }, [data]);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(date);
  };

  const handleViewDocument = (doc: ProcessedDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Use the job ID from our mapping if available, otherwise fall back to document ID
    const jobId = docToJobMapping[doc._id] || doc._id;
    window.open(`/jobs/show/${jobId}`, '_blank');
  };

  const handleSendEmail = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log(`Send document ${id} to email`);
    alert("Email functionality will be implemented here");
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log(`Delete document ${id}`);
    if (confirm("Are you sure you want to delete this document?")) {
      alert("Delete functionality will be implemented here");
    }
  };

  const handleRefresh = () => {
    console.log("Manually refreshing document list");
    refetch();
    // Clear the mapping to force re-fetching job IDs
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
    <Stack p="md">
      <Group justify="space-between">
        <Title order={2}>Doc Store</Title>
        <Button 
          onClick={handleRefresh} 
          leftSection={<RefreshCw size={16} />}
          loading={isLoading}
        >
          Refresh
        </Button>
      </Group>

      {error && (
        <Alert 
          icon={<AlertCircle size={16} />}
          title="Error" 
          color="red" 
          onClose={() => console.log("Error dismissed")}
          withCloseButton
        >
          {error.message || "Failed to load documents. Please try again."}
        </Alert>
      )}

      <Card withBorder>
        <Stack>
          {!data?.data.length ? (
            <Text>No documents found.</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Document Title</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.data.map((doc) => (
                  <Table.Tr key={doc._id}>
                    <Table.Td>
                      <Text fw={500}>
                        {doc.title || doc.output?.title || doc.fileName || 'Untitled Document'}
                      </Text>
                    </Table.Td>
                    <Table.Td>{formatDate(doc.createdAt)}</Table.Td>
                    <Table.Td>
                      <Text>{doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Unknown'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group>
                        <Tooltip label="View Document">
                          <ActionIcon 
                            variant="light" 
                            color="blue"
                            onClick={(e) => handleViewDocument(doc, e)}
                          >
                            <Eye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Send to Email">
                          <ActionIcon 
                            variant="light" 
                            color="indigo"
                            onClick={(e) => handleSendEmail(doc._id, e)}
                          >
                            <Mail size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon 
                            variant="light" 
                            color="red"
                            onClick={(e) => handleDelete(doc._id, e)}
                          >
                            <Trash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}