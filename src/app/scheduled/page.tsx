"use client";

import { 
  Box, 
  Stack, 
  Title, 
  Text, 
  Card, 
  Group, 
  Badge,
  Button 
} from '@mantine/core';
import { Clock, Calendar } from 'lucide-react';
import { IconWrapper } from '@/utils/ui-utils';

export default function ScheduledJobs() {
  return (
    <Stack gap="xl" p="md">
      <Group justify="space-between">
        <Title order={2}>Scheduled Jobs</Title>
      </Group>
      
      <Card withBorder p="xl" style={{ textAlign: 'center' }}>
        <Stack gap="lg" align="center">
          <Group>
            <IconWrapper icon={Calendar} size={42} color="#228be6" />
            <IconWrapper icon={Clock} size={42} color="#228be6" />
          </Group>
          
          <Title order={3}>Coming Soon</Title>
          
          <Text size="lg" c="dimmed" maw={600} mx="auto">
            The scheduled jobs feature is currently in development. Soon you&apos;ll be able to schedule 
            your processing tasks to run automatically at specified times.
          </Text>
          
          <Group>
            <Badge size="lg" variant="light" color="blue">Future Release</Badge>
          </Group>
          
          <Text size="sm" c="dimmed" mt="md">
            Check back later for updates on this feature.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}