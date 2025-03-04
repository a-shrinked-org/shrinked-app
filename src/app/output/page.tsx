"use client";

import { useList, useGetIdentity, useNavigation } from "@refinedev/core";
import React, { useState, useEffect } from "react";
import { 
  Card, 
  Group, 
  Title, 
  Stack,
  Button,
  Text,
  Divider,
  LoadingOverlay,
  Table,
  Badge,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import { 
  IconDownload, 
  IconEye, 
  IconFileText, 
  IconMail, 
  IconTrash 
} from '@tabler/icons-react';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
}

interface ProcessedDocument {
  _id: string;
  jobId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  status: string;
  title?: string; // Optional title field
}

export default function ProcessingList() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const { show } = useNavigation();
  
  // Only fetch data when identity is available
  const { data, isLoading, refetch } = useList<ProcessedDocument>({
    resource: identity?.id ? `processing/user/${identity.id}/documents` : "",
    queryOptions: {
      enabled: !!identity?.id, // Only run the query when identity.id exists
    },
    pagination: {
      pageSize: 100,
    },
    meta: {
      headers: identity?.token ? {
        'Authorization': `Bearer ${identity.token}`
      } : undefined
    }
  });

  // Debug: Log the data when it changes
  useEffect(() => {
    if (data) {
      console.log("Processing documents response:", data);
    }
  }, [data]);

  // This effect will refetch data when identity is loaded
  useEffect(() => {
    if (identity?.id) {
      console.log("Identity loaded, refetching data:", identity);
      refetch();
    }
  }, [identity, refetch]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'green';
      case 'in_progress':
      case 'processing':
        return 'blue';
      case 'failed':
      case 'error':
        return 'red';
      case 'pending':
      case 'queued':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const handleViewDocument = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.open(`/processing/${id}/document`, '_blank');
  };

  const handleDownloadDocument = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.open(`/api/shrinked.ai/processing/${id}/document/download`, '_blank');
  };

  const handleViewPdf = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.open(`/pdf/${id}/json`, '_blank');
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
        <Text>Authentication required</Text>
      </Stack>
    );
  }

  return (
    <Stack p="md">
      <Group justify="space-between">
        <Title order={2}>Processed Documents</Title>
        <Button onClick={() => refetch()}>Refresh</Button>
      </Group>

      <Card withBorder>
        <Stack>
          {!data?.data.length ? (
            <Text>No processed documents found.</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>File Name</Table.Th>
                  <Table.Th>Size</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.data.map((doc) => (
                  <Table.Tr key={doc._id}>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text fw={500}>{doc.title || doc.fileName || 'Untitled Document'}</Text>
                        <Text size="xs" color="dimmed">
                          {formatDateTime(doc.createdAt)}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>{formatFileSize(doc.size)}</Table.Td>
                    <Table.Td>{doc.mimeType || 'Unknown'}</Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(doc.status)}>
                        {doc.status || 'Unknown'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatDateTime(doc.createdAt)}</Table.Td>
                    <Table.Td>
                      <Group>
                        <Tooltip label="View Document">
                          <ActionIcon 
                            variant="light" 
                            color="blue"
                            onClick={(e) => handleViewDocument(doc._id, e)}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Download">
                          <ActionIcon 
                            variant="light" 
                            color="green"
                            onClick={(e) => handleDownloadDocument(doc._id, e)}
                          >
                            <IconDownload size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="View PDF">
                          <ActionIcon 
                            variant="light" 
                            color="red"
                            onClick={(e) => handleViewPdf(doc._id, e)}
                          >
                            <IconFileText size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Send to Email">
                          <ActionIcon 
                            variant="light" 
                            color="indigo"
                            onClick={(e) => handleSendEmail(doc._id, e)}
                          >
                            <IconMail size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon 
                            variant="light" 
                            color="red"
                            onClick={(e) => handleDelete(doc._id, e)}
                          >
                            <IconTrash size={16} />
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