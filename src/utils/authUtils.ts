// src/utils/authUtils.ts
import { toast } from "react-toastify";
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Global type definitions
declare global {
  interface Window {
	_refreshTimerId: ReturnType<typeof setTimeout> | undefined;
  }
}

// Interface for token metadata
interface TokenMetadata {
  accessExpiry: number;  // timestamp in milliseconds
  refreshExpiry: number; // timestamp in milliseconds
  lastRefresh: number;   // timestamp of last refresh
}

// Configuration constants
export const API_CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai",
  ENDPOINTS: {
	LOGIN: "/auth/login",
	REGISTER: "/auth/register",
	PROFILE: "/users/profile",
	REFRESH: "/auth/refresh",
	LOGOUT: "/auth/logout",
	PERMISSIONS: "/auth/permissions",
  },
  STORAGE_KEYS: {
	ACCESS_TOKEN: "access_token",
	REFRESH_TOKEN: "refresh_token",
	USER_DATA: "user_data",
	TOKEN_METADATA: "token_metadata"
  }
};

// Improved token refresh with single source of truth
let refreshPromise: Promise<boolean> | null = null;
const REFRESH_COOLDOWN = 30000; // 30 seconds between refresh attempts
let lastSuccessfulRefreshTime = 0;

// Function to decode JWT and extract expiration
const parseJwt = (token: string): any => {
  try {
	// Split the token and get the payload part
	const base64Url = token.split('.')[1];
	const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	const jsonPayload = decodeURIComponent(
	  atob(base64).split('').map(function(c) {
		return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
	  }).join('')
	);
	return JSON.parse(jsonPayload);
  } catch (e) {
	console.error("Error parsing JWT:", e);
	return null;
  }
};

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

  storeTokenMetadata: (accessToken: string, refreshToken: string): void => {
	try {
	  // Parse tokens to get expiry
	  const accessData = parseJwt(accessToken);
	  const refreshData = parseJwt(refreshToken);
	  
	  if (!accessData || !refreshData) {
		return;
	  }
	  
	  // JWT exp is in seconds, convert to milliseconds
	  const accessExpiry = accessData.exp * 1000;
	  const refreshExpiry = refreshData.exp * 1000;
	  
	  const metadata: TokenMetadata = {
		accessExpiry,
		refreshExpiry,
		lastRefresh: Date.now()
	  };
	  
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA, JSON.stringify(metadata));
	  console.log(`[AUTH] Token metadata stored. Access expires in ${Math.round((accessExpiry - Date.now())/60000)} minutes`);
	} catch (e) {
	  console.error("Error storing token metadata:", e);
	}
  },

  getTokenMetadata: (): TokenMetadata | null => {
	try {
	  const metadataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA);
	  if (!metadataStr) return null;
	  
	  return JSON.parse(metadataStr) as TokenMetadata;
	} catch (e) {
	  console.error("Error getting token metadata:", e);
	  return null;
	}
  },

  saveTokens: (accessToken: string, refreshToken: string): void => {
	try {
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
	  authUtils.storeTokenMetadata(accessToken, refreshToken);
	} catch (e) {
	  console.error("Error saving tokens to localStorage:", e);
	}
  },

  clearAuthStorage: (): void => {
	try {
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA);
	  
	  // Clear any refresh timer
	  if (window._refreshTimerId) {
		clearTimeout(window._refreshTimerId);
		window._refreshTimerId = undefined;
	  }
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

		// Based on the Postman collection, refreshToken should be sent in the request body
		const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.REFRESH}`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify({ refreshToken }),
		  mode: 'cors',
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

		// Update tokens in storage - this will also update token metadata
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
		
		// Reset the refresh timer after successful refresh
		authUtils.setupRefreshTimer();
		
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

  // Silent refresh timer setup
  // In authUtils.ts, modify the setupRefreshTimer function:
  setupRefreshTimer: (forceCheck: boolean = false): void => {
	// Clear any existing timer
	if (window._refreshTimerId) {
	  clearTimeout(window._refreshTimerId);
	}
	
	try {
	  const metadata = authUtils.getTokenMetadata();
	  if (!metadata) {
		console.log("[AUTH] No token metadata found, skip timer setup");
		return;
	  }
	  
	  const now = Date.now();
	  
	  // Check if refresh token is expired
	  if (metadata.refreshExpiry <= now) {
		console.log("[AUTH] Refresh token expired, clearing auth storage");
		authUtils.clearAuthStorage();
		return;
	  }
	  
	  // Calculate time until access token expires (with 1-minute buffer)
	  const timeUntilExpiry = metadata.accessExpiry - now - (1 * 60 * 1000);
	  
	  // Only refresh if token is actually expired or close to expiring
	  // Add a check for minimum time threshold (e.g., 5 minutes)
	  const minimumRefreshThreshold = 5 * 60 * 1000; // 5 minutes
	  
	  // If access token will expire soon or forceCheck is true and it expires within the minimum threshold
	  if (timeUntilExpiry <= 0 || (forceCheck && timeUntilExpiry < minimumRefreshThreshold)) {
		console.log("[AUTH] Access token expiring soon, refreshing now");
		authUtils.refreshToken()
		  .then(success => {
			if (success) {
			  console.log("[AUTH] Token refreshed successfully");
			  // Token is refreshed, set up next refresh cycle
			  authUtils.setupRefreshTimer();
			} else {
			  console.log("[AUTH] Token refresh failed");
			}
		  })
		  .catch(error => {
			console.error("[AUTH] Error refreshing token:", error);
		  });
		return;
	  }
	  
	  // Schedule the next refresh 1 minute before token expires
	  const refreshOffset = Math.min(timeUntilExpiry, 14 * 60 * 1000); // Max 14 minutes (for 15-min tokens)
	  const nextRefreshIn = timeUntilExpiry - refreshOffset;
	  
	  console.log(`[AUTH] Scheduling token refresh in ${Math.round(nextRefreshIn/60000)} minutes`);
	  
	  // Set timer for next refresh
	  window._refreshTimerId = setTimeout(() => {
		console.log("[AUTH] Silent refresh timer triggered");
		authUtils.refreshToken()
		  .then(success => {
			if (success) {
			  console.log("[AUTH] Token refreshed successfully by timer");
			} else {
			  console.log("[AUTH] Timer-triggered token refresh failed");
			}
			// Always set up next cycle
			authUtils.setupRefreshTimer();
		  })
		  .catch(error => {
			console.error("[AUTH] Error in timed token refresh:", error);
			authUtils.setupRefreshTimer();
		  });
	  }, nextRefreshIn);
	} catch (e) {
	  console.error("[AUTH] Error in refresh scheduler:", e);
	}
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
		signal: options.signal || controller.signal,
		mode: 'cors'
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
		  mode: 'cors'
		},
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
	  toast.error("Session expired. Please log in again if this persists.");
	  // Try token refresh if not already refreshing
	  authUtils.refreshToken().catch(() => {
		// Token refresh failed, display additional message only if critical
	  });
	} else if (status === 521 || status === 522 || status === 523) {
	  toast.error("Server currently unavailable. Please try again later.");
	} else if (!navigator.onLine) {
	  toast.error("You appear to be offline. Please check your connection.");
	} else {
	  // Generic error message for other cases
	  toast.error("An error occurred. Please try again.");
	}
  },

  // Get auth headers for requests (convenience method)
  getAuthHeaders: (extraHeaders = {}): HeadersInit => {
	const accessToken = authUtils.getAccessToken();
	return {
	  ...extraHeaders,
	  ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
	  'Content-Type': 'application/json',
	};
  },

  // Fetch with auth (convenience method)
  fetchWithAuth: async (url: string, options: RequestInit = {}): Promise<Response> => {
	return authUtils.apiRequest(url, options);
  },

  // Get user data from localStorage
  getUserData: () => {
	try {
	  const userDataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	  if (userDataStr) {
		return JSON.parse(userDataStr);
	  }
	  return null;
	} catch (e) {
	  console.error("Error getting user data:", e);
	  return null;
	}
  },

  // Update user data in localStorage
  updateUserData: (data: any) => {
	try {
	  const userDataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	  if (userDataStr) {
		const userData = JSON.parse(userDataStr);
		const updatedUserData = { ...userData, ...data };
		localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
		return true;
	  }
	  return false;
	} catch (e) {
	  console.error("Error updating user data:", e);
	  return false;
	}
  }
};

// Enhanced hook for auth operations with all necessary methods
export const useAuth = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize token refresh on component mount
  useEffect(() => {
	const initializeAuth = async () => {
	  setIsLoading(true);
	  
	  // Check if we have valid tokens
	  const authenticated = authUtils.isAuthenticated();
	  setIsAuthenticated(authenticated);
	  
	  if (authenticated) {
		// Set up the silent refresh mechanism
		authUtils.setupRefreshTimer(true); // true to force an immediate check
	  }
	  
	  setIsLoading(false);
	};
	
	initializeAuth();
	
	// Cleanup function to clear timer on unmount
	return () => {
	  if (window._refreshTimerId) {
		clearTimeout(window._refreshTimerId);
	  }
	};
  }, []);
  
  // Get access token (convenience method)
  const getAccessToken = useCallback(() => {
	return authUtils.getAccessToken();
  }, []);
  
  // Get auth headers (convenience method)
  const getAuthHeaders = useCallback((extraHeaders = {}) => {
	return authUtils.getAuthHeaders(extraHeaders);
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
  
  // Consistent error handling that automatically tries to refresh tokens
  const handleAuthError = useCallback((error: any) => {
	// Use centralized error handling
	authUtils.handleAuthError(error);
	
	// Check if error requires token refresh
	const status = error?.status || error?.statusCode || 
				  (error?.response ? error?.response.status : null);
	
	if (status === 401 || status === 403) {
	  // Token is likely invalid, try to refresh
	  refreshToken().catch(() => {
		// Silent catch - the error is already handled by authUtils.handleAuthError
	  });
	}
  }, [refreshToken]);
  
  // Fetch with authentication
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
	try {
	  const response = await authUtils.fetchWithAuth(url, options);
	  return response;
	} catch (error) {
	  handleAuthError(error);
	  throw error;
	}
  }, [handleAuthError]);
  
  return {
	isAuthenticated,
	isLoading,
	refreshToken,
	handleAuthError,
	getAccessToken,
	getAuthHeaders,
	fetchWithAuth,
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