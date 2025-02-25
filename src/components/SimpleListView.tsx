'use client';

import { useEffect } from 'react';
import { Paper, Text, Group, Stack, Badge, Timeline, Box } from '@mantine/core';
import { IconCircleCheck, IconClock, IconAlertCircle } from '@tabler/icons-react';

interface SimpleFlowProps {
  jobScenario?: string;
  jobStatus?: string;
}

export default function SimpleListView({ jobScenario = '', jobStatus = 'PENDING' }: SimpleFlowProps) {
  useEffect(() => {
    console.log("List view component mounted with:", { jobScenario, jobStatus });
  }, [jobScenario, jobStatus]);

  // Normalize statuses for display
  const status = (jobStatus || '').toUpperCase();
  const scenario = (jobScenario || '').toUpperCase();
  
  // Determine step statuses based on job status
  const getStepStatus = (stepIndex: number) => {
    if (status === 'COMPLETED') {
      return 'completed';
    }
    
    if (status === 'IN_PROGRESS') {
      if (stepIndex === 0) return 'completed';
      if (stepIndex === 1) return 'in-progress';
      return 'pending';
    }
    
    if (status === 'FAILED') {
      if (stepIndex === 0) return 'completed';
      if (stepIndex === 1) return 'failed';
      return 'pending';
    }
    
    return 'pending';
  };
  
  // Get content for timeline item based on status
  const getTimelineContent = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return { color: 'green', icon: <IconCircleCheck size={16} /> };
      case 'in-progress':
        return { color: 'blue', icon: <IconClock size={16} /> };
      case 'failed':
        return { color: 'red', icon: <IconAlertCircle size={16} /> };
      default:
        return { color: 'gray', icon: <IconClock size={16} /> };
    }
  };
  
  // Get badge color for status display
  const getBadgeColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed': return 'green';
      case 'in-progress': return 'blue';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  // Define the steps based on scenario
  const steps = [
    { title: 'File Upload', description: 'File is uploaded and validated' },
    { title: 'AI Processing', description: 'Content is analyzed by AI' },
    { title: 'Result Output', description: 'Results are compiled and prepared' }
  ];
  
  // Add document step for PLATOGRAM_DOC scenario
  if (scenario.includes('PLATOGRAM_DOC')) {
    steps.push({ 
      title: 'Document Generation', 
      description: 'Final document is generated' 
    });
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={500}>Job Processing Flow</Text>
          <Badge color={getBadgeColor(getStepStatus(1))}>{status}</Badge>
        </Group>
        
        <Text size="xs" color="dimmed" mb="md">
          Scenario: {scenario || 'Unknown'}
        </Text>
        
        <Box>
          <Timeline active={status === 'COMPLETED' ? steps.length : 1} bulletSize={24} lineWidth={2}>
            {steps.map((step, index) => {
              const stepStatus = getStepStatus(index);
              const { color, icon } = getTimelineContent(stepStatus);
              
              return (
                <Timeline.Item 
                  key={index} 
                  title={step.title} 
                  color={color} 
                  bullet={icon}
                >
                  <Text color="dimmed" size="sm">{step.description}</Text>
                  <Badge size="sm" color={color} mt={4}>
                    {stepStatus === 'completed' ? 'Complete' : 
                     stepStatus === 'in-progress' ? 'In Progress' :
                     stepStatus === 'failed' ? 'Failed' : 'Pending'}
                  </Badge>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </Box>
      </Stack>
    </Paper>
  );
}