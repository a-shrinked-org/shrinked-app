"use client";

import React from 'react';
import { 
  Box, 
  Stack, 
  Text, 
  Card, 
  Group,
  Button,
  Flex
} from '@mantine/core';
import { Calendar, Plus } from 'lucide-react';
import { GeistMono } from 'geist/font/mono';
import DocumentsTable, { ProcessedDocument } from '@/components/DocumentsTable';

// Mock data to demonstrate the table structure
const scheduledJobsData: ProcessedDocument[] = [];

// Format date function to match the expected format in DocumentsTable
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function ScheduledJobs() {
  return (
    <Box style={{ 
      backgroundColor: '#000000', 
      color: '#ffffff', 
      minHeight: '100vh',
      width: '100%'
    }}>
      {/* Using DocumentsTable component with a custom empty state */}
      <DocumentsTable
        data={scheduledJobsData}
        formatDate={formatDate}
        title="SCHEDULED JOBS"
        onAddNew={() => {
          // Handle adding new scheduled job
          console.log('Add new scheduled job');
        }}
        noDataMessage={null} // Set to null to use our custom empty state
        showStatus={false}
        customGridTemplate="70% 30%"
      />

      {/* Custom empty state when there's no data */}
      {scheduledJobsData.length === 0 && (
        <Box p="xl">
          <Card 
            p="xl" 
            withBorder 
            style={{ 
              textAlign: 'center',
              backgroundColor: '#0D0D0D',
              borderColor: '#2B2B2B',
              maxWidth: 600,
              margin: '0 auto',
              marginTop: 30
            }}
          >
            <Stack gap="xl" align="center">
              <Box>
                <Calendar size={48} color="#F5A623" />
              </Box>
              
              <Text fw={500} size="xl" style={{ color: '#ffffff' }}>
                Scheduled Jobs
              </Text>
              
              <Text size="sm" c="#A1A1A1" style={{ maxWidth: 400, margin: '0 auto' }}>
                Create automated processing schedules to run your jobs at specific times. Set up recurring tasks and let Shrinked handle the timing.
              </Text>
              
              <Button
                variant="filled"
                rightSection={<Plus size={16} />}
                onClick={() => console.log('Add new scheduled job')}
                styles={{
                  root: {
                    fontFamily: GeistMono.style.fontFamily,
                    fontSize: '14px',
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '8px 16px',
                    backgroundColor: '#F5A623',
                    color: '#000000',
                    '&:hover': {
                      backgroundColor: '#E09612',
                    },
                  },
                }}
              >
                <Text size="xs">SCHEDULE A JOB</Text>
              </Button>
              
              <Text size="xs" c="#666666">
                This feature is currently in early access. More options coming soon.
              </Text>
            </Stack>
          </Card>
        </Box>
      )}
    </Box>
  );
}