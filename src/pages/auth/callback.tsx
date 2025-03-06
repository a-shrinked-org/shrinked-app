// pages/auth/callback.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

  // Simple styling without Mantine
  const styles = {
	container: {
	  minHeight: "100vh",
	  display: "flex",
	  alignItems: "center",
	  justifyContent: "center",
	  fontFamily: "sans-serif",
	  padding: "20px"
	},
	card: {
	  border: "1px solid #e0e0e0",
	  borderRadius: "8px",
	  padding: "24px",
	  backgroundColor: "#F5F5F5",
	  width: "100%",
	  maxWidth: "400px",
	  textAlign: "center" as const,
	  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
	},
	title: {
	  color: "red",
	  fontSize: "20px",
	  marginBottom: "16px"
	},
	text: {
	  textAlign: "center" as const,
	  marginBottom: "24px"
	},
	link: {
	  color: "#D87A16",
	  textDecoration: "none"
	},
	loader: {
	  border: "4px solid #f3f3f3",
	  borderTop: "4px solid #D87A16",
	  borderRadius: "50%",
	  width: "30px",
	  height: "30px",
	  animation: "spin 2s linear infinite",
	  margin: "0 auto 16px auto"
	}
  };

  if (error) {
	return (
	  <div style={styles.container}>
		<div style={styles.card}>
		  <h2 style={styles.title}>Authentication Error</h2>
		  <p style={styles.text}>{error}</p>
		  <p>
			<a href="/login" style={styles.link}>Return to login</a>
		  </p>
		</div>
	  </div>
	);
  }

  return (
	<div style={styles.container}>
	  <div style={styles.card}>
		<div style={styles.loader}></div>
		<style jsx global>{`
		  @keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		  }
		`}</style>
		<p style={styles.text}>
		  Completing authentication, please wait...
		</p>
	  </div>
	</div>
  );
}