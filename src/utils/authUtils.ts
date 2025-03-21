// src/utils/authUtils.ts
import { toast } from "react-toastify";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

// Global type definitions
declare global {
  interface Window {
	_refreshTimerId: ReturnType<typeof setTimeout> | undefined;
	_debugAuthState: (message: string) => void;
  }
}

// Interface for token metadata
interface TokenMetadata {
  accessExpiry: number; // timestamp in milliseconds
  refreshExpiry: number; // timestamp in milliseconds
  lastRefresh: number; // timestamp of last refresh
}

// Debug helper function
const authDebug = {
  enabled: true, // Set to false in production
  log: (area: string, message: string, data?: any) => {
	if (authDebug.enabled) {
	  console.log(`[AUTH:${area}] ${message}`, data || "");
	}
  },
  error: (area: string, message: string, error?: any) => {
	if (authDebug.enabled) {
	  console.error(`[AUTH:${area}] ERROR: ${message}`, error || "");
	}
  },
  warn: (area: string, message: string, data?: any) => {
	if (authDebug.enabled) {
	  console.warn(`[AUTH:${area}] WARNING: ${message}`, data || "");
	}
  },
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
	AUTH_STATE: "auth_state",
  },
};

// Improved token refresh with single source of truth
let refreshPromise: Promise<boolean> | null = null;
const REFRESH_COOLDOWN = 30000; // 30 seconds between refresh attempts
let lastSuccessfulRefreshTime = 0;

// Add global debug function
if (typeof window !== "undefined") {
  window._debugAuthState = (message: string) => {
	const state = {
	  message,
	  timestamp: new Date().toISOString(),
	  accessToken: !!authUtils.getAccessToken(),
	  refreshToken: !!authUtils.getRefreshToken(),
	  userData: !!localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA),
	  metadata: !!localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA),
	  authenticated: authUtils.isAuthenticated(),
	};
	console.log("[AUTH_STATE]", state);
	return state;
  };
}

// Function to decode JWT and extract expiration
const parseJwt = (token: string): { exp?: number } => {
  try {
	const base64Url = token.split(".")[1];
	const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
	const jsonPayload = decodeURIComponent(
	  atob(base64)
		.split("")
		.map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
		.join("")
	);
	return JSON.parse(jsonPayload);
  } catch (e) {
	authDebug.error("parseJwt", "Error parsing JWT:", e);
	return {};
  }
};

export const authUtils = {
  // Storage for pending operations
  _pendingOperations: [] as Array<() => Promise<void>>,

  getAccessToken: (): string | null => {
	try {
	  const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	  authDebug.log("getAccessToken", token ? "Token retrieved" : "No token found");
	  return token;
	} catch (e) {
	  authDebug.error("getAccessToken", "Error accessing localStorage:", e);
	  return null;
	}
  },

  getRefreshToken: (): string | null => {
	try {
	  const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	  authDebug.log("getRefreshToken", token ? "Token retrieved" : "No token found");
	  return token;
	} catch (e) {
	  authDebug.error("getRefreshToken", "Error accessing localStorage:", e);
	  return null;
	}
  },

  saveTokens: (accessToken: string, refreshToken: string): void => {
	try {
	  if (!accessToken || !refreshToken) {
		throw new Error("Missing tokens");
	  }
	  authDebug.log("saveTokens", "Saving tokens", {
		access: accessToken.substring(0, 10) + "...",
		refresh: refreshToken.substring(0, 10) + "...",
	  });
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

	  // Verify storage
	  const storedAccess = localStorage.getItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	  const storedRefresh = localStorage.getItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	  if (!storedAccess || !storedRefresh) {
		throw new Error("Failed to store tokens in localStorage");
	  }

	  // Store metadata
	  const accessData = parseJwt(accessToken);
	  const refreshData = parseJwt(refreshToken);
	  const metadata: TokenMetadata = {
		accessExpiry: accessData.exp ? accessData.exp * 1000 : Date.now() + 3600000, // Default 1 hour
		refreshExpiry: refreshData.exp ? refreshData.exp * 1000 : Date.now() + 2592000000, // Default 30 days
		lastRefresh: Date.now(),
	  };
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA, JSON.stringify(metadata));

	  authDebug.log("saveTokens", "Tokens and metadata stored successfully");
	  authUtils.setupRefreshTimer();
	} catch (e) {
	  authDebug.error("saveTokens", "Error saving tokens:", e);
	  throw e; // Propagate error to catch failures
	}
  },

  clearAuthStorage: (): void => {
	try {
	  authDebug.log("clearAuthStorage", "Clearing auth storage");
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.AUTH_STATE);
	  if (typeof window !== "undefined" && window._refreshTimerId) {
		clearTimeout(window._refreshTimerId);
		window._refreshTimerId = undefined;
	  }
	} catch (e) {
	  authDebug.error("clearAuthStorage", "Error clearing storage:", e);
	}
  },

  isAuthenticated: (): boolean => {
	const accessToken = authUtils.getAccessToken();
	const refreshToken = authUtils.getRefreshToken();
	const hasTokens = !!accessToken && !!refreshToken;
	authDebug.log("isAuthenticated", `Check: ${hasTokens}`);
	return hasTokens;
  },

  refreshToken: async (): Promise<boolean> => {
	const now = Date.now();
	if (now - lastSuccessfulRefreshTime < REFRESH_COOLDOWN) {
	  authDebug.log("refreshToken", "Skipping refresh due to cooldown");
	  return true;
	}

	if (refreshPromise) {
	  authDebug.log("refreshToken", "Reusing existing refresh promise");
	  return refreshPromise;
	}

	refreshPromise = (async () => {
	  try {
		const refreshToken = authUtils.getRefreshToken();
		if (!refreshToken) {
		  authDebug.log("refreshToken", "No refresh token available");
		  return false;
		}

		authDebug.log("refreshToken", "Attempting token refresh");
		const response = await fetch(`/api/auth-proxy/refresh`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ refreshToken }),
		  credentials: "include",
		});

		const data = await response.json();
		if (response.ok && data.accessToken && data.refreshToken) {
		  authUtils.saveTokens(data.accessToken, data.refreshToken);
		  lastSuccessfulRefreshTime = Date.now();
		  authDebug.log("refreshToken", "Refresh successful");
		  return true;
		} else {
		  authDebug.error("refreshToken", "Refresh failed:", data);
		  authUtils.clearAuthStorage();
		  return false;
		}
	  } catch (e) {
		authDebug.error("refreshToken", "Refresh error:", e);
		authUtils.clearAuthStorage();
		return false;
	  } finally {
		refreshPromise = null;
	  }
	})();

	return refreshPromise;
  },

  ensureValidToken: async (): Promise<string | null> => {
	const accessToken = authUtils.getAccessToken();
	const metadataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA);
	if (!accessToken || !metadataStr) {
	  authDebug.log("ensureValidToken", "No token or metadata, attempting refresh");
	  return (await authUtils.refreshToken()) ? authUtils.getAccessToken() : null;
	}

	const metadata: TokenMetadata = JSON.parse(metadataStr);
	if (metadata.accessExpiry < Date.now() + 60000) {
	  authDebug.log("ensureValidToken", "Token expiring soon, refreshing");
	  return (await authUtils.refreshToken()) ? authUtils.getAccessToken() : null;
	}

	authDebug.log("ensureValidToken", "Token valid");
	return accessToken;
  },

  setupRefreshTimer: (): void => {
	if (typeof window === "undefined") return;
	if (window._refreshTimerId) clearTimeout(window._refreshTimerId);
  
	const metadataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA);
	if (!metadataStr) {
	  authDebug.log("setupRefreshTimer", "No metadata, skipping");
	  return;
	}
  
	const metadata: TokenMetadata = JSON.parse(metadataStr);
	// Increase buffer from 60000 (1 minute) to 180000 (3 minutes)
	const timeUntilExpiry = metadata.accessExpiry - Date.now() - 180000; 
	
	if (timeUntilExpiry <= 0) {
	  authUtils.refreshToken();
	  return;
	}
  
	window._refreshTimerId = setTimeout(() => {
	  authUtils.refreshToken().then((success) => {
		if (success) authUtils.setupRefreshTimer();
	  });
	}, Math.max(timeUntilExpiry, 1000));
	
	authDebug.log("setupRefreshTimer", `Scheduled refresh in ${Math.round(timeUntilExpiry / 60000)} minutes`);
  },

  checkNetworkStatus: (): boolean => {
	if (typeof navigator !== "undefined" && !navigator.onLine) {
	  authDebug.log("checkNetworkStatus", "Offline");
	  return false;
	}
	return true;
  },

  queueOfflineOperation: (operation: () => Promise<void>): void => {
	authDebug.log("queueOfflineOperation", "Queuing operation");
	authUtils._pendingOperations.push(operation);
  },

  processPendingOperations: async (): Promise<void> => {
	if (authUtils._pendingOperations.length === 0) return;
	authDebug.log("processPendingOperations", `Processing ${authUtils._pendingOperations.length} operations`);
	const operations = [...authUtils._pendingOperations];
	authUtils._pendingOperations = [];
	for (const op of operations) {
	  try {
		await op();
	  } catch (e) {
		authDebug.error("processPendingOperations", "Error in queued operation:", e);
	  }
	}
  },

  setupNetworkListeners: (onlineCallback?: () => void, offlineCallback?: () => void): () => void => {
	if (typeof window === "undefined") return () => {};

	const handleOnline = () => {
	  authDebug.log("setupNetworkListeners", "Online");
	  authUtils.processPendingOperations();
	  if (onlineCallback) onlineCallback();
	};
	const handleOffline = () => {
	  authDebug.log("setupNetworkListeners", "Offline");
	  if (offlineCallback) offlineCallback();
	};

	window.addEventListener("online", handleOnline);
	window.addEventListener("offline", handleOffline);
	return () => {
	  window.removeEventListener("online", handleOnline);
	  window.removeEventListener("offline", handleOffline);
	};
  },

  fetchWithAuth: async (url: string, options: RequestInit = {}): Promise<Response> => {
	const token = await authUtils.ensureValidToken();
	if (!token) throw new Error("No valid token");

	authDebug.log("fetchWithAuth", `Fetching ${url}`);
	return fetch(url, {
	  ...options,
	  headers: {
		...options.headers,
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	  },
	  credentials: "include",
	});
  },

  getAuthHeaders: (extraHeaders = {}): HeadersInit => {
	const token = authUtils.getAccessToken();
	return {
	  ...extraHeaders,
	  ...(token ? { Authorization: `Bearer ${token}` } : {}),
	  "Content-Type": "application/json",
	};
  },

  handleAuthError: (error: any): void => {
	if (!error) return;
	const status = error.status || error.statusCode || (error.response ? error.response.status : null);
	if (status === 401 || status === 403) {
	  toast.error("Session expired. Please log in again.");
	  authUtils.refreshToken();
	} else if (status >= 500) {
	  toast.error("Server error. Please try again later.");
	} else if (!navigator.onLine) {
	  toast.error("You are offline.");
	} else {
	  toast.error("An error occurred.");
	}
  },

  getUserData: (): any => {
	try {
	  const userDataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	  return userDataStr ? JSON.parse(userDataStr) : null;
	} catch (e) {
	  authDebug.error("getUserData", "Error getting user data:", e);
	  return null;
	}
  },

  updateUserData: (data: any): boolean => {
	try {
	  const userDataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	  if (userDataStr) {
		const userData = JSON.parse(userDataStr);
		localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify({ ...userData, ...data }));
		return true;
	  }
	  return false;
	} catch (e) {
	  authDebug.error("updateUserData", "Error updating user data:", e);
	  return false;
	}
  },

  ensureUserProfile: async (): Promise<any> => {
	const userData = authUtils.getUserData();
	if (userData) {
	  authDebug.log("ensureUserProfile", "Using cached profile");
	  return userData;
	}
  
	const token = await authUtils.ensureValidToken();
	if (!token) {
	  authDebug.error("ensureUserProfile", "No valid token");
	  return null;
	}
  
	try {
	  authDebug.log("ensureUserProfile", "Fetching profile");
	  // Use the proxy endpoint instead of direct API call
	  const response = await fetch(`/api/auth-proxy/profile`, {
		headers: { 
		  Authorization: `Bearer ${token}`,
		  "Content-Type": "application/json" 
		},
		// No need for credentials: 'include' here
	  });
  
	  if (!response.ok) {
		authDebug.error("ensureUserProfile", `Fetch failed: ${response.status}`);
		return null;
	  }
  
	  const profile = await response.json();
	  localStorage.setItem(
		API_CONFIG.STORAGE_KEYS.USER_DATA,
		JSON.stringify({ ...profile, accessToken: token, refreshToken: authUtils.getRefreshToken() })
	  );
	  authDebug.log("ensureUserProfile", "Profile stored");
	  return profile;
	} catch (e) {
	  authDebug.error("ensureUserProfile", "Error fetching profile:", e);
	  return null;
	}
  },

  setAuthenticatedState: (isAuthenticated: boolean): void => {
	try {
	  if (isAuthenticated && authUtils.getAccessToken() && authUtils.getRefreshToken()) {
		localStorage.setItem(
		  API_CONFIG.STORAGE_KEYS.AUTH_STATE,
		  JSON.stringify({ authenticated: true, lastUpdated: Date.now() })
		);
		authDebug.log("setAuthenticatedState", "Set to authenticated");
	  } else {
		localStorage.removeItem(API_CONFIG.STORAGE_KEYS.AUTH_STATE);
		authDebug.log("setAuthenticatedState", "Set to unauthenticated");
	  }
	} catch (e) {
	  authDebug.error("setAuthenticatedState", "Error setting state:", e);
	}
  },
};

// Hook remains unchanged but included for completeness
export const useAuth = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);

  useEffect(() => {
	const initializeAuth = async () => {
	  setIsLoading(true);
	  const authenticated = authUtils.isAuthenticated();
	  setIsAuthenticated(authenticated);
	  if (authenticated) {
		authUtils.setupRefreshTimer();
		await authUtils.ensureUserProfile();
	  }
	  setIsLoading(false);
	};

	const cleanup = authUtils.setupNetworkListeners(
	  () => setIsOffline(false),
	  () => setIsOffline(true)
	);
	initializeAuth();

	return () => {
	  if (window._refreshTimerId) clearTimeout(window._refreshTimerId);
	  cleanup();
	};
  }, []);

  const getAccessToken = useCallback(() => authUtils.getAccessToken(), []);
  const getAuthHeaders = useCallback((extraHeaders = {}) => authUtils.getAuthHeaders(extraHeaders), []);
  const refreshToken = useCallback(async () => {
	const success = await authUtils.refreshToken();
	if (!success && !["/login", "/register", "/forgot-password"].some((path) => window.location.pathname.startsWith(path))) {
	  authDebug.log("useAuth.refreshToken", "Refresh failed, redirecting");
	  router.push("/login");
	}
	return success;
  }, [router]);
  const ensureValidToken = useCallback(() => authUtils.ensureValidToken(), []);
  const handleAuthError = useCallback((error: any) => {
	authUtils.handleAuthError(error);
	const status = error?.status || error?.statusCode || (error?.response ? error?.response.status : null);
	if (status === 401 || status === 403) refreshToken();
  }, [refreshToken]);
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
	try {
	  await ensureValidToken();
	  return await authUtils.fetchWithAuth(url, options);
	} catch (e) {
	  handleAuthError(e);
	  throw e;
	}
  }, [ensureValidToken, handleAuthError]);

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
	login: async (email: string, password: string) => {
	  try {
		authDebug.log("useAuth.login", `Logging in: ${email}`);
		const response = await fetch(`/api/auth-proxy/login`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ email, password }),
		  credentials: "include",
		});

		const data = await response.json();
		if (!response.ok) {
		  authDebug.error("useAuth.login", "Login failed:", data);
		  return { success: false, error: data };
		}

		if (data.accessToken && data.refreshToken) {
		  authUtils.clearAuthStorage();
		  authUtils.saveTokens(data.accessToken, data.refreshToken);
		  authUtils.setAuthenticatedState(true);
		  setIsAuthenticated(true);
		  authDebug.log("useAuth.login", "Login successful");
		  return { success: true, data };
		}
		authDebug.error("useAuth.login", "Invalid response");
		return { success: false, error: { message: "Invalid response" } };
	  } catch (e) {
		authDebug.error("useAuth.login", "Login error:", e);
		return { success: false, error: { message: e instanceof Error ? e.message : "Unknown error" } };
	  }
	},
	logout: async () => {
	  authDebug.log("useAuth.logout", "Logging out");
	  try {
		if (navigator.onLine) {
		  const refreshToken = authUtils.getRefreshToken();
		  if (refreshToken) {
			await fetch(`/api/auth-proxy/logout`, {
			  method: "POST",
			  headers: { "Content-Type": "application/json" },
			  body: JSON.stringify({ refreshToken }),
			  credentials: "include",
			});
		  }
		}
	  } catch (e) {
		authDebug.error("useAuth.logout", "Logout request failed:", e);
	  } finally {
		authUtils.clearAuthStorage();
		setIsAuthenticated(false);
		authUtils.setAuthenticatedState(false);
		router.push("/login");
	  }
	},
  };
};

// Initialize refresh timer on load
if (typeof window !== "undefined" && authUtils.isAuthenticated()) {
  authUtils.setupRefreshTimer();
}