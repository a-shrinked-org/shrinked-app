// src/utils/authUtils.ts
import { toast } from "react-toastify";

// Configuration constants
export const API_CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai",
  ENDPOINTS: {
	LOGIN: "/auth/login",
	REGISTER: "/auth/register",
	PROFILE: "/users/profile",
	REFRESH: "/auth/refresh-token",
	LOGOUT: "/auth/logout",
	PERMISSIONS: "/auth/permissions",
  },
  STORAGE_KEYS: {
	ACCESS_TOKEN: "access_token",
	REFRESH_TOKEN: "refresh_token",
	USER_DATA: "user_data",
  }
};

// Prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
// Track last refresh time to prevent rapid successive attempts
let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 10000; // 10 seconds

export const authUtils = {
  // Get tokens with proper error handling
  getAccessToken: (): string | null => {
	try {
	  return localStorage.getItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	} catch (e) {
	  console.error("Error accessing localStorage for access token:", e);
	  return null;
	}
  },

  getRefreshToken: (): string | null => {
	try {
	  return localStorage.getItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	} catch (e) {
	  console.error("Error accessing localStorage for refresh token:", e);
	  return null;
	}
  },

  saveTokens: (accessToken: string, refreshToken: string): void => {
	try {
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
	} catch (e) {
	  console.error("Error saving tokens to localStorage:", e);
	}
  },

  clearAuthStorage: (): void => {
	try {
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	} catch (e) {
	  console.error("Error clearing auth storage:", e);
	}
  },

  // Debounced token refresh with shared promise
  refreshToken: async (): Promise<boolean> => {
	// Check if we've refreshed recently
	const now = Date.now();
	if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
	  console.log("Refresh attempt too soon, skipping");
	  return false;
	}

	// If already refreshing, return the existing promise
	if (isRefreshing && refreshPromise) {
	  console.log("Refresh already in progress, reusing promise");
	  return refreshPromise;
	}

	// Start a new refresh process
	isRefreshing = true;
	refreshPromise = (async () => {
	  try {
		console.log("Starting token refresh");
		const refreshToken = authUtils.getRefreshToken();
		if (!refreshToken) {
		  console.log("No refresh token available");
		  return false;
		}

		if (!navigator.onLine) {
		  console.log("Offline, can't refresh token");
		  return false;
		}

		const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.REFRESH}`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify({ refreshToken }),
		});

		if (!response.ok) {
		  console.error("Token refresh failed:", response.status);
		  return false;
		}

		const data = await response.json();
		if (!data.accessToken || !data.refreshToken) {
		  console.error("Invalid token refresh response");
		  return false;
		}

		// Update tokens in storage
		authUtils.saveTokens(data.accessToken, data.refreshToken);
		
		// Update user data if available
		try {
		  const userDataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
		  if (userDataStr) {
			const userData = JSON.parse(userDataStr);
			const updatedUserData = {
			  ...userData,
			  accessToken: data.accessToken,
			  refreshToken: data.refreshToken
			};
			localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
		  }
		} catch (e) {
		  console.error("Error updating user data after refresh:", e);
		}

		console.log("Token refresh successful");
		lastRefreshTime = Date.now();
		return true;
	  } catch (error) {
		console.error("Token refresh error:", error);
		return false;
	  } finally {
		isRefreshing = false;
	  }
	})();

	// Return the result of the refresh promise
	const result = await refreshPromise;
	refreshPromise = null;
	return result;
  },

  // Centralized API request handler with automatic token refresh
  apiRequest: async (url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> => {
	const MAX_RETRIES = 1;
	
	// Get current access token
	const accessToken = authUtils.getAccessToken();
	
	// Set up authorization header if token exists
	const headers = {
	  ...options.headers,
	  ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
	  'Content-Type': 'application/json',
	};
	
	try {
	  const response = await fetch(url, {
		...options,
		headers,
	  });
	  
	  // If unauthorized (401) or forbidden (403), try to refresh token and retry
	  if ((response.status === 401 || response.status === 403) && retryCount < MAX_RETRIES) {
		const refreshSuccess = await authUtils.refreshToken();
		if (refreshSuccess) {
		  // Retry with new token
		  return authUtils.apiRequest(url, options, retryCount + 1);
		}
	  }
	  
	  return response;
	} catch (error) {
	  console.error("API request error:", error);
	  throw error;
	}
  },

  // Helper method to check if user is authenticated
  isAuthenticated: (): boolean => {
	return !!authUtils.getAccessToken() && !!authUtils.getRefreshToken();
  },
  
  // Simple service status check
  checkServiceStatus: async (): Promise<string> => {
	try {
	  if (!navigator.onLine) {
		return "You appear to be offline. Please check your internet connection.";
	  }
	  
	  const response = await fetch(`${API_CONFIG.API_URL}/health`, {
		method: 'GET',
		headers: {
		  'Content-Type': 'application/json',
		},
	  });
	  
	  if (response.status >= 200 && response.status < 300) {
		return "Service is online and operational.";
	  } else if (response.status >= 500) {
		return `Service is experiencing issues. Status: ${response.status}`;
	  } else if (response.status === 401 || response.status === 403) {
		return "Authentication required to check service status.";
	  } else {
		return `Unexpected status code: ${response.status}`;
	  }
	} catch (error) {
	  return `Unable to connect to service: ${error instanceof Error ? error.message : 'Unknown error'}`;
	}
  },

  // Handle auth errors consistently
  handleAuthError: (error: any): void => {
	if (!error) return;
	
	const status = error.status || error.statusCode || 
				  (error.response ? error.response.status : null);
	
	// Handle different error cases
	if (status === 401 || status === 403) {
	  // Will attempt refresh on next request through apiRequest method
	  toast.error("Session expired. Please log in again if this persists.");
	} else if (status === 521 || status === 522 || status === 523) {
	  toast.error("Server currently unavailable. Please try again later.");
	} else if (!navigator.onLine) {
	  toast.error("You appear to be offline. Please check your connection.");
	}
  }
};

// Custom hook for auth operations
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check auth status on mount
  useEffect(() => {
	const checkAuth = async () => {
	  setIsLoading(true);
	  const authenticated = authUtils.isAuthenticated();
	  setIsAuthenticated(authenticated);
	  setIsLoading(false);
	};
	
	checkAuth();
  }, []);
  
  // Token refresh with redirect handling
  const refreshToken = useCallback(async () => {
	const success = await authUtils.refreshToken();
	if (!success) {
	  // Only redirect if on a protected page
	  const publicPaths = ['/login', '/register', '/forgot-password'];
	  const currentPath = window.location.pathname;
	  
	  if (!publicPaths.some(path => currentPath.startsWith(path))) {
		router.push('/login');
	  }
	}
	return success;
  }, [router]);
  
  // Consistent error handling
  const handleAuthError = useCallback((error: any) => {
	authUtils.handleAuthError(error);
  }, []);
  
  return {
	isAuthenticated,
	isLoading,
	refreshToken,
	handleAuthError,
	login: async (email: string, password: string) => {
	  // Implementation would be moved from customAuthProvider
	  // This gives components a simpler interface for auth operations
	},
	logout: async () => {
	  await authUtils.clearAuthStorage();
	  setIsAuthenticated(false);
	  router.push('/login');
	}
  };
};