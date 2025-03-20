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
      title: "Structured Conversation Protocol",
      fileName: "structured-conversation-protocol",
      description: "Transform raw conversation data into structured JSON with precise attribution and relationships.",
      createdAt: new Date().toISOString(),
      status: "active",
      jobsCount: realJobsCount,
      steps: 6,
      isDefault: true,
      isComingSoon: false,
      instructions: `I want to transform raw conversational data into structured JSON with precise attribution and relationships.
  
  ## Processing steps
  1. Extract multi-speaker dialogues with speaker identification and exact timestamps
  2. Segment conversations into semantic blocks based on topic transitions
  3. Generate standardized JSON with \`conversation_id\`, \`speaker\`, \`timestamp\`, and nested \`content\` fields
  4. Apply metadata tagging for topic classification, priority, and action items
  5. Create cross-references between related statements using \`references\` and \`connections\` arrays
  6. Output to standardized docStore format optimized for Claude-3-7-Sonnet analysis
  
  ## Input sources
  1. Raw conversational content: {{meeting_type}}
  2. Audio/video formats: {{file_format}}
  3. Speaker identification requirements: {{speaker_identification}}
  
  The resulting data structure should enable context-aware AI analysis with complete traceability to source statements, supporting both comprehensive research generation and targeted information retrieval.`,
      availableModels: ["CLAUDE 3.7 SONNET", "GEMINI 2.0 FLASH"],
    },
    {
      _id: "logic-2",
      title: "Timeline Analysis Protocol",
      fileName: "timeline-analysis-protocol",
      description: "Track how discussions on specific topics evolve across multiple conversations over time.",
      createdAt: new Date().toISOString(),
      status: "active",
      jobsCount: 2,
      steps: 6,
      isDefault: false,
      isComingSoon: false,
      instructions: `I want to track how discussions on specific topics evolve across multiple conversations over time.
  
  ## Processing steps
  1. Identify target topic across all conversations in the specified time range: {{target_topic}}
  2. Extract all related statements with complete speaker attribution and chronological metadata
  3. Organize content into a temporal sequence showing the evolution of understanding
  4. Detect opinion shifts, decision points, and concept development milestones
  5. Create contextual links between temporally distant but semantically related statements
  6. Generate progression visualization showing how the topic evolved from initial mention to current state
  
  ## Time range parameters
  1. Start date: {{start_date}}
  2. End date: {{end_date}}
  3. Conversation sources to include: {{conversation_sources}}
  
  The output should reveal how understanding, decisions, or approaches to the topic have developed over time, highlighting key turning points and the context that influenced changes.`,
      availableModels: ["CLAUDE 3.7 SONNET", "GEMINI 2.0 FLASH"],
    },
    {
      _id: "logic-3",
      title: "Multi-Source Merge Protocol",
      fileName: "multi-source-merge-protocol",
      description: "Combine related segments from multiple conversations to create a unified knowledge structure.",
      createdAt: new Date().toISOString(),
      status: "active",
      jobsCount: 1,
      steps: 6,
      isDefault: false,
      isComingSoon: false,
      instructions: `I want to combine related segments from multiple conversations to create a unified knowledge structure.
  
  ## Processing steps
  1. Extract conversation blocks from different sources that relate to a unified theme: {{unified_theme}}
  2. Preserve original context by including surrounding statements for proper interpretation
  3. Merge related segments into a coherent narrative while maintaining source attribution
  4. Create temporal and logical connections between statements from different conversations
  5. Generate cross-referenced JSON that maps relationships between all source materials
  6. Output consolidated knowledge structure with complete traceability to original contexts
  
  ## Merge parameters
  1. Conversation IDs to merge: {{conversation_ids}}
  2. Relationship threshold (0-1): {{relationship_threshold}}
  3. Context preservation level (1-3): {{context_preservation}}
  
  The result should present a comprehensive view of the topic that draws from all relevant discussions while maintaining perfect attribution to allow verification of any specific point.`,
      availableModels: ["CLAUDE 3.7 SONNET", "GEMINI 2.0 FLASH"],
    },
    {
      _id: "logic-4",
      title: "Topic-Centered Merge Protocol",
      fileName: "topic-centered-merge-protocol",
      description: "Extract and analyze all discussions related to a specific key topic across conversations.",
      createdAt: new Date().toISOString(),
      status: "active",
      jobsCount: 0,
      steps: 6,
      isDefault: false,
      isComingSoon: false,
      instructions: `I want to extract and analyze all discussions related to a specific key topic across conversations.
  
  ## Processing steps
  1. Extract all statements containing target keyword: {{target_keyword}} or semantic equivalents
  2. Include 1-2 statements before/after matches to preserve conversational context
  3. Organize extracted content into topic clusters showing different aspects or subtopics
  4. Map agreement/disagreement patterns between speakers on the key topic
  5. Generate comprehensive topic analysis showing all perspectives, decisions, and open questions
  6. Create visualization of how the topic connects to other important themes in the conversation corpus
  
  ## Topic parameters
  1. Primary topic or keyword: {{primary_topic}}
  2. Related subtopics (optional): {{related_subtopics}}
  3. Speaker focus (optional): {{speaker_focus}}
  
  The output should provide a complete view of everything discussed about the target topic across all conversations, showing how different perspectives relate and where consensus or disagreement exists.`,
      availableModels: ["CLAUDE 3.7 SONNET", "GEMINI 2.0 FLASH"],
    },
    {
      _id: "logic-5",
      title: "Decision Extraction Protocol",
      fileName: "decision-extraction-protocol",
      description: "Identify all key decisions, commitments, and action items across conversational data.",
      createdAt: new Date().toISOString(),
      status: "inactive",
      jobsCount: 0,
      steps: 6,
      isDefault: false,
      isComingSoon: true,
      instructions: `I want to identify all key decisions, commitments, and action items across conversational data.
  
  ## Processing steps
  1. Extract statements containing decision language, commitments, or assigned responsibilities
  2. Capture the decision context including contributing opinions and dissenting viewpoints
  3. Track follow-ups and implementation mentions in subsequent conversations
  4. Create accountability mapping showing ownership and status of action items
  5. Generate decision log with complete attribution and implementation tracking
  6. Output structured JSON optimized for integration with project management systems
  
  ## Extraction parameters
  1. Decision types to extract: {{decision_types}}
  2. Time period: {{time_period}}
  3. Project context: {{project_context}}
  
  The resulting structure will provide a comprehensive decision log with complete context, clear ownership assignment, and implementation status tracking for all commitments made across the analyzed conversations.`,
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

  // Handle job creation
  const handleCreateJob = () => {
    if (selectedLogic?.isDefault) {
      // Navigate to jobs/create page
      window.location.href = "/jobs/create";
    }
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