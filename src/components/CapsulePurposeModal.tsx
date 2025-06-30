import React, { useState, useEffect } from 'react';
import {
  Text,
  Box,
  Group,
  Button,
  LoadingOverlay,
  ActionIcon,
  Flex,
  Modal,
  SimpleGrid,
  Card,
  Badge,
} from '@mantine/core';
import { X, Check } from 'lucide-react';

interface PurposeCard {
  id: string;
  name: string;
  description: string;
  prompt: string;
  section: string;
  isDefault?: boolean;
}

interface CapsulePurposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  summary: string;
  highlights: string;
  testSummary: string;
  onPurposeSelect: (card: PurposeCard) => void;
  activePurpose?: string;
  capsuleId: string;
}

const CapsulePurposeModal: React.FC<CapsulePurposeModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  summary,
  highlights,
  testSummary,
  onPurposeSelect,
  activePurpose,
  capsuleId
}) => {
  // Default cards using backend data
  const defaultCards: PurposeCard[] = [
    {
      id: 'summary',
      name: 'Summary',
      description: 'Generate a comprehensive summary of the provided documents',
      prompt: '',
      section: 'capsule.summary',
      isDefault: true
    },
    {
      id: 'highlights',
      name: 'Highlights',
      description: 'Extract key highlights and important points from documents',
      prompt: highlights || 'Extract key highlights and important points from documents',
      section: 'capsule.highlights',
      isDefault: true
    }
  ];

  // Prototype cards with frontend-stored prompts
  const prototypeCards: PurposeCard[] = [
    {
      id: 'rfp-response',
      name: 'Answer RFP documentation',
      description: 'Generate comprehensive responses to RFP requirements based on provided documentation',
      prompt: 'Analyze the provided RFP documentation and generate detailed, compliant responses that address all requirements. Structure the response professionally with clear sections for technical approach, methodology, timeline, and deliverables.',
      section: 'capsule.rfp-response'
    },
    {
      id: 'competitor-analysis',
      name: 'Conduct a competitor analysis',
      description: 'Perform detailed competitive analysis from provided market research and company data',
      prompt: 'Conduct a comprehensive competitor analysis based on the provided documents. Identify key competitors, analyze their strengths and weaknesses, market positioning, pricing strategies, and provide strategic recommendations.',
      section: 'capsule.competitor-analysis'
    },
    {
      id: 'communication-feedback',
      name: 'Provide feedback on communication effectiveness',
      description: 'Analyze communication materials and provide improvement recommendations',
      prompt: 'Review the provided communication materials and provide detailed feedback on effectiveness, clarity, tone, and audience engagement. Suggest specific improvements for better communication outcomes.',
      section: 'capsule.communication-feedback'
    },
    {
      id: 'linkedin-connection',
      name: 'Craft a LinkedIn connection request',
      description: 'Create personalized LinkedIn connection requests based on prospect research',
      prompt: 'Based on the provided prospect research and company information, craft personalized LinkedIn connection requests that are professional, relevant, and likely to be accepted. Include specific reasons for connecting.',
      section: 'capsule.linkedin-connection'
    },
    {
      id: 'prospect-email',
      name: 'Write a prospect email',
      description: 'Compose compelling prospect emails using research insights',
      prompt: 'Using the provided prospect and company research, write compelling outreach emails that are personalized, value-focused, and designed to generate positive responses. Include clear call-to-actions.',
      section: 'capsule.prospect-email'
    },
    {
      id: 'followup-templates',
      name: 'Prepare follow-up email templates for prospect',
      description: 'Create a series of follow-up email templates for prospect nurturing',
      prompt: 'Create a series of follow-up email templates based on the prospect research provided. Include templates for different scenarios: initial follow-up, value-add follow-up, and final attempt. Each should be personalized and professional.',
      section: 'capsule.followup-templates'
    }
  ];

  const allCards = [...defaultCards, ...prototypeCards];

  const handleCardSelect = async (card: PurposeCard) => {
    await onPurposeSelect(card);
    onClose(); // Close modal after selection
  };

  const isCardActive = (cardId: string) => {
    return activePurpose === cardId;
  };

  const isCardDisabled = (card: PurposeCard) => {
    // Make highlights passive for now
    return card.id === 'highlights';
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      withCloseButton={false}
      title={null}
      centered
      size="xl"
      styles={{
        body: { 
          backgroundColor: '#000000', 
          color: '#ffffff',
          padding: '22px 30px',
        },
        inner: {
          padding: 0,
        },
        content: {
          maxWidth: '900px',
          borderRadius: '10px',
          border: '0.5px solid #2B2B2B',
          overflow: 'hidden',
        },
      }}
    >
      <Box>
        <Flex justify="space-between" align="center" mb="16px">
          <Text fw={500} size="md">
            Capsule Purpose
          </Text>
          <ActionIcon 
            onClick={onClose} 
            variant="transparent" 
            color="#ffffff" 
            style={{ marginRight: '-10px', marginTop: '-10px' }}
          >
            <X size={18} />
          </ActionIcon>
        </Flex>
        
        <Text size="md" mb="lg" style={{ 
          color: '#A1A1A1', 
          fontSize: '14px',
          fontFamily: 'inherit'
        }}>
          Choose the purpose for your capsule to customize how content is generated
        </Text>
        
        <Box style={{ position: 'relative', minHeight: '400px' }}>
          <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
          
          <SimpleGrid cols={2} spacing="md" verticalSpacing="md">
            {allCards.map((card) => (
              <Card
                key={card.id}
                padding="lg"
                style={{
                  backgroundColor: isCardActive(card.id) ? '#1a1a1a' : '#0a0a0a',
                  border: isCardActive(card.id) ? '1px solid #F5A623' : '1px solid #2B2B2B',
                  borderRadius: '8px',
                  cursor: isCardDisabled(card) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  minHeight: '120px',
                  opacity: isCardDisabled(card) ? 0.5 : 1
                }}
                onClick={() => !isCardDisabled(card) && handleCardSelect(card)}
              >
                <Flex direction="column" h="100%">
                  <Flex justify="space-between" align="flex-start" mb="xs">
                    <Text fw={500} size="sm" style={{ color: '#ffffff', lineHeight: 1.3 }}>
                      {card.name}
                    </Text>
                    <Flex gap="xs" align="center">
                      {isCardActive(card.id) && (
                        <ActionIcon size="sm" style={{ color: '#F5A623' }}>
                          <Check size={16} />
                        </ActionIcon>
                      )}
                      {card.isDefault && (
                        <Badge 
                          size="xs" 
                          style={{ 
                            backgroundColor: '#2B2B2B', 
                            color: '#A1A1A1',
                            textTransform: 'uppercase',
                            fontSize: '10px'
                          }}
                        >
                          Default
                        </Badge>
                      )}
                      {isCardDisabled(card) && (
                        <Badge 
                          size="xs" 
                          style={{ 
                            backgroundColor: '#444', 
                            color: '#888',
                            textTransform: 'uppercase',
                            fontSize: '10px'
                          }}
                        >
                          Soon
                        </Badge>
                      )}
                    </Flex>
                  </Flex>
                  
                  <Text 
                    size="xs" 
                    style={{ 
                      color: '#A1A1A1', 
                      lineHeight: 1.4,
                      flex: 1
                    }}
                  >
                    {card.description}
                  </Text>
                </Flex>
              </Card>
            ))}
          </SimpleGrid>
        </Box>
      </Box>
    </Modal>
  );
};

export default CapsulePurposeModal;