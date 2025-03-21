// src/utils/authUtils.ts
import { toast } from "react-toastify";
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Global type definitions
declare global {
  interface Window {
	_refreshTimerId: ReturnType<typeof setTimeout> | undefined;
	_debugAuthState: (message: string) => void;
  }
}

// Interface for token metadata
interface TokenMetadata {
  accessExpiry: number;  // timestamp in milliseconds
  refreshExpiry: number; // timestamp in milliseconds
  lastRefresh: number;   // timestamp of last refresh
}

// Debug helper function
const authDebug = {
  enabled: true, // Set to false in production
  log: (area: string, message: string, data?: any) => {
	if (authDebug.enabled) {
	  console.log(`[AUTH:${area}] ${message}`, data || '');
	}
  },
  error: (area: string, message: string, error?: any) => {
	if (authDebug.enabled) {
	  console.error(`[AUTH:${area}] ERROR: ${message}`, error || '');
	}
  },
  warn: (area: string, message: string, data?: any) => {
	if (authDebug.enabled) {
	  console.warn(`[AUTH:${area}] WARNING: ${message}`, data || '');
	}
  }
};

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
	TOKEN_METADATA: "token_metadata",
	AUTH_STATE: "auth_state" // New key for tracking auth state
  }
};

// Improved token refresh with single source of truth
let refreshPromise: Promise<boolean> | null = null;
const REFRESH_COOLDOWN = 30000; // 30 seconds between refresh attempts
let lastSuccessfulRefreshTime = 0;

// Add global debug function
if (typeof window !== 'undefined') {
  window._debugAuthState = (message: string) => {
	const state = {
	  message,
	  timestamp: new Date().toISOString(),
	  accessToken: !!authUtils.getAccessToken(),
	  refreshToken: !!authUtils.getRefreshToken(),
	  userData: !!localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA),
	  metadata: !!localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA),
	  authenticated: authUtils.isAuthenticated()
	};
	
	console.log('[AUTH_STATE]', state);
	return state;
  };
}

// Function to decode JWT and extract expiration
const parseJwt = (token: string): any => {
  try {
	if (!token || typeof token !== 'string') {
	  authDebug.log("parseJwt", "Token missing or not a string");
	  return null;
	}
	
	if (!token.includes('.') || token.split('.').length !== 3) {
	  authDebug.log("parseJwt", "Token doesn't appear to be in JWT format, skipping parsing");
	  return { exp: Math.floor(Date.now() / 1000) + 3600 }; // Default 1-hour expiry
	}
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
	authDebug.error("parseJwt", "Error parsing JWT:", e);
	return null;
  }
};

export const authUtils = {
  // Storage for pending operations
  _pendingOperations: [] as Array<() => Promise<void>>,

  // Get tokens with proper error handling and logging
  getAccessToken: (): string | null => {
	try {
	  const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	  authDebug.log("getAccessToken", token ? "Token retrieved" : "No token found");
	  return token;
	} catch (e) {
	  authDebug.error("getAccessToken", "Error accessing localStorage for access token:", e);
	  return null;
	}
  },

  getRefreshToken: (): string | null => {
	try {
	  const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	  authDebug.log("getRefreshToken", token ? "Token retrieved" : "No token found");
	  return token;
	} catch (e) {
	  authDebug.error("getRefreshToken", "Error accessing localStorage for refresh token:", e);
	  return null;
	}
  },

  storeTokenMetadata: (accessToken: string, refreshToken: string): void => {
	try {
	  // Parse tokens to get expiry
	  const accessData = parseJwt(accessToken);
	  const refreshData = parseJwt(refreshToken);
	  
	  if (!accessData || !refreshData) {
		authDebug.error("storeTokenMetadata", "Failed to parse token data");
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
	  authDebug.log("storeTokenMetadata", `Token metadata stored. Access expires in ${Math.round((accessExpiry - Date.now())/60000)} minutes`);
	} catch (e) {
	  authDebug.error("storeTokenMetadata", "Error storing token metadata:", e);
	}
  },

  getTokenMetadata: (): TokenMetadata | null => {
	try {
	  const metadataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA);
	  if (!metadataStr) return null;
	  
	  return JSON.parse(metadataStr) as TokenMetadata;
	} catch (e) {
	  authDebug.error("getTokenMetadata", "Error getting token metadata:", e);
	  return null;
	}
  },

  saveTokens: (accessToken: string, refreshToken: string): void => {
	try {
	  if (!accessToken || !refreshToken) {
		authDebug.error("saveTokens", "Missing tokens:", { accessTokenExists: !!accessToken, refreshTokenExists: !!refreshToken });
		return;
	  }
	  
	  authDebug.log("saveTokens", "Saving tokens to localStorage");
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
	  
	  // Try to store metadata but don't fail if it doesn't work
	  try {
		authUtils.storeTokenMetadata(accessToken, refreshToken);
	  } catch (metadataError) {
		authDebug.error("saveTokens", "Failed to store token metadata, but continuing:", metadataError);
	  }
	  
	  // Also store token in cookie for server components
	  if (typeof document !== 'undefined') {
		document.cookie = `access_token=${accessToken}; path=/; max-age=${60*60}`; // 1 hour expiry
	  }
	  
	  // Update auth state
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.AUTH_STATE, JSON.stringify({
		authenticated: true,
		lastUpdated: Date.now()
	  }));
	  
	  // Debug output to verify tokens were saved
	  authDebug.log("saveTokens", "Tokens saved successfully", {
		accessTokenExists: !!authUtils.getAccessToken(),
		refreshTokenExists: !!authUtils.getRefreshToken()
	  });
	  
	  // Set up refresh timer after saving tokens
	  setTimeout(() => {
		authUtils.setupRefreshTimer(true);
	  }, 100);
	  
	} catch (e) {
	  authDebug.error("saveTokens", "Error saving tokens to localStorage:", e);
	}
  },

  clearAuthStorage: (): void => {
	try {
	  authDebug.log("clearAuthStorage", "Clearing all auth data from localStorage");
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.AUTH_STATE);
	  
	  // Clear cookie as well
	  if (typeof document !== 'undefined') {
		document.cookie = 'access_token=; path=/; max-age=0';
	  }
	  
	  // Clear any refresh timer
	  if (typeof window !== 'undefined' && window._refreshTimerId) {
		clearTimeout(window._refreshTimerId);
		window._refreshTimerId = undefined;
	  }
	  
	  authDebug.log("clearAuthStorage", "Auth storage cleared");
	} catch (e) {
	  authDebug.error("clearAuthStorage", "Error clearing auth storage:", e);
	}
  },

  // Improved token refresh with proper promise sharing and cooldown
  refreshToken: async (): Promise<boolean> => {
	const now = Date.now();
	
	// Don't refresh if we've successfully refreshed recently
	if (now - lastSuccessfulRefreshTime < REFRESH_COOLDOWN) {
	  authDebug.log("refreshToken", `Skipping refresh (cooldown active), last refresh was ${(now - lastSuccessfulRefreshTime)/1000}s ago`);
	  return true; // Return success if we refreshed recently
	}
	
	// If already refreshing, return the existing promise
	if (refreshPromise) {
	  authDebug.log("refreshToken", "Another refresh already in progress, reusing promise");
	  return refreshPromise;
	}
	
	// Create new refresh promise and store it
	refreshPromise = (async () => {
	  try {
		authDebug.log("refreshToken", "Starting token refresh");
		const refreshToken = authUtils.getRefreshToken();
		
		if (!refreshToken) {
		  authDebug.log("refreshToken", "No refresh token available");
		  return false;
		}

		// Use the proxy endpoint to refresh token
		authDebug.log("refreshToken", "Making refresh request to proxy endpoint");
		const response = await fetch(`/api/auth-proxy/refresh`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify({ refreshToken }),
		  credentials: 'include' // Include cookies
		});

		if (!response.ok) {
		  authDebug.error("refreshToken", `Token refresh failed with status: ${response.status}`);
		  
		  // Clear tokens on unauthorized for security
		  if (response.status === 401 || response.status === 403) {
			authUtils.clearAuthStorage();
		  }
		  return false;
		}

		const data = await response.json();
		if (!data.accessToken || !data.refreshToken) {
		  authDebug.error("refreshToken", "Invalid token refresh response, missing tokens");
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
			authDebug.log("refreshToken", "Updated user data in localStorage");
		  }
		} catch (e) {
		  authDebug.error("refreshToken", "Error updating user data after refresh:", e);
		}

		authDebug.log("refreshToken", "Token refresh successful");
		lastSuccessfulRefreshTime = Date.now();
		
		// Reset the refresh timer after successful refresh
		authUtils.setupRefreshTimer();
		
		return true;
	  } catch (error) {
		authDebug.error("refreshToken", "Token refresh error:", error);
		return false;
	  } finally {
		// Clear the promise to allow future refresh attempts
		refreshPromise = null;
	  }
	})();

	// Return the result of the refresh promise
	return refreshPromise;
  },

  // Function to ensure API calls always have a valid token
  ensureValidToken: async (): Promise<string | null> => {
	// First check if the current token is valid
	const metadata = authUtils.getTokenMetadata();
	const accessToken = authUtils.getAccessToken();
	
	if (!accessToken || !metadata) {
	  authDebug.log("ensureValidToken", "No token or metadata, attempting refresh");
	  // No token or metadata, try to refresh
	  const refreshSuccess = await authUtils.refreshToken();
	  return refreshSuccess ? authUtils.getAccessToken() : null;
	}
	
	const now = Date.now();
	// If token is expired or about to expire (less than 1 minute left)
	if (metadata.accessExpiry - now < 60000) {
	  authDebug.log("ensureValidToken", `Token expiring soon (${Math.round((metadata.accessExpiry - now)/1000)}s left), refreshing`);
	  // Try to refresh token
	  const refreshSuccess = await authUtils.refreshToken();
	  return refreshSuccess ? authUtils.getAccessToken() : null;
	}
	
	// Token is valid
	authDebug.log("ensureValidToken", `Token valid, expires in ${Math.round((metadata.accessExpiry - now)/60000)} minutes`);
	return accessToken;
  },

  // Silent refresh timer setup
  setupRefreshTimer: (forceCheck: boolean = false): void => {
	// Clear any existing timer
	if (typeof window !== 'undefined' && window._refreshTimerId) {
	  clearTimeout(window._refreshTimerId);
	}
	
	try {
	  const metadata = authUtils.getTokenMetadata();
	  if (!metadata) {
		authDebug.log("setupRefreshTimer", "No token metadata found, skip timer setup");
		return;
	  }
	  
	  const now = Date.now();
	  
	  // Check if refresh token is expired
	  if (metadata.refreshExpiry <= now) {
		authDebug.log("setupRefreshTimer", "Refresh token expired, clearing auth storage");
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
		authDebug.log("setupRefreshTimer", "Access token expiring soon, refreshing now");
		authUtils.refreshToken()
		  .then(success => {
			if (success) {
			  authDebug.log("setupRefreshTimer", "Token refreshed successfully");
			  // Token is refreshed, set up next refresh cycle
			  authUtils.setupRefreshTimer();
			} else {
			  authDebug.log("setupRefreshTimer", "Token refresh failed");
			}
		  })
		  .catch(error => {
			authDebug.error("setupRefreshTimer", "Error refreshing token:", error);
		  });
		return;
	  }
	  
	  // Schedule the next refresh 1 minute before token expires
	  const refreshOffset = Math.min(timeUntilExpiry, 14 * 60 * 1000); // Max 14 minutes (for 15-min tokens)
	  const nextRefreshIn = timeUntilExpiry - refreshOffset;
	  
	  authDebug.log("setupRefreshTimer", `Scheduling token refresh in ${Math.round(nextRefreshIn/60000)} minutes`);
	  
	  // Set timer for next refresh
	  if (typeof window !== 'undefined') {
		window._refreshTimerId = setTimeout(() => {
		  authDebug.log("setupRefreshTimer", "Silent refresh timer triggered");
		  authUtils.refreshToken()
			.then(success => {
			  if (success) {
				authDebug.log("setupRefreshTimer", "Token refreshed successfully by timer");
			  } else {
				authDebug.log("setupRefreshTimer", "Timer-triggered token refresh failed");
			  }
			  // Always set up next cycle
			  authUtils.setupRefreshTimer();
			})
			.catch(error => {
			  authDebug.error("setupRefreshTimer", "Error in timed token refresh:", error);
			  authUtils.setupRefreshTimer();
			});
		}, nextRefreshIn);
	  }
	} catch (e) {
	  authDebug.error("setupRefreshTimer", "Error in refresh scheduler:", e);
	}
  },

  // Network status checker function
  checkNetworkStatus: (): boolean => {
	if (typeof navigator !== 'undefined' && !navigator.onLine) {
	  authDebug.log("checkNetworkStatus", "Network appears to be offline");
	  return false;
	}
	return true;
  },

  // Add operation to pending queue
  queueOfflineOperation: (operation: () => Promise<void>): void => {
	authDebug.log("queueOfflineOperation", "Queuing operation for when network is available");
	authUtils._pendingOperations.push(operation);
  },

  // Process all pending operations
  processPendingOperations: async (): Promise<void> => {
	if (authUtils._pendingOperations.length === 0) return;
	
	authDebug.log("processPendingOperations", `Processing ${authUtils._pendingOperations.length} pending operations`);
	
	// Get all operations and clear the queue
	const operations = [...authUtils._pendingOperations];
	authUtils._pendingOperations = [];
	
	// Execute operations in sequence
	for (const operation of operations) {
	  try {
		await operation();
	  } catch (error) {
		authDebug.error("processPendingOperations", "Error processing queued operation:", error);
	  }
	}
  },

  // Setup network status event listeners
  setupNetworkListeners: (onlineCallback?: () => void, offlineCallback?: () => void): () => void => {
	if (typeof window === 'undefined') {
	  return () => {}; // Return empty cleanup function for SSR
	}
	
	const handleOnline = () => {
	  authDebug.log("setupNetworkListeners", "Network connection restored");
	  // Process any pending operations
	  authUtils.processPendingOperations();
	  // Call additional callback if provided
	  if (onlineCallback) onlineCallback();
	};
	
	const handleOffline = () => {
	  authDebug.log("setupNetworkListeners", "Network connection lost");
	  // Call additional callback if provided
	  if (offlineCallback) offlineCallback();
	};
	
	window.addEventListener('online', handleOnline);
	window.addEventListener('offline', handleOffline);
	
	// Return cleanup function
	return () => {
	  window.removeEventListener('online', handleOnline);
	  window.removeEventListener('offline', handleOffline);
	};
  },

  // Centralized API request handler with improved error handling
  apiRequest: async (url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> => {
	const MAX_RETRIES = 1;
	
	// Ensure we have a valid token before making the request
	await authUtils.ensureValidToken();
	
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
	  
	  // Check if this is an API URL that needs to be proxied
	  let requestUrl = url;
	  if (url.startsWith(API_CONFIG.API_URL)) {
		// Replace API URL with proxy URL
		const relativePath = url.substring(API_CONFIG.API_URL.length);
		
		// Handle auth-related endpoints
		if (relativePath.startsWith('/auth')) {
		  // Direct auth endpoints to auth-proxy
		  requestUrl = `/api/auth-proxy${relativePath.substring(5)}`;
		} 
		// Handle users endpoints
		else if (relativePath.startsWith('/users')) {
		  // Direct user endpoints to user-proxy
		  requestUrl = `/api/user-proxy${relativePath.substring(6)}`;
		}
		// Handle PDF endpoints
		else if (relativePath.startsWith('/pdf')) {
		  requestUrl = `/api/pdf${relativePath.substring(4)}`;
		}
		// For any other API endpoint, you might want a general proxy
		else {
		  // Use a general API proxy for other endpoints
		  requestUrl = `/api/proxy${relativePath}`;
		}
	  }
	  
	  authDebug.log("apiRequest", `Making ${options.method || 'GET'} request to ${requestUrl}`);
	  
	  const response = await fetch(requestUrl, {
		...options,
		headers,
		signal: options.signal || controller.signal,
		mode: 'cors',
		cache: 'no-store', // Prevent caching issues with authenticated content
		credentials: 'include' // Always include credentials
	  });
	  
	  clearTimeout(timeoutId);
	  
	  // If unauthorized (401) or forbidden (403), try to refresh token and retry
	  if ((response.status === 401 || response.status === 403) && retryCount < MAX_RETRIES) {
		authDebug.log("apiRequest", `Received ${response.status}, attempting token refresh`);
		const refreshSuccess = await authUtils.refreshToken();
		if (refreshSuccess) {
		  authDebug.log("apiRequest", "Token refreshed, retrying request");
		  // Retry with new token
		  return authUtils.apiRequest(url, options, retryCount + 1);
		}
	  }
	  
	  if (!response.ok) {
		authDebug.warn("apiRequest", `Request failed with status ${response.status}`);
	  } else {
		authDebug.log("apiRequest", `Request successful with status ${response.status}`);
	  }
	  
	  return response;
	} catch (error) {
	  // Handle abort errors differently - they're often intentional
	  if (error instanceof DOMException && error.name === 'AbortError') {
		authDebug.log("apiRequest", "Request was aborted:", url);
	  } else {
		authDebug.error("apiRequest", "API request error:", error);
	  }
	  throw error;
	}
  },

  // Enhanced fetchWithAuth that includes retry logic
  fetchWithRetry: async (url: string, options: RequestInit = {}, retries = 2): Promise<Response> => {
	try {
	  const response = await authUtils.apiRequest(url, options);
	  return response;
	} catch (error) {
	  if (retries <= 0) throw error;
	  
	  // If we're offline, don't retry immediately
	  if (typeof navigator !== 'undefined' && !navigator.onLine) throw error;
	  
	  authDebug.log("fetchWithRetry", `Request failed, retrying... (${retries} attempts left)`);
	  // Wait before retry with exponential backoff
	  await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, 2 - retries)));
	  return authUtils.fetchWithRetry(url, options, retries - 1);
	}
  },

  // Helper method to check if user is authenticated
  isAuthenticated: (): boolean => {
	// Check for both tokens and validate accessToken hasn't expired
	const accessToken = authUtils.getAccessToken();
	const refreshToken = authUtils.getRefreshToken();
	const metadata = authUtils.getTokenMetadata();
	
	const hasTokens = !!accessToken && !!refreshToken;
	
	// If we have metadata, check token expiration
	if (hasTokens && metadata) {
	  const now = Date.now();
	  // Token is considered valid if not expired or about to expire (5 min buffer)
	  const isAccessValid = metadata.accessExpiry > now;
	  const isRefreshValid = metadata.refreshExpiry > now;
	  
	  if (!isAccessValid) {
		authDebug.log("isAuthenticated", "Access token has expired, needs refresh");
	  }
	  
	  if (!isRefreshValid) {
		authDebug.log("isAuthenticated", "Refresh token has expired, login required");
		return false;
	  }
	  
	  // Even if access token expired, we're still authenticated if refresh is valid
	  return isRefreshValid;
	}
	
	authDebug.log("isAuthenticated", `Authentication check: ${hasTokens}`);
	return hasTokens;
  },
  
  // Simple service status check with improved error handling
  checkServiceStatus: async (): Promise<string> => {
	try {
	  if (typeof navigator !== 'undefined' && !navigator.onLine) {
		return "You appear to be offline. Please check your internet connection.";
	  }
	  
	  // Add timeout to prevent hanging request
	  const controller = new AbortController();
	  const timeoutId = setTimeout(() => controller.abort(), 5000);
	  
	  const response = await fetch(`/api/auth-proxy/health`, {
		method: 'GET',
		headers: {
		  'Content-Type': 'application/json',
		},
		signal: controller.signal,
		credentials: 'include'
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
	} else if (typeof navigator !== 'undefined' && !navigator.onLine) {
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
	  authDebug.error("getUserData", "Error getting user data:", e);
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
	  authDebug.error("updateUserData", "Error updating user data:", e);
	  return false;
	}
  },
  
  // New method to ensure profile is loaded
  ensureUserProfile: async (): Promise<any> => {
	try {
	  // First check if we have user data cached
	  const userData = authUtils.getUserData();
	  if (userData) {
		authDebug.log("ensureUserProfile", "Using cached user profile");
		return userData;
	  }
	  
	  // Ensure we have a valid token
	  const token = await authUtils.ensureValidToken();
	  if (!token) {
		authDebug.error("ensureUserProfile", "No valid token available");
		return null;
	  }
	  
	  // Fetch user profile
	  authDebug.log("ensureUserProfile", "Fetching user profile from API");
	  const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
		headers: {
		  Authorization: `Bearer ${token}`,
		  "Content-Type": "application/json",
		},
		credentials: 'include'
	  });
	  
	  if (!response.ok) {
		authDebug.error("ensureUserProfile", `Failed to fetch profile: ${response.status}`);
		if (response.status === 401 || response.status === 403) {
		  // Try refresh token
		  const refreshSuccess = await authUtils.refreshToken();
		  if (refreshSuccess) {
			return authUtils.ensureUserProfile(); // Retry after refresh
		  }
		}
		return null;
	  }
	  
	  // Parse and store user data
	  const profile = await response.json();
	  const accessToken = authUtils.getAccessToken();
	  const refreshToken = authUtils.getRefreshToken();
	  
	  if (profile && accessToken && refreshToken) {
		const completeUserData = {
		  ...profile,
		  accessToken,
		  refreshToken
		};
		
		localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(completeUserData));
		authDebug.log("ensureUserProfile", "User profile fetched and stored");
		return completeUserData;
	  }
	  
	  return profile;
	} catch (error) {
	  authDebug.error("ensureUserProfile", "Error ensuring user profile:", error);
	  return null;
	}
  },
  
  // Method to directly set authenticated state (useful for login/logout)
  setAuthenticatedState: (isAuthenticated: boolean): void => {
	try {
	  if (isAuthenticated) {
		// Only set to authenticated if we actually have tokens
		if (authUtils.getAccessToken() && authUtils.getRefreshToken()) {
		  localStorage.setItem(API_CONFIG.STORAGE_KEYS.AUTH_STATE, JSON.stringify({
			authenticated: true,
			lastUpdated: Date.now()
		  }));
		  authDebug.log("setAuthenticatedState", "Set auth state to authenticated");
		} else {
		  authDebug.error("setAuthenticatedState", "Cannot set authenticated state without tokens");
		}
	  } else {
		localStorage.removeItem(API_CONFIG.STORAGE_KEYS.AUTH_STATE);
		authDebug.log("setAuthenticatedState", "Set auth state to unauthenticated");
	  }
	} catch (e) {
	  authDebug.error("setAuthenticatedState", "Error setting auth state:", e);
	}
  }
};

// Enhanced hook for auth operations with all necessary methods
export const useAuth = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  
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
		
		// Ensure user profile is loaded
		await authUtils.ensureUserProfile();
	  }
	  
	  setIsLoading(false);
	};
	
	// Setup network listeners
	const cleanup = authUtils.setupNetworkListeners(
	  // Online callback
	  () => setIsOffline(false),
	  // Offline callback
	  () => setIsOffline(true)
	);
	
	initializeAuth();
	
	// Cleanup function to clear timer and event listeners on unmount
	return () => {
	  if (typeof window !== 'undefined' && window._refreshTimerId) {
		clearTimeout(window._refreshTimerId);
	  }
	  cleanup();
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
		authDebug.log("useAuth.refreshToken", "Token refresh failed, redirecting to login");
		router.push('/login');
	  }
	}
	return success;
  }, [router]);

  // Ensure valid token before making API calls
  const ensureValidToken = useCallback(async () => {
	return await authUtils.ensureValidToken();
  }, []);
  
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
	  // First ensure we have a valid token
	  await ensureValidToken();
	  
	  const response = await authUtils.fetchWithAuth(url, options);
	  return response;
	} catch (error) {
	  handleAuthError(error);
	  throw error;
	}
  }, [handleAuthError, ensureValidToken]);
  
  // Enhanced fetch with retry
  const fetchWithRetry = useCallback(async (url: string, options: RequestInit = {}, retries = 2) => {
	try {
	  // First ensure we have a valid token
	  await ensureValidToken();
	  
	  const response = await authUtils.fetchWithRetry(url, options, retries);
	  return response;
	} catch (error) {
	  handleAuthError(error);
	  throw error;
	}
  }, [handleAuthError, ensureValidToken]);
  
  return {
	isAuthenticated,
	isLoading,
	isOffline,
	refreshToken,
	ensureValidToken,
	handleAuthError,
	getAccessToken,
	getAuthHeaders,
	fetchWithAuth,
	fetchWithRetry,
	
	login: async (email: string, password: string) => {
	  try {
		authDebug.log("useAuth.login", `Logging in with email: ${email}`);
		// Use the proxy endpoint instead of direct API call
		const response = await fetch(`/api/auth-proxy/login`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify({ email, password }),
		  // Include cookies to ensure tokens are properly set
		  credentials: 'include'
		});
	
		if (!response.ok) {
		  const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
		  authDebug.error("useAuth.login", "Login failed:", errorData);
		  return { success: false, error: errorData };
		}
	
		const data = await response.json();
		if (data.accessToken && data.refreshToken) {
		  // Clear any existing auth data first
		  authUtils.clearAuthStorage();
		  
		  // Save tokens - this now also stores token metadata
		  authUtils.saveTokens(data.accessToken, data.refreshToken);
		  
		  // Set authenticated state
		  authUtils.setAuthenticatedState(true);
		  
		  // Update state in hook
		  setIsAuthenticated(true);
		  
		  // Set up refresh timer
		  authUtils.setupRefreshTimer(true);
		  
		  // Log success
		  authDebug.log("useAuth.login", "Login successful, tokens stored");
		  
		  return { success: true, data };
		} else {
		  authDebug.error("useAuth.login", "Invalid response format from server");
		  return { 
			success: false, 
			error: { message: 'Invalid response format from server' } 
		  };
		}
	  } catch (error) {
		authDebug.error("useAuth.login", "Login error:", error);
		return { 
		  success: false, 
		  error: { message: error instanceof Error ? error.message : 'Unknown error' } 
		};
	  }
	},
	
	logout: async () => {
	  authDebug.log("useAuth.logout", "Logging out user");
	  
	  // Attempt to notify the server but don't wait for response
	  try {
		if (navigator.onLine) {
		  const refreshToken = authUtils.getRefreshToken();
		  if (refreshToken) {
			authDebug.log("useAuth.logout", "Sending logout request to server");
			fetch(`/api/auth-proxy/logout`, {
			  method: 'POST',
			  headers: {
				'Content-Type': 'application/json',
			  },
			  body: JSON.stringify({ refreshToken }),
			  credentials: 'include'
			}).catch(() => {
			  // Ignore errors during logout
			});
		  }
		}
	  } finally {
		// Always clear local storage
		authUtils.clearAuthStorage();
		
		// Update state
		setIsAuthenticated(false);
		
		// Set unauthenticated state
		authUtils.setAuthenticatedState(false);
		
		authDebug.log("useAuth.logout", "Logged out, redirecting to login page");
		router.push('/login');
	  }
	}
  };
};