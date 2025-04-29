// Let's enhance the modal with TextArea inputs instead of TextInput for better multi-line editing
// and improve the styling to match the Logic component's modal more closely

// First, import the Textarea component
import {
  Text,
  Box,
  Group,
  Button,
  LoadingOverlay,
  ActionIcon,
  Badge,
  Alert,
  Flex,
  Stack,
  Title,
  Textarea, // Add Textarea component
  Modal,
} from '@mantine/core';

// For the state variables and functions, keep them the same as in the previous code

// Then replace the CapsuleSettingsModal component with this improved version:

const CapsuleSettingsModal = () => {
  return (
    <Modal
      opened={isSettingsModalOpen}
      onClose={() => setIsSettingsModalOpen(false)}
      withCloseButton={false}
      title={null}
      centered
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
          maxWidth: '600px',
          borderRadius: '10px',
          border: '0.5px solid #2B2B2B',
          overflow: 'hidden',
        },
      }}
    >
      <Box>
        {/* Custom header with title and close button */}
        <Flex justify="space-between" align="center" mb="16px">
          <Text fw={500} size="md">
            Capsule Settings
          </Text>
          <ActionIcon 
            onClick={() => setIsSettingsModalOpen(false)} 
            variant="transparent" 
            color="#ffffff" 
            style={{ marginRight: '-10px', marginTop: '-10px' }}
          >
            <X size={18} />
          </ActionIcon>
        </Flex>
        
        {/* Subtitle with instructions similar to Logic modal */}
        <Text size="md" mb="lg" style={{ 
          color: '#A1A1A1', 
          fontSize: '14px',
          fontFamily: 'inherit'
        }}>
          Edit the prompts used for this capsule's content generation
        </Text>
        
        {/* Loading overlay */}
        <Box style={{ position: 'relative', minHeight: '300px' }}>
          <LoadingOverlay visible={isLoadingPrompts} overlayProps={{ blur: 2 }} />
          
          {/* Summary prompt */}
          <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
            Summary Prompt
          </Text>
          <Textarea
            placeholder="Enter prompt for summary generation"
            value={promptsData.summary}
            onChange={(e) => setPromptsData(prev => ({ ...prev, summary: e.target.value }))}
            mb="lg"
            minRows={4}
            autosize
            maxRows={8}
            styles={{
              input: {
                backgroundColor: '#000000',
                borderColor: '#2B2B2B',
                color: '#ffffff',
                borderWidth: '0.5px',
                padding: '12px 16px',
                fontFamily: 'inherit',
                fontSize: '14px',
                '&:focus': {
                  borderColor: '#F5A623',
                },
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
              }
            }}
          />
          
          {/* Extraction prompt */}
          <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
            Extraction Prompt
          </Text>
          <Textarea
            placeholder="Enter prompt for data extraction"
            value={promptsData.extraction}
            onChange={(e) => setPromptsData(prev => ({ ...prev, extraction: e.target.value }))}
            mb="lg"
            minRows={4}
            autosize
            maxRows={8}
            styles={{
              input: {
                backgroundColor: '#000000',
                borderColor: '#2B2B2B',
                color: '#ffffff',
                borderWidth: '0.5px',
                padding: '12px 16px',
                fontFamily: 'inherit',
                fontSize: '14px',
                '&:focus': {
                  borderColor: '#F5A623',
                },
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
              }
            }}
          />
          
          {/* Classification prompt */}
          <Text fw={500} size="sm" mb="xs" c="#a1a1a1">
            Classification Prompt
          </Text>
          <Textarea
            placeholder="Enter prompt for classification"
            value={promptsData.classification}
            onChange={(e) => setPromptsData(prev => ({ ...prev, classification: e.target.value }))}
            mb="lg"
            minRows={4}
            autosize
            maxRows={8}
            styles={{
              input: {
                backgroundColor: '#000000',
                borderColor: '#2B2B2B',
                color: '#ffffff',
                borderWidth: '0.5px',
                padding: '12px 16px',
                fontFamily: 'inherit',
                fontSize: '14px',
                '&:focus': {
                  borderColor: '#F5A623',
                },
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
              }
            }}
          />
          
          {/* Save status message */}
          {promptSaveStatus && (
            <Text 
              size="sm" 
              c={promptSaveStatus === 'Saved successfully' ? 'green' : 
                 promptSaveStatus === 'Saving...' ? 'orange' : 'red'} 
              mb="md"
            >
              {promptSaveStatus}
            </Text>
          )}
          
          {/* Save and Cancel Buttons */}
          <Group position="right" mt="xl">
            <Button
              variant="default"
              onClick={() => setIsSettingsModalOpen(false)}
              styles={{
                root: {
                  borderColor: '#2b2b2b',
                  color: '#ffffff',
                  height: '44px',
                  '&:hover': {
                    backgroundColor: '#2b2b2b',
                  },
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveCapsulePrompts}
              loading={isLoadingPrompts && promptSaveStatus === 'Saving...'}
              styles={{
                root: {
                  backgroundColor: '#F5A623',
                  color: '#000000',
                  height: '44px',
                  '&:hover': {
                    backgroundColor: '#E09612',
                  },
                },
              }}
            >
              Save
            </Button>
          </Group>
        </Box>
      </Box>
    </Modal>
  );
};

// Additionally, let's modify the API calls to use capsules-proxy instead of capsules-direct
// Update the fetchCapsulePrompts function:

const fetchCapsulePrompts = useCallback(async () => {
  if (!capsuleId) return;
  
  try {
    setIsLoadingPrompts(true);
    const response = await fetchWithAuth(`/api/capsules-proxy/${capsuleId}/prompts`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch prompts: ${response.status}`);
    }
    
    const data = await response.json();
    setPromptsData({
      summary: data.summary || '',
      extraction: data.extraction || '',
      classification: data.classification || ''
    });
  } catch (error) {
    console.error('[CapsuleView] Failed to fetch prompts:', error);
    setErrorMessage(formatErrorMessage(error));
    handleAuthError(error);
  } finally {
    setIsLoadingPrompts(false);
  }
}, [capsuleId, fetchWithAuth, handleAuthError]);

// And update the saveCapsulePrompts function:

const saveCapsulePrompts = useCallback(async () => {
  if (!capsuleId) return;
  
  try {
    setIsLoadingPrompts(true);
    setPromptSaveStatus('Saving...');
    
    const response = await fetchWithAuth(`/api/capsules-proxy/${capsuleId}/prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promptsData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save prompts: ${response.status}`);
    }
    
    setPromptSaveStatus('Saved successfully');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setPromptSaveStatus('');
    }, 3000);
    
    // After saving successfully, trigger regeneration
    const regenerateResponse = await fetchWithAuth(`/api/capsules-proxy/${capsuleId}/regenerate`, {
      method: 'GET',
    });
    
    if (!regenerateResponse.ok) {
      console.warn('[CapsuleView] Regeneration after saving prompts failed:', regenerateResponse.status);
    } else {
      // Start monitoring for the regeneration process
      setIsRegenerating(true);
      startStatusMonitoring();
      
      // Notify user
      notifications.show({
        title: 'Regenerating Capsule',
        message: 'Capsule is being regenerated with new prompts.',
        color: 'yellow',
      });
    }
    
  } catch (error) {
    console.error('[CapsuleView] Failed to save prompts:', error);
    setPromptSaveStatus('Failed to save');
    setErrorMessage(formatErrorMessage(error));
    handleAuthError(error);
  } finally {
    setIsLoadingPrompts(false);
  }
}, [capsuleId, fetchWithAuth, handleAuthError, promptsData, startStatusMonitoring]);