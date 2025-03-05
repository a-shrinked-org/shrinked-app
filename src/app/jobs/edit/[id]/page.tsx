"use client";

import { useNavigation, useGetIdentity, useResource } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
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
  Text,
  Alert
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
// Replaced Tabler icons with Lucide
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { HttpError } from "@refinedev/core";
// Import centralized auth utilities
import { authUtils, API_CONFIG } from "@/utils/authUtils";

interface Identity {
  token?: string;
  email?: string;
  name?: string;
}

type JobEditForm = {
  _id?: string;
  jobName: string;
  scenario: string;
  lang: string;
  isPublic: boolean;
  createPage: boolean;
  link: string;
}

// Define an interface for HTTP errors with status
interface HttpErrorWithStatus {
  status?: number;
  message?: string;
}

export default function JobEdit() {
  const { list } = useNavigation();
  const { id } = useResource();
  const { data: identity } = useGetIdentity<Identity>();

  const {
    refineCore: { onFinish },
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    setError,
  } = useForm<JobEditForm, HttpError, JobEditForm>({
    refineCoreProps: {
      resource: "jobs",
      id,
      action: "edit",
      redirect: false,
      queryOptions: {
        enabled: !!id && !!identity?.token,
        onSuccess: (data) => {
          console.log("Edit query success:", data);
        },
        onError: (error) => {
          console.error("Edit query error:", error);
          
          // Enhanced error handling
          if (!navigator.onLine) {
            setError("root.serverError", {
              type: "manual",
              message: "You appear to be offline. Please check your internet connection."
            });
          } else if (error?.status === 521 || error?.status === 522 || error?.status === 523) {
            setError("root.serverError", {
              type: "manual",
              message: "The server is currently unreachable. Please try again later."
            });
          } else {
            setError("root.serverError", {
              type: "manual",
              message: error?.message || "Failed to load job details"
            });
          }
        }
      },
      meta: {
        headers: identity?.token ? {
          'Authorization': `Bearer ${authUtils.getAccessToken() || identity.token}`
        } : undefined
      }
    }
  });

  if (!identity?.token) {
    return (
      <Box p="md">
        <Text>Loading authentication...</Text>
      </Box>
    );
  }

  const onSubmitHandler = async (data: JobEditForm) => {
    try {
      if (!navigator.onLine) {
        showNotification({
          title: 'Error',
          message: 'You appear to be offline. Please check your internet connection.',
          color: 'red',
          icon: <AlertCircle size={16} />
        });
        return;
      }
      
      await onFinish(data);
      
      showNotification({
        title: 'Success',
        message: 'Job updated successfully',
        color: 'green'
      });

      list('jobs');
    } catch (error: unknown) {
      // Improved error handling with proper typing
      const httpError = error as HttpErrorWithStatus;
      
      if (httpError?.status === 521 || httpError?.status === 522 || httpError?.status === 523) {
        showNotification({
          title: 'Error',
          message: 'The server is currently unreachable. Please try again later.',
          color: 'red',
          icon: <AlertCircle size={16} />
        });
      } else {
        showNotification({
          title: 'Error',
          message: error instanceof Error ? error.message : 'Failed to update job',
          color: 'red',
          icon: <AlertCircle size={16} />
        });
      }
    }
  };

  return (
    <Box p="md">
      <Paper p="md" radius="md">
        <Stack gap="lg">
          <Group justify="space-between">
            <Title order={2}>Edit Job</Title>
            <Button
              variant="light"
              leftSection={<ArrowLeft size={16} />}
              onClick={() => list('jobs')}
            >
              Back to List
            </Button>
          </Group>

          {errors?.root?.serverError?.message && (
            <Alert 
              icon={<AlertCircle size={16} />}
              color="red" 
              title="Error"
            >
              {errors.root.serverError.message}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmitHandler)}>
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
                data={[
                  { value: 'SINGLE_FILE_DEFAULT', label: 'Single File Default' },
                  { value: 'SINGLE_FILE_PLATOGRAM_DOC', label: 'Single File Platogram Doc' },
                  // Add other scenarios as needed
                ]}
                required
                error={errors?.scenario?.message}
                value={watch('scenario')}
                onChange={(value) => setValue('scenario', value || '')}
              />

              <Select
                label="Language"
                data={[
                  { value: 'en', label: 'English' },
                  { value: 'uk', label: 'Ukrainian' }
                ]}
                required
                error={errors?.lang?.message}
                value={watch('lang')}
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
                  checked={watch('isPublic')}
                  onChange={(event) => setValue('isPublic', event.currentTarget.checked)}
                />

                <Switch
                  label="Create Page"
                  checked={watch('createPage')}
                  onChange={(event) => setValue('createPage', event.currentTarget.checked)}
                />
              </Group>

              <Group justify="flex-end" mt="md">
                <Button type="submit" color="blue">
                  Save Changes
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Box>
  );
}