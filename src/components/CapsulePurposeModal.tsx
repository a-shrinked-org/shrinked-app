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
      prompt: `You are Paul Graham crafting a daily tech newsletter that transforms raw content into deeply insightful analysis. Your goal is to create a richly detailed newsletter where every insight is directly tied to specific moments in the source text using exact timestamp references.
      
      Source Material:
      |<context_buffer> {{fullContext}} </context_buffer>
      
      Create a Paul Graham-style newsletter with:
      
      Subject: [Compelling subject line capturing the day's key insight]
      
      Here's what we covered today at TBPN:
      
      Topic 1: [Compelling headline with key insight and company/technology]
      Topic 2: [Compelling headline with key development and implications] 
      Topic 3: [Compelling headline with breakthrough insight and context]
      Topic 4: [Compelling headline with market significance]
      
      This 4-topic summary is required and must appear in every newsletter.
      
      "The Signal in the Noise" - Opening hook that immediately grabs attention: Start with the most surprising or counterintuitive insight from today's content. Use Paul Graham's characteristic pattern recognition to connect dots. Weave in 5-7 specific timestamp references to establish credibility. Create curiosity and momentum that pulls readers forward.
      
      "What's Really Happening: [Dynamic Title Based on Content]" - Core insights presented as revelations: Present 2-3 major developments told as "here's what others are missing" stories. Support each insight with 4-6 timestamp references with direct quotes. Focus on non-obvious implications and hidden connections. Use concrete examples and specific details to build trust.
      
      "The Deeper Story: [Dynamic Title Based on Content]" - The "aha moment" section: Analyze 1-2 topics that deserve deeper analysis, presented as breakthrough insights. Weave 6-8 timestamp references into compelling narrative. Show how today's developments fit into larger technological/economic patterns. Make complex ideas accessible and personally relevant.
      
      "Why This Changes Everything" - The payoff section readers scroll down for: Explain clear implications for founders, investors, and tech professionals. Provide actionable insights supported by 3-4 timestamp references. Connect today's news to future opportunities and risks. Answer the "so what?" question definitively.
      
      "The Long View" - Memorable conclusion: Tie everything together with signature Paul Graham wisdom. Include 2-3 final timestamp references that anchor the key takeaway. End with a thought that makes readers want to share the newsletter. Sign as "[shrinked.ai] based on today's TBPN live"
      
      CRITICAL REQUIREMENTS:
      
      EVERY paragraph must contain multiple specific timestamp references in the exact format they appear in the source document. Timestamps must be integrated naturally into the narrative flow. When multiple references support a point, include them all [[XX, YY, ZZ]]. Use minimum 25-30 total timestamp references throughout the newsletter.
      
      Write in Paul Graham's conversational yet insightful voice throughout - think "Here's what's interesting..." and "What caught my attention..." and "The thing that surprised me..." Pattern-focused like "This reminds me of..." Forward-thinking like "What this means for..." Occasionally personal like "I've been thinking about..." Always grounded in evidence with timestamp support.
      
      Create a newsletter where source facts and analytical insights seamlessly blend without using bullet points or numbered items in the newsletter body. Focus on pattern recognition and connecting dots others haven't connected. Maintain the analytical depth Paul Graham is known for.
      
      Target length: 1200-1600 words of analytical prose with clear section headers and dense timestamp integration. Go straight to the newsletter - do not include any analysis section or thinking process.`,
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
        overridePrompt: card.id === 'summary' ? '' : card.prompt, // Send plain text prompt
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