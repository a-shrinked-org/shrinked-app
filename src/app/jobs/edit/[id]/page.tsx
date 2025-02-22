"use client";

import { useNavigation, useGetIdentity, useResource } from "@refinedev/core";
import { useForm, UseFormProps } from "@refinedev/react-hook-form";
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
import { IconArrowLeft } from '@tabler/icons-react';
import { FieldValues } from "react-hook-form";

interface Identity {
  token?: string;
  email?: string;
  name?: string;
}

type JobEditForm = {
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

export default function JobEdit() {
  const { list } = useNavigation();
  const { id } = useResource();
  const { data: identity } = useGetIdentity<Identity>();

  const formProps: UseFormProps = {
    refineCoreProps: {
      resource: "jobs",
      id,
      action: "edit",
      redirect: false,
      meta: {
        headers: {
          'Authorization': `Bearer ${identity?.token}`
        }
      }
    }
  };

  const {
    refineCore: { onFinish },
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm(formProps);

  const onSubmitHandler = async (data: FieldValues) => {
    try {
      await onFinish(data);
      
      showNotification({
        title: 'Success',
        message: 'Job updated successfully',
        color: 'green'
      });

      list('jobs');
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update job',
        color: 'red'
      });
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
              leftIcon={<IconArrowLeft size={16} />}
              onClick={() => list('jobs')}
            >
              Back to List
            </Button>
          </Group>

          <form onSubmit={handleSubmit(onSubmitHandler)}>
            <Stack gap="md">
              <TextInput
                label="Job Name"
                placeholder="Enter job name"
                required
                error={errors?.jobName?.message?.toString()}
                {...register('jobName', { required: 'Job name is required' })}
              />

              <Select
                label="Scenario"
                data={scenarioOptions}
                required
                error={errors?.scenario?.message?.toString()}
                value={watch('scenario')}
                onChange={(value) => setValue('scenario', value || '')}
              />

              <Select
                label="Language"
                data={languageOptions}
                required
                error={errors?.lang?.message?.toString()}
                value={watch('lang')}
                onChange={(value) => setValue('lang', value || '')}
              />

              <TextInput
                label="Link"
                placeholder="Enter file link"
                required
                error={errors?.link?.message?.toString()}
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