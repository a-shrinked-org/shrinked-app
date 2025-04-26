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
  const { fetchWithAuth, handleAuthError, getAccessToken } = useAuth(); // Added getAccessToken
  const router = useRouter();
  // const { create } = useNavigation(); // Using fetch directly, so create might not be needed

  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch user's capsules to find if they already have one
  const { data, isLoading, refetch } = useList<Capsule>({
    resource: "capsules", // Keep resource name consistent if Refine uses it elsewhere
    queryOptions: {
      enabled: !!identity?.token,
      onSuccess: (data) => {
        console.log("[CapsuleDirectPage] Fetched capsules:", data.data);
        if (data.data.length > 0) {
          // Optional: Decide if you always want to redirect or show a list/create option
          // const capsule = data.data[0];
          // console.log("[CapsuleDirectPage] Found existing capsule:", capsule._id);
          // router.push(`/capsules/${capsule._id}`);
          console.log("[CapsuleDirectPage] Capsules found, user can create another or navigate.");
           setErrorMessage("You already have capsules. Navigate or create a new one."); // Update message
        } else {
          console.log("[CapsuleDirectPage] No capsules found");
          // No need to set error message here, the UI handles the "create" state
          setErrorMessage(null);
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
      // Use the consistent, correct proxy route
      dataProviderName: "proxy", // Assuming you have a dataProvider named "proxy" configured
      custom: {
        url: '/api/capsules', // <-- FIX: Use the correct proxy URL
        method: 'get'
      }
      // --- OR if not using a custom dataProvider ---
      // headers: { 'Authorization': `Bearer ${getAccessToken() || identity?.token || ''}` },
      // url: '/api/capsules' // <-- FIX: Use the correct proxy URL
    }
  });

  const handleCreateCapsule = useCallback(async () => {
    try {
      setIsCreating(true);
      setErrorMessage(null);

      console.log("[CapsuleDirectPage] Creating new capsule");
      // Use fetchWithAuth which should handle tokens automatically
      const response = await fetchWithAuth('/api/capsules', { // <-- FIX: Use the correct proxy URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' // fetchWithAuth might add Auth header
        },
        body: JSON.stringify({
          // Send minimal data, let backend set defaults if possible
          // name: "My New Capsule", // Optionally send a default name
        })
      });

      if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { error: `Server returned status ${response.status}` };
        }
        console.error("Capsule creation error response:", errorData);
        throw new Error(errorData.error || errorData.message || `Failed to create capsule: ${response.status}`);
      }

      const result = await response.json();
      console.log("[CapsuleDirectPage] Created capsule:", result._id);

      // Redirect to the newly created capsule's view page
      router.push(`/capsules/${result._id}`);

    } catch (error) {
      console.error("[CapsuleDirectPage] Failed to create capsule:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsCreating(false);
    }
  }, [fetchWithAuth, router, handleAuthError]); // Added handleAuthError

  const handleCreateClick = useCallback(() => {
    handleCreateCapsule();
  }, [handleCreateCapsule]);

  // Decide what to show based on loading state and whether capsules exist
  const capsulesExist = data && data.data.length > 0;
  const showCreateUI = !isLoading && !identityLoading && !capsulesExist;

  useEffect(() => {
    console.log("[CapsuleDirectPage] State:", { identityLoading, isLoading, capsulesExist, hasError: !!errorMessage });
  }, [identityLoading, isLoading, capsulesExist, errorMessage]);


  if (identityLoading || isLoading) {
    return (
      <Box style={{ position: 'relative', minHeight: '300px' }}>
        <LoadingOverlay visible={true} overlayProps={{ blur: 2 }} />
        <Text ta="center" pt="xl">Loading capsule information...</Text>
      </Box>
    );
  }

  if (!identity?.token) {
    return (
      <Box style={{ padding: '24px' }}>
          <Alert
            icon={<AlertCircle size={16} />}
            color="red"
            title="Authentication Required"
            mb="md"
          >
            You must be logged in to view or create capsules.
          </Alert>
      </Box>
    );
  }

  // If capsules exist, maybe show a list or redirect (current logic redirects in onSuccess)
  // If you want to *allow* creating even if some exist, modify the logic.
  // For now, assuming the redirect in onSuccess handles the "capsules exist" case.
  // The UI below is primarily for the "no capsules exist" case.

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

      {errorMessage && !showCreateUI && ( // Only show error if not in create mode
        <Alert
          icon={<AlertCircle size={16} />}
          color="red"
          title="Error"
          mb="xl"
          onClose={() => setErrorMessage(null)} // Allow dismissing error
          withCloseButton
        >
          {errorMessage}
        </Alert>
      )}

      {/* Show this card only if loading is complete AND no capsules were found */}
      {showCreateUI && (
         <Card p="xl" radius="md" style={{
            backgroundColor: '#131313',
            border: '1px solid #2b2b2b',
            maxWidth: '600px',
            margin: '40px auto' // Add some margin
          }}>
            <Stack gap="lg" align="center">
              <Text ta="center" size="lg" mb="md">Create your first Capsule</Text>
              <Text ta="center" c="dimmed" mb="xl">
                A capsule helps you organize and analyze multiple documents together into a single context.
              </Text>
              <Button
                leftSection={<Plus size={16} />}
                onClick={handleCreateClick}
                loading={isCreating}
                size="md" // Make button slightly larger
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

      {/* You might want a different UI if capsules *do* exist but the redirect didn't happen */}
       {capsulesExist && !isLoading && (
         <Box style={{ padding: '24px', textAlign: 'center' }}>
            <Text>Loading your capsule...</Text>
            {/* Or display a list of capsules here */}
         </Box>
       )}

    </Box>
  );
}