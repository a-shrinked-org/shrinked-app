"use client";

import React, { useState } from "react";
import {
  Stack,
  Button,
  Group,
  Modal,
  Text,
  Badge,
  Box,
  TextInput,
  Flex,
  Tabs,
  LoadingOverlay,
} from "@mantine/core";
import {
  CircleDot,
  FileScan,
  Plus,
  Upload,
  Download,
  ExternalLink,
} from 'lucide-react';
import { authUtils } from "@/utils/authUtils";
import { IconWrapper } from "@/utils/ui-utils";
import DocumentsTable, { ProcessedDocument } from '@/components/shared/DocumentsTable';
import { formatDate } from '@/utils/formatting';
import { GeistMono } from 'geist/font/mono';

// Extended document interface to include Logic-specific fields
interface LogicDocument extends ProcessedDocument {
  jobsCount?: number;
  steps?: number;
  isDefault?: boolean;
  isComingSoon?: boolean;
  instructions?: string;
  availableModels?: string[];
}

export default function LogicList() {
  // State for modal management
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedLogic, setSelectedLogic] = useState<LogicDocument | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>("claude-3.7-sonnet");
  const [isLoading, setIsLoading] = useState(false);

  // Hardcoded data for logic templates
  const mockLogicData: LogicDocument[] = [
    {
      _id: "logic-1",
      title: "Conduct a competitor analysis",
      fileName: "competitor-analysis",
      description: "Designed to help manage sales processes and maximize customer engagement.",
      createdAt: new Date().toISOString(),
      status: "active",
      jobsCount: 3,
      steps: 3,
      isDefault: true,
      isComingSoon: false,
      instructions: `I want to craft a personalized message to a prospect. Please provide me with three options for a LinkedIn connection request, each with a maximum of 280 characters. Each option should be different from the other to provide some variety.

Use what you know about {{company}} to craft the perfect, tailored message for this person. The main goal is to make the message feel highly targeted to the recipient and as little sales like as possible.

Below, you'll find information on the recipient, their company, and guidelines to follow.

Info to use on the recipient and their company:
1. Info on recipient: {{Paste prospect info}}
2. Info on company: {{Paste company info}}`,
      availableModels: ["CLAUDE 3.7 SONNET", "GEMINI 2.0 FLASH"],
    },
    {
      _id: "logic-2",
      title: "Conduct a competitor analysis",
      fileName: "competitor-analysis-alt",
      description: "Designed to help manage sales processes and maximize customer engagement.",
      createdAt: new Date().toISOString(),
      status: "active",
      jobsCount: 0,
      steps: 0,
      isDefault: false,
      isComingSoon: true,
      instructions: `I want to craft a personalized message to a prospect.`,
      availableModels: ["CLAUDE 3.7 SONNET", "GEMINI 2.0 FLASH"],
    }
  ];

  // Custom columns for the Logic table
  const logicColumns = [
    {
      header: "Jobs",
      accessor: (doc: LogicDocument) => (
        <Text size="sm">{doc.jobsCount}</Text>
      ),
    },
    {
      header: "Steps",
      accessor: (doc: LogicDocument) => (
        <Text size="sm">{doc.steps}</Text>
      ),
    },
  ];

  // Open the details modal
  const handleLogicClick = (logic: LogicDocument) => {
    setSelectedLogic(logic);
    setIsDetailsModalOpen(true);
  };

  // Handle job creation
  const handleCreateJob = () => {
    if (selectedLogic?.isDefault) {
      // Navigate to jobs/create page
      window.location.href = "/jobs/create";
    }
  };

  // Custom row renderer with badge for default/coming soon status
  const renderTitleWithBadge = (doc: LogicDocument) => (
    <Flex align="center" gap="sm">
      <Text size="md" fw={500}>
        {doc.title}
      </Text>
      {doc.isDefault && (
        <Badge color="blue" variant="filled" size="sm">Default</Badge>
      )}
      {doc.isComingSoon && (
        <Badge color="gray" variant="filled" size="sm">Coming soon</Badge>
      )}
    </Flex>
  );

  // Custom actions for the logic items
  const renderActions = (doc: LogicDocument) => (
    <Group gap="xs">
      <Button
        variant="outline"
        size="xs"
        leftSection={<Upload size={14} />}
        disabled={doc.isComingSoon}
      >
        UPLOAD
      </Button>
      <Button
        variant="outline"
        size="xs"
        leftSection={<Download size={14} />}
        disabled={doc.isComingSoon}
      >
        EXPORT
      </Button>
    </Group>
  );

  return (
    <>
      <DocumentsTable<LogicDocument>
        data={mockLogicData}
        onRowClick={handleLogicClick}
        formatDate={formatDate}
        isLoading={isLoading}
        title="PROCESSING LOGIC"
        extraColumns={logicColumns}
        noDataMessage="No logic templates found."
        showStatus={false}
        onAddNew={() => {}}
        // Override title renderer
        titleRenderer={(doc) => renderTitleWithBadge(doc)}
        // Override actions renderer
        actionsRenderer={(doc) => renderActions(doc)}
      />
      
      {/* Display "ADDING/EDITING OF LOGIC SOON" subtitle */}
      <Text 
        size="xs" 
        color="dimmed" 
        style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '20px', 
          fontFamily: GeistMono.style.fontFamily 
        }}
      >
        ADDING/EDITING OF LOGIC SOON
      </Text>

      {/* Logic Details Modal */}
      <Modal
        opened={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={
          <Text fw={700} style={{ fontFamily: GeistMono.style.fontFamily }}>
            {selectedLogic?.isDefault ? "Edit logic template" : "Logic template"}
          </Text>
        }
        size="lg"
        styles={{
          header: { 
            backgroundColor: '#000000', 
            color: '#ffffff',
            borderBottom: '1px solid #2b2b2b'
          },
          body: { 
            backgroundColor: '#000000', 
            color: '#ffffff',
            padding: '20px'
          },
          close: { color: '#ffffff' }
        }}
      >
        <Box>
          <Text size="sm" mb="lg">
            Wrap text with &#123;&#123; &#125;&#125; to make part of the task editable, use [[]] to make a source reference.
          </Text>

          <Text fw={700} style={{ fontFamily: GeistMono.style.fontFamily }} mb="md">
            {selectedLogic?.title?.toUpperCase()}
          </Text>

          <Text fw={500} size="sm" mb="xs">
            Instructions
          </Text>
          <Box p="md" bg="#0d0d0d" style={{ borderRadius: '4px', marginBottom: '20px' }}>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {selectedLogic?.instructions}
            </Text>
          </Box>

          <Text fw={500} size="sm" mb="xs">
            Model
          </Text>
          <Group grow mb="lg">
            {selectedLogic?.availableModels?.map((model, index) => (
              <Button 
                key={index}
                variant={activeTab === model.toLowerCase().replace(' ', '-') ? "filled" : "outline"}
                onClick={() => setActiveTab(model.toLowerCase().replace(' ', '-'))}
                styles={{
                  root: {
                    backgroundColor: activeTab === model.toLowerCase().replace(' ', '-') ? "#F5A623" : "transparent",
                    borderColor: "#2b2b2b",
                    color: activeTab === model.toLowerCase().replace(' ', '-') ? "#000000" : "#ffffff",
                    '&:hover': {
                      backgroundColor: activeTab === model.toLowerCase().replace(' ', '-') ? "#E09612" : "#2b2b2b",
                    },
                  },
                }}
              >
                {model}
              </Button>
            ))}
          </Group>

          <Text fw={500} size="sm" mb="xs">
            Additional Steps
          </Text>
          <Group mb="xl">
            <Button
              variant="outline"
              size="xs"
              leftSection={<Upload size={14} />}
              styles={{
                root: {
                  borderColor: "#2b2b2b",
                  color: "#ffffff",
                },
              }}
            >
              UPLOAD
            </Button>
            <Button
              variant="outline"
              size="xs"
              leftSection={<Download size={14} />}
              styles={{
                root: {
                  borderColor: "#2b2b2b",
                  color: "#ffffff",
                },
              }}
            >
              EXPORT
            </Button>
          </Group>

          <Button
            fullWidth
            disabled={!selectedLogic?.isDefault}
            onClick={handleCreateJob}
            styles={{
              root: {
                backgroundColor: selectedLogic?.isDefault ? "#ffffff" : "#2b2b2b",
                color: selectedLogic?.isDefault ? "#000000" : "#5c5c5c",
                '&:hover': {
                  backgroundColor: selectedLogic?.isDefault ? "#e0e0e0" : "#2b2b2b",
                },
              },
            }}
          >
            RUN NEW JOB
          </Button>
        </Box>
      </Modal>
    </>
  );
}