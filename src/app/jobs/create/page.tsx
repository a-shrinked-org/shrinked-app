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
  Alert
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
// Replaced Tabler icons with Lucide
import { ArrowLeft, AlertCircle } from 'lucide-react';
// Import centralized auth utilities
import { authUtils, API_CONFIG } from "@/utils/authUtils";

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

  const form = useForm<JobCreateForm>({
    defaultValues: {
      isPublic: true,
      createPage: true,
      lang: 'en',
      scenario: 'SINGLE_FILE_DEFAULT' // Default to SINGLE_FILE_DEFAULT
    }
  });

  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    setValue,
    setError 
  } = form;

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
      
      // Use token from centralized auth utilities
      const token = authUtils.getAccessToken() || identity?.token;
      
      if (!token) {
        showNotification({
          title: 'Error',
          message: 'Authentication required',
          color: 'red',
          icon: <AlertCircle size={16} />
        });
        return;
      }
      
      const response = await fetch(`${API_CONFIG.API_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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

              <TextInput
                label="Link"
                placeholder="Enter file link"
                required
                error={errors?.link?.message}
                {...register('link', { required: 'Link is required' })}
              />

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