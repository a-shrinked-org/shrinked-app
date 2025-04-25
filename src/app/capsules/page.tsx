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
  const { fetchWithAuth, handleAuthError } = useAuth();
  const router = useRouter();
  const { create } = useNavigation();
  
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Fetch user's capsules to find if they already have one
  const { data, isLoading, refetch } = useList<Capsule>({
    resource: "capsules",
    queryOptions: {
      enabled: !!identity?.token,
      onSuccess: (data) => {
        console.log("[CapsuleDirectPage] Fetched capsules:", data.data);
        if (data.data.length > 0) {
          const capsule = data.data[0];
          console.log("[CapsuleDirectPage] Redirecting to capsule:", capsule._id);
          router.push(`/capsules/${capsule._id}`);
        } else {
          console.log("[CapsuleDirectPage] No capsules found");
          setErrorMessage("No capsules available. Create a new one to get started.");
        }
      },
      onError: (error) => {
        console.error("[CapsuleDirectPage] Error fetching capsules:", error);
        handleAuthError(error);
        setErrorMessage("Failed to fetch capsules: " + (error.message || "Unknown error"));
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
      
      console.log("[CapsuleDirectPage] Creating new capsule");
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
      console.log("[CapsuleDirectPage] Created capsule:", result._id);
      
      router.push(`/capsules/${result._id}`);
      
    } catch (error) {
      console.error("[CapsuleDirectPage] Failed to create capsule:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsCreating(false);
    }
  }, [fetchWithAuth, router]);
  
  const handleCreateClick = useCallback(() => {
    handleCreateCapsule();
  }, [handleCreateCapsule]);
  
  useEffect(() => {
    console.log("[CapsuleDirectPage] Identity:", identity);
    console.log("[CapsuleDirectPage] Loading state:", { identityLoading, isLoading });
  }, [identity, identityLoading, isLoading]);
  
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
        <Stack gap="lg" align="center">
          <Text ta="center" size="lg" mb="md">You don't have a capsule yet</Text>
          <Text ta="center" c="dimmed" mb="xl">
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