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
  X,
} from 'lucide-react';
import { authUtils, API_CONFIG } from "@/utils/authUtils";
import DocumentsTable, { ProcessedDocument } from '@/components/shared/DocumentsTable';
import { formatDate } from '@/utils/formatting';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans'; // Added GeistSans import

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
      jobsCount: 0,
      steps: 6,
      isDefault: false,
      isComingSoon: true,
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
      jobsCount: 0,
      steps: 6,
      isDefault: false,
      isComingSoon: true,
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
      isComingSoon: true,
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
        withCloseButton={false} // Remove the default close button
        title={null} // Remove default title
        centered
        styles={{
          header: { 
            display: 'none', // Hide default header completely
          },
          body: { 
            backgroundColor: '#000000', 
            color: '#ffffff',
            padding: '22px 30px', // Fixed: Removed semicolon
          },
          inner: {
            padding: 0,
          },
          content: {
            maxWidth: '520px',
            borderRadius: '10px', // 10px corner radius
            border: '0.5px solid #2B2B2B', // 0.5px border with #2B2B2B color
            overflow: 'hidden',
          },
        }}
      >
        <Box>
          {/* Custom header with properly aligned title and close button */}
          <Flex justify="space-between" align="center" mb="16px">
            <Text fw={500} size="md">
              Edit logic template
            </Text>
            <ActionIcon 
              onClick={() => setIsDetailsModalOpen(false)} 
              variant="transparent" 
              color="#ffffff" 
              style={{ marginRight: '-10px', marginTop: '-10px' }} // Fixed: Used camelCase
            >
              <X size={18} />
            </ActionIcon>
          </Flex>
      
          {/* Subtitle - Applied GeistSans */}
          <Text size="md" mb="lg" style={{ 
            color: '#A1A1A1', 
            fontSize: '14px',
            fontFamily: GeistSans.style.fontFamily 
          }}>
            Wrap text with &#123;&#123; &#125;&#125; to make part of the task editable, use [[]] to make a source reference.
          </Text>
      
          {/* Logic Title with Badge in Fake Input Field */}
          <Box 
            style={{ 
              padding: '12px 16px', 
              backgroundColor: '#000000', // Black background
              borderRadius: '6px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '0.5px solid #2B2B2B', // 0.5px outline
            }}
          >
            <Text fw={500} style={{ fontFamily: GeistMono.style.fontFamily, fontSize: '14px' }}>
              {selectedLogic?.title?.toUpperCase()}
            </Text>
            {selectedLogic?.isDefault && (
              <Badge color="blue" variant="filled" size="sm">Default</Badge>
            )}
            {selectedLogic?.isComingSoon && (
              <Badge color="gray" variant="filled" size="sm">Coming soon</Badge>
            )}
          </Box>
      
          {/* Instructions Section - using GeistSans */}
          <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
            Instructions
          </Text>
          <Box 
            p="md" 
            bg="#000000" // Black background
            style={{ 
              borderRadius: '6px', 
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
            <Text size="sm" style={{ 
              whiteSpace: 'pre-wrap', 
              fontSize: '14px',
              fontFamily: GeistSans.style.fontFamily 
            }}>
              {selectedLogic?.instructions}
            </Text>
          </Box>
      
          {/* Model Selection */}
          <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
            Model
          </Text>
          <Group grow mb="lg">
            {selectedLogic?.availableModels?.map((model, index) => {
              const isSonnet = model.toLowerCase().includes('sonnet');
              
              return (
                <Button 
                  key={index}
                  variant={isSonnet ? "filled" : "outline"}
                  onClick={() => setActiveTab(model.toLowerCase().replace(' ', '-'))}
                  styles={{
                    root: {
                      backgroundColor: isSonnet 
                        ? "#EAA944" 
                        : "#2B2B2B",
                      borderColor: "#2b2b2b",
                      color: isSonnet ? "#000000" : "#000000",
                      height: '44px', // 44px height
                      fontFamily: GeistMono.style.fontFamily,
                      fontSize: '14px',
                      fontWeight: 500,
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
                  color: "#A1A1A1",
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
                  color: "#A1A1A1",
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
                fontWeight: 500,
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