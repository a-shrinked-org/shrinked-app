// pages/auth/callback.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Container, Text, Loader, Title } from '@mantine/core';
import { API_CONFIG, authUtils } from "@/utils/authUtils";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(true);

  useEffect(() => {
	const exchangeCodeForTokens = async () => {
	  try {
		// Handle the case where searchParams might be null
		if (!searchParams) {
		  setError('Navigation parameters not available');
		  setIsProcessing(false);
		  return;
		}

		const code = searchParams.get('code');
		console.log("Auth callback received code:", code);
		
		if (!code) {
		  setError('No authentication code found in URL');
		  setIsProcessing(false);
		  return;
		}

		// Exchange the code for tokens
		const response = await fetch(`${API_CONFIG.API_URL}/auth/exchange`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify({ code }),
		});

		if (!response.ok) {
		  const errorData = await response.json();
		  throw new Error(errorData.message || `Failed to exchange code: ${response.status}`);
		}

		const data = await response.json();
		console.log("Successfully exchanged code for tokens");

		// Save tokens
		authUtils.saveTokens(data.accessToken, data.refreshToken);
		
		// Set up token refresh
		authUtils.setupRefreshTimer(false);

		// Fetch user profile to store
		const profileResponse = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
		  headers: {
			'Authorization': `Bearer ${data.accessToken}`,
			'Content-Type': 'application/json',
		  },
		});

		if (profileResponse.ok) {
		  const userData = await profileResponse.json();
		  
		  // Save user data with tokens
		  const userDataWithTokens = {
			...userData,
			accessToken: data.accessToken,
			refreshToken: data.refreshToken,
		  };
		  
		  localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userDataWithTokens));
		}

		// Redirect to jobs page
		router.push('/jobs');
	  } catch (err) {
		console.error("Error during OAuth callback processing:", err);
		setError(err instanceof Error ? err.message : 'Authentication failed');
		setIsProcessing(false);
	  }
	};

	exchangeCodeForTokens();
  }, [searchParams, router]);

  // Rest of your component remains the same
  if (error) {
	return (
	  <Container size="xs" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
		<Card radius="md" p="xl" withBorder style={{ backgroundColor: "#F5F5F5", width: "100%" }}>
		  <Title order={2} ta="center" mb="md" style={{ color: "red" }}>
			Authentication Error
		  </Title>
		  <Text ta="center" mb="xl">
			{error}
		  </Text>
		  <Text ta="center">
			<a href="/login" style={{ color: "#D87A16" }}>Return to login</a>
		  </Text>
		</Card>
	  </Container>
	);
  }

  return (
	<Container size="xs" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
	  <Card radius="md" p="xl" withBorder style={{ backgroundColor: "#F5F5F5", width: "100%", textAlign: "center" }}>
		<Loader size="md" color="#D87A16" style={{ margin: "0 auto", display: "block" }} />
		<Text ta="center" mt="md">
		  Completing authentication, please wait...
		</Text>
	  </Card>
	</Container>
  );
}