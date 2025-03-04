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
import { IconDownload, IconEye, IconFileText } from '@tabler/icons-react';

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
}

export default function ProcessingList() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const { show } = useNavigation();
  
  const { data, isLoading, refetch } = useList<ProcessedDocument>({
    resource: "processing",
    filters: [
      {
        field: "userId",
        operator: "eq",
        value: identity?.id,
      },
    ],
    pagination: {
      pageSize: 100,
    },
    meta: {
      headers: identity?.token ? {
        'Authorization': `Bearer ${identity.token}`
      } : undefined
    }
  });

  // This effect will refetch data when identity is loaded
  useEffect(() => {
    if (identity?.id) {
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

  const handleViewDocument = (id: string) => {
    window.open(`/processing/${id}/document`, '_blank');
  };

  const handleDownloadDocument = (id: string) => {
    window.open(`/api/shrinked.ai/processing/${id}/document/download`, '_blank');
  };

  const handleViewPdf = (id: string) => {
    window.open(`/pdf/${id}/json`, '_blank');
  };

  if (identityLoading || isLoading) {
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
                      <Text fw={500}>{doc.fileName || 'Untitled Document'}</Text>
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
                            onClick={() => handleViewDocument(doc._id)}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Download">
                          <ActionIcon 
                            variant="light" 
                            color="green"
                            onClick={() => handleDownloadDocument(doc._id)}
                          >
                            <IconDownload size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="View PDF">
                          <ActionIcon 
                            variant="light" 
                            color="red"
                            onClick={() => handleViewPdf(doc._id)}
                          >
                            <IconFileText size={16} />
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