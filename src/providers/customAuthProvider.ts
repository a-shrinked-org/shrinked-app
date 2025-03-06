// src/providers/customAuthProvider.ts
import { AuthProvider } from "@refinedev/core";
import { authUtils, API_CONFIG } from "@/utils/authUtils";

interface UserData {
  id?: string;
  userId?: string;
  _id?: string;
  email: string;
  username: string;
  roles?: string[];
  subscriptionPlan?: string;
  userHash?: string;
  tokens?: number;
  apiKeys?: string[];
  avatar?: string | null;
  accessToken?: string;
  refreshToken?: string;
}

// Track login/check attempts to prevent excessive requests
let lastAuthCheckTime = 0;
const AUTH_CHECK_COOLDOWN = 2000; // 2 seconds

class AuthProviderClass implements AuthProvider {
  async login(params: any) {
	const { providerName, email, password } = params;

	// Handle different OAuth providers
	if (providerName === "auth0" || providerName === "google" || providerName === "github") {
	  const redirectUrl = providerName === "auth0" 
		? undefined // Auth0 uses NextAuth
		: `${API_CONFIG.API_URL}/auth/${providerName}`;
	  
	  if (redirectUrl) {
		window.location.href = redirectUrl;
	  }
	  
	  return {
		success: false,
		error: {
		  message: `Redirecting to ${providerName}...`,
		  name: providerName
		}
	  };
	}

	// Handle email/password login
	try {
	  // Check for internet connection
	  if (!navigator.onLine) {
		return {
		  success: false,
		  error: {
			message: 'Network error: You appear to be offline',
			name: 'Connection Error'
		  }
		};
	  }

	  // Use fetch directly for login - based on Postman examples
	  const loginResponse = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password }),
	  });

	  // Handle Cloudflare errors
	  if (loginResponse.status === 521 || loginResponse.status === 522 || loginResponse.status === 523) {
		return {
		  success: false,
		  error: {
			message: 'The server is currently unreachable. Please try again later.',
			name: 'Connection Error'
		  }
		};
	  }

	  const loginData = await loginResponse.json();

	  if (!loginResponse.ok) {
		return {
		  success: false,
		  error: {
			message: loginData.message || 'Login failed',
			name: 'Invalid email or password'
		  }
		};
	  }

	  // Store tokens using centralized utilities
	  authUtils.saveTokens(loginData.accessToken, loginData.refreshToken);

	  // Fetch user profile after successful login
	  try {
		// Based on Postman collection, use Bearer token for profile fetch
		const profileResponse = await fetch(
		  `${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PROFILE}`,
		  {
			headers: {
			  'Authorization': `Bearer ${loginData.accessToken}`,
			  'Content-Type': 'application/json'
			}
		  }
		);

		if (!profileResponse.ok) {
		  authUtils.clearAuthStorage();
		  return {
			success: false,
			error: {
			  message: 'Could not verify user profile',
			  name: 'Login Error'
			}
		  };
		}

		const userData: UserData = await profileResponse.json();
		const userDataWithTokens = {
		  ...userData,
		  accessToken: loginData.accessToken,
		  refreshToken: loginData.refreshToken
		};
		
		localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userDataWithTokens));

		return {
		  success: true,
		  redirectTo: "/jobs",
		  user: userDataWithTokens
		};
	  } catch (profileError) {
		console.error("Error fetching user profile:", profileError);
		authUtils.clearAuthStorage();
		return {
		  success: false,
		  error: {
			message: 'Could not verify user profile',
			name: 'Login Error'
		  }
		};
	  }
	} catch (error) {
	  authUtils.clearAuthStorage();
	  return {
		success: false,
		error: {
		  message: error instanceof Error ? error.message : 'Login failed',
		  name: 'Login Error'
		}
	  };
	}
  }

  async register(params: any) {
	const { email, password, username } = params;
	try {
	  const registerResponse = await fetch(`${API_CONFIG.API_URL}/auth/register`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({
		  email,
		  password,
		  username,
		  subscriptionPlan: 'FREE'
		}),
	  });

	  const registerData = await registerResponse.json();

	  if (!registerResponse.ok) {
		return {
		  success: false,
		  error: {
			message: registerData.message || 'Registration failed',
			name: registerData.error || 'Registration Error'
		  }
		};
	  }

	  return this.login({ email, password });
	} catch (error) {
	  return {
		success: false,
		error: {
		  message: error instanceof Error ? error.message : 'Registration failed',
		  name: 'Registration Error'
		}
	  };
	}
  }

  async check() {
	// Add debouncing for auth checks to prevent excessive API calls
	const now = Date.now();
	if (now - lastAuthCheckTime < AUTH_CHECK_COOLDOWN) {
	  const authenticated = authUtils.isAuthenticated();
	  return { authenticated };
	}
	lastAuthCheckTime = now;
	
	// Use centralized authentication check
	const authenticated = authUtils.isAuthenticated();
	if (!authenticated) {
	  authUtils.clearAuthStorage();
	  return { authenticated: false };
	}
	
	try {
	  // Validate token with backend only if enough time has passed
	  const accessToken = authUtils.getAccessToken();
	  const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
		headers: {
		  'Authorization': `Bearer ${accessToken}`,
		  'Content-Type': 'application/json'
		}
	  });
	  
	  if (response.ok) {
		// Update user data in localStorage to ensure it's fresh
		const userData = await response.json();
		const accessToken = authUtils.getAccessToken();
		const refreshToken = authUtils.getRefreshToken();
		
		if (accessToken && refreshToken) {
		  const updatedUserData = {
			...userData,
			accessToken,
			refreshToken
		  };
		  localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
		}
		return { authenticated: true };
	  }
	  
	  // If we got here, token validation failed even after potential refresh
	  authUtils.clearAuthStorage();
	  return { authenticated: false };
	} catch (error) {
	  console.error("Auth check error:", error);
	  // Only clear storage for certain errors
	  if (error instanceof Error && 'status' in error && (error as any).status === 401) {
		authUtils.clearAuthStorage();
	  }
	  return { authenticated: false };
	}
  }

  async getIdentity() {
	const userStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	if (!userStr) {
	  return null;
	}
	
	try {
	  const userData: UserData = JSON.parse(userStr);
	  return {
		id: userData.userId || userData._id || userData.id,
		name: userData.username || userData.email,
		email: userData.email,
		avatar: userData.avatar || '',
		roles: userData.roles || [],
		token: userData.accessToken || authUtils.getAccessToken(),
		subscriptionPlan: userData.subscriptionPlan,
		apiKeys: userData.apiKeys || [],
		userId: userData.userId || userData._id || userData.id
	  };
	} catch (error) {
	  console.error("Error parsing user data:", error);
	  return null;
	}
  }

  async getPermissions() {
	// Use memory cache for permissions to reduce API calls
	const userStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	if (!userStr) return null;

	try {
	  const userData: UserData = JSON.parse(userStr);
	  // If roles exist in userData, use those without making API call
	  if (userData.roles && Array.isArray(userData.roles) && userData.roles.length > 0) {
		return userData.roles;
	  }
	  
	  // Only make API call if necessary
	  const accessToken = authUtils.getAccessToken();
	  const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PERMISSIONS}`, {
		headers: {
		  'Authorization': `Bearer ${accessToken}`,
		  'Content-Type': 'application/json'
		}
	  });
	  
	  if (response.ok) {
		const { roles } = await response.json();
		
		// Update roles in local storage for future use
		try {
		  userData.roles = roles;
		  localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
		} catch (e) {
		  console.error("Error updating roles in localStorage:", e);
		}
		
		return roles;
	  }
	  return null;
	} catch (error) {
	  console.error("Error getting permissions:", error);
	  return null;
	}
  }

  async updatePassword(params: any) {
	try {
	  const accessToken = authUtils.getAccessToken();
	  const response = await fetch(
		`${API_CONFIG.API_URL}/auth/update-password`,
		{
		  method: 'POST',
		  headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		  },
		  body: JSON.stringify(params)
		}
	  );

	  if (!response.ok) {
		const errorData = await response.json();
		return {
		  success: false,
		  error: {
			message: errorData.message || "Invalid password",
			name: "Update password failed"
		  }
		};
	  }

	  return { success: true };
	} catch (error) {
	  return {
		success: false,
		error: {
		  message: "Update failed",
		  name: "Update password failed"
		}
	  };
	}
  }

  async forgotPassword(params: any) {
	try {
	  const response = await fetch(`${API_CONFIG.API_URL}/auth/forgot-password`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify(params),
	  });

	  if (!response.ok) {
		const errorData = await response.json();
		return {
		  success: false,
		  error: {
			message: errorData.message || "Invalid email",
			name: "Forgot password failed"
		  }
		};
	  }

	  return {
		success: true
	  };
	} catch (error) {
	  return {
		success: false,
		error: {
		  message: "Request failed",
		  name: "Forgot password failed"
		}
	  };
	}
  }

  async logout() {
	// Attempt to invalidate refresh token on server if available
	try {
	  const refreshToken = authUtils.getRefreshToken();
	  if (refreshToken) {
		// Use a fetch with timeout to avoid hanging on server issues
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000);
		
		// Based on Postman collection, refreshToken should be in the request body
		await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify({ refreshToken }),
		  signal: controller.signal
		}).catch(() => {
		  // Ignore server errors during logout
		}).finally(() => {
		  clearTimeout(timeoutId);
		});
	  }
	} catch (error) {
	  // Continue with logout even if server request fails
	}
	
	// Use centralized method to clear storage
	authUtils.clearAuthStorage();
	
	return {
	  success: true,
	  redirectTo: "/login",
	};
  }

  async onError(error: any) {
	console.error("Auth error:", error);
	
	// Let the centralized error handler take care of it
	authUtils.handleAuthError(error);
	
	const status = error?.response?.status || error?.statusCode || error?.status;
	
	// Only fully log out for 401/403 that fail a token refresh
	if (status === 401 || status === 403) {
	  // Try refresh token, but don't create circular logic
	  const errorContext = error?.context;
	  const isFromRefresh = errorContext && errorContext.isRefreshAttempt;
	  
	  if (!isFromRefresh) {
		const refreshSuccess = await authUtils.refreshToken();
		if (refreshSuccess) {
		  // Successfully refreshed, don't log out
		  return { error };
		}
	  }
	  
	  // If refresh failed or this is already from a refresh, log out
	  authUtils.clearAuthStorage();
	  return {
		logout: true,
		redirectTo: "/login",
		error
	  };
	}
	
	// For other errors, just pass through
	return { error };
  }
}

const authProviderInstance = new AuthProviderClass();

type CustomAuthProvider = Required<AuthProvider> & {
  register: (params: any) => Promise<any>;
  forgotPassword?: (params: any) => Promise<any>;
  updatePassword?: (params: any) => Promise<any>;
  getPermissions?: (params?: any) => Promise<any>;
};

export const customAuthProvider: CustomAuthProvider = {
  login: authProviderInstance.login.bind(authProviderInstance),
  register: authProviderInstance.register.bind(authProviderInstance),
  logout: authProviderInstance.logout.bind(authProviderInstance),
  check: authProviderInstance.check.bind(authProviderInstance),
  onError: authProviderInstance.onError.bind(authProviderInstance),
  getIdentity: authProviderInstance.getIdentity.bind(authProviderInstance),
  forgotPassword: authProviderInstance.forgotPassword.bind(authProviderInstance),
  updatePassword: authProviderInstance.updatePassword.bind(authProviderInstance),
  getPermissions: authProviderInstance.getPermissions.bind(authProviderInstance),
} as const;