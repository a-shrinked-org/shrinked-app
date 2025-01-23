"use client";

import { useOne, useNavigation } from "@refinedev/core";
import React from "react";
import { 
  Card, 
  Group, 
  Title, 
  Stack,
  Button,
  Text,
  Divider,
  LoadingOverlay
} from '@mantine/core';
import { IconDownload, IconArrowLeft } from '@tabler/icons-react';

interface FileData {
  key: string;
  size: number;
  uploaded: string;
  contentType?: string;
}

export default function OutputShow({ params }: { params: { id: string } }) {
  const { list } = useNavigation();
  
  const { data, isLoading } = useOne<FileData>({
    resource: "output",
    id: decodeURIComponent(params.id),
    dataProviderName: "r2"
  });

  const handleDownload = async () => {
    try {
      const downloadUrl = `${process.env.NEXT_PUBLIC_R2_BASE_URL}/object/${params.id}`;
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (isLoading) {
    return (
      <Stack p="md" style={{ position: 'relative', minHeight: '200px' }}>
        <LoadingOverlay visible={true} />
      </Stack>
    );
  }

  const file = data?.data;

  if (!file) {
    return (
      <Stack p="md">
        <Group>
          <Button 
            variant="default" 
            onClick={() => list("output")}
            leftSection={<IconArrowLeft size={14} />}
          >
            Back to List
          </Button>
        </Group>
        <Text>File not found</Text>
      </Stack>
    );
  }

  return (
    <Stack p="md">
      <Group justify="space-between" align="center">
        <Group>
          <Button 
            variant="default" 
            onClick={() => list("output")}
            leftSection={<IconArrowLeft size={14} />}
          >
            Back to List
          </Button>
          <Title order={2}>{file.key}</Title>
        </Group>
        <Button 
          onClick={handleDownload}
          leftSection={<IconDownload size={14} />}
        >
          Download
        </Button>
      </Group>

      <Card withBorder>
        <Stack>
          <Title order={4}>File Details</Title>
          <Divider />
          
          <Group>
            <Text fw={500}>File Name:</Text>
            <Text>{file.key}</Text>
          </Group>

          <Group>
            <Text fw={500}>Size:</Text>
            <Text>
              {file.size < 1024
                ? `${file.size} B`
                : file.size < 1024 * 1024
                ? `${(file.size / 1024).toFixed(2)} KB`
                : file.size < 1024 * 1024 * 1024
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                : `${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB`}
            </Text>
          </Group>

          <Group>
            <Text fw={500}>Upload Date:</Text>
            <Text>
              {new Date(file.uploaded).toLocaleString(undefined, {
                timeZone: "UTC",
              })}
            </Text>
          </Group>

          {file.contentType && (
            <Group>
              <Text fw={500}>Content Type:</Text>
              <Text>{file.contentType}</Text>
            </Group>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}