// src/components/shared/DocumentsTable.tsx
"use client";

import React, { useState } from "react";
import { 
  Table, 
  Text, 
  Group, 
  ActionIcon, 
  Tooltip,
  Stack,
  Card,
  Title,
  Button,
  Alert,
  Modal,
  TextInput,
  LoadingOverlay
} from '@mantine/core';
import { 
  Eye, 
  Mail, 
  Trash,
  RefreshCw,
  AlertCircle,
  Send
} from 'lucide-react';

export interface ProcessedDocument {
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

interface DocumentsTableProps {
  data: ProcessedDocument[];
  docToJobMapping: Record<string, string>;
  onView: (doc: ProcessedDocument, e?: React.MouseEvent) => void;
  onSendEmail: (id: string, email?: string, e?: React.MouseEvent) => void;
  onDelete: (id: string, e?: React.MouseEvent) => void;
  formatDate: (dateString: string) => string;
  isLoading?: boolean;
  onRefresh?: () => void;
  error?: any;
  title?: string;
}

const DocumentsTable: React.FC<DocumentsTableProps> = ({ 
  data, 
  docToJobMapping, 
  onView, 
  onSendEmail, 
  onDelete,
  formatDate,
  isLoading = false,
  onRefresh,
  error,
  title = "Documents"
}) => {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleEmailClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveDocId(id);
    setEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!activeDocId) return;
    
    setSendingEmail(true);
    try {
      await onSendEmail(activeDocId, emailAddress);
      setEmailModalOpen(false);
      setEmailAddress("");
      setActiveDocId(null);
    } finally {
      setSendingEmail(false);
    }
  };

  const renderTable = () => {
    if (!data || data.length === 0) {
      return <Text>No documents found.</Text>;
    }

    return (
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
          {data.map((doc) => (
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
                      onClick={(e) => onView(doc, e)}
                    >
                      <Eye size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Send to Email">
                    <ActionIcon 
                      variant="light" 
                      color="indigo"
                      onClick={(e) => handleEmailClick(doc._id, e)}
                    >
                      <Mail size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <ActionIcon 
                      variant="light" 
                      color="red"
                      onClick={(e) => onDelete(doc._id, e)}
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
    );
  };

  return (
    <>
      <Stack p="md">
        <Group justify="space-between">
          <Title order={2}>{title}</Title>
          {onRefresh && (
            <Button 
              onClick={onRefresh} 
              leftSection={<RefreshCw size={16} />}
              loading={isLoading}
            >
              Refresh
            </Button>
          )}
        </Group>

        {error && (
          <Alert 
            icon={<AlertCircle size={16} />}
            title="Error" 
            color="red" 
            withCloseButton
          >
            {error.message || "Failed to load documents. Please try again."}
          </Alert>
        )}

        <Card withBorder>
          <div style={{ position: 'relative' }}>
            <LoadingOverlay visible={isLoading} />
            <Stack>
              {renderTable()}
            </Stack>
          </div>
        </Card>
      </Stack>

      {/* Email Modal */}
      <Modal
        opened={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Send Document to Email"
        centered
      >
        <Stack>
          <TextInput
            label="Email Address"
            placeholder="Enter email address"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            required
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              color="indigo" 
              onClick={handleSendEmail} 
              leftSection={<Send size={16} />}
              loading={sendingEmail}
              disabled={!emailAddress}
            >
              Send
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default DocumentsTable;