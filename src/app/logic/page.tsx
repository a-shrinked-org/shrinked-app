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
  FileText,
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

  // Simple title renderer to show badges
  const renderTitleWithBadge = (doc: LogicDocument) => (
    <Flex direction="column" gap={4}>
      <Flex align="center">
        <Text size="md" fw={500} mr="xs">
          {doc.title}
        </Text>
        
        {doc.isDefault && (
          <Badge color="blue" variant="filled" size="sm">Default</Badge>
        )}
        {doc.isComingSoon && (
          <Badge color="gray" variant="filled" size="sm">Coming soon</Badge>
        )}
      </Flex>
      
      <Text size="xs" c="#a1a1a1">
        {doc.description}
      </Text>
    </Flex>
  );
  
  // Custom actions for the logic items
  const renderActions = (doc: LogicDocument) => (
    <Group gap="xs">
      {/* Edit icon - always disabled */}
      <ActionIcon
        variant="subtle"
        disabled={true}
        style={{
          color: '#555555',
          opacity: 0.5,
          cursor: 'default'
        }}
      >
        <Edit size={16} />
      </ActionIcon>
      
      {/* File text icon - active only for default logic */}
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
        <FileText size={16} />
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
        // Use the updated title renderer - simpler now!
        titleRenderer={(doc) => renderTitleWithBadge(doc)}
        // Keep the same action renderer
        actionsRenderer={(doc) => renderActions(doc)}
        // Don't show date column
        showDate={false}
        // Custom grid template
        customGridTemplate={getCustomGridTemplate()}
        // Set the new status indicator style
        statusIndicatorStyle="whiteFilled"
      />

      {/* Logic Details Modal */}
      <Modal
        opened={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        closeButtonProps={{
          style: {
            position: 'relative', // Change position to relative
            top: 'auto',
            right: 'auto',
            float: 'right', // Float to right
            marginTop: '16px', // Align with title
            color: '#ffffff'
          }
        }}
        title={null} // Remove default title, we'll add custom title
        centered
        styles={{
          header: { 
            backgroundColor: '#000000', 
            color: '#ffffff',
            borderBottom: 'none', // Remove separator
            padding: '16px 24px 0',
            display: 'flex',
            justifyContent: 'flex-end', // Move close button to right
          },
          body: { 
            backgroundColor: '#000000', 
            color: '#ffffff',
            padding: '0 24px 24px',
          },
          close: { 
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#1a1a1a',
            }
          },
          inner: {
            padding: 0,
          },
          content: {
            width: '480px',
            maxWidth: '480px',
          },
        }}
      >
        <Box>
          {/* Custom Title and Description - using GeistSans (default) */}
          <Text fw={700} size="lg" mb="8px">
            Edit logic template
          </Text>
          <Text size="md" mb="lg" style={{ color: '#ffffff', fontSize: '16px' }}>
            Wrap text with &#123;&#123; &#125;&#125; to make part of the task editable, use [[]] to make a source reference.
          </Text>
      
          {/* Logic Title with Badge in Fake Input Field */}
          <Box 
            style={{ 
              padding: '12px', 
              backgroundColor: '#000000', // Black background
              borderRadius: '4px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '0.5px solid #2B2B2B', // 0.5px outline
            }}
          >
            <Text fw={700} style={{ fontFamily: GeistMono.style.fontFamily, fontSize: '14px' }}>
              {selectedLogic?.title?.toUpperCase()}
            </Text>
            {selectedLogic?.isDefault && (
              <Badge color="blue" variant="filled" size="sm">Default</Badge>
            )}
            {selectedLogic?.isComingSoon && (
              <Badge color="gray" variant="filled" size="sm">Coming soon</Badge>
            )}
          </Box>
      
          {/* Instructions Section - using GeistSans (default) */}
          <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
            Instructions
          </Text>
          <Box 
            p="md" 
            bg="#000000" // Black background
            style={{ 
              borderRadius: '4px', 
              marginBottom: '20px',
              height: '180px', // Reduced height
              overflowY: 'auto',
              border: '0.5px solid #2B2B2B', // 0.5px outline
              // Custom scrollbar styling
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#000000',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#0C0C0C',
                borderRadius: '3px',
                border: '0.5px solid #2B2B2B',
              },
            }}
          >
            <Text size="sm" style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
              {selectedLogic?.instructions}
            </Text>
          </Box>
      
          {/* Model Selection */}
          <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
            Model
          </Text>
          <Group grow mb="lg">
            {selectedLogic?.availableModels?.map((model, index) => {
              const isActive = model.toLowerCase().includes('sonnet') ? 
                true : activeTab === model.toLowerCase().replace(' ', '-');
              
              return (
                <Button 
                  key={index}
                  variant={isActive ? "filled" : "outline"}
                  onClick={() => setActiveTab(model.toLowerCase().replace(' ', '-'))}
                  styles={{
                    root: {
                      backgroundColor: model.toLowerCase().includes('sonnet') 
                        ? "#EAA944" 
                        : "#2B2B2B",
                      borderColor: "#2b2b2b",
                      color: model.toLowerCase().includes('sonnet') ? "#000000" : "#777777",
                      height: '44px', // 44px height
                      fontFamily: GeistMono.style.fontFamily,
                      fontSize: '14px',
                      fontWeight: 700,
                    },
                  }}
                >
                  {model}
                </Button>
              );
            })}
          </Group>
      
          {/* Additional Steps */}
          <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
            Additional Steps
          </Text>
          <Group mb="xl">
            <Button
              variant="outline"
              size="compact-xs" // Smaller size
              styles={{
                root: {
                  height: '20px', // 20px height
                  padding: '0 8px',
                  borderColor: "#2b2b2b",
                  borderWidth: '1px',
                  color: "#ffffff",
                  fontSize: '12px',
                  fontWeight: 500,
                },
              }}
            >
              UPLOAD
            </Button>
            <Button
              variant="outline"
              size="compact-xs" // Smaller size
              styles={{
                root: {
                  height: '20px', // 20px height
                  padding: '0 8px',
                  borderColor: "#2b2b2b",
                  borderWidth: '1px',
                  color: "#ffffff",
                  fontSize: '12px',
                  fontWeight: 500,
                },
              }}
            >
              EXPORT
            </Button>
          </Group>
      
          {/* Run New Job Button */}
          <Button
            fullWidth
            disabled={!selectedLogic?.isDefault}
            onClick={handleNavigateToCreateJob}
            styles={{
              root: {
                backgroundColor: selectedLogic?.isDefault ? "#333333" : "#2b2b2b",
                color: selectedLogic?.isDefault ? "#ffffff" : "#5c5c5c",
                height: '44px', // 44px height
                '&:hover': {
                  backgroundColor: selectedLogic?.isDefault ? "#ffffff" : "#2b2b2b",
                  color: selectedLogic?.isDefault ? "#000000" : "#5c5c5c",
                },
                transition: 'all 0.2s ease',
                fontFamily: GeistMono.style.fontFamily,
                fontWeight: 700,
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