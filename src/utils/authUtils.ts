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
  enabled: process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true',
  log: (area: string, message: string, data?: any) => {
	if (authDebug.enabled) {
	  console.log(`[AUTH:${area}] ${message}`, data ?? "");
	}
  },
  // Always log errors regardless of environment
  error: (area: string, message: string, error?: any) => {
	console.error(`[AUTH:${area}] ERROR: ${message}`, error || "");
  }
};

// Improved token refresh logic
if (now - lastSuccessfulRefreshTime < REFRESH_COOLDOWN) {
  authDebug.log("refreshToken", `Skipping refresh (cooldown: ${Math.round((REFRESH_COOLDOWN - (now - lastSuccessfulRefreshTime)) / 1000)}s remaining)`);
  return Promise.resolve(true); // Return existing token validity state
}

// Better error response detection
const isAuthError = response.status === 401 || response.status === 403;
if (isAuthError) {
  authUtils.clearAuthStorage();
  authUtils.setAuthenticatedState(false);
  return false;
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
const parseJwt = (token: string): { exp?: number; [key: string]: any } => { // Added index signature
  try {
	const base64Url = token.split(".")[1];
	if (!base64Url) return {}; // Handle cases with invalid token format
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
	  if (typeof window === 'undefined') return null; // Prevent server-side localStorage access
	  const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	  // authDebug.log("getAccessToken", token ? "Token retrieved" : "No token found"); // Can be noisy
	  return token;
	} catch (e) {
	  authDebug.error("getAccessToken", "Error accessing localStorage:", e);
	  return null;
	}
  },

  getRefreshToken: (): string | null => {
	try {
	  if (typeof window === 'undefined') return null;
	  const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	  // authDebug.log("getRefreshToken", token ? "Token retrieved" : "No token found"); // Can be noisy
	  return token;
	} catch (e) {
	  authDebug.error("getRefreshToken", "Error accessing localStorage:", e);
	  return null;
	}
  },

  saveTokens: (accessToken: string, refreshToken: string): void => {
	try {
	  if (typeof window === 'undefined') {
		  throw new Error("Cannot save tokens on server-side");
	  }
	  if (!accessToken || !refreshToken) {
		throw new Error("Missing tokens to save");
	  }
	  authDebug.log("saveTokens", "Saving tokens");
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

	  // Verify storage
	  const storedAccess = localStorage.getItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	  const storedRefresh = localStorage.getItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	  if (storedAccess !== accessToken || storedRefresh !== refreshToken) {
		console.error("Local storage check failed after saving tokens!");
		// Potentially throw error or notify user if critical
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
	  authUtils.setupRefreshTimer(); // Setup timer after successful save
	} catch (e) {
	  authDebug.error("saveTokens", "Error saving tokens:", e);
	  // Do not re-throw, let the calling function handle UI feedback
	}
  },

  clearAuthStorage: (): void => {
	try {
	   if (typeof window === 'undefined') return;
	  authDebug.log("clearAuthStorage", "Clearing auth storage");
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.AUTH_STATE);
	  if (window._refreshTimerId) {
		clearTimeout(window._refreshTimerId);
		window._refreshTimerId = undefined;
	  }
	} catch (e) {
	  authDebug.error("clearAuthStorage", "Error clearing storage:", e);
	}
  },

  isAuthenticated: (): boolean => {
	// Check for presence of both tokens as a primary indicator
	const accessToken = authUtils.getAccessToken();
	const refreshToken = authUtils.getRefreshToken();
	const hasTokens = !!accessToken && !!refreshToken;
	// authDebug.log("isAuthenticated", `Check: ${hasTokens}`); // Can be noisy
	return hasTokens;
  },

  refreshToken: async (): Promise<boolean> => {
	const now = Date.now();
	if (now - lastSuccessfulRefreshTime < REFRESH_COOLDOWN) {
	  authDebug.log("refreshToken", "Skipping refresh due to cooldown");
	  // Return true because we assume the tokens are still likely valid within the cooldown
	  return true;
	}

	if (refreshPromise) {
	  authDebug.log("refreshToken", "Reusing existing refresh promise");
	  return refreshPromise;
	}

	refreshPromise = (async () => {
	  let success = false;
	  try {
		const currentRefreshToken = authUtils.getRefreshToken();
		if (!currentRefreshToken) {
		  authDebug.log("refreshToken", "No refresh token available for refresh attempt.");
		  // If no refresh token, clear everything and signal failure
		  authUtils.clearAuthStorage();
		  authUtils.setAuthenticatedState(false);
		  return false;
		}

		authDebug.log("refreshToken", "Attempting token refresh via proxy");
		// Ensure this proxy route exists and works
		const response = await fetch(`/api/auth-proxy/refresh`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ refreshToken: currentRefreshToken }),
		  // credentials: "include", // Usually not needed when calling own API route
		});

		if (!response.ok) {
			// Handle specific errors from refresh endpoint
			const errorData = await response.json().catch(() => ({ message: `Refresh failed with status ${response.status}` }));
			authDebug.error("refreshToken", `Refresh failed (${response.status}):`, errorData.message || errorData);
			 // Clear storage on explicit failure (like invalid refresh token)
			 authUtils.clearAuthStorage();
			 authUtils.setAuthenticatedState(false);
			return false;
		}

		const data = await response.json();
		if (data.accessToken && data.refreshToken) {
		  authUtils.saveTokens(data.accessToken, data.refreshToken);
		  lastSuccessfulRefreshTime = Date.now();
		  authDebug.log("refreshToken", "Refresh successful");
		  success = true;
		} else {
		  authDebug.error("refreshToken", "Refresh response missing tokens:", data);
		  authUtils.clearAuthStorage();
		  authUtils.setAuthenticatedState(false);
		  success = false;
		}
	  } catch (e) {
		authDebug.error("refreshToken", "Network or unexpected error during refresh:", e);
		// Consider if clearing storage is appropriate for network errors vs invalid token errors
		// authUtils.clearAuthStorage(); // Maybe only clear on 401/403 type errors from backend
		 authUtils.setAuthenticatedState(false); // Reflect potential logged-out state
		success = false;
	  } finally {
		refreshPromise = null; // Clear promise regardless of outcome
	  }
	  return success;
	})();

	return refreshPromise;
  },

  ensureValidToken: async (): Promise<string | null> => {
	const accessToken = authUtils.getAccessToken();
	if (!accessToken) {
		authDebug.log("ensureValidToken", "No access token found, trying refresh...");
		const refreshed = await authUtils.refreshToken();
		return refreshed ? authUtils.getAccessToken() : null;
	}

	const metadataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA);
	let needsRefresh = false;
	if (metadataStr) {
		try {
			const metadata: TokenMetadata = JSON.parse(metadataStr);
			// Refresh if token expires within the next 60 seconds
			if (metadata.accessExpiry < Date.now() + 60000) {
				authDebug.log("ensureValidToken", "Token expiring soon, refreshing");
				needsRefresh = true;
			}
		} catch (e) {
			authDebug.error("ensureValidToken", "Error parsing metadata, forcing refresh", e);
			needsRefresh = true; // Force refresh if metadata is corrupt
		}
	} else {
		authDebug.log("ensureValidToken", "No metadata found, forcing refresh");
		needsRefresh = true; // Force refresh if no metadata
	}

	if (needsRefresh) {
		const refreshed = await authUtils.refreshToken();
		return refreshed ? authUtils.getAccessToken() : null;
	}

	// authDebug.log("ensureValidToken", "Token is valid"); // Can be noisy
	return accessToken;
  },

  setupRefreshTimer: (): void => {
	if (typeof window === "undefined") return;
	if (window._refreshTimerId) {
		// authDebug.log("setupRefreshTimer", "Clearing existing timer");
		clearTimeout(window._refreshTimerId);
	}

	const metadataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN_METADATA);
	if (!metadataStr) {
	  authDebug.log("setupRefreshTimer", "No metadata, cannot schedule refresh");
	  return;
	}

	try {
		const metadata: TokenMetadata = JSON.parse(metadataStr);
		// Schedule refresh 3 minutes before actual expiry, minimum 1 second delay
		const refreshBuffer = 180000; // 3 minutes in ms
		const timeUntilRefresh = Math.max(metadata.accessExpiry - Date.now() - refreshBuffer, 1000);

		// Don't schedule if refresh token itself might be expired (optional check)
		if (metadata.refreshExpiry && metadata.refreshExpiry < Date.now()) {
			authDebug.warn("setupRefreshTimer", "Refresh token likely expired, not scheduling refresh.");
			// Optionally clear storage here if refresh token is definitely expired
			// authUtils.clearAuthStorage();
			// authUtils.setAuthenticatedState(false);
			return;
		}

		window._refreshTimerId = setTimeout(async () => {
			authDebug.log("setupRefreshTimer", "Timer triggered, attempting refresh");
			const success = await authUtils.refreshToken();
			// Only reschedule if refresh was successful
			if (success) {
				 authUtils.setupRefreshTimer();
			} else {
				 authDebug.warn("setupRefreshTimer", "Refresh failed after timer, not rescheduling.");
				 // Optionally trigger logout flow here
			}
		}, timeUntilRefresh);

		authDebug.log("setupRefreshTimer", `Scheduled refresh in ~${Math.round(timeUntilRefresh / 60000)} minutes`);

	} catch (e) {
		 authDebug.error("setupRefreshTimer", "Error parsing metadata for scheduling:", e);
	}
  },

  // --- fetchWithAuth ---
  // Uses ensureValidToken to get a valid token, then makes the fetch call
  // Automatically adds Authorization header. Assumes JSON content type.
  fetchWithAuth: async (url: string, options: RequestInit = {}): Promise<Response> => {
	const token = await authUtils.ensureValidToken();
	if (!token) {
	  // If no valid token could be obtained (e.g., refresh failed), reject the promise.
	  authDebug.error("fetchWithAuth", `Cannot fetch ${url}: No valid token`);
	  // Simulate a 401 response to trigger appropriate error handling downstream
	  return Promise.resolve(new Response(JSON.stringify({ message: "Authentication required", error: "No valid token" }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
	}

	authDebug.log("fetchWithAuth", `Fetching ${url} with token`);
	const defaultHeaders: Record<string, string> = {
		'Authorization': `Bearer ${token}`,
	};
	// Only add Content-Type if there's a body and it wasn't explicitly set otherwise
	if (options.body && !(options.headers && 'Content-Type' in options.headers)) {
		 defaultHeaders['Content-Type'] = 'application/json';
	}


	return fetch(url, {
	  ...options,
	  headers: {
		...defaultHeaders, // Add auth and default content-type
		...options.headers, // Allow overriding defaults
	  },
	  // credentials: "include", // Usually not needed when calling own API routes
	});
  },

  // --- getAuthHeaders (Corrected for Axios) ---
  // Returns a plain object suitable for Axios headers config
  getAuthHeaders: (extraHeaders: Record<string, string> = {}): Record<string, string> => {
	const token = authUtils.getAccessToken();
	const baseHeaders: Record<string, string> = {
		// Set default Content-Type that Axios expects, can be overridden by extraHeaders
		'Content-Type': 'application/json',
		...extraHeaders, // Spread extra headers first to allow override
	};
	if (token) {
		// Add/overwrite Authorization header
		baseHeaders['Authorization'] = `Bearer ${token}`;
	}
	// authDebug.log("getAuthHeaders", "Generated headers", baseHeaders); // Can be noisy
	return baseHeaders;
  },

  handleAuthError: (error: any): void => {
	// Basic error handling, triggers toast notifications
	if (!error) return;
	const status = error?.status ?? error?.statusCode ?? error?.response?.status;
	const message = error?.message ?? "An unknown error occurred";

	authDebug.warn("handleAuthError", `Handling error (status: ${status})`, message);

	if (status === 401 || status === 403) {
	  toast.error("Session expired or unauthorized. Please log in again.", {toastId: 'authError'});
	  // Attempt refresh - NOTE: This might cause loops if refresh itself fails with 401
	  // Consider adding logic to prevent infinite refresh loops
	   authUtils.refreshToken().then(success => {
		  if (!success) {
			  // If refresh fails immediately, redirect to login
			  authUtils.clearAuthStorage();
			  authUtils.setAuthenticatedState(false);
			  // Avoid redirecting if already on login page
			  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
				window.location.href = '/login'; // Force reload redirect
			  }
		  }
	   });
	} else if (status >= 500) {
	  toast.error("A server error occurred. Please try again later.", {toastId: 'serverError'});
	} else if (typeof navigator !== 'undefined' && !navigator.onLine) {
	  toast.warn("You appear to be offline. Some actions may fail.", {toastId: 'offlineError'});
	} else if (status === 400) {
		 toast.error(`Bad request: ${message}`, {toastId: 'badRequestError'});
	} else if (status === 404) {
		 toast.warn(`Resource not found: ${message}`, {toastId: 'notFoundError'});
	}
	 // Don't toast generic network errors if offline message was already shown
	else if (message !== "Network Error" || (typeof navigator !== 'undefined' && navigator.onLine)) {
	   // Avoid double-toasting common errors
	   if (!String(message).includes("token") && !String(message).includes("Authentication")) {
		  toast.error(`An error occurred: ${message}`, {toastId: 'genericError'});
	   }
	}
  },

  getUserData: (): any => {
	try {
	  if (typeof window === 'undefined') return null;
	  const userDataStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	  return userDataStr ? JSON.parse(userDataStr) : null;
	} catch (e) {
	  authDebug.error("getUserData", "Error getting user data:", e);
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_DATA); // Clear corrupted data
	  return null;
	}
  },

  updateUserData: (data: any): boolean => {
	try {
		if (typeof window === 'undefined') return false;
	  const currentData = authUtils.getUserData() || {}; // Get current or empty object
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify({ ...currentData, ...data }));
	  return true;
	} catch (e) {
	  authDebug.error("updateUserData", "Error updating user data:", e);
	  return false;
	}
  },

  ensureUserProfile: async (): Promise<any> => {
	// Try cache first
	const cachedUserData = authUtils.getUserData();
	if (cachedUserData?.email) { // Check for a key property like email
	  // authDebug.log("ensureUserProfile", "Using cached profile");
	  return cachedUserData;
	}

	const token = await authUtils.ensureValidToken();
	if (!token) {
	  authDebug.error("ensureUserProfile", "Cannot fetch profile: No valid token");
	  return null;
	}

	try {
	  authDebug.log("ensureUserProfile", "Fetching profile via proxy");
	  // Use the specific auth proxy endpoint
	  const response = await fetch(`/api/auth-proxy/profile`, {
		headers: {
		  'Authorization': `Bearer ${token}`,
		},
	  });

	  if (!response.ok) {
		const errorData = await response.json().catch(() => ({ message: `Profile fetch failed: ${response.status}` }));
		authDebug.error("ensureUserProfile", `Fetch failed (${response.status}):`, errorData.message || errorData);
		if (response.status === 401 || response.status === 403) {
			// If profile fetch fails with auth error, trigger logout/refresh mechanism
			authUtils.handleAuthError({ status: response.status });
		}
		return null; // Return null on failure
	  }

	  const profile = await response.json();
	  // Store profile in localStorage
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(profile));
	  authDebug.log("ensureUserProfile", "Profile fetched and stored");
	  return profile;
	} catch (e) {
	  authDebug.error("ensureUserProfile", "Network or unexpected error fetching profile:", e);
	  return null;
	}
  },

  setAuthenticatedState: (isAuthenticated: boolean): void => {
	// This function seems redundant if isAuthenticated() relies on token presence.
	// Keeping it for potential explicit state tracking if needed.
	try {
	   if (typeof window === 'undefined') return;
	  if (isAuthenticated) {
		localStorage.setItem(
		  API_CONFIG.STORAGE_KEYS.AUTH_STATE,
		  JSON.stringify({ authenticated: true, lastUpdated: Date.now() })
		);
		// authDebug.log("setAuthenticatedState", "Set to authenticated");
	  } else {
		localStorage.removeItem(API_CONFIG.STORAGE_KEYS.AUTH_STATE);
		// authDebug.log("setAuthenticatedState", "Set to unauthenticated");
	  }
	} catch (e) {
	  authDebug.error("setAuthenticatedState", "Error setting state:", e);
	}
  },

   // --- Network Status ---
  checkNetworkStatus: (): boolean => {
	if (typeof navigator !== "undefined" && !navigator.onLine) {
	  authDebug.log("checkNetworkStatus", "Offline");
	  return false;
	}
	return true;
  },

  queueOfflineOperation: (operation: () => Promise<void>): void => {
	authDebug.log("queueOfflineOperation", "Queuing operation for later");
	authUtils._pendingOperations.push(operation);
	// Consider persisting pending operations to localStorage for resilience
  },

  processPendingOperations: async (): Promise<void> => {
	if (!authUtils.checkNetworkStatus()) {
		authDebug.log("processPendingOperations", "Still offline, skipping processing");
		return;
	}
	if (authUtils._pendingOperations.length === 0) return;

	authDebug.log("processPendingOperations", `Processing ${authUtils._pendingOperations.length} queued operations`);
	const operationsToProcess = [...authUtils._pendingOperations];
	authUtils._pendingOperations = []; // Clear queue before processing

	for (const op of operationsToProcess) {
	  try {
		await op(); // Attempt the operation
	  } catch (e) {
		authDebug.error("processPendingOperations", "Error executing queued operation:", e);
		// Decide if the failed operation should be re-queued or dropped
		// authUtils._pendingOperations.unshift(op); // Example: Re-queue at the beginning
	  }
	}
	 authDebug.log("processPendingOperations", `Finished processing operations`);
  },

  setupNetworkListeners: (onlineCallback?: () => void, offlineCallback?: () => void): () => void => {
	if (typeof window === "undefined") return () => {};

	const handleOnline = () => {
	  authDebug.log("setupNetworkListeners", "Network status: Online");
	  authUtils.processPendingOperations(); // Process queue when coming online
	  if (onlineCallback) onlineCallback();
	};
	const handleOffline = () => {
	  authDebug.log("setupNetworkListeners", "Network status: Offline");
	  if (offlineCallback) offlineCallback();
	};

	window.addEventListener("online", handleOnline);
	window.addEventListener("offline", handleOffline);

	// Initial check
	if (navigator.onLine) handleOnline(); else handleOffline();

	// Return cleanup function
	return () => {
	  window.removeEventListener("online", handleOnline);
	  window.removeEventListener("offline", handleOffline);
	};
  },

};

// --- useAuth Hook ---
// Provides authentication state and functions to components
export const useAuth = () => {
  const router = useRouter();
  // Initialize state from localStorage synchronously if possible
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
	  if (typeof window !== 'undefined') {
		  return authUtils.isAuthenticated();
	  }
	  return false;
  });
  const [isLoading, setIsLoading] = useState(true); // Start loading until initial check is done
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" ? !navigator.onLine : false);

  useEffect(() => {
	let isMounted = true; // Prevent state updates on unmounted component

	const initializeAuth = async () => {
	  // Ensure initial state syncs with storage after hydration
	  const authenticated = authUtils.isAuthenticated();
	   if (isMounted) setIsAuthenticated(authenticated);

	  if (authenticated) {
		// Setup timer and fetch profile only if authenticated
		authUtils.setupRefreshTimer();
		await authUtils.ensureUserProfile(); // Fetch profile after confirming auth
	  }
	  if (isMounted) setIsLoading(false); // Mark loading complete
	};

	const cleanupListeners = authUtils.setupNetworkListeners(
	  () => { if(isMounted) setIsOffline(false) },
	  () => { if(isMounted) setIsOffline(true) }
	);

	initializeAuth();

	// Cleanup function
	return () => {
	  isMounted = false;
	  if (typeof window !== "undefined" && window._refreshTimerId) {
		 clearTimeout(window._refreshTimerId); // Clear timer on unmount
	  }
	  cleanupListeners(); // Remove network listeners
	};
  }, []); // Run only once on mount

  // Memoized callbacks for stability
  const getAccessToken = useCallback(() => authUtils.getAccessToken(), []);
  const getAuthHeaders = useCallback((extraHeaders = {}) => authUtils.getAuthHeaders(extraHeaders), []);

  // Enhanced refreshToken callback
  const refreshToken = useCallback(async () => {
	setIsLoading(true); // Indicate loading during refresh attempt
	const success = await authUtils.refreshToken();
	if (!success) {
	  // Refresh failed, update state and potentially redirect
	  setIsAuthenticated(false);
	  authDebug.warn("useAuth.refreshToken", "Refresh failed, redirecting to login");
	  if (!["/login", "/register"].some((path) => window.location.pathname.startsWith(path))) {
		router.push("/login"); // Use Next.js router for navigation
	  }
	} else {
	  setIsAuthenticated(true); // Ensure state reflects successful refresh
	}
	setIsLoading(false);
	return success;
  }, [router]);

  const ensureValidToken = useCallback(async () => {
	  // No need to set loading here as ensureValidToken might be called frequently
	  const token = await authUtils.ensureValidToken();
	  if (!token && isAuthenticated) { // If token became invalid while supposedly authenticated
		  setIsAuthenticated(false); // Update local state
	  }
	  return token;
  },[isAuthenticated]);


  const handleAuthError = useCallback((error: any) => {
	authUtils.handleAuthError(error); // Delegate to central handler
	// Additional hook-specific logic if needed, e.g., updating local state
	const status = error?.status ?? error?.statusCode ?? error?.response?.status;
	if (status === 401 || status === 403) {
		setIsAuthenticated(false); // Reflect likely logged-out state
	}
  }, []);

  // fetchWithAuth wrapper using the hook's context
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
	try {
	   // ensureValidToken already handles refresh internally
	  return await authUtils.fetchWithAuth(url, options);
	} catch (e: any) {
		// Catch errors (like the simulated 401 from fetchWithAuth if token is missing)
		handleAuthError(e);
		throw e; // Re-throw the error so calling code knows it failed
	}
  }, [handleAuthError]); // ensureValidToken dependency removed as it's called internally


  // Login function
  const login = useCallback(async (email: string, password: string) => {
	setIsLoading(true);
	try {
	  authDebug.log("useAuth.login", `Attempting login for: ${email}`);
	  // Call the auth-proxy endpoint
	  const response = await fetch(`/api/auth-proxy/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	  });

	  const data = await response.json();

	  if (!response.ok) {
		authDebug.error("useAuth.login", `Login failed (${response.status}):`, data.message || data);
		toast.error(data.message || `Login failed: ${response.status}`);
		setIsLoading(false);
		return { success: false, error: data };
	  }

	  if (data.accessToken && data.refreshToken) {
		authUtils.clearAuthStorage(); // Clear any old stuff first
		authUtils.saveTokens(data.accessToken, data.refreshToken);
		authUtils.setAuthenticatedState(true);
		setIsAuthenticated(true); // Update hook state
		await authUtils.ensureUserProfile(); // Fetch profile immediately after login
		authDebug.log("useAuth.login", "Login successful");
		setIsLoading(false);
		return { success: true, data };
	  } else {
		authDebug.error("useAuth.login", "Login response missing tokens");
		toast.error("Login failed: Invalid server response.");
		 setIsLoading(false);
		return { success: false, error: { message: "Invalid server response" } };
	  }
	} catch (e) {
	  authDebug.error("useAuth.login", "Exception during login:", e);
	  toast.error("An unexpected error occurred during login.");
	  setIsLoading(false);
	  return { success: false, error: { message: e instanceof Error ? e.message : "Unknown error" } };
	}
  }, []); // Removed router dependency as it's not used here

  // Logout function
  const logout = useCallback(async () => {
	setIsLoading(true);
	authDebug.log("useAuth.logout", "Initiating logout");
	const currentRefreshToken = authUtils.getRefreshToken(); // Get token *before* clearing storage

	try {
	  if (authUtils.checkNetworkStatus() && currentRefreshToken) {
		// Attempt to invalidate token on the backend via proxy
		await fetch(`/api/auth-proxy/logout`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ refreshToken: currentRefreshToken }),
		});
		// We don't strictly need to wait for or check the logout response
		authDebug.log("useAuth.logout", "Backend logout request sent (best effort)");
	  }
	} catch (e) {
	  authDebug.error("useAuth.logout", "Backend logout request failed:", e);
	  // Continue with local logout anyway
	} finally {
	  // Always clear local storage and state
	  authUtils.clearAuthStorage();
	  setIsAuthenticated(false);
	  authUtils.setAuthenticatedState(false);
	  setIsLoading(false);
	  authDebug.log("useAuth.logout", "Local logout complete, redirecting");
	  // Use router for client-side navigation after state updates
	  router.push("/login");
	}
  }, [router]);

  // Return the hook's value
  return {
	isAuthenticated,
	isLoading,
	isOffline,
	login,
	logout,
	refreshToken,
	ensureValidToken,
	handleAuthError,
	getAccessToken,
	getAuthHeaders,
	fetchWithAuth,
  };
};


// --- Initial Setup ---
// Attempt to setup timer or process queue on initial load if authenticated
if (typeof window !== "undefined") {
	if (authUtils.isAuthenticated()) {
		authUtils.setupRefreshTimer();
	}
	// Process any operations queued from previous sessions (if offline persistence was added)
	authUtils.processPendingOperations();
	// Setup network listeners globally once
	authUtils.setupNetworkListeners();
}