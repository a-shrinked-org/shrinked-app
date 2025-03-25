"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_CONFIG, authUtils } from "@/utils/authUtils";
import "@/styles/callback-styles.css";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("Establishing secure connection...");

  useEffect(() => {
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap";
	document.head.appendChild(link);

	const progressInterval = setInterval(() => {
	  setProgress((prev) => {
		const newProgress = (prev + 5) % 110;
		
		// Update status message based on progress
		if (newProgress > 20 && newProgress <= 40) {
		  setStatusMessage("Validating authentication tokens...");
		} else if (newProgress > 40 && newProgress <= 60) {
		  setStatusMessage("Retrieving account information...");
		} else if (newProgress > 60 && newProgress <= 80) {
		  setStatusMessage("Setting up secure session...");
		} else if (newProgress > 80) {
		  setStatusMessage("Finalizing authentication...");
		}
		
		return newProgress;
	  });
	}, 150);

	return () => {
	  clearInterval(progressInterval);
	  document.head.removeChild(link);
	};
  }, []);

  useEffect(() => {
	const exchangeCodeForTokens = async () => {
	  try {
		if (!searchParams) {
		  setError("Navigation parameters not available");
		  setIsProcessing(false);
		  return;
		}
  
		const code = searchParams.get("code");
		if (!code) {
		  setError("No authentication code found in URL");
		  setIsProcessing(false);
		  return;
		}
  
		authUtils.clearAuthStorage();
		console.log("OAuth callback: Processing code", code.substring(0, 5) + "...");
  
		const response = await fetch(`/api/auth-proxy/exchange`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ code }),
		  credentials: "include",
		});
  
		if (!response.ok) {
		  const errorData = await response.json().catch(() => ({}));
		  throw new Error(errorData.message || `Failed to exchange code: ${response.status}`);
		}
  
		const data = await response.json();
		console.log("OAuth tokens received successfully");
  
		// Store the tokens in localStorage
		authUtils.saveTokens(data.accessToken, data.refreshToken);
		
		// Use a proxy API route instead of direct API call to avoid CORS issues
		const profileResponse = await fetch('/api/auth-proxy/profile', {
		  headers: {
			'Authorization': `Bearer ${data.accessToken}`,
			'Content-Type': 'application/json'
		  }
		});
		
		if (!profileResponse.ok) {
		  throw new Error("Failed to fetch user profile");
		}
		
		const profileData = await profileResponse.json();
		// Store profile data in localStorage
		localStorage.setItem(
		  API_CONFIG.STORAGE_KEYS.USER_DATA,
		  JSON.stringify({ ...profileData, accessToken: data.accessToken, refreshToken: data.refreshToken })
		);
		
		authUtils.setAuthenticatedState(true);
		authUtils.setupRefreshTimer();
		router.push("/jobs");
	  } catch (err) {
		console.error("Error during OAuth callback processing:", err);
		setError(err instanceof Error ? err.message : "Authentication failed");
		setIsProcessing(false);
	  }
	};
  
	exchangeCodeForTokens();
  }, [searchParams, router]);

  if (error) {
	return (
	  <div className="callback-container error-container">
		<div className="callback-content">
		  <div className="error-message">{error}</div>
		  <a href="/login" className="return-link">
			RETURN TO LOGIN
		  </a>
		</div>
	  </div>
	);
  }

  return (
	<div className="callback-container">
	  <div className="callback-content">
		<div className="status-message">{statusMessage}</div>
		<div className="progress-container">
		  <div className="progress-bar" style={{ width: `${Math.min(progress, 100)}%` }}></div>
		</div>
	  </div>
	</div>
  );
}