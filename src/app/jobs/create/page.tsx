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
  Paper
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';

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
      scenario: 'SINGLE_FILE_PLATOGRAM_DOC'
    }
  });

  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    setValue 
  } = form;

  const onSubmit = handleSubmit(async (data: JobCreateForm) => {
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

      showNotification({
        title: 'Success',
        message: 'Job created successfully',
        color: 'green'
      });

      list('jobs');
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create job',
        color: 'red'
      });
    }
  });

  return (
    <Box p="md">
      <Paper p="md" radius="md">
        <Stack gap="lg">
          <Group justify="space-between">
            <Title order={2}>Create New Job</Title>
            <Button variant="light" onClick={() => list('jobs')}>
              Back to List
            </Button>
          </Group>

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
                defaultValue="SINGLE_FILE_PLATOGRAM_DOC"
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