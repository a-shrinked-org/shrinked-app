"use client";

import { useList } from "@refinedev/core";
import React, { useState, useEffect } from "react";
import {
  Stack,
  Button,
  Group,
  Text,
  Badge,
  Box,
  TextInput,
  Flex,
  Tabs,
  LoadingOverlay,
  Modal,
  ActionIcon
} from "@mantine/core";
import {
  Edit,
  FileSearch,
  Upload,
  Download,
} from 'lucide-react';
import { authUtils, API_CONFIG } from "@/utils/authUtils";
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
  const [realJobsCount, setRealJobsCount] = useState(0);

  // Fetch real jobs count for the default logic
  useEffect(() => {
    const fetchJobsCount = async () => {
      try {
        // Check if authenticated
        if (!authUtils.isAuthenticated()) return;

        setIsLoading(true);
        // Get jobs to count how many use the default logic
        const response = await fetch(`${API_CONFIG.API_URL}/jobs`, {
          headers: authUtils.getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          // Count jobs with default logic
          setRealJobsCount(data.data?.length || 3); // Fallback to 3 if no data
        }
      } catch (error) {
        console.error("Error fetching jobs count:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobsCount();
  }, []);

  // Hardcoded data for logic templates
  const mockLogicData: LogicDocument[] = [
    {
      _id: "logic-1",
      title: "Conduct a competitor analysis",
      fileName: "competitor-analysis",
      description: "Designed to help manage sales processes and maximize customer engagement.",
      createdAt: new Date().toISOString(),
      status: "active",
      jobsCount: realJobsCount,
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
      status: "inactive",
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
        <Group gap="xs">
          <Button
            variant="outline"
            size="xs"
            styles={{
              root: {
                borderColor: "#2b2b2b",
                color: "#ffffff",
                textTransform: "uppercase",
                padding: "4px 8px",
                fontSize: "10px",
                fontWeight: "bold",
                '&:hover': {
                  backgroundColor: "#2b2b2b",
                },
              },
            }}
          >
            UPLOAD
          </Button>
          <Button
            variant="outline"
            size="xs"
            styles={{
              root: {
                borderColor: "#2b2b2b",
                color: "#ffffff",
                textTransform: "uppercase",
                padding: "4px 8px",
                fontSize: "10px",
                fontWeight: "bold",
                '&:hover': {
                  backgroundColor: "#2b2b2b",
                },
              },
            }}
          >
            EXPORT
          </Button>
        </Group>
      ),
    },
  ];

  // Open the details modal
  const handleLogicClick = (logic: LogicDocument) => {
    setSelectedLogic(logic);
    setIsDetailsModalOpen(true);
  };

  // Handle navigation to create job
  const handleNavigateToCreateJob = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = "/jobs/create";
  };

  // Custom row renderer with status indicator for default/coming soon status
  const renderTitleWithBadge = (doc: LogicDocument) => (
    <Flex direction="column" gap={4}>
      <Flex align="center">
        {/* Status indicator - filled white circle for default, outlined for others */}
        {doc.isDefault ? (
          <div style={{ 
            width: '16px', 
            height: '16px', 
            borderRadius: '50%', 
            backgroundColor: '#ffffff', 
            marginRight: '8px' 
          }}/>
        ) : (
          <div style={{ 
            width: '16px', 
            height: '16px', 
            borderRadius: '50%', 
            border: '1.5px solid #ffffff', 
            marginRight: '8px',
            backgroundColor: 'transparent'
          }}/>
        )}

        <Text size="md" fw={500} mr="xs">
          {doc.title}
        </Text>
        
        {/* Badge indicators */}
        {doc.isDefault && (
          <Badge color="blue" variant="filled" size="sm">Default</Badge>
        )}
        {doc.isComingSoon && (
          <Badge color="gray" variant="filled" size="sm">Coming soon</Badge>
        )}
      </Flex>
      
      <Text size="xs" c="#a1a1a1" ml={24}>
        {doc.description}
      </Text>
    </Flex>
  );

  // Custom actions for the logic items
  const renderActions = (doc: LogicDocument) => (
    <Group gap="xs">
      {/* Edit action - active only for default logic */}
      <ActionIcon
        variant="subtle"
        onClick={(e) => {
          e.stopPropagation();
          if (doc.isDefault) {
            window.location.href = "/jobs/create";
          }
        }}
        disabled={!doc.isDefault}
        style={{
          color: doc.isDefault ? '#ffffff' : '#555555',
          opacity: doc.isDefault ? 1 : 0.5,
          cursor: doc.isDefault ? 'pointer' : 'default'
        }}
      >
        <Edit size={16} />
      </ActionIcon>
      
      {/* Scan document action - always disabled for now */}
      <ActionIcon
        variant="subtle"
        disabled={true}
        style={{
          color: '#555555',
          opacity: 0.5,
          cursor: 'default'
        }}
      >
        <FileSearch size={16} />
      </ActionIcon>
    </Group>
  );

  // Grid template columns for logic table
  const getCustomGridTemplate = () => {
    return "65% 10% 10% 15%"; // title, jobs, steps, actions
  };

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
        // Override title renderer
        titleRenderer={(doc) => renderTitleWithBadge(doc)}
        // Override actions renderer
        actionsRenderer={(doc) => renderActions(doc)}
        // Don't show date column
        showDate={false}
        // Custom grid template
        customGridTemplate={getCustomGridTemplate()}
      />

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