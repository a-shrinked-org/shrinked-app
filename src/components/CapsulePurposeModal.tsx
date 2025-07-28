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

import { prototypeCards, PurposeCard } from "@/providers/data-provider/cards";

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
      name: 'Narrative Analysis Summary',
      description: 'Compelling fact-driven narratives that reveal hidden patterns and counterintuitive insights',
      prompt: summary,
      section: 'capsule.summary',
      isDefault: true
    }
  ];

  

  const allCards = [...defaultCards, ...prototypeCards];

  const handleCardSelect = async (card: PurposeCard) => {
    const purposeChanged = activePurpose !== card.id;
    setIsUpdating(true);
    
    try {
      const payload = {
        overridePrompt: card.isDefault ? '' : card.prompt,
      };
      console.log('Modal: Sending payload:', payload);
      
      const response = await fetchWithAuth(`/api/capsule/${capsuleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error(`Failed to update purpose: ${response.status}`);
      
      await refetch();
      
      // Reset content if purpose changed
      if (purposeChanged) {
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
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  minHeight: '120px',
                  opacity: isUpdating ? 0.5 : 1
                }}
                onClick={() => !isUpdating && handleCardSelect(card)}
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