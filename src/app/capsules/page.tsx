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
  // Destructure handleAuthError here
  const { fetchWithAuth, handleAuthError, getAccessToken } = useAuth();
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCreateUI, setShowCreateUI] = useState(false);

  // Fetch user's capsules
  const { data, isLoading, refetch } = useList<Capsule>({
    resource: "capsules",
    queryOptions: {
      enabled: !!identity?.token,
      staleTime: 15000,
      refetchOnWindowFocus: false,
      onSuccess: (fetchedData) => {
        // console.log("[CapsuleDirectPage] Fetched capsules:", fetchedData.data);
        if (fetchedData.data.length > 0) {
          const firstCapsule = fetchedData.data[0];
          console.log("[CapsuleDirectPage] Found existing capsule, redirecting to:", firstCapsule._id);
          router.push(`/capsules/${firstCapsule._id}`);
        } else {
          console.log("[CapsuleDirectPage] No capsules found, showing create UI.");
          setShowCreateUI(true);
          setErrorMessage(null);
        }
      },
      onError: (error) => {
        console.error("[CapsuleDirectPage] Error fetching capsules:", error);
        handleAuthError(error);
        setErrorMessage("Failed to load your capsule information. Please try again later.");
        setShowCreateUI(false);
      }
    },
    pagination: {
      mode: 'off'
    },
  });

  const handleCreateCapsule = useCallback(async () => {
    setIsCreating(true);
    setErrorMessage(null);
    setShowCreateUI(false);

    try {
      console.log("[CapsuleDirectPage] Creating new capsule via proxy...");
      const response = await fetchWithAuth('/api/capsules-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { message: `Server returned status ${response.status}` };
        }
        console.error("[CapsuleDirectPage] Capsule creation error response:", errorData);
        throw new Error(errorData.message || `Failed to create capsule: ${response.status}`);
      }

      const result = await response.json();
      if (!result?._id) {
         throw new Error("Created capsule response did not include an ID.");
      }
      console.log("[CapsuleDirectPage] Created capsule:", result._id);
      router.push(`/capsules/${result._id}`);

    } catch (error) {
      console.error("[CapsuleDirectPage] Failed to create capsule:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to create capsule";
      setErrorMessage(errorMsg);
      handleAuthError(error); // Also pass to central handler
      setShowCreateUI(true);
    } finally {
      setIsCreating(false);
    }
  // --- ESLint FIX: Added handleAuthError back into dependency array ---
  }, [fetchWithAuth, router, handleAuthError]);
  // --- END ESLint FIX ---


  const shouldShowCreateCard = !isLoading && !identityLoading && showCreateUI;

  // Loading State
  if (isLoading || identityLoading) {
    return null;
  }

  // Not Authenticated State
  if (!identity?.token) {
     return (
      <Box style={{ padding: '24px' }}>
          <Alert
            icon={<AlertCircle size={16} />}
            color="red"
            title="Authentication Required"
          >
            Please log in to manage your capsules.
          </Alert>
      </Box>
    );
  }

  // Main Content Area
  return (
    <Box
      style={{
        backgroundColor: '#0a0a0a',
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <Title
        order={2}
        mb="xl"
        style={{
          fontFamily: GeistMono.style.fontFamily,
          fontWeight: 500,
          fontSize: '20px',
          letterSpacing: '0.5px',
        }}
      >
        CAPSULE
      </Title>
  
      
  
      {!isLoading && !identityLoading && !identity?.token && (
        <Box style={{ padding: '24px' }}>
          <Alert
            icon={<AlertCircle size={16} />}
            color="red"
            title="Authentication Required"
          >
            Please log in to manage your capsules.
          </Alert>
        </Box>
      )}
  
      {!isLoading && !identityLoading && identity?.token && showCreateUI && (
        <Card
          p="xl"
          radius="md"
          style={{
            backgroundColor: '#131313',
            border: '1px solid #2b2b2b',
            maxWidth: '600px',
            margin: '40px auto',
          }}
        >
          <Stack gap="lg" align="center">
            <Text ta="center" size="lg" mb="md">
              Create your first Capsule
            </Text>
            <Text ta="center" c="dimmed" mb="xl">
              A capsule helps you organize and analyze multiple documents together.
            </Text>
            {errorMessage && (
              <Alert
                color="red"
                title="Creation Failed"
                mb="md"
                icon={<AlertCircle size={16} />}
              >
                {errorMessage}
              </Alert>
            )}
            <Button
              leftSection={<Plus size={16} />}
              onClick={handleCreateCapsule}
              loading={isCreating}
              size="md"
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
              Create Capsule
            </Button>
          </Stack>
        </Card>
      )}
  
      
    </Box>
  );
}