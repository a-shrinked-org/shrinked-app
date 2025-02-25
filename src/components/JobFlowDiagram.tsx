'use client';

import { useEffect } from 'react';
import { Box, Text, Group, Stack, Paper } from '@mantine/core';
import { IconUpload, IconBrain, IconFileText, IconDocument } from '@tabler/icons-react';

interface JobFlowDiagramProps {
  jobScenario?: string;
  jobStatus?: string;
  // Add steps if they're available in the job data
  steps?: Array<{
    name: string;
    status: string;
    startTime?: string;
    endTime?: string;
  }>;
}

export default function JobFlowDiagram({ 
  jobScenario = '', 
  jobStatus = 'PENDING',
  steps = []
}: JobFlowDiagramProps) {
  // Get actual job status data or use mock data if not available
  const hasStepsData = steps && steps.length > 0;
  
  // Normalize values
  const status = (jobStatus || '').toUpperCase();
  const scenario = (jobScenario || '').toUpperCase();
  
  // Determine step statuses based on job status if no step data is provided
  const getStepStatus = (stepIndex: number) => {
    if (status === 'COMPLETED') {
      return 'COMPLETED';
    }
    
    if (status === 'IN_PROGRESS') {
      if (stepIndex === 0) return 'COMPLETED';
      if (stepIndex === 1) return 'IN_PROGRESS';
      return 'PENDING';
    }
    
    if (status === 'FAILED') {
      if (stepIndex === 0) return 'COMPLETED';
      if (stepIndex === 1) return 'FAILED';
      return 'PENDING';
    }
    
    return 'PENDING';
  };
  
  // Get background color for step block based on status
  const getBlockStyle = (stepStatus: string) => {
    const status = stepStatus.toUpperCase();
    
    if (status === 'COMPLETED') {
      return { backgroundColor: '#f6ffed', borderColor: '#b7eb8f' };
    }
    
    if (status === 'IN_PROGRESS') {
      return { backgroundColor: '#e6f7ff', borderColor: '#91d5ff' };
    }
    
    if (status === 'FAILED') {
      return { backgroundColor: '#fff2f0', borderColor: '#ffccc7' };
    }
    
    return { backgroundColor: '#f5f5f5', borderColor: '#d9d9d9' };
  };

  // Get icon for step
  const getStepIcon = (stepType: string) => {
    switch (stepType.toLowerCase()) {
      case 'upload':
        return <IconUpload size={20} />;
      case 'processing':
        return <IconBrain size={20} />;
      case 'output':
        return <IconFileText size={20} />;
      case 'document':
        return <IconDocument size={20} />;
      default:
        return <IconUpload size={20} />;
    }
  };

  // Get formatted time duration if available
  const getTimeDuration = (step: any) => {
    // If actual step data with timestamps is available
    if (step && step.startTime && step.endTime) {
      const start = new Date(step.startTime);
      const end = new Date(step.endTime);
      const durationMs = end.getTime() - start.getTime();
      
      // Format duration based on length
      if (durationMs < 60000) {
        return `${Math.round(durationMs / 1000)}s`;
      } else {
        return `${Math.round(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;
      }
    }
    
    // If no actual timing data, return placeholder or empty string
    const status = step?.status?.toUpperCase() || '';
    if (status === 'COMPLETED') {
      return 'Completed';
    } else if (status === 'IN_PROGRESS') {
      return 'In Progress...';
    }
    
    return '';
  };

  // Define the steps based on scenario
  const flowSteps = hasStepsData ? steps : [
    { 
      name: 'File Upload', 
      status: getStepStatus(0),
      type: 'upload'
    },
    { 
      name: 'AI Processing', 
      status: getStepStatus(1),
      type: 'processing'
    },
    { 
      name: 'Result Output', 
      status: getStepStatus(2),
      type: 'output'
    }
  ];
  
  // Add document step for PLATOGRAM_DOC scenario if not using actual steps data
  if (!hasStepsData && scenario.includes('PLATOGRAM_DOC')) {
    flowSteps.push({ 
      name: 'Document Generation', 
      status: getStepStatus(3),
      type: 'document'
    });
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Text fw={500} size="lg">Job Processing Flow</Text>
        
        <Box mt={20}>
          <Group align="flex-start" position="apart" spacing={12}>
            {flowSteps.map((step, index) => (
              <Box key={index} style={{ position: 'relative', flex: 1 }}>
                <Paper
                  p="md"
                  withBorder
                  style={{
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderRadius: 8,
                    height: 100,
                    ...getBlockStyle(step.status)
                  }}
                >
                  <Group position="apart" mb={8}>
                    <Box>{getStepIcon(step.type || '')}</Box>
                    <Text size="xs" color="dimmed">
                      {getTimeDuration(step)}
                    </Text>
                  </Group>
                  
                  <Text fw={500}>{step.name}</Text>
                  
                  <Text size="xs" color="dimmed" mt={4}>
                    {step.status}
                  </Text>
                </Paper>
                
                {/* Add connector arrow, except for the last item */}
                {index < flowSteps.length - 1 && (
                  <Box
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: -30,
                      transform: 'translateY(-50%)',
                      zIndex: 1,
                      color: '#d9d9d9',
                      fontSize: 20
                    }}
                  >
                    →
                  </Box>
                )}
              </Box>
            ))}
          </Group>
        </Box>
      </Stack>
    </Paper>
  );
}