"use client";

import { useNavigation, useGetIdentity } from "@refinedev/core";
import { useForm, useFieldArray } from "react-hook-form";
import { 
  TextInput, 
  Select, 
  Button, 
  Stack, 
  Group, 
  Box, 
  Title,
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
  FileText 
} from 'lucide-react';
import { useAuth } from "@/utils/authUtils";
import { FileUpload } from '@/components/FileUpload';
import { useState } from 'react';
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

// Updated scenario options based on API documentation
const scenarioOptions = [
  { value: 'SINGLE_FILE_DEFAULT', label: 'Single File Default' },
  { value: 'SINGLE_FILE_PLATOGRAM_DOC', label: 'Single File with Document' },
];

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'uk', label: 'Ukrainian' },
];

export default function JobCreate() {
  const { list } = useNavigation();
  const { data: identity } = useGetIdentity<Identity>();
  const { fetchWithAuth, handleAuthError } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const form = useForm<JobCreateForm>({
    defaultValues: {
      isPublic: false, // Default to Private
      createPage: false, // Default to No
      lang: 'en',
      scenario: 'SINGLE_FILE_DEFAULT',
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
      title: 'File Uploaded',
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
    <Box p={{ base: 'xs', sm: 'md' }} style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh' }}>
      <Paper p={{ base: 'xs', sm: 'md' }} radius="md" style={{ backgroundColor: '#0D0D0D', border: '1px solid #2b2b2b' }}>
        <Stack gap="lg">
          <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid #2b2b2b' }}>
            <Text size="sm" fw={500} style={{ 
              fontFamily: GeistMono.style.fontFamily, 
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              height: '100%'
            }}>
              NEW JOB
            </Text>
            <Button 
              variant="subtle"
              onClick={() => list('jobs')}
              leftSection={<ArrowLeft size={16} />}
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

          {errors?.root?.message && (
            <Alert 
              icon={<AlertCircle size={16} />}
              color="red" 
              title="Error"
              style={{ backgroundColor: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)' }}
            >
              {errors.root.message}
            </Alert>
          )}

          <form onSubmit={onSubmit}>
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

              <Select
                label="Scenario"
                data={scenarioOptions}
                required
                defaultValue="SINGLE_FILE_DEFAULT"
                error={errors?.scenario?.message}
                onChange={(value) => setValue('scenario', value || '')}
                styles={{
                  input: {
                    backgroundColor: '#0d0d0d',
                    borderColor: '#2b2b2b',
                    color: '#ffffff',
                  },
                  label: {
                    color: '#a1a1a1',
                  },
                  dropdown: {
                    backgroundColor: '#0d0d0d',
                    borderColor: '#2b2b2b',
                  },
                  option: {
                    '&[data-selected]': {
                      backgroundColor: '#2b2b2b',
                    },
                    '&[data-hovered]': {
                      backgroundColor: '#1a1a1a',
                    },
                  },
                }}
              />

              <Select
                label="Language"
                data={languageOptions}
                required
                defaultValue="en"
                error={errors?.lang?.message}
                onChange={(value) => setValue('lang', value || '')}
                styles={{
                  input: {
                    backgroundColor: '#0d0d0d',
                    borderColor: '#2b2b2b',
                    color: '#ffffff',
                  },
                  label: {
                    color: '#a1a1a1',
                  },
                  dropdown: {
                    backgroundColor: '#0d0d0d',
                    borderColor: '#2b2b2b',
                  },
                  option: {
                    '&[data-selected]': {
                      backgroundColor: '#2b2b2b',
                    },
                    '&[data-hovered]': {
                      backgroundColor: '#1a1a1a',
                    },
                  },
                }}
              />

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
                      '&:hover': {
                        backgroundColor: '#111111',
                      },
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
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontFamily: GeistMono.style.fontFamily,
                            color: '#a1a1a1',
                            '&[data-active="true"]': {
                              color: '#F5A623',
                              borderColor: '#F5A623',
                            },
                          },
                        }}
                      >
                        <Tabs.List>
                          <Tabs.Tab value="link" leftSection={<LinkIcon size={12} />}>
                            LINK
                          </Tabs.Tab>
                          <Tabs.Tab value="upload" leftSection={<Upload size={12} />}>
                            FILE
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

              {/* Hidden fields - set to default values but not shown to user */}
              {/* <Group>
                <Switch
                  label="Public"
                  checked={watch('isPublic')}
                  onChange={(event) => setValue('isPublic', event.currentTarget.checked)}
                />

                <Switch
                  label="Create Page"
                  checked={watch('createPage')}
                  onChange={(event) => setValue('createPage', event.currentTarget.checked)}
                />
              </Group> */}

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
          </form>
        </Stack>
      </Paper>
    </Box>
  );
}