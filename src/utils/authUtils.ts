// src/utils/authUtils.ts
import { useGetIdentity, useNotification, useNavigation } from "@refinedev/core";
import { useState } from "react";

const API_URL = 'https://api.shrinked.ai';

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
	  // Get refresh token from localStorage (as used in your customAuthProvider)
	  const refreshToken = localStorage.getItem('refreshToken');
	  
	  if (!refreshToken) {
		console.error("No refresh token available");
		return false;
	  }
	  
	  // Make refresh token request
	  const response = await fetch(`${API_URL}/auth/refresh`, {
		method: "POST",
		headers: {
		  'Content-Type': 'application/json'
		},
		body: JSON.stringify({ refreshToken })
	  });
	  
	  if (!response.ok) {
		console.error("Token refresh failed:", response.status);
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
	  localStorage.setItem('accessToken', data.accessToken);
	  localStorage.setItem('refreshToken', data.refreshToken);
	  
	  // Update user object with new tokens
	  const userStr = localStorage.getItem('user');
	  if (userStr) {
		try {
		  const userData = JSON.parse(userStr);
		  const updatedUserData = {
			...userData,
			accessToken: data.accessToken,
			refreshToken: data.refreshToken
		  };
		  localStorage.setItem('user', JSON.stringify(updatedUserData));
		} catch (e) {
		  console.error("Failed to update user data with new tokens", e);
		}
	  }
	  
	  return true;
	} catch (error) {
	  console.error("Error refreshing token:", error);
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
  
  return {
	refreshToken,
	handleAuthError,
	isRefreshing,
	identity
  };
}