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
  // Destructure handleAuthError here but don't necessarily include in every useCallback dep array
  const { fetchWithAuth, handleAuthError, getAccessToken } = useAuth();
  const router = useRouter();
  // const { create } = useNavigation(); // Using fetch directly

  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCreateUI, setShowCreateUI] = useState(false); // State to control showing create UI

  // Fetch user's capsules
  const { data, isLoading, refetch } = useList<Capsule>({
    resource: "capsules", // Resource name for Refine
    queryOptions: {
      enabled: !!identity?.token, // Only fetch if logged in
      staleTime: 15000, // Cache for 15 seconds
      refetchOnWindowFocus: false, // Don't refetch just on focus
      onSuccess: (fetchedData) => {
        console.log("[CapsuleDirectPage] Fetched capsules:", fetchedData.data);
        if (fetchedData.data.length > 0) {
          // --- Redirect Logic Restored ---
          const firstCapsule = fetchedData.data[0];
          console.log("[CapsuleDirectPage] Found existing capsule, redirecting to:", firstCapsule._id);
          // Redirect to the first capsule found
          router.push(`/capsules/${firstCapsule._id}`);
          // --- END Redirect Logic ---
        } else {
          console.log("[CapsuleDirectPage] No capsules found, showing create UI.");
          setShowCreateUI(true); // Explicitly set state to show create UI
          setErrorMessage(null); // Clear any previous errors
        }
      },
      onError: (error) => {
        console.error("[CapsuleDirectPage] Error fetching capsules:", error);
        handleAuthError(error); // Use central error handler
        setErrorMessage("Failed to load your capsule information. Please try again later.");
        setShowCreateUI(false); // Don't show create UI if there was an error loading
      }
    },
    pagination: {
      mode: 'off' // We only need to know if *any* exist
    },
    // Let the dataProvider handle the URL construction
  });

  const handleCreateCapsule = useCallback(async () => {
    setIsCreating(true);
    setErrorMessage(null);
    setShowCreateUI(false); // Hide create UI while creating

    try {
      console.log("[CapsuleDirectPage] Creating new capsule via proxy...");
      const response = await fetchWithAuth('/api/capsules-proxy', { // Use the proxy URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Optionally send a default name, or let backend handle it
          // name: "My New Capsule"
        })
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

      // Redirect to the newly created capsule's view page
      router.push(`/capsules/${result._id}`);

    } catch (error) {
      console.error("[CapsuleDirectPage] Failed to create capsule:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to create capsule";
      setErrorMessage(errorMsg); // Set specific error message
      handleAuthError(error); // Also pass to central handler if needed
      setShowCreateUI(true); // Show create UI again on error
    } finally {
      setIsCreating(false);
    }
  // --- ESLint FIX: Removed handleAuthError from dependency array ---
  }, [fetchWithAuth, router]);
  // --- END ESLint FIX ---


  // We only render the "Create" UI if loading is complete and no capsules were found (setShowCreateUI is true)
  const shouldShowCreateCard = !isLoading && !identityLoading && showCreateUI;

  useEffect(() => {
    // Log state changes for debugging
    // console.log("[CapsuleDirectPage] State Update:", { identityLoading, isLoading, showCreateUI, hasError: !!errorMessage });
  }, [identityLoading, isLoading, showCreateUI, errorMessage]);

  // Loading State
  if (isLoading || identityLoading) {
    return (
      <Box style={{ position: 'relative', minHeight: '300px', padding: '24px' }}>
        <LoadingOverlay visible={true} overlayProps={{ blur: 2 }} />
        <Text ta="center" pt="xl" c="dimmed">Loading capsule information...</Text>
      </Box>
    );
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

      {/* Show General Error Message if loading failed */}
      {errorMessage && !shouldShowCreateCard && (
         <Alert
          icon={<AlertCircle size={16} />}
          color="red"
          title="Error"
          mb="xl"
          onClose={() => setErrorMessage(null)}
          withCloseButton
        >
          {errorMessage}
        </Alert>
      )}

      {/* Show "Create Capsule" Card */}
      {shouldShowCreateCard && (
         <Card p="xl" radius="md" style={{
            backgroundColor: '#131313',
            border: '1px solid #2b2b2b',
            maxWidth: '600px',
            margin: '40px auto'
          }}>
            <Stack gap="lg" align="center">
              <Text ta="center" size="lg" mb="md">Create your first Capsule</Text>
              <Text ta="center" c="dimmed" mb="xl">
                A capsule helps you organize and analyze multiple documents together.
              </Text>
              {/* Display error specific to creation if it occurred */}
              {errorMessage && (
                 <Alert color="red" title="Creation Failed" mb="md" icon={<AlertCircle size={16}/>}>
                     {errorMessage}
                 </Alert>
              )}
              <Button
                leftSection={<Plus size={16} />}
                onClick={handleCreateCapsule} // Directly call create handler
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

      {/* Fallback text if loading finished but redirect hasn't happened yet (should be brief) */}
      {!isLoading && !identityLoading && !showCreateUI && !errorMessage && (
          <Box style={{ padding: '24px', textAlign: 'center' }}>
            <Text c="dimmed">Loading your capsule...</Text>
          </Box>
      )}

    </Box>
  );
}