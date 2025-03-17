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
  titleRenderer?: (doc: T) => React.ReactNode;
  actionsRenderer?: (doc: T) => React.ReactNode;
  showDate?: boolean;
  customGridTemplate?: string;
}

// Changed from generic expression to function declaration
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
    showDate = true,
    noDataMessage = "No documents found.",
    titleRenderer,
    actionsRenderer,
    customGridTemplate
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

  // Determine if we have any actions
  const hasActions = !!(onView || onSendEmail || onDelete || actionsRenderer);

  // Calculate grid template columns with improved alignment
  const getGridTemplateColumns = () => {
    // If custom grid template is provided, use it
    if (customGridTemplate) {
      return customGridTemplate;
    }
    
    const columnsCount = visibleColumns.length;
    
    // Determine if we're in the processing list (fewer columns) or jobs list (more columns)
    const isProcessingList = columnsCount === 0 && !showStatus;
    
    if (isProcessingList) {
      // For processing list: title gets more space, date and actions get fixed widths
      return hasActions ? 
        `60% ${showDate ? '15% ' : ''}${hasActions ? '25%' : ''}` : 
        `70% ${showDate ? '30%' : ''}`;
    } else if (columnsCount === 0) {
      // For other views with just status: title gets space, status and date get fixed widths
      return hasActions 
        ? `50% ${showStatus ? '10% ' : ''}${showDate ? '15% ' : ''}25%` 
        : `60% ${showStatus ? '15% ' : ''}${showDate ? '25%' : ''}`;
    } else {
      // For job list with extra columns: more balanced approach
      // Title still gets priority, other columns are more evenly distributed
      const extraColWidth = Math.max(8, 25 / columnsCount); // Minimum 8% width
      
      return hasActions 
        ? `45% ${showStatus ? '10% ' : ''}${showDate ? '15% ' : ''}repeat(${columnsCount}, ${extraColWidth}%) 15%`
        : `50% ${showStatus ? '10% ' : ''}${showDate ? '15% ' : ''}repeat(${columnsCount}, ${extraColWidth}%)`;
    }
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

  const renderDesktopView = () => {
    return (
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
            width: '100%',
            maxWidth: '100%',
            overflowX: 'hidden'
          }}
        >
          <Box style={{ textAlign: 'left' }}>/title</Box>
          {showStatus && <Box style={{ textAlign: 'left' }}>/status</Box>}
          {showDate && <Box style={{ textAlign: 'left' }}>/date</Box>}
          {visibleColumns.map((col, index) => (
            <Box key={index} style={{ textAlign: 'left' }}>/{col.header.toLowerCase()}</Box>
          ))}
          {hasActions && <Box style={{ textAlign: 'left' }}>/actions</Box>}
        </Box>

        {/* Table Content */}
        {data && data.length > 0 ? (
          <Box style={{ overflow: 'auto', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
            {data.map((doc) => {
              // Ensure each doc has a unique identifier
              const uniqueId = doc._id || `fallback-${Math.random()}`;
              const isProcessingList = visibleColumns.length === 0 && !showStatus;
              
              return (
                <Box
                  key={uniqueId}
                  onClick={() => onRowClick && onRowClick(doc)}
                  onMouseEnter={() => setHoveredRow(uniqueId)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ 
                    display: 'grid',
                    gridTemplateColumns: getGridTemplateColumns(),
                    padding: isProcessingList ? '1rem 1.5rem' : '1.5rem', // Shorter rows for processing list
                    borderBottom: '1px solid #2b2b2b',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.2s ease-in-out',
                    backgroundColor: getRowBackground(uniqueId, doc.status),
                    width: '100%',
                    maxWidth: '100%'
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
                      {titleRenderer ? titleRenderer(doc) : (
                        <>
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
                            {doc.description || doc.output?.description || 'No description available'}
                          </Text>
                        </>
                      )}
                    </Box>
                  </Box>
                  
                  {showStatus && (
                    <Box style={{ display: 'flex', alignItems: 'center', textAlign: 'left' }}>
                      <Text size="sm" c={getStatusTextColor(doc.status)}>
                        {doc.status ? doc.status.toUpperCase() : 'UNKNOWN'}
                      </Text>
                    </Box>
                  )}
                  
                  {showDate && (
                    <Box style={{ display: 'flex', alignItems: 'center', textAlign: 'left' }}>
                      <Text size="sm">{formatDate(doc.createdAt)}</Text>
                    </Box>
                  )}
                  
                  {visibleColumns.map((col, index) => (
                    <Box key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      paddingRight: '8px', 
                      textAlign: 'left',
                      maxWidth: '100%' // Keep content within column
                    }}>
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
                  
                  {hasActions && (
                    <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                      {actionsRenderer ? actionsRenderer(doc) : (
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
                      )}
                    </Box>
                  )}
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
    );
  };

  const renderMobileView = () => (
    <Box>
      {data && data.length > 0 ? (
        <Stack gap={0}>
          {data.map((doc) => {
            // Ensure each doc has a unique identifier
            const uniqueId = doc._id || `fallback-${Math.random()}`;
            const isProcessingList = visibleColumns.length === 0 && !showStatus;
            
            return (
              <Box
                key={uniqueId}
                onClick={() => onRowClick && onRowClick(doc)}
                onMouseEnter={() => setHoveredRow(uniqueId)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{ 
                  padding: isProcessingList ? '0.75rem 1rem' : '1rem',
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
                        {titleRenderer ? titleRenderer(doc) : (
                          <>
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
                              {doc.description || doc.output?.description || 'No description available'}
                            </Text>
                          </>
                        )}
                      </Box>
                      {onRowClick && (
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
                      )}
                    </Flex>
                    
                    <Flex gap="md" wrap="wrap" mt="xs">
                      {showStatus && (
                        <Text size="xs" c={getStatusTextColor(doc.status)}>
                          {doc.status ? doc.status.toUpperCase() : 'UNKNOWN'}
                        </Text>
                      )}
                      
                      {showDate && (
                        <Text size="xs" c="#a1a1a1">
                          {formatDate(doc.createdAt)}
                        </Text>
                      )}
                      
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
                    
                    {(onSendEmail || onDelete || actionsRenderer) && (
                      <Flex justify="flex-start" mt="xs">
                        {actionsRenderer ? actionsRenderer(doc) : (
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
                        )}
                      </Flex>
                    )}
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
  );

  // Render the component
  return (
    <Box style={{ 
      backgroundColor: '#000000', 
      color: '#ffffff', 
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden'
    }}>
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
              variant="filled"
              onClick={onAddNew}
              rightSection={<Plus size={16} />}
              styles={{
                root: {
                  fontFamily: GeistMono.style.fontFamily,
                  fontSize: '14px',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '8px 16px',
                  backgroundColor: '#F5A623',
                  color: '#000000',
                  '&:hover': {
                    backgroundColor: '#E09612',
                  },
                },
              }}
            >
              <Text size="xs">ADD NEW JOB</Text>
            </Button>
          )}
        </Group>
      </Flex>

      {/* Render either desktop or mobile view based on screen size */}
      <Box style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
        {!isMobile ? renderDesktopView() : renderMobileView()}
      </Box>

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