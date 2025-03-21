"use client";

import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import DocumentsTable, { ProcessedDocument } from '@/components/shared/DocumentsTable';

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
    <DocumentsTable
      data={[]} // Empty data array
      formatDate={formatDate}
      title="SCHEDULED JOBS"
      comingSoon={true} // Enable coming soon state
      comingSoonConfig={{
        icon: <Calendar size={48} color="#F5A623" />,
        title: "Scheduled Jobs",
        description: "Create automated processing schedules to run your jobs at specific times. Set up recurring tasks and let Shrinked handle the timing.",
        buttonText: "SCHEDULE A JOB",
        buttonAction: () => console.log('Schedule job clicked')
      }}
    />
  );
}