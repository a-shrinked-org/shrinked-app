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
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
	// Simple progress animation
	const progressInterval = setInterval(() => {
	  setProgress(prev => (prev + 10) % 110);
	}, 150);

	return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
	const exchangeCodeForTokens = async () => {
	  try {
		if (!searchParams) {
		  setError('Navigation parameters not available');
		  setIsProcessing(false);
		  return;
		}

		const code = searchParams.get('code');
		
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

  if (error) {
	return (
	  <div style={{ 
		display: 'flex', 
		justifyContent: 'center', 
		alignItems: 'center', 
		height: '100vh',
		fontFamily: 'system-ui, sans-serif'
	  }}>
		<div style={{ textAlign: 'center' }}>
		  <p style={{ color: 'red', fontSize: '16px', marginBottom: '12px' }}>
			{error}
		  </p>
		  <a href="/login" style={{ 
			color: '#D87A16', 
			textDecoration: 'none', 
			fontSize: '14px' 
		  }}>
			Return to login
		  </a>
		</div>
	  </div>
	);
  }

  // Just the bar and nothing else
  return (
	<div style={{ 
	  display: 'flex', 
	  justifyContent: 'center', 
	  alignItems: 'center', 
	  height: '100vh',
	  background: 'white'
	}}>
	  <div style={{ 
		width: '300px',
		height: '4px',
		background: 'var(--theme-border-subdued, #e0e0e0)',
		whiteSpace: 'nowrap',
		textAlign: 'left',
		verticalAlign: 'bottom',
		overflow: 'hidden',
		position: 'relative'
	  }}>
		<div style={{ 
		  height: '100%',
		  width: `${Math.min(progress, 100)}%`,
		  background: '#D87A16',
		  transition: 'width 0.2s ease-in-out'
		}}></div>
	  </div>
	</div>
  );
}