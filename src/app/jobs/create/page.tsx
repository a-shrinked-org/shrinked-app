"use client";

import { useNavigation, useGetIdentity } from "@refinedev/core";
import { useForm } from "react-hook-form";
import { 
  TextInput, 
  Select, 
  Switch, 
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
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
// Replaced Tabler icons with Lucide
import { ArrowLeft, AlertCircle, Link as LinkIcon, Upload } from 'lucide-react';
// Import centralized auth utilities with useAuth hook
import { authUtils, useAuth, API_CONFIG } from "@/utils/authUtils";
// Import the FileUpload component
import { FileUpload } from '@/components/FileUpload';
import { useState } from 'react';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
}

interface JobCreateForm {
  jobName: string;
  scenario: string;
  lang: string;
  isPublic: boolean;
  createPage: boolean;
  link: string;
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
  const [activeTab, setActiveTab] = useState<'link' | 'upload'>('link');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  
  // Use the centralized auth hook
  const { fetchWithAuth, handleAuthError } = useAuth();

  const form = useForm<JobCreateForm>({
    defaultValues: {
      isPublic: true,
      createPage: true,
      lang: 'en',
      scenario: 'SINGLE_FILE_DEFAULT', // Default to SINGLE_FILE_DEFAULT
      link: '',
    }
  });

  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    setValue,
    watch,
    setError 
  } = form;
  
  // Watch the link value to update when file is uploaded
  const linkValue = watch('link');

  // Handle file upload success
  const handleFileUploaded = (fileUrl: string) => {
    setValue('link', fileUrl);
    setUploadedFileUrl(fileUrl);
    showNotification({
      title: 'File Uploaded',
      message: 'File URL has been added to the form',
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
      
      // Check if we have a link, either entered manually or from file upload
      if (!data.link) {
        setError('link', { 
          type: 'manual', 
          message: 'Please provide a file link or upload a file' 
        });
        return;
      }
      
      // Use centralized fetchWithAuth for API calls
      const response = await fetchWithAuth(`${API_CONFIG.API_URL}/jobs`, {
        method: 'POST',
        body: JSON.stringify(data)
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
    <Box p="md">
      <Paper p="md" radius="md">
        <Stack gap="lg">
          <Group justify="space-between">
            <Title order={2}>Create New Job</Title>
            <Button 
              variant="light" 
              onClick={() => list('jobs')}
              leftSection={<ArrowLeft size={16} />}
            >
              Back to List
            </Button>
          </Group>

          {errors?.root?.serverError && (
            <Alert 
              icon={<AlertCircle size={16} />}
              color="red" 
              title="Error"
            >
              {errors.root.serverError.message}
            </Alert>
          )}

          <form onSubmit={onSubmit}>
            <Stack gap="md">
              <TextInput
                label="Job Name"
                placeholder="Enter job name"
                required
                error={errors?.jobName?.message}
                {...register('jobName', { required: 'Job name is required' })}
              />

              <Select
                label="Scenario"
                data={scenarioOptions}
                required
                defaultValue="SINGLE_FILE_DEFAULT"
                error={errors?.scenario?.message}
                onChange={(value) => setValue('scenario', value || '')}
              />

              <Select
                label="Language"
                data={languageOptions}
                required
                defaultValue="en"
                error={errors?.lang?.message}
                onChange={(value) => setValue('lang', value || '')}
              />

              <Divider label="File Source" labelPosition="center" />

              <Tabs value={activeTab} onChange={(value) => setActiveTab(value as 'link' | 'upload')}>
                <Tabs.List>
                  <Tabs.Tab value="link" leftSection={<LinkIcon size={16} />}>
                    Provide Link
                  </Tabs.Tab>
                  <Tabs.Tab value="upload" leftSection={<Upload size={16} />}>
                    Upload File
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="link" pt="md">
                  <TextInput
                    label="Link"
                    placeholder="Enter file link"
                    error={errors?.link?.message}
                    {...register('link')}
                  />
                </Tabs.Panel>

                <Tabs.Panel value="upload" pt="md">
                  <Box mb="sm">
                    {/* Fixed: Removed 'weight' prop and used 'fw' instead */}
                    <Text size="sm" fw={500} mb="xs">Upload File</Text>
                    <FileUpload onFileUploaded={handleFileUploaded} />
                    
                    {uploadedFileUrl && (
                      <Text size="sm" mt="sm" color="dimmed">
                        File URL: {uploadedFileUrl}
                      </Text>
                    )}
                  </Box>
                </Tabs.Panel>
              </Tabs>

              {errors?.link && (
                <Alert 
                  color="red"
                  icon={<AlertCircle size={16} />}
                >
                  {errors.link.message}
                </Alert>
              )}

              <Group>
                <Switch
                  label="Public"
                  defaultChecked
                  onChange={(event) => setValue('isPublic', event.currentTarget.checked)}
                />

                <Switch
                  label="Create Page"
                  defaultChecked
                  onChange={(event) => setValue('createPage', event.currentTarget.checked)}
                />
              </Group>

              <Group justify="flex-end" mt="md">
                <Button type="submit" color="blue">
                  Create Job
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Box>
  );
}