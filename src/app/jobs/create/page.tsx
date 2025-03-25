"use client";

import { useNavigation, useGetIdentity } from "@refinedev/core";
import { useForm, useFieldArray } from "react-hook-form";
import { 
  TextInput, 
  Button, 
  Stack, 
  Group, 
  Box, 
  Paper,
  Alert,
  Divider,
  Tabs,
  Text,
  ActionIcon,
  Card,
  Tooltip,
  rem
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { 
  ArrowLeft, 
  AlertCircle, 
  Link as LinkIcon, 
  Upload, 
  Plus, 
  Trash, 
  FileText,
  InfoCircle,
  ExternalLink 
} from 'lucide-react';
import { useAuth } from "@/utils/authUtils";
import { FileUpload } from '@/components/FileUpload';
import { GeistMono } from 'geist/font/mono';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
}

interface FileItem {
  type: 'link' | 'upload';
  url: string;
  filename?: string;
  size?: number;
}

interface JobCreateForm {
  jobName: string;
  scenario: string;
  lang: string;
  isPublic: boolean;
  createPage: boolean;
  files: FileItem[];
}

export default function JobCreate() {
  const { list } = useNavigation();
  const { data: identity } = useGetIdentity<Identity>();
  const { fetchWithAuth, handleAuthError } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const form = useForm<JobCreateForm>({
    defaultValues: {
      isPublic: false, // Default to Private
      createPage: false, // Default to No
      lang: 'en', // English only for now
      scenario: 'SINGLE_FILE_DEFAULT', // Default scenario
      files: [{ type: 'link', url: '' }]
    }
  });

  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    setValue, 
    control,
    watch,
    setError
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "files"
  });

  // Format file size for display
  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} bytes`;
    else if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    else if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    else return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Handle file upload success
  const handleFileUploaded = (fileUrl: string, index: number = 0) => {
    setValue(`files.${index}.url`, fileUrl);
    
    // Extract filename from URL
    const urlParts = fileUrl.split('/');
    const filenameWithParams = urlParts[urlParts.length - 1];
    const filename = filenameWithParams.split('?')[0]; // Remove query parameters if any
    setValue(`files.${index}.filename`, filename);
    
    showNotification({
      title: 'Success',
      message: 'File URL has been added',
      color: 'green',
    });
  };

  const onSubmit = handleSubmit(async (data: JobCreateForm) => {
    try {
      // Check if online before making request
      if (!navigator.onLine) {
        showNotification({
          title: 'Error',
          message: 'You appear to be offline. Please check your internet connection.',
          color: 'red',
          icon: <AlertCircle size={16} />
        });
        return;
      }
      
      // Check if we have at least one valid file URL
      const validFiles = data.files.filter(file => file.url.trim() !== '');
      if (validFiles.length === 0) {
        setError('root', { 
          type: 'manual', 
          message: 'Please provide at least one file link or upload a file' 
        });
        return;
      }

      // For API compatibility - if only one file, submit with link parameter
      // otherwise create a multi-file job
      let apiData;
      if (validFiles.length === 1) {
        apiData = {
          jobName: data.jobName,
          scenario: data.scenario,
          lang: data.lang,
          isPublic: data.isPublic,
          createPage: data.createPage,
          link: validFiles[0].url
        };
      } else {
        // Format for multi-file job - assuming backend support
        apiData = {
          jobName: data.jobName,
          scenario: data.scenario,
          lang: data.lang,
          isPublic: data.isPublic,
          createPage: data.createPage,
          files: validFiles.map(file => ({ url: file.url }))
        };
      }
      
      // Use centralized fetchWithAuth for API calls
      const response = await fetchWithAuth(`/api/jobs-proxy`, {
        method: 'POST',
        body: JSON.stringify(apiData)
      });

      // Handle Cloudflare errors
      if (response.status === 521 || response.status === 522 || response.status === 523) {
        throw new Error('The server is currently unreachable. Please try again later.');
      }

      if (!response.ok) {
        // Attempt to parse error message from response
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `Error: ${response.status}`;
        } catch {
          errorMessage = `Error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      showNotification({
        title: 'Success',
        message: 'Job created successfully',
        color: 'green'
      });

      list('jobs');
    } catch (error) {
      console.error("Create job error:", error);
      
      // Use centralized error handling
      handleAuthError(error);
      
      showNotification({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create job',
        color: 'red',
        icon: <AlertCircle size={16} />
      });
    }
  });

  return (
    <Box style={{ 
      backgroundColor: '#000000', 
      color: '#ffffff', 
      minHeight: '100vh', 
      width: '100%'
    }}>
      <Box 
        style={{ 
          backgroundColor: '#000000', 
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Group justify="space-between" p="sm" style={{ 
          borderBottom: '1px solid #2b2b2b',
          flexShrink: 0
        }}>
          <Text size="sm" fw={500} style={{ 
            fontFamily: GeistMono.style.fontFamily, 
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            height: '100%'
          }}>NEW JOB</Text>
          
          <Button 
            variant="subtle"
            onClick={() => list('jobs')}
            leftSection={<ArrowLeft size={14} />}
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
            <Text size="xs" fw={500}>BACK TO LIST</Text>
          </Button>
        </Group>

        <form onSubmit={onSubmit}>
          <Box style={{ 
            width: '100%', 
            maxWidth: '100%', 
            overflowX: 'hidden',
            flex: 1
          }}>
            {errors?.root?.message && (
              <Alert 
                icon={<AlertCircle size={16} />}
                color="red" 
                title="Error"
                style={{ 
                  backgroundColor: 'rgba(244, 67, 54, 0.1)', 
                  border: '1px solid rgba(244, 67, 54, 0.3)', 
                  margin: '1rem' 
                }}
              >
                {errors.root.message}
              </Alert>
            )}

            <Stack gap="md" p="md">
              <TextInput
                label="Job Name"
                placeholder="Enter job name"
                required
                error={errors?.jobName?.message}
                {...register('jobName', { required: 'Job name is required' })}
                styles={{
                  input: {
                    backgroundColor: '#0d0d0d',
                    borderColor: '#2b2b2b',
                    color: '#ffffff',
                  },
                  label: {
                    color: '#a1a1a1',
                  },
                }}
              />

              <Group align="center" style={{ marginBottom: '0.5rem' }}>
                <Text size="sm" style={{ color: '#a1a1a1' }}>Logic:</Text>
                <Text size="sm">Default</Text>
                <Tooltip 
                  label={
                    <Group align="center">
                      <Text size="xs">Find advanced logic configurations at the logic page</Text>
                      <ActionIcon 
                        variant="subtle" 
                        component="a" 
                        href="/logic" 
                        target="_blank"
                        size="xs"
                      >
                        <ExternalLink size={12} />
                      </ActionIcon>
                    </Group>
                  }
                  multiline
                  width={200}
                >
                  <InfoCircle size={16} style={{ color: '#a1a1a1', cursor: 'help' }} />
                </Tooltip>
              </Group>

              <Group align="center" style={{ marginBottom: '0.5rem' }}>
                <Text size="sm" style={{ color: '#a1a1a1' }}>Language:</Text>
                <Text size="sm">English</Text>
              </Group>

              <Divider 
                label="FILES" 
                labelPosition="center" 
                styles={{
                  label: {
                    fontFamily: GeistMono.style.fontFamily,
                    color: '#a1a1a1',
                    fontSize: '12px',
                  },
                  root: {
                    borderTop: '1px solid #2b2b2b',
                  },
                }}
              />

              <Card 
                p={0} 
                withBorder 
                style={{ 
                  backgroundColor: '#0D0D0D', 
                  borderColor: '#2B2B2B',
                  overflow: 'hidden'
                }}
              >
                {/* Header row - hide on mobile */}
                {!isMobile && (
                  <Box style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'minmax(50px, 1fr) minmax(300px, 3fr) 100px',
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #2b2b2b',
                    color: '#a1a1a1',
                    fontSize: '12px',
                  }}>
                    <Box style={{ textAlign: 'left' }}>/type</Box>
                    <Box style={{ textAlign: 'left' }}>/source</Box>
                    <Box style={{ textAlign: 'right' }}>/actions</Box>
                  </Box>
                )}

                {fields.map((field, index) => (
                  <Box
                    key={field.id}
                    style={{ 
                      display: isMobile ? 'flex' : 'grid',
                      gridTemplateColumns: 'minmax(50px, 1fr) minmax(300px, 3fr) 100px',
                      padding: '1rem 1.5rem',
                      borderBottom: index < fields.length - 1 ? '1px solid #2b2b2b' : 'none',
                      transition: 'background-color 0.2s ease-in-out',
                      backgroundColor: 'transparent',
                      flexDirection: isMobile ? 'column' : undefined,
                      gap: isMobile ? rem(10) : undefined,
                    }}
                    style={{
                      '&:hover': {
                        backgroundColor: '#111111',
                      }
                    }}
                  >
                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                      <Tabs
                        value={field.type}
                        onChange={(value) => setValue(`files.${index}.type`, value as 'link' | 'upload')}
                        styles={{
                          root: {
                            width: 'auto'
                          },
                          list: {
                            border: 'none',
                          },
                          tab: {
                            padding: '8px',
                            color: '#a1a1a1',
                            '&[data-active="true"]': {
                              color: '#F5A623',
                              borderColor: '#F5A623',
                            },
                          },
                        }}
                      >
                        <Tabs.List>
                          <Tabs.Tab value="link" leftSection={null}>
                            <LinkIcon size={16} />
                          </Tabs.Tab>
                          <Tabs.Tab value="upload" leftSection={null}>
                            <Upload size={16} />
                          </Tabs.Tab>
                        </Tabs.List>
                      </Tabs>
                    </Box>

                    <Box style={{ padding: isMobile ? 0 : '0 1rem', width: '100%' }}>
                      {watch(`files.${index}.type`) === 'link' ? (
                        <TextInput
                          placeholder="Enter file URL"
                          {...register(`files.${index}.url`)}
                          styles={{
                            input: {
                              backgroundColor: '#0d0d0d',
                              borderColor: '#2b2b2b',
                              color: '#ffffff',
                            },
                            wrapper: {
                              width: '100%'
                            }
                          }}
                        />
                      ) : (
                        <Box style={{ width: '100%' }}>
                          {!watch(`files.${index}.url`) ? (
                            <FileUpload 
                              onFileUploaded={(fileUrl) => handleFileUploaded(fileUrl, index)} 
                              maxSizeMB={100}
                            />
                          ) : (
                            <Group 
                              p="sm" 
                              style={{ 
                                border: '1px solid #2b2b2b', 
                                borderRadius: '4px', 
                                backgroundColor: '#0d0d0d'
                              }}
                              wrap="nowrap"
                            >
                              <FileText size={16} />
                              <Box style={{ flex: 1, overflow: 'hidden' }}>
                                <Text size="sm" truncate>
                                  {watch(`files.${index}.filename`) || 'Uploaded file'}
                                </Text>
                                {watch(`files.${index}.size`) && (
                                  <Text size="xs" c="dimmed">
                                    {formatFileSize(watch(`files.${index}.size`) as number)}
                                  </Text>
                                )}
                              </Box>
                              <Button 
                                size="xs" 
                                variant="light" 
                                color="gray"
                                onClick={() => {
                                  setValue(`files.${index}.url`, '');
                                  setValue(`files.${index}.filename`, '');
                                  setValue(`files.${index}.size`, undefined);
                                }}
                              >
                                Change
                              </Button>
                            </Group>
                          )}
                        </Box>
                      )}
                    </Box>

                    <Box style={{ 
                      display: 'flex', 
                      justifyContent: isMobile ? 'flex-start' : 'flex-end', 
                      alignItems: 'center',
                      marginTop: isMobile ? rem(10) : 0
                    }}>
                      <Group>
                        {fields.length > 1 && (
                          <Tooltip label="Remove">
                            <ActionIcon 
                              variant="subtle"
                              color="red"
                              onClick={() => remove(index)}
                            >
                              <Trash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Box>
                  </Box>
                ))}

                <Box p="md" style={{ borderTop: '1px solid #2b2b2b' }}>
                  <Button
                    leftSection={<Plus size={16} />}
                    variant="outline"
                    fullWidth
                    onClick={() => append({ type: 'link', url: '' })}
                    styles={{
                      root: {
                        borderColor: '#2b2b2b',
                        color: '#f5a623',
                        '&:hover': {
                          backgroundColor: 'rgba(245, 166, 35, 0.1)',
                        },
                      },
                    }}
                  >
                    Add File
                  </Button>
                </Box>
              </Card>

              <Group justify="flex-end" mt="md">
                <Button 
                  type="submit" 
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
                  <Text size="xs">Create Job</Text>
                </Button>
              </Group>
            </Stack>
          </Box>
        </form>
      </Box>
    </Box>
  );
}