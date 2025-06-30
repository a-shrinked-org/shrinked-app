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
  onContentReset: () => void; // New prop for content reset
  activePurpose?: string;
  capsuleId: string;
  fetchWithAuth: (url: string, options: any) => Promise<Response>;
  refetch: () => Promise<any>;
  notifications: any;
  formatErrorMessage: (error: any) => string;
}

const CapsulePurposeModal: React.FC<CapsulePurposeModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  summary,
  highlights,
  testSummary,
  onContentReset,
  activePurpose,
  capsuleId,
  fetchWithAuth,
  refetch,
  notifications,
  formatErrorMessage
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  // Default cards using backend data
  const defaultCards: PurposeCard[] = [
    {
      id: 'summary',
      name: 'Summary',
      description: 'Generate a comprehensive summary of the provided documents',
      prompt: summary,
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
      id: 'narrative-analyst',
      name: 'Narrative Analysis Summary',
      description: 'Transform raw content into compelling, accessible narratives that reveal hidden patterns and counterintuitive insights through masterful storytelling',
      prompt: `You are Malcolm Gladwell crafting a comprehensive summary that transforms raw content into compelling, accessible narratives. Your goal is to create a deeply engaging summary where every key point is anchored to specific moments in the source material using exact timestamp references.
      Source Material: |<context_buffer> {{fullContext}} </context_buffer>
      Create a Malcolm Gladwell-style summary with:
      Title: [Provocative title that captures the unexpected angle or counterintuitive truth]
      **"The Moment Everything Changed:" [Dynamic subtitle based on content]** Open with the single most pivotal moment or revelation from the content. Use Gladwell's signature approach of starting with a specific, almost mundane detail that reveals something profound. Weave in 4-5 specific timestamp references to ground the narrative. Create that "wait, what?" moment that hooks readers immediately and makes them reconsider what they thought they knew.
      **"The Surface Story:" [Dynamic subtitle based on content]** Present the immediate, surface-level takeaways as stories worth telling. Frame 2-3 key developments as fascinating case studies using Gladwell's "thin-slicing" approach. Support each story with 5-6 timestamp references woven naturally into the narrative. Focus on the human elements and surprising patterns that emerge from the data. Make readers feel like they're discovering hidden truths.
      **"The Hidden Patterns:" [Dynamic subtitle based on content]** Dive into what takes sustained attention to understand. Analyze 1-2 complex topics as interconnected systems using Gladwell's lens of examining context and environment. Integrate 6-8 timestamp references into compelling storytelling. Show how seemingly unrelated factors combine to create significant outcomes. Transform complexity into clarity through vivid analogies and real-world parallels.
      **"What This Really Means:" [Dynamic subtitle based on content]** Reveal the counterintuitive implications and unexpected advantages hidden in the content. Explain how apparent disadvantages might be strengths, or how conventional wisdom might be wrong. Provide clear, actionable insights supported by 4-5 timestamp references. Connect today's insights to broader patterns of human behavior and societal change. Answer the "why should I care?" question with unexpected angles that stick in memory.
      CRITICAL REQUIREMENTS:
      EVERY paragraph must contain multiple specific timestamp references in the exact format they appear in the source document. Timestamps must flow naturally within the storytelling. When multiple references support a narrative point, include them all [[XX, YY, ZZ]]. Use minimum 20-25 total timestamp references throughout the summary.
      Write in Malcolm Gladwell's distinctive voice throughout - think "Here's what's fascinating..." and "Consider this..." and "What if I told you..." Story-driven like "There's a moment when..." Pattern-seeking like "This is the same principle behind..." Accessible like "Think about it this way..." Always supported by specific evidence with timestamp anchoring.
      Create a summary where facts become stories and analysis becomes revelation, avoiding bullet points or numbered lists in the main body. Focus on making the complex simple and the obvious surprising. Transform information into insight through the power of narrative and unexpected connections.
      Target length: 1000-1400 words of narrative prose with clear section headers and natural timestamp integration. Go straight to the summary - do not include any preliminary analysis or meta-commentary.`,
      section: 'capsule.narrative-analyst'
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
    console.log('Modal: handleCardSelect called with:', {
      cardId: card.id,
      cardPrompt: card.prompt,
      currentActivePurpose: activePurpose,
      willSendOverridePrompt: card.id === 'summary' ? null : card.prompt
    });
    
    const purposeChanged = activePurpose !== card.id;
    setIsUpdating(true);
    
    try {
      const payload = {
        overridePrompt: card.id === 'summary' ? '' : card.prompt,
      };
      console.log('Modal: Sending payload:', payload);
      
      const response = await fetchWithAuth(`/api/capsule/${capsuleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error(`Failed to update purpose: ${response.status}`);
      
      console.log('Modal: Server response OK, refetching...');
      await refetch();
      
      // Reset content if purpose changed
      if (purposeChanged) {
        console.log('Modal: Purpose changed from', activePurpose, 'to', card.id, '- triggering content reset');
        onContentReset();
      }
      
      // Close modal and show success
      onClose();
      notifications.show({
        title: 'Purpose Updated',
        message: `Capsule purpose set to: ${card.name}`,
        color: 'green',
      });
      
    } catch (error) {
      console.error('Modal: Error in handleCardSelect:', error);
      notifications.show({
        title: 'Error',
        message: formatErrorMessage(error),
        color: 'red',
      });
    } finally {
      setIsUpdating(false);
    }
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
          <LoadingOverlay visible={isLoading || isUpdating} overlayProps={{ blur: 2 }} />
          
          <SimpleGrid cols={2} spacing="md" verticalSpacing="md">
            {allCards.map((card) => (
              <Card
                key={card.id}
                padding="lg"
                style={{
                  backgroundColor: isCardActive(card.id) ? '#1a1a1a' : '#0a0a0a',
                  border: isCardActive(card.id) ? '1px solid #F5A623' : '1px solid #2B2B2B',
                  borderRadius: '8px',
                  cursor: isCardDisabled(card) || isUpdating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  minHeight: '120px',
                  opacity: isCardDisabled(card) || isUpdating ? 0.5 : 1
                }}
                onClick={() => !isCardDisabled(card) && !isUpdating && handleCardSelect(card)}
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