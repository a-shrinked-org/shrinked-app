'use client';

import { useEffect } from 'react';
import { Box, Text, Group, Stack, Paper } from '@mantine/core';
import { IconUpload, IconBrain, IconFileText, IconFile } from '@tabler/icons-react';

// Updated interface to include optional type property
interface StepData {
  name: string;
  status: string;
  startTime?: string;
  endTime?: string;
  type?: string; // Make type optional since it might not be in API data
}

interface JobFlowDiagramProps {
  jobScenario?: string;
  jobStatus?: string;
  steps?: StepData[];
}

export default function JobFlowDiagram({ 
  jobScenario = '', 
  jobStatus = 'PENDING',
  steps = []
}: JobFlowDiagramProps) {
  const hasStepsData = steps && steps.length > 0;
  const status = (jobStatus || '').toUpperCase();
  const scenario = (jobScenario || '').toUpperCase();

  const getStepStatus = (stepIndex: number) => {
    if (status === 'COMPLETED') return 'COMPLETED';
    if (status === 'IN_PROGRESS') return stepIndex === 0 ? 'COMPLETED' : stepIndex === 1 ? 'IN_PROGRESS' : 'PENDING';
    if (status === 'FAILED') return stepIndex === 0 ? 'COMPLETED' : stepIndex === 1 ? 'FAILED' : 'PENDING';
    return 'PENDING';
  };

  const getBlockStyle = (stepStatus: string) => {
    const status = stepStatus.toUpperCase();
    if (status === 'COMPLETED') return { backgroundColor: '#f6ffed', borderColor: '#b7eb8f' };
    if (status === 'IN_PROGRESS') return { backgroundColor: '#e6f7ff', borderColor: '#91d5ff' };
    if (status === 'FAILED') return { backgroundColor: '#fff2f0', borderColor: '#ffccc7' };
    return { backgroundColor: '#f5f5f5', borderColor: '#d9d9d9' };
  };

  // Get step type based on index if not provided
  const getStepType = (step: StepData, index: number): string => {
    // If step has a type, use it
    if (step.type) return step.type;

    // Otherwise, infer type from index and scenario
    switch (index) {
      case 0: return 'upload';
      case 1: return 'processing';
      case 2: return 'output';
      case 3: return 'document';
      default: return 'upload';
    }
  };

  const getStepIcon = (stepType: string) => {
    switch (stepType.toLowerCase()) {
      case 'upload': return <IconUpload size={20} />;
      case 'processing': return <IconBrain size={20} />;
      case 'output': return <IconFileText size={20} />;
      case 'document': return <IconFile size={20} />;
      default: return <IconUpload size={20} />;
    }
  };

  const getTimeDuration = (step: StepData) => {
    if (step && step.startTime && step.endTime) {
      const durationMs = new Date(step.endTime).getTime() - new Date(step.startTime).getTime();
      return durationMs < 60000 ? `${Math.round(durationMs / 1000)}s` : `${Math.round(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;
    }
    return step?.status?.toUpperCase() === 'COMPLETED' ? 'Completed' : step?.status?.toUpperCase() === 'IN_PROGRESS' ? 'In Progress...' : '';
  };

  // Create flow steps based on data or scenario
  let flowSteps: StepData[] = [];
  
  if (hasStepsData) {
    // Use the actual steps data from API
    flowSteps = steps;
  } else {
    // Create default steps based on scenario
    flowSteps = [
      { name: 'File Upload', status: getStepStatus(0) },
      { name: 'AI Processing', status: getStepStatus(1) },
      { name: 'Result Output', status: getStepStatus(2) }
    ];
    
    // Add document step for PLATOGRAM_DOC scenario
    if (scenario.includes('PLATOGRAM_DOC')) {
      flowSteps.push({ name: 'Document Generation', status: getStepStatus(3) });
    }
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Text fw={500} size="lg">Job Processing Flow</Text>
        
        <Box mt={20}>
          <Group align="flex-start" gap="md">
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
                  <Group justify="space-between" mb={8}>
                    <Box>{getStepIcon(getStepType(step, index))}</Box>
                    <Text size="xs" c="dimmed">{getTimeDuration(step)}</Text>
                  </Group>
                  
                  <Text fw={500}>{step.name}</Text>
                  
                  <Text size="xs" c="dimmed" mt={4}>{step.status}</Text>
                </Paper>
                
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