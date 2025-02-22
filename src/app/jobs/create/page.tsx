"use client";

import { useNavigation, useGetIdentity } from "@refinedev/core";
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
  Paper
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

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

const scenarioOptions = [
  { value: 'SINGLE_FILE_PLATOGRAM_DOC', label: 'Single File Platogram Doc' },
  // Add other scenarios as needed
];

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'uk', label: 'Ukrainian' },
  // Add other languages as needed
];

export default function JobCreate() {
  const { list } = useNavigation();
  const { data: identity } = useGetIdentity<Identity>();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<JobCreateForm>({
    defaultValues: {
      isPublic: true,
      createPage: true,
      lang: 'en',
      scenario: 'SINGLE_FILE_PLATOGRAM_DOC'
    }
  });

  const onSubmit = async (data: JobCreateForm) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${identity?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const result = await response.json();
      
      notifications.show({
        title: 'Success',
        message: 'Job created successfully',
        color: 'green'
      });

      list('jobs');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create job',
        color: 'red'
      });
    }
  };

  return (
    <Box p="md">
      <Paper p="md" radius="md">
        <Stack spacing="lg">
          <Group position="apart">
            <Title order={2}>Create New Job</Title>
            <Button variant="light" onClick={() => list('jobs')}>
              Back to List
            </Button>
          </Group>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing="md">
              <TextInput
                label="Job Name"
                placeholder="Enter job name"
                required
                error={errors.jobName?.message}
                {...register('jobName', { required: 'Job name is required' })}
              />

              <Select
                label="Scenario"
                data={scenarioOptions}
                required
                error={errors.scenario?.message}
                {...register('scenario', { required: 'Scenario is required' })}
                onChange={(value) => setValue('scenario', value || '')}
              />

              <Select
                label="Language"
                data={languageOptions}
                required
                error={errors.lang?.message}
                {...register('lang', { required: 'Language is required' })}
                onChange={(value) => setValue('lang', value || '')}
              />

              <TextInput
                label="Link"
                placeholder="Enter file link"
                required
                error={errors.link?.message}
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

              <Group position="right" mt="md">
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