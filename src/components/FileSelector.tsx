import React, { useState, useEffect, useCallback } from 'react';
import { 
  Modal, 
  Text, 
  Box, 
  Group, 
  Button, 
  Checkbox, 
  LoadingOverlay,
  Alert
} from '@mantine/core';
import { AlertCircle, Check } from 'lucide-react';
import { useAuth } from '@/utils/authUtils';

interface File {
  _id: string;
  title: string;
  createdAt: string;
}

interface FileSelectorProps {
  opened: boolean;
  onClose: () => void;
  onSelect: (fileIds: string[]) => void;
  capsuleId: string;
  existingFileIds?: string[];
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
  const [error, setError] = useState<string | null>(null);
  
  const { fetchWithAuth } = useAuth();
  
  // Define fetchFiles as a useCallback function to use it in the dependency array
  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Using the jobs-proxy endpoint since it would connect to a different API endpoint
      const response = await fetchWithAuth('/api/jobs-proxy/processing/documents');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter out files that are already in the capsule
      const availableFiles = data.filter((file: File) => 
        !existingFileIds.includes(file._id)
      );
      
      setFiles(availableFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, existingFileIds]);
  
  // Fetch available files when modal opens
  useEffect(() => {
    if (opened) {
      fetchFiles();
      // Reset selected files when modal opens
      setSelectedFileIds([]);
    }
  }, [opened, fetchFiles]);
  
  const handleFileSelect = (fileId: string) => {
    setSelectedFileIds(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };
  
  const handleSubmit = () => {
    if (selectedFileIds.length === 0) {
      setError("Please select at least one file");
      return;
    }
    
    onSelect(selectedFileIds);
    onClose();
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Select Files"
      size="lg"
      styles={{
        header: { backgroundColor: '#000000', color: '#ffffff', borderBottom: '1px solid #2b2b2b' },
        body: { backgroundColor: '#000000', color: '#ffffff' },
        close: { color: '#ffffff' },
      }}
    >
      <Box style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={isLoading} />
        
        {error && (
          <Alert 
            icon={<AlertCircle size={16} />}
            color="red"
            title="Error"
            mb="md"
          >
            {error}
          </Alert>
        )}
        
        {!isLoading && files.length === 0 && !error && (
          <Alert 
            color="blue"
            title="No files available"
            mb="md"
          >
            You don&apos;t have any processed files to add to this capsule. Process some files first and then add them to your capsule.
          </Alert>
        )}
        
        {files.length > 0 && (
          <Box mb="lg">
            <Text mb="xs">Select files to add to your capsule:</Text>
            
            <Box style={{ 
              border: '1px solid #2b2b2b',
              borderRadius: '4px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {files.map(file => (
                <Box 
                  key={file._id}
                  p="sm"
                  style={{ 
                    borderBottom: '1px solid #2b2b2b',
                    backgroundColor: selectedFileIds.includes(file._id) 
                      ? '#1a1a1a' 
                      : 'transparent',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleFileSelect(file._id)}
                >
                  <Group position="apart">
                    <Box>
                      <Text size="sm">{file.title}</Text>
                      <Text size="xs" c="dimmed">Created: {formatDate(file.createdAt)}</Text>
                    </Box>
                    <Checkbox 
                      checked={selectedFileIds.includes(file._id)}
                      onChange={() => {}}
                      styles={{
                        input: { cursor: 'pointer' }
                      }}
                    />
                  </Group>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        
        <Group position="right" mt="md">
          <Button 
            variant="outline"
            onClick={onClose}
            styles={{
              root: {
                borderColor: '#2b2b2b',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2b2b2b',
                },
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            leftSection={<Check size={16} />}
            onClick={handleSubmit}
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
            Add Selected Files
          </Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default FileSelector;