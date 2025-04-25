"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigation, useGetIdentity, useList } from "@refinedev/core";
import { 
  Text, 
  Box,
  Group,
  Button,
  LoadingOverlay,
  Alert,
  Card,
  Stack,
  Title
} from '@mantine/core';
import { 
  Plus, 
  AlertCircle
} from 'lucide-react';
import { useAuth } from "@/utils/authUtils";
import { GeistMono } from 'geist/font/mono';
import { useRouter } from "next/navigation";

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
}

interface Capsule {
  _id: string;
  name: string;
  slug: string;
  files: Array<any>;
  updatedAt: string;
  createdAt: string;
  status: string;
}

export default function CapsuleDirectPage() {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Identity>();
  const { fetchWithAuth } = useAuth();
  const router = useRouter();
  const { create, show } = useNavigation();
  
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Fetch user's capsules to find if they already have one
  const { data, isLoading, refetch } = useList<Capsule>({
    resource: "capsules",
    queryOptions: {
      enabled: !!identity?.token,
      onSuccess: (data) => {
        // If the user has at least one capsule, redirect to it
        if (data.data.length > 0) {
          const capsule = data.data[0];
          router.push(`/capsules/${capsule._id}`);
        }
      },
      onError: (error) => {
        console.error("Error fetching capsules:", error);
        setErrorMessage("Failed to fetch capsules. Please try again later.");
      }
    },
    pagination: {
      mode: 'off'
    },
    meta: {
      headers: { 'Authorization': `Bearer ${identity?.token || ''}` },
      url: '/api/capsules-proxy'
    }
  });
  
  const handleCreateCapsule = useCallback(async () => {
    try {
      setIsCreating(true);
      setErrorMessage(null);
      
      // Create a default capsule with a generic name
      const response = await fetchWithAuth('/api/capsules-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: "My Capsule",
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create capsule: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Navigate to the new capsule
      router.push(`/capsules/${result._id}`);
      
    } catch (error) {
      console.error("Failed to create capsule:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsCreating(false);
    }
  }, [fetchWithAuth, router]);
  
  // Handle create button click - can either direct to form or create directly
  const handleCreateClick = useCallback(() => {
    // Create capsule directly with default values
    handleCreateCapsule();
  }, [handleCreateCapsule]);
  
  if (identityLoading || isLoading) {
    return (
      <Box style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={true} />
      </Box>
    );
  }
  
  if (!identity?.token) {
    return (
      <Alert 
        icon={<AlertCircle size={16} />}
        color="red"
        title="Authentication Required"
        mb="md"
      >
        You must be logged in to view capsules.
      </Alert>
    );
  }
  
  // If we've fetched data and there are no capsules, show empty state
  if (data && data.data.length === 0) {
    return (
      <Box style={{ 
        backgroundColor: '#0a0a0a', 
        minHeight: '100vh', 
        padding: '24px'
      }}>
        <Title order={2} mb="xl" style={{ 
          fontFamily: GeistMono.style.fontFamily,
          fontWeight: 500,
          fontSize: '20px',
          letterSpacing: '0.5px'
        }}>
          CAPSULE
        </Title>
        
        {errorMessage && (
          <Alert 
            icon={<AlertCircle size={16} />}
            color="red"
            title="Error"
            mb="xl"
          >
            {errorMessage}
          </Alert>
        )}
        
        <Card p="xl" radius="md" style={{ 
          backgroundColor: '#131313', 
          border: '1px solid #2b2b2b',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <Stack spacing="lg" align="center">
            <Text align="center" size="lg" mb="md">You don't have a capsule yet</Text>
            <Text align="center" c="dimmed" mb="xl">
              A capsule helps you organize and analyze multiple documents together into a single context.
            </Text>
            <Button 
              leftSection={<Plus size={16} />}
              onClick={handleCreateClick}
              loading={isCreating}
              styles={{
                root: {
                  backgroundColor: '#F5A623',
                  color: '#000000',
                  '&:hover': {
                    backgroundColor: '#E09612',
                  },
                },
              }}
            >
              Create Your Capsule
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }
  
  // This would normally be unreachable because we redirect in the onSuccess handler
  // But it's a good fallback
  return (
    <Box style={{ position: 'relative', minHeight: '300px' }}>
      <LoadingOverlay visible={true} />
    </Box>
  );
}