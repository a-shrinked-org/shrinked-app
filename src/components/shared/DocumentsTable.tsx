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
  Stack,
  Card
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
  ChevronRight,
  Calendar,
  WifiOff,
  ServerCrash
} from 'lucide-react';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { toast } from 'react-toastify';

// ErrorFallback component for better error handling
function ErrorFallback({ 
  error, 
  onRetry 
}: { 
  error: any; 
  onRetry?: () => void 
}) {
  const isOffline = !navigator.onLine;
  const statusCode = 'statusCode' in error ? error.statusCode : undefined;
  const isServerError = statusCode && statusCode >= 500;
  
  const getErrorIcon = () => {
    if (isOffline) return <WifiOff size={36} color="#EAA944" />;
    if (isServerError) return <ServerCrash size={36} color="#EAA944" />;
    return <ServerCrash size={36} color="#EAA944" />;
  };

  const getErrorTitle = () => {
    if (isOffline) return "You're offline";
    if (isServerError) return "Server is unavailable";
    return "Connection error";
  };

  const getErrorMessage = () => {
    if (isOffline) {
      return "Check your internet connection and try again.";
    }
    
    if (isServerError) {
      return "Our server is currently unavailable. This is likely a temporary issue.";
    }
    
    return "There was a problem connecting to the server. This might be a temporary issue.";
  };

  return (
    <Box
      p="xl"
      style={{
        backgroundColor: '#0D0D0D',
        borderRadius: '8px',
        border: '1px solid #2b2b2b',
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto'
      }}
    >
      <Stack ta="center" gap="md">
        {getErrorIcon()}
        
        <Text 
          size="lg" 
          fw={600} 
          style={{ 
            fontFamily: GeistMono.style.fontFamily,
            marginTop: '16px'
          }}
        >
          {getErrorTitle()}
        </Text>
        
        <Text 
          ta="center"
          c="gray.4"
          style={{ 
            fontFamily: GeistSans.style.fontFamily || 'system-ui, sans-serif',
            fontSize: '14px',
            maxWidth: '380px'
          }}
        >
          {getErrorMessage()}
        </Text>
        
        {error.message && !isOffline && (
          <Text 
            size="sm" 
            c="gray.6" 
            ta="center"
            style={{ 
              fontFamily: GeistMono.style.fontFamily,
              fontSize: '12px',
              padding: '8px 12px',
              backgroundColor: '#000000',
              borderRadius: '4px',
              width: '100%'
            }}
          >
            {error.message}
          </Text>
        )}
        
        <Button
          onClick={onRetry}
          leftSection={<RefreshCw size={16} />}
          style={{
            backgroundColor: '#EAA944',
            color: '#000000',
            fontFamily: GeistMono.style.fontFamily,
            marginTop: '16px',
          }}
        >
          RETRY
        </Button>
      </Stack>
    </Box>
  );
}

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
  isDefault?: boolean;
  isComingSoon?: boolean;
}

export interface ExtraColumn<T extends ProcessedDocument> {
  header: string;
  accessor: keyof T | ((doc: T) => React.ReactNode);
  hideOnMobile?: boolean;
}

export type StatusIndicatorStyle = 'default' | 'whiteFilled' | 'whiteOutlined';

interface DocumentsTableProps<T extends ProcessedDocument> {
  data: T[];
  docToJobMapping?: Record<string, string>;
  onView?: (doc: T, e?: React.MouseEvent) => void;
  onSendEmail?: (id: string, email?: string, e?: React.MouseEvent) => Promise<void>;
  onDelete?: (id: string, e?: React.MouseEvent) => void | Promise<void>;
  onRowClick?: (doc: T) => void;
  formatDate: (dateString: string) => string;
  isLoading?: boolean;
  onRefresh?: () => any | Promise<any>;
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
  statusIndicatorStyle?: StatusIndicatorStyle;
  loadingDocId?: string | null;
  statusRenderer?: (doc: T) => React.ReactNode;
  comingSoon?: boolean;
  comingSoonConfig?: {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    buttonText?: string;
    buttonAction?: () => void;
  };
  buttonText?: string;
}

function DocumentsTable<T extends ProcessedDocument>({
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
  customGridTemplate,
  statusIndicatorStyle = 'default',
  loadingDocId = null,
  statusRenderer,
  comingSoon = false,
  comingSoonConfig = {
    icon: <Calendar size={48} color="#F5A623" />,
    title: "Coming Soon",
    description: "This feature is currently in development. Check back later for updates.",
    buttonText: "LEARN MORE",
    buttonAction: () => console.log('Coming soon feature clicked')
  },
  buttonText
}: DocumentsTableProps<T>) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  
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

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    
    if (onRefresh) {
      try {
        const refreshPromise = Promise.resolve(onRefresh());
        
        refreshPromise
          .catch(err => {
            // If offline, show toast notification
            if (!navigator.onLine) {
              toast.error("You're offline. Please check your connection and try again.", {
                position: "top-center",
                autoClose: 5000,
                theme: "dark"
              });
            } else if (err?.statusCode && err.statusCode >= 500) {
              toast.error("Server is temporarily unavailable. Please try again later.", {
                position: "top-center",
                autoClose: 5000,
                theme: "dark"
              });
            } else {
              toast.error("Connection error. Please try again.", {
                position: "top-center",
                autoClose: 5000,
                theme: "dark"
              });
            }
            console.error("Error during refresh:", err);
          })
          .finally(() => {
            setIsRefreshing(false);
            setRefreshCounter(prev => prev + 1);
          });
      } catch (error) {
        console.error("Error during refresh:", error);
        setIsRefreshing(false);
        
        // Show toast notification for error
        toast.error("An error occurred. Please try again.", {
          position: "top-center",
          autoClose: 5000,
          theme: "dark"
        });
      }
    } else {
      setTimeout(() => {
        setIsRefreshing(false);
        setRefreshCounter(prev => prev + 1);
      }, 500);
    }
  };

  const renderComingSoonState = () => (
    <Box style={{ 
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '16px'
    }}>
      <Card 
        p="xl" 
        withBorder 
        style={{ 
          textAlign: 'center',
          backgroundColor: '#0D0D0D',
          borderColor: '#2B2B2B',
          maxWidth: 600,
          margin: '0 auto',
          transition: 'all 0.3s ease',
          animation: isRefreshing ? 'pulse 0.5s ease' : 'none'
        }}
      >
        <style jsx global>{`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }
        `}</style>
        
        <Stack gap="xl" ta="center">
          <Box>
            {comingSoonConfig.icon}
          </Box>
          
          <Text fw={500} size="xl" style={{ color: '#ffffff' }}>
            {comingSoonConfig.title}
          </Text>
          
          <Text size="sm" c="#A1A1A1" style={{ maxWidth: 450, margin: '0 auto' }}>
            {comingSoonConfig.description}
          </Text>
          
          {comingSoonConfig.buttonText && comingSoonConfig.buttonAction && (
            <Button
              variant="filled"
              rightSection={<Plus size={16} />}
              onClick={comingSoonConfig.buttonAction}
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
              <Text size="xs">{comingSoonConfig.buttonText}</Text>
            </Button>
          )}
          
          <Text size="xs" c="#666666">
            This feature is currently in early access. More options coming soon.
            {refreshCounter > 0 && ` Last refreshed: ${new Date().toLocaleTimeString()}`}
          </Text>
        </Stack>
      </Card>
    </Box>
  );

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

  const getRowBackground = (id: string, status?: string) => {
    if (hoveredRow === id) {
      return "#111111";
    }
    if (status?.toLowerCase() === 'error') {
      return "rgba(244, 67, 54, 0.05)";
    }
    if (status?.toLowerCase() === 'completed') {
      return "rgba(24, 90, 47, 0.05)";
    }
    return "transparent";
  };

  const renderStatusIndicator = (doc: T) => {
    if (statusIndicatorStyle === 'default') {
      return (
        <Box style={{ 
          height: '12px', 
          width: '12px', 
          borderRadius: '50%', 
          backgroundColor: getRowIndicatorColor(doc.status),
          flexShrink: 0
        }} />
      );
    }
    
    if (statusIndicatorStyle === 'whiteFilled') {
      const isActive = doc.isDefault;
      return (
        <Box style={{ 
          height: '12px', 
          width: '12px', 
          borderRadius: '50%', 
          backgroundColor: isActive ? '#ffffff' : 'transparent',
          border: !isActive ? '1.5px solid #ffffff' : 'none',
          flexShrink: 0
        }} />
      );
    }
    
    if (statusIndicatorStyle === 'whiteOutlined') {
      return (
        <Box style={{ 
          height: '12px', 
          width: '12px', 
          borderRadius: '50%', 
          backgroundColor: 'transparent',
          border: '1.5px solid #ffffff',
          flexShrink: 0
        }} />
      );
    }
    
    return (
      <Box style={{ 
        height: '12px', 
        width: '12px', 
        borderRadius: '50%', 
        backgroundColor: getRowIndicatorColor(doc.status),
        flexShrink: 0
      }} />
    );
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
        return "#f4a522";
    }
  };

  const hasActions = !!(onView || onSendEmail || onDelete || actionsRenderer);

  const getGridTemplateColumns = () => {
    if (customGridTemplate) {
      return customGridTemplate;
    }
    
    const columnsCount = visibleColumns.length;
    const dateColumnWidth = '120px';
    const statusColumnWidth = '120px';
    const actionsColumnWidth = '100px';
    const typeColumnWidth = '100px';
    const logicColumnWidth = '140px';
    
    const isProcessingList = columnsCount === 0 && !showStatus;
    
    if (isProcessingList) {
      return hasActions 
        ? `minmax(300px, 1fr) ${showDate ? dateColumnWidth : ''} ${actionsColumnWidth}`
        : `minmax(300px, 1fr) ${showDate ? dateColumnWidth : ''}`;
    } else if (columnsCount === 0) {
      return hasActions 
        ? `minmax(300px, 1fr) ${showStatus ? statusColumnWidth : ''} ${showDate ? dateColumnWidth : ''} ${actionsColumnWidth}`
        : `minmax(300px, 1fr) ${showStatus ? statusColumnWidth : ''} ${showDate ? dateColumnWidth : ''}`;
    } else {
      let template = `minmax(250px, 1fr) `;
      
      if (showStatus) {
        template += `${statusColumnWidth} `;
      }
      
      if (showDate) {
        template += `${dateColumnWidth} `;
      }
      
      visibleColumns.forEach(col => {
        if (col.header.toLowerCase() === 'type') {
          template += `${typeColumnWidth} `;
        } else if (col.header.toLowerCase() === 'logic') {
          template += `${logicColumnWidth} `;
        } else {
          template += `120px `;
        }
      });
      
      if (hasActions) {
        template += actionsColumnWidth;
      }
      
      return template;
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
      <Box p="md" style={{ 
        backgroundColor: '#000000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px'
      }}>
        <ErrorFallback 
          error={error} 
          onRetry={() => {
            if (onRefresh) {
              handleRefreshClick();
            }
          }} 
        />
      </Box>
    );
  }
  
  const visibleColumns = extraColumns.filter(col => isMobile ? !col.hideOnMobile : true);
  
  const renderDesktopView = () => {
    return (
      <>
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
  
        {data && data.length > 0 ? (
          <Box style={{ overflow: 'auto', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
            {data.map((doc) => {
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
                    padding: isProcessingList ? '1rem 1.5rem' : '1.5rem',
                    borderBottom: '1px solid #2b2b2b',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.2s ease-in-out',
                    backgroundColor: getRowBackground(uniqueId, doc.status),
                    width: '100%'
                  }}
                >
                  <Box style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    minWidth: 0,
                    overflow: 'hidden'
                  }}>
                    {renderStatusIndicator(doc)}
                    
                    <Box style={{ overflow: 'hidden', minWidth: 0 }}>
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
                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                      {statusRenderer ? statusRenderer(doc) : (
                        <Text size="sm" c={getStatusTextColor(doc.status)}>
                          {doc.status ? doc.status.toUpperCase() : 'UNKNOWN'}
                        </Text>
                      )}
                    </Box>
                  )}
                  
                  {showDate && (
                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                      <Text size="sm">{formatDate(doc.createdAt)}</Text>
                    </Box>
                  )}
                  
                  {visibleColumns.map((col, index) => (
                    <Box key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      overflow: 'hidden'
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
                                loading={loadingDocId === doc._id}
                                disabled={loadingDocId === doc._id}
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
                  {statusIndicatorStyle === 'default' ? (
                    <Box style={{ 
                      width: '8px', 
                      borderRadius: '4px', 
                      backgroundColor: getRowIndicatorColor(doc.status),
                      alignSelf: 'stretch',
                      flexShrink: 0
                    }} />
                  ) : (
                    <Box style={{ 
                      width: '8px', 
                      borderRadius: '4px', 
                      backgroundColor: statusIndicatorStyle === 'whiteFilled' && doc.isDefault ? 
                        '#ffffff' : 'transparent',
                      border: (statusIndicatorStyle === 'whiteOutlined' || 
                              (statusIndicatorStyle === 'whiteFilled' && !doc.isDefault)) ? 
                        '1.5px solid #ffffff' : 'none',
                      alignSelf: 'stretch',
                      flexShrink: 0
                    }} />
                  )}
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Flex justify="space-between" align="flex-start">
                      <Box style={{ flex: 1, minWidth: 0 }}>
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
                          loading={loadingDocId === doc._id}
                          disabled={loadingDocId === doc._id}
                          style={{
                            color: '#ffffff',
                            marginLeft: '8px',
                            flexShrink: 0
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
                                  
                                  return (
                                    <Box style={{ 
                                      backgroundColor: '#000000', 
                                      color: '#ffffff', 
                                      height: '100%',
                                      width: '100%',
                                      maxWidth: '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      overflow: 'hidden'
                                    }}>
                                      <Flex justify="space-between" ta="center" p="sm" style={{ 
                                        borderBottom: '1px solid #2b2b2b',
                                        flexShrink: 0
                                      }}>
                                        <Text size="sm" fw={500} style={{ 
                                          fontFamily: GeistMono.style.fontFamily, 
                                          letterSpacing: '0.5px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          height: '100%'
                                        }}>{title}</Text>
                                        <Group>
                                          {(onRefresh || comingSoon) && (
                                            <Button
                                              variant="subtle"
                                              onClick={handleRefreshClick}
                                              leftSection={<RefreshCw size={14} />}
                                              loading={isLoading || isRefreshing}
                                              styles={{
                                                root: {
                                                  backgroundColor: 'transparent',
                                                  color: '#ffffff',
                                                  fontWeight: 500,
                                                  textTransform: 'uppercase',
                                                  fontFamily: GeistMono.style.fontFamily,
                                                  fontSize: '14px',
                                                  letterSpacing: '0.5px',
                                                  padding: '8px 16px',
                                                  border: 'none',
                                                  '&:hover': {
                                                    backgroundColor: '#1a1a1a',
                                                  },
                                                },
                                              }}
                                            >
                                              {!isMobile && <Text size="xs" fw={500}>REFRESH</Text>}
                                            </Button>
                                          )}
                                          
                                          {onAddNew && !comingSoon && (
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
                                              <Text size="xs">{buttonText || "ADD NEW JOB"}</Text>
                                            </Button>
                                          )}
                                        </Group>
                                      </Flex>
                                  
                                      {comingSoon ? (
                                        renderComingSoonState()
                                      ) : (
                                        <Box style={{ 
                                          width: '100%', 
                                          maxWidth: '100%', 
                                          overflowX: 'hidden',
                                          flex: 1
                                        }}>
                                          {!isMobile ? renderDesktopView() : renderMobileView()}
                                        </Box>
                                      )}
                                
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