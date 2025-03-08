"use client";

import React, { useState } from "react";
import { 
  Text, 
  Group, 
  ActionIcon, 
  Tooltip,
  Box,
  Button,
  Alert,
  Modal,
  TextInput,
  Flex,
  Loader,
  Stack
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { 
  Eye, 
  Mail, 
  Trash,
  RefreshCw,
  AlertCircle,
  Send,
  Plus,
  ChevronRight
} from 'lucide-react';
import { GeistMono } from 'geist/font/mono';

export interface ProcessedDocument {
  _id: string;
  jobId?: string;
  title?: string;
  fileName?: string;
  createdAt: string;
  status?: string;
  type?: string;
  logic?: string;
  owner?: {
    name?: string;
    avatar?: string;
  };
  output?: {
    title?: string;
    description?: string;
  };
  description?: string;
}

export interface ExtraColumn<T extends ProcessedDocument> {
  header: string;
  accessor: keyof T | ((doc: T) => React.ReactNode);
  hideOnMobile?: boolean;
}

interface DocumentsTableProps<T extends ProcessedDocument> {
  data: T[];
  docToJobMapping?: Record<string, string>;
  onView?: (doc: T, e?: React.MouseEvent) => void;
  onSendEmail?: (id: string, email?: string, e?: React.MouseEvent) => Promise<void>;
  onDelete?: (id: string, e?: React.MouseEvent) => Promise<void>;
  onRowClick?: (doc: T) => void;
  formatDate: (dateString: string) => string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onAddNew?: () => void;
  error?: any;
  title?: string;
  extraColumns?: ExtraColumn<T>[];
  showStatus?: boolean;
  noDataMessage?: string;
}

// Fix the syntax by properly declaring the generic component
function DocumentsTable<T extends ProcessedDocument>(props: DocumentsTableProps<T>) {
  const { 
    data, 
    docToJobMapping = {},
    onView, 
    onSendEmail, 
    onDelete,
    onRowClick,
    formatDate,
    isLoading = false,
    onRefresh,
    onAddNew,
    error,
    title = "DOCUMENTS",
    extraColumns = [],
    showStatus = true,
    noDataMessage = "No documents found."
  } = props;

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  
  // Use useMediaQuery instead of MediaQuery component
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleEmailClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveDocId(id);
    setEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!activeDocId || !onSendEmail) return;
    
    setSendingEmail(true);
    try {
      await onSendEmail(activeDocId, emailAddress);
      setEmailModalOpen(false);
      setEmailAddress("");
      setActiveDocId(null);
    } finally {
      setSendingEmail(false);
    }
  };

  // Status color mapping
  const getStatusColor = (status?: string) => {
    if (!status) return "#ffffff";
    
    switch(status.toLowerCase()) {
      case 'completed':
        return "#185a2f";
      case 'error':
        return "#f44336";
      case 'processing':
        return "#a1a1a1";
      default:
        return "#ffffff";
    }
  };

  const getStatusTextColor = (status?: string) => {
    if (!status) return "#ffffff";
    
    switch(status.toLowerCase()) {
      case 'completed':
        return "#185a2f";
      case 'error':
        return "#f44336";
      case 'processing':
      default:
        return "#a1a1a1";
    }
  };

  const getRowIndicatorColor = (status?: string) => {
    if (!status) return "#ffffff";
    
    switch(status.toLowerCase()) {
      case 'completed':
        return "#185a2f";
      case 'error':
        return "#f44336";
      case 'processing':
        return "#ffffff";
      default:
        return "#f4a522"; // Orange for other cases
    }
  };

  const getRowBackground = (id: string, status?: string) => {
    if (hoveredRow === id) {
      return "#111111";
    }
    if (status?.toLowerCase() === 'error') {
      return "rgba(244, 67, 54, 0.05)"; // Very subtle red
    }
    if (status?.toLowerCase() === 'completed') {
      return "rgba(24, 90, 47, 0.05)"; // Very subtle green
    }
    return "transparent";
  };

  if (isLoading) {
    return (
      <Box p="xl" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', backgroundColor: '#000000' }}>
        <Loader color="#ffffff" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="md" style={{ backgroundColor: '#000000' }}>
        <Alert 
          icon={<AlertCircle size={16} />} 
          title="Error loading data" 
          color="red"
        >
          {error.message || "Failed to load data. Please try again."}
        </Alert>
      </Box>
    );
  }

  // Define visible columns for different screen sizes
  const visibleColumns = extraColumns.filter(col => isMobile ? !col.hideOnMobile : true);
  
  // Calculate grid template columns - fixing spacing issues
  const getGridTemplateColumns = () => {
    // First column (title) is 45%, status is 10%, date is 15%
    // Remaining columns equally share 20%, and actions get 10%
    const columnsCount = visibleColumns.length;
    
    if (columnsCount === 0) {
      return `45% ${showStatus ? '10% ' : ''}15% 30%`;
    }
    
    // Calculate equal width for extra columns
    const extraColWidth = 20 / columnsCount;
    
    return `45% ${showStatus ? '10% ' : ''}15% repeat(${columnsCount}, ${extraColWidth}%) 10%`;
  };

  const traceDataIds = () => {
    console.log("Document IDs in table:", data.map(doc => ({
      id: doc._id,
      title: doc.title
    })));
  };

  // Call this to debug
  traceDataIds();

  // Render either desktop or mobile view based on screen size
  return (
    <Box style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #2b2b2b' }}>
        <Text size="sm" fw={700} style={{ fontFamily: GeistMono.style.fontFamily, letterSpacing: '0.5px' }}>{title}</Text>
        <Group>
          {onRefresh && (
            <Button
              variant="outline"
              onClick={onRefresh}
              leftSection={<RefreshCw size={16} />}
              loading={isLoading}
              styles={{
                root: {
                  backgroundColor: 'transparent',
                  borderColor: '#2b2b2b',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#2b2b2b',
                  },
                },
              }}
            >
              {!isMobile && <Text>Refresh</Text>}
            </Button>
          )}
          {onAddNew && (
            <Button
              variant="outline"
              onClick={onAddNew}
              rightSection={<Plus size={16} />}
              styles={{
                root: {
                  backgroundColor: 'transparent',
                  borderColor: '#2b2b2b',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#2b2b2b',
                  },
                },
              }}
            >
              <Text size="xs">ADD NEW JOB</Text>
            </Button>
          )}
        </Group>
      </Flex>

      {!isMobile ? (
        // Desktop View
        <>
          {/* Table Header */}
          <Box 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: getGridTemplateColumns(),
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #2b2b2b',
              color: '#a1a1a1',
              fontSize: '12px',
            }}
          >
            <Box style={{ textAlign: 'left' }}>/title</Box>
            {showStatus && <Box style={{ textAlign: 'left' }}>/status</Box>}
            <Box style={{ textAlign: 'left' }}>/date</Box>
            {visibleColumns.map((col, index) => (
              <Box key={index} style={{ textAlign: 'left' }}>/{col.header.toLowerCase()}</Box>
            ))}
            <Box style={{ textAlign: 'left' }}>/actions</Box>
          </Box>

          {/* Table Content */}
          {data && data.length > 0 ? (
            <Box style={{ overflow: 'auto' }}>
              {data.map((doc) => {
                // Ensure each doc has a unique identifier
                const uniqueId = doc._id || `fallback-${Math.random()}`;
                
                return (
                  <Box
                    key={uniqueId}
                    onClick={() => onRowClick && onRowClick(doc)}
                    onMouseEnter={() => {
                      console.log(`Mouse entering row with ID: ${uniqueId}`);
                      setHoveredRow(uniqueId);
                    }}
                    onMouseLeave={() => {
                      console.log(`Mouse leaving row with ID: ${uniqueId}`);
                      setHoveredRow(null);
                    }}
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: getGridTemplateColumns(),
                      padding: '1.5rem',
                      borderBottom: '1px solid #2b2b2b',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background-color 0.2s ease-in-out',
                      backgroundColor: getRowBackground(uniqueId, doc.status),
                    }}
                  >
                    <Box style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <Box style={{ 
                        height: '12px', 
                        width: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: getRowIndicatorColor(doc.status),
                        flexShrink: 0
                      }} />
                      <Box style={{ overflow: 'hidden' }}>
                        <Text size="md" fw={500} style={{ 
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {doc.title || doc.output?.title || doc.fileName || 'Untitled Document'}
                        </Text>
                        <Text size="xs" c="#a1a1a1" style={{ 
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {doc.description || doc.output?.description || '...'}
                        </Text>
                      </Box>
                    </Box>
                    
                    {showStatus && (
                      <Box style={{ display: 'flex', alignItems: 'center', textAlign: 'left' }}>
                        <Text size="sm" c={getStatusTextColor(doc.status)}>
                          {doc.status ? doc.status.toUpperCase() : 'UNKNOWN'}
                        </Text>
                      </Box>
                    )}
                    
                    <Box style={{ display: 'flex', alignItems: 'center', textAlign: 'left' }}>
                      <Text size="sm">{formatDate(doc.createdAt)}</Text>
                    </Box>
                    
                    {visibleColumns.map((col, index) => (
                      <Box key={index} style={{ display: 'flex', alignItems: 'center', paddingRight: '8px', textAlign: 'left' }}>
                        {typeof col.accessor === 'function' ? (
                          col.accessor(doc)
                        ) : (
                          <Text size="sm" style={{ 
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {String(doc[col.accessor] || '')}
                          </Text>
                        )}
                      </Box>
                    ))}
                    
                    <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                      <Group>
                        {onView && (
                          <Tooltip label="View Document">
                            <ActionIcon 
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                onView(doc, e);
                              }}
                              style={{
                                color: '#ffffff',
                                '&:hover': { backgroundColor: '#2b2b2b' }
                              }}
                            >
                              <Eye size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {onSendEmail && (
                          <Tooltip label="Send to Email">
                            <ActionIcon 
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEmailClick(doc._id, e);
                              }}
                              style={{
                                color: '#ffffff',
                                '&:hover': { backgroundColor: '#2b2b2b' }
                              }}
                            >
                              <Mail size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {onDelete && (
                          <Tooltip label="Delete">
                            <ActionIcon 
                              variant="subtle"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(doc._id, e);
                              }}
                              style={{
                                '&:hover': { backgroundColor: '#2b2b2b' }
                              }}
                            >
                              <Trash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box p="xl" style={{ textAlign: 'center' }}>
              <Text c="#a1a1a1">{noDataMessage}</Text>
            </Box>
          )}
        </>
      ) : (
        // Mobile View
        <Box>
          {data && data.length > 0 ? (
            <Stack gap={0}>
              {data.map((doc) => {
                // Ensure each doc has a unique identifier
                const uniqueId = doc._id || `fallback-${Math.random()}`;
                
                return (
                  <Box
                    key={uniqueId}
                    onClick={() => onRowClick && onRowClick(doc)}
                    onMouseEnter={() => setHoveredRow(uniqueId)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{ 
                      padding: '1rem',
                      borderBottom: '1px solid #2b2b2b',
                      cursor: onRowClick ? 'pointer' : 'default',
                      backgroundColor: getRowBackground(uniqueId, doc.status),
                      transition: 'background-color 0.2s ease-in-out',
                    }}
                  >
                    <Flex align="stretch" gap="md">
                      <Box style={{ 
                        width: '8px', 
                        borderRadius: '4px', 
                        backgroundColor: getRowIndicatorColor(doc.status),
                        alignSelf: 'stretch',
                        flexShrink: 0
                      }} />
                      <Box style={{ flex: 1 }}>
                        <Flex justify="space-between" align="flex-start">
                          <Box style={{ flex: 1 }}>
                            <Text size="md" fw={500} style={{ 
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {doc.title || doc.output?.title || doc.fileName || 'Untitled Document'}
                            </Text>
                            <Text size="xs" c="#a1a1a1" mb="xs" style={{
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {doc.description || doc.output?.description || '...'}
                            </Text>
                          </Box>
                          <ActionIcon 
                            variant="subtle"
                            onClick={(e) => {
                              e.stopPropagation();
                              onView && onView(doc, e);
                            }}
                            style={{
                              color: '#ffffff',
                              marginLeft: '8px'
                            }}
                          >
                            <ChevronRight size={16} />
                          </ActionIcon>
                        </Flex>
                        
                        <Flex gap="md" wrap="wrap" mt="xs">
                          {showStatus && (
                            <Text size="xs" c={getStatusTextColor(doc.status)}>
                              {doc.status ? doc.status.toUpperCase() : 'UNKNOWN'}
                            </Text>
                          )}
                          
                          <Text size="xs" c="#a1a1a1">
                            {formatDate(doc.createdAt)}
                          </Text>
                          
                          {visibleColumns.map((col, index) => (
                            <Text key={index} size="xs" c="#a1a1a1">
                              {typeof col.accessor === 'function' 
                                ? React.isValidElement(col.accessor(doc)) 
                                  ? col.header 
                                  : String(col.accessor(doc) || '')
                                : String(doc[col.accessor] || '')}
                            </Text>
                          ))}
                        </Flex>
                        
                        <Flex justify="flex-start" mt="xs">
                          <Group>
                            {onSendEmail && (
                              <ActionIcon 
                                variant="subtle"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEmailClick(doc._id, e);
                                }}
                                style={{
                                  color: '#ffffff',
                                }}
                              >
                                <Mail size={14} />
                              </ActionIcon>
                            )}
                            {onDelete && (
                              <ActionIcon 
                                variant="subtle"
                                size="sm"
                                color="red"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(doc._id, e);
                                }}
                              >
                                <Trash size={14} />
                              </ActionIcon>
                            )}
                          </Group>
                        </Flex>
                      </Box>
                    </Flex>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Box p="xl" style={{ textAlign: 'center' }}>
              <Text c="#a1a1a1">{noDataMessage}</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Email Modal */}
      <Modal
        opened={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Send to Email"
        centered
        styles={{
          header: { backgroundColor: '#000000', color: '#ffffff' },
          body: { backgroundColor: '#000000', color: '#ffffff' },
          close: { color: '#ffffff' },
        }}
      >
        <Box>
          <TextInput
            label="Email Address"
            placeholder="Enter email address"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            required
            styles={{
              input: {
                backgroundColor: '#0d0d0d',
                borderColor: '#2b2b2b',
                color: '#ffffff',
              },
              label: {
                color: '#ffffff',
              },
            }}
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={() => setEmailModalOpen(false)}
              styles={{
                root: {
                  borderColor: '#2b2b2b',
                  color: '#ffffff',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              leftSection={<Send size={16} />}
              loading={sendingEmail}
              disabled={!emailAddress}
              styles={{
                root: {
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  '&:hover': {
                    backgroundColor: '#e0e0e0',
                  },
                },
              }}
            >
              Send
            </Button>
          </Group>
        </Box>
      </Modal>
    </Box>
  );
}

export default DocumentsTable;