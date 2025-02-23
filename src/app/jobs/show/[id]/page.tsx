"use client";

import { useNavigation, useResource, useShow, useGetIdentity } from "@refinedev/core";
import { 
  Paper, 
  Title, 
  Group, 
  Button, 
  Stack, 
  Text, 
  Badge,
  Box,
  Grid,
  Card,
  Alert
} from '@mantine/core';
import { IconEdit, IconArrowLeft, IconAlertCircle } from '@tabler/icons-react';
import { useParams } from "next/navigation";

interface Identity {
  token?: string;
  email?: string;
  name?: string;
}

export default function JobShow() {
  const params = useParams();
  const { edit, list } = useNavigation();
  const jobId = params.id as string;
  const { data: identity } = useGetIdentity<Identity>();
  
  const { queryResult } = useShow({
    resource: "jobs",
    id: jobId,
    meta: {
      headers: {
        'Authorization': `Bearer ${identity?.token}`
      }
    }
  });
  
  const { data, isLoading, isError } = queryResult;
  const record = data?.data;

  if (isLoading) {
    return (
      <Box p="md">
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (isError || !jobId) {
    return (
      <Box p="md">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          Unable to load job details. Please try again.
        </Alert>
        <Button
          mt="md"
          variant="light"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => list('jobs')}
        >
          Back to List
        </Button>
      </Box>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'blue';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Box p="md">
      <Paper p="md" radius="md">
        <Stack gap="lg">
          <Group justify="space-between">
            <Title order={2}>Job Details</Title>
            <Group>
              <Button
                variant="light"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => list('jobs')}
              >
                Back to List
              </Button>
              <Button
                onClick={() => edit('jobs', jobId)}
                leftSection={<IconEdit size={16} />}
              >
                Edit
              </Button>
            </Group>
          </Group>

          <Grid>
            <Grid.Col span={12}>
              <Card withBorder p="md">
                <Stack gap="md">
                  <Group justify="space-between">
                    <div>
                      <Text size="sm" c="dimmed">Job Name</Text>
                      <Text fw={500}>{record?.jobName}</Text>
                    </div>
                    <Badge 
                      color={getStatusColor(record?.status)}
                      variant="light"
                      size="lg"
                    >
                      {record?.status?.toLowerCase()
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </Badge>
                  </Group>

                  <div>
                    <Text size="sm" c="dimmed">Scenario</Text>
                    <Text>
                      {record?.scenario?.replace(/_/g, ' ').toLowerCase()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </Text>
                  </div>

                  <div>
                    <Text size="sm" c="dimmed">Language</Text>
                    <Text>
                      {record?.lang === 'en' ? 'English' : 
                       record?.lang === 'uk' ? 'Ukrainian' : 
                       record?.lang}
                    </Text>
                  </div>

                  <div>
                    <Text size="sm" c="dimmed">Link</Text>
                    <Text>{record?.link}</Text>
                  </div>

                  <Group>
                    <div>
                      <Text size="sm" c="dimmed">Public</Text>
                      <Badge color={record?.isPublic ? "green" : "gray"} variant="light">
                        {record?.isPublic ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div>
                      <Text size="sm" c="dimmed">Create Page</Text>
                      <Badge color={record?.createPage ? "green" : "gray"} variant="light">
                        {record?.createPage ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </Group>

                  <div>
                    <Text size="sm" c="dimmed">Created At</Text>
                    <Text>
                      {record?.createdAt 
                        ? new Date(record.createdAt).toLocaleString(undefined, {
                            timeZone: "UTC",
                          })
                        : "N/A"}
                    </Text>
                  </div>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Stack>
      </Paper>
    </Box>
  );
}