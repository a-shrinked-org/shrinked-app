"use client";

import { useList, useGetIdentity, useNavigation } from "@refinedev/core";
import React, { useEffect } from "react";
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
// Replace Tabler icons with Lucide icons
import { 
  Eye, 
  Mail, 
  Trash,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
// Import centralized auth utilities
import { authUtils, API_CONFIG } from "@/utils/authUtils";

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
}

interface ProcessedDocument {
  _id: string;
  jobId?: string; // May not exist in actual data
  user?: string; // Instead of userId
  userId?: string; // Backup field
  fileName?: string;
  createdAt: string;
  output?: {
    title?: string;
  }
}

export default function ProcessingList() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const { show } = useNavigation();
  
  // Only fetch data when identity is available
  const { data, isLoading, refetch, error } = useList<ProcessedDocument>({
    resource: identity?.id ? `processing/user/${identity.id}/documents` : "",
    queryOptions: {
      enabled: !!identity?.id, // Only run the query when identity.id exists
    },
    pagination: {
      pageSize: 100,
    },
    meta: {
      headers: {
        // Use centralized token management
        'Authorization': `Bearer ${authUtils.getAccessToken() || identity?.token || ''}`
      }
    }
  });

  // Debug: Log the data when it changes
  useEffect(() => {
    if (data) {
      console.log("Processing documents response:", data);
    }
  }, [data]);

  // Log errors if they occur
  useEffect(() => {
    if (error) {
      console.error("Error fetching documents:", error);
      
      // Try to refresh token on auth errors
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

  // This effect will refetch data when identity is loaded
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
    // From the console log, it appears _id is the job ID
    window.open(`/jobs/show/${doc._id}`, '_blank');
  };

  const handleSendEmail = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log(`Send document ${id} to email`);
    // Implement email sending logic or show modal
    alert("Email functionality will be implemented here");
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log(`Delete document ${id}`);
    // Implement delete confirmation and logic
    if (confirm("Are you sure you want to delete this document?")) {
      // Call delete API here
      alert("Delete functionality will be implemented here");
    }
  };

  const handleRefresh = () => {
    console.log("Manually refreshing document list");
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
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.data.map((doc) => (
                  <Table.Tr key={doc._id}>
                    <Table.Td>
                      <Text fw={500}>
                        {doc.output?.title || doc.fileName || 'Untitled Document'}
                      </Text>
                    </Table.Td>
                    <Table.Td>{formatDate(doc.createdAt)}</Table.Td>
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