// src/utils/authUtils.ts
import { useGetIdentity, useNotification, useNavigation } from "@refinedev/core";
import { useState } from "react";

// Centralized configuration
export const API_CONFIG = {
  // Base URL for API calls
  API_URL: 'https://api.shrinked.ai',
  
  // Storage keys
  STORAGE_KEYS: {
	ACCESS_TOKEN: 'accessToken',
	REFRESH_TOKEN: 'refreshToken',
	USER_DATA: 'user'
  },
  
  // Endpoints
  ENDPOINTS: {
	REFRESH: '/auth/refresh',
	PROFILE: '/users/profile',
	PERMISSIONS: '/users/permissions',
	LOGIN: '/auth/login',
	LOGOUT: '/auth/logout',
	STATUS: '/status'  // Added status endpoint
  },
  
  // Retry settings
  RETRY: {
	MAX_ATTEMPTS: 3,
	DELAY_MS: 1000 // Base delay in ms (will be multiplied by attempt number)
  }
};

/**
 * Central authentication utilities
 * Can be imported and used throughout the application
 */
export const authUtils = {
  /**
   * Refresh the authentication token
   * @returns {Promise<boolean>} True if refresh was successful
   */
  refreshToken: async (): Promise<boolean> => {
	try {
	  // Get refresh token from localStorage
	  const refreshToken = localStorage.getItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	  
	  if (!refreshToken) {
		console.error("No refresh token available");
		return false;
	  }
	  
	  // Check if we're offline
	  if (!navigator.onLine) {
		console.error("No internet connection");
		return false;
	  }
	  
	  // Make refresh token request with error handling for network issues
	  try {
		const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.REFRESH}`, {
		  method: "POST",
		  headers: {
			'Content-Type': 'application/json'
		  },
		  body: JSON.stringify({ refreshToken })
		});
		
		if (!response.ok) {
		  console.error("Token refresh failed:", response.status);
		  
		  // Handle Cloudflare errors
		  if (response.status === 521 || response.status === 522 || response.status === 523) {
			console.error("Server unreachable (Cloudflare error)");
		  }
		  
		  return false;
		}
		
		// Process successful response
		const data = await response.json();
		
		if (!data.accessToken || !data.refreshToken) {
		  console.error("Invalid refresh token response");
		  return false;
		}
		
		console.log("Token refresh successful");
		
		// Update localStorage tokens
		localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
		localStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
		
		// Update user object with new tokens
		await authUtils.updateStoredUserWithTokens(data.accessToken, data.refreshToken);
		
		return true;
	  } catch (error) {
		console.error("Network error during token refresh:", error);
		return false;
	  }
	} catch (error) {
	  console.error("Error refreshing token:", error);
	  return false;
	}
  },
  
  /**
   * Update stored user data with new tokens
   */
  updateStoredUserWithTokens: async (accessToken: string, refreshToken: string): Promise<boolean> => {
	const userStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	if (!userStr) {
	  return false;
	}
	
	try {
	  const userData = JSON.parse(userStr);
	  const updatedUserData = {
		...userData,
		accessToken,
		refreshToken
	  };
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
	  return true;
	} catch (e) {
	  console.error("Failed to update user data with new tokens", e);
	  return false;
	}
  },
  
  /**
   * Handle authentication errors by checking status codes
   * @param {any} error The error object
   * @returns {Promise<boolean>} True if the error was handled
   */
  handleAuthError: async (error: any): Promise<boolean> => {
	const status = error?.response?.status || error?.status || error?.statusCode;
	
	// Only attempt refresh for authentication errors
	if (status === 401 || status === 403) {
	  return await authUtils.refreshToken();
	}
	
	return false;
  },
  
  /**
   * Clear all authentication data from storage
   */
  clearAuthStorage: (): void => {
	localStorage.removeItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	localStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
  },
  
  /**
   * Get the current authentication token
   */
  getAccessToken: (): string | null => {
	return localStorage.getItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
  },
  
  /**
   * Get the current refresh token
   */
  getRefreshToken: (): string | null => {
	return localStorage.getItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
  },
  
  /**
   * Check the status of API services
   * @returns {Promise<string>} The combined status message
   */
  checkServiceStatus: async (): Promise<string> => {
	// Check if we're offline
	if (!navigator.onLine) {
	  return "You appear to be offline. Please check your internet connection.";
	}
	
	// Get the token
	const token = authUtils.getAccessToken();
	
	if (!token) {
	  return "Authentication required to check server status.";
	}
	
	let combinedStatus = "";
	
	// Check API status
	try {
	  const controller = new AbortController();
	  const timeoutId = setTimeout(() => controller.abort(), 10000);
	  
	  const apiResponse = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.STATUS}`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${token}`,
		  'Content-Type': 'application/json'
		},
		signal: controller.signal
	  }).catch(error => {
		clearTimeout(timeoutId);
		throw error;
	  });
	  
	  clearTimeout(timeoutId);
	  
	  if (apiResponse.status === 502) {
		combinedStatus += "API: Server is under maintenance.\n";
	  } else if (apiResponse.status === 521 || apiResponse.status === 522 || apiResponse.status === 523) {
		combinedStatus += "API: The server is currently unreachable (Cloudflare error).\n";
	  } else if (!apiResponse.ok) {
		combinedStatus += `API: Error ${apiResponse.status}\n`;
	  } else {
		const apiResult = await apiResponse.json();
		combinedStatus += `API: ${apiResult.status || 'Ok'}\n`;
	  }
	} catch (error) {
	  if (error instanceof Error && error.name === 'AbortError') {
		combinedStatus += "API: Request timed out after 10 seconds.\n";
	  } else {
		combinedStatus += "API: Request failed (network error).\n";
	  }
	}
	
	// Check Processing status (using the same endpoint but for demonstration,
	// you could use a different endpoint if needed)
	try {
	  const controller = new AbortController();
	  const timeoutId = setTimeout(() => controller.abort(), 10000);
	  
	  const processingResponse = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.STATUS}`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${token}`,
		  'Content-Type': 'application/json'
		},
		signal: controller.signal
	  }).catch(error => {
		clearTimeout(timeoutId);
		throw error;
	  });
	  
	  clearTimeout(timeoutId);
	  
	  if (processingResponse.status === 502) {
		combinedStatus += "Processing: Server is under maintenance.";
	  } else if (processingResponse.status === 521 || processingResponse.status === 522 || processingResponse.status === 523) {
		combinedStatus += "Processing: The server is currently unreachable (Cloudflare error).";
	  } else if (!processingResponse.ok) {
		combinedStatus += `Processing: Error ${processingResponse.status}`;
	  } else {
		const processingResult = await processingResponse.json();
		combinedStatus += `Processing: ${processingResult.status || 'Ok'}`;
	  }
	} catch (error) {
	  if (error instanceof Error && error.name === 'AbortError') {
		combinedStatus += "Processing: Request timed out after 10 seconds.";
	  } else {
		combinedStatus += "Processing: Request failed (network error).";
	  }
	}
	
	return combinedStatus;
  }
};

/**
 * Custom hook that wraps the auth utilities with Refine hooks
 * Use this in components that need to handle auth and show notifications
 */
export function useAuth() {
  const { data: identity, refetch: refetchIdentity } = useGetIdentity();
  const notificationHook = useNotification();
  const { list } = useNavigation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshToken = async (): Promise<boolean> => {
	if (isRefreshing) return false;
	setIsRefreshing(true);
	
	try {
	  const success = await authUtils.refreshToken();
	  
	  if (success) {
		// Refresh identity to update Refine's authentication state
		if (refetchIdentity) {
		  await refetchIdentity();
		}
		
		// Only show notification if the hook is available
		if (notificationHook?.open) {
		  notificationHook.open({
			type: "success",
			message: "Session refreshed",
			description: "Your authentication has been refreshed"
		  });
		}
		
		return true;
	  } else {
		// Only show notification if the hook is available
		if (notificationHook?.open) {
		  notificationHook.open({
			type: "error",
			message: "Authentication error",
			description: "Failed to refresh your session. Please log in again."
		  });
		}
		
		// Redirect to login on failure
		list('/login');
		return false;
	  }
	} catch (error) {
	  // Only show notification if the hook is available
	  if (notificationHook?.open) {
		notificationHook.open({
		  type: "error",
		  message: "Authentication error",
		  description: error instanceof Error ? error.message : "Unknown error"
		});
	  }
	  
	  return false;
	} finally {
	  setIsRefreshing(false);
	}
  };

  const handleAuthError = async (error: any): Promise<boolean> => {
	if (error?.status === 401 || error?.status === 403) {
	  return await refreshToken();
	}
	return false;
  };
  
  // Add status check function to useAuth hook
  const checkStatus = async (): Promise<string> => {
	return await authUtils.checkServiceStatus();
  };
  
  return {
	refreshToken,
	handleAuthError,
	isRefreshing,
	identity,
	clearAuth: authUtils.clearAuthStorage,
	checkStatus // Expose the status check through the hook
  };
}