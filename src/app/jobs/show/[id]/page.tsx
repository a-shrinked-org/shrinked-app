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
  Card
} from '@mantine/core';
import { IconEdit, IconArrowLeft } from '@tabler/icons-react';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
}

export default function JobShow() {
  const { edit, list } = useNavigation();
  const { id } = useResource();
  const { data: identity } = useGetIdentity<Identity>();
  
  const { queryResult } = useShow({
    resource: "jobs",
    id,
    meta: {
      headers: {
        'Authorization': `Bearer ${identity?.token}`
      }
    }
  });
  
  const { data, isLoading } = queryResult;
  const record = data?.data;

  if (isLoading) {
    return (
      <Box p="md">
        <Text>Loading...</Text>
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
        <Stack spacing="lg">
          <Group position="apart">
            <Title order={2}>Job Details</Title>
            <Group>
              <Button
                variant="light"
                leftIcon={<IconArrowLeft size={16} />}
                onClick={() => list('jobs')}
              >
                Back to List
              </Button>
              <Button
                onClick={() => edit('jobs', id ?? '')}
                leftIcon={<IconEdit size={16} />}
              >
                Edit
              </Button>
            </Group>
          </Group>

          <Grid>
            <Grid.Col span={12}>
              <Card withBorder p="md">
                <Stack spacing="md">
                  <Group position="apart">
                    <div>
                      <Text size="sm" color="dimmed">Job Name</Text>
                      <Text weight={500}>{record?.jobName}</Text>
                    </div>
                    <Badge 
                      color={getStatusColor(record?.status)}
                      variant="light"
                      size="lg"
                    >
                      {record?.status}
                    </Badge>
                  </Group>

                  <div>
                    <Text size="sm" color="dimmed">Scenario</Text>
                    <Text>{record?.scenario}</Text>
                  </div>

                  <div>
                    <Text size="sm" color="dimmed">Language</Text>
                    <Text>{record?.lang}</Text>
                  </div>

                  <div>
                    <Text size="sm" color="dimmed">Link</Text>
                    <Text>{record?.link}</Text>
                  </div>

                  <Group>
                    <div>
                      <Text size="sm" color="dimmed">Public</Text>
                      <Badge color={record?.isPublic ? "green" : "gray"}>
                        {record?.isPublic ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div>
                      <Text size="sm" color="dimmed">Create Page</Text>
                      <Badge color={record?.createPage ? "green" : "gray"}>
                        {record?.createPage ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </Group>

                  <div>
                    <Text size="sm" color="dimmed">Created At</Text>
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