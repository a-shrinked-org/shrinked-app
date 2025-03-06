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

// Improved token refresh with single source of truth
let refreshPromise: Promise<boolean> | null = null;
const REFRESH_COOLDOWN = 30000; // 30 seconds between refresh attempts
let lastSuccessfulRefreshTime = 0;

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

  // Improved token refresh with proper promise sharing and cooldown
  refreshToken: async (): Promise<boolean> => {
	const now = Date.now();
	
	// Don't refresh if we've successfully refreshed recently
	if (now - lastSuccessfulRefreshTime < REFRESH_COOLDOWN) {
	  return true; // Return success if we refreshed recently
	}
	
	// If already refreshing, return the existing promise
	if (refreshPromise) {
	  return refreshPromise;
	}
	
	// Create new refresh promise and store it
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
		  credentials: 'include' // Add this to handle cookies if used
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
		lastSuccessfulRefreshTime = Date.now();
		return true;
	  } catch (error) {
		console.error("Token refresh error:", error);
		return false;
	  } finally {
		// Clear the promise to allow future refresh attempts
		refreshPromise = null;
	  }
	})();

	// Return the result of the refresh promise
	return refreshPromise;
  },

  // Centralized API request handler with improved error handling
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
	  // Add timeout to prevent hanging requests
	  const controller = new AbortController();
	  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
	  
	  const response = await fetch(url, {
		...options,
		headers,
		credentials: 'include', // Add credentials mode to handle cookies
		signal: options.signal || controller.signal
	  });
	  
	  clearTimeout(timeoutId);
	  
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
	  // Handle abort errors differently - they're often intentional
	  if (error instanceof DOMException && error.name === 'AbortError') {
		console.log("Request was aborted:", url);
	  } else {
		console.error("API request error:", error);
	  }
	  throw error;
	}
  },

  // Helper method to check if user is authenticated
  isAuthenticated: (): boolean => {
	// Only check if tokens exist, let the backend validate them
	const accessToken = authUtils.getAccessToken();
	const refreshToken = authUtils.getRefreshToken();
	return !!accessToken && !!refreshToken;
  },
  
  // Simple service status check with improved error handling
  checkServiceStatus: async (): Promise<string> => {
	try {
	  if (!navigator.onLine) {
		return "You appear to be offline. Please check your internet connection.";
	  }
	  
	  // Add timeout to prevent hanging request
	  const controller = new AbortController();
	  const timeoutId = setTimeout(() => controller.abort(), 5000);
	  
	  const response = await fetch(`${API_CONFIG.API_URL}/health`, {
		method: 'GET',
		headers: {
		  'Content-Type': 'application/json',
		},
		credentials: 'include',
		signal: controller.signal
	  });
	  
	  clearTimeout(timeoutId);
	  
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
	  if (error instanceof DOMException && error.name === 'AbortError') {
		return "Service status check timed out. The server may be under heavy load.";
	  }
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
	} else {
	  // Generic error message for other cases
	  toast.error("An error occurred. Please try again.");
	}
  }
};