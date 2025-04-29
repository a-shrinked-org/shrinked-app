import React, { useState, useEffect, useCallback } from 'react';
import { 
  Modal, 
  Text, 
  Checkbox, 
  Button, 
  Group, 
  Stack, 
  TextInput,
  LoadingOverlay,
  Box,
  Flex,
  ScrollArea,
  Divider,
  Alert
} from '@mantine/core';
import { Search, AlertCircle } from 'lucide-react';
import { useAuth } from '@/utils/authUtils';
import { API_CONFIG } from '@/utils/authUtils';

interface File {
  _id: string;
  title: string;
  fileName?: string;
  createdAt: string;
  output?: {
    title?: string;
  }
}

interface FileSelectorProps {
  opened: boolean;
  onClose: () => void;
  // Update this line to pass full file objects
  onSelect: (fileIds: string[], fileData: File[]) => void;
  capsuleId: string;
  existingFileIds: string[];
}

const FileSelector: React.FC<FileSelectorProps> = ({ 
  opened, 
  onClose, 
  onSelect, 
  capsuleId,
  existingFileIds = []
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const { getAccessToken, ensureValidToken } = useAuth();
  
  const fetchFiles = useCallback(async () => {
    if (!opened) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const token = await ensureValidToken();
      if (!token) throw new Error('Authentication failed - unable to get valid token');
      
      let userId = '';
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        userId = tokenPayload._id || tokenPayload.id || tokenPayload.userId || '';
      } catch (e) {
        console.warn('Could not extract user ID from token');
      }
      
      if (!userId) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        const profileResponse = await fetch(`${API_CONFIG.API_URL}/users/profile`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          userId = profile._id || profile.id || '';
        }
      }
      
      if (!userId) {
        throw new Error('Could not determine current user ID');
      }
      
      console.log(`[FileSelector] Fetching documents for user: ${userId}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      const response = await fetch(`${API_CONFIG.API_URL}/processing/user/${userId}/documents`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`[FileSelector] Error fetching documents: ${response.status}`);
        throw new Error(`Failed to fetch files: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[FileSelector] Fetched documents:', data);
      
      const availableFiles = Array.isArray(data) 
        ? data.filter(file => !existingFileIds.includes(file._id))
        : [];
      
      setFiles(availableFiles);
    } catch (error) {
      console.error('[FileSelector] Error fetching files:', error);
      setError(error instanceof Error 
        ? error.name === 'AbortError' 
          ? 'Request timed out while fetching files. Please try again.'
          : error.message 
        : String(error));
    } finally {
      setIsLoading(false);
    }
  }, [opened, ensureValidToken, existingFileIds]);
  
  useEffect(() => {
    if (opened) {
      fetchFiles();
      setSelectedFileIds([]);
    }
  }, [opened, fetchFiles]);
  
  const handleToggleFile = (fileId: string) => {
    setSelectedFileIds(prev => 
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };
  
  const handleSelectAll = () => {
    if (selectedFileIds.length === filteredFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(filteredFiles.map(file => file._id));
    }
  };
  
  const handleConfirm = () => {
    // Get the full file objects for the selected IDs
    const selectedFiles = files.filter(file => selectedFileIds.includes(file._id));
    // Pass both the IDs and the full file data
    onSelect(selectedFileIds, selectedFiles);
    onClose();
  };
  
  const filteredFiles = files.filter(file => {
    const searchLower = searchQuery.toLowerCase();
    const title = file.title || file.output?.title || file.fileName || '';
    return title.toLowerCase().includes(searchLower);
  });
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600} size="lg">Select Files</Text>}
      size="lg"
    >
      <Box style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={isLoading} />
        
        <Stack gap="md">
          <TextInput
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<Search size={16} />}
          />
          
          {error && (
            <Alert color="red" title="Error" icon={<AlertCircle size={16} />}>
              {error}
            </Alert>
          )}
          
          {!isLoading && filteredFiles.length === 0 && !error && (
            <Alert color="blue" title="No Files Available">
              No files found {searchQuery ? 'matching your search' : 'available to add to this capsule'}.
            </Alert>
          )}
          
          {filteredFiles.length > 0 && (
            <>
              <Group justify="space-between">
                <Checkbox
                  label={`${selectedFileIds.length === filteredFiles.length ? 'Deselect' : 'Select'} All (${filteredFiles.length})`}
                  checked={selectedFileIds.length === filteredFiles.length && filteredFiles.length > 0}
                  onChange={handleSelectAll}
                />
                <Text size="sm" c="dimmed">{selectedFileIds.length} selected</Text>
              </Group>
              
              <Divider />
              
              <ScrollArea h={350} offsetScrollbars>
                <Stack gap="xs">
                  {filteredFiles.map((file) => (
                    <Box 
                      key={file._id}
                      style={{
                        padding: '10px',
                        borderRadius: '4px',
                        backgroundColor: selectedFileIds.includes(file._id) ? '#1a1a1a' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onClick={() => handleToggleFile(file._id)}
                    >
                      <Flex justify="space-between" gap="md">
                        <Checkbox
                          checked={selectedFileIds.includes(file._id)}
                          onChange={() => handleToggleFile(file._id)}
                          label={
                            <Text lineClamp={1}>
                              {file.title || file.output?.title || file.fileName || 'Untitled Document'}
                            </Text>
                          }
                          styles={{
                            label: {
                              cursor: 'pointer',
                              flex: 1,
                            }
                          }}
                        />
                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                          {formatDate(file.createdAt)}
                        </Text>
                      </Flex>
                    </Box>
                  ))}
                </Stack>
              </ScrollArea>
            </>
          )}
          
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleConfirm} 
              disabled={selectedFileIds.length === 0}
              styles={{
                root: {
                  backgroundColor: '#F5A623',
                  color: '#000000',
                  '&:hover': {
                    backgroundColor: '#E09612',
                  },
                },
              }}
            >
              Add Selected ({selectedFileIds.length})
            </Button>
          </Group>
        </Stack>
      </Box>
    </Modal>
  );
};

export default FileSelector;