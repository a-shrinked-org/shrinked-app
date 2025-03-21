// src/providers/customAuthProvider.ts
import { AuthProvider } from "@refinedev/core";
import { authUtils, API_CONFIG } from "@/utils/authUtils";
import { nanoid } from "nanoid";

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
  isVerified?: boolean;
}

interface IdentityData {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  roles?: string[];
  token?: string;
  subscriptionPlan?: string;
  apiKeys?: string[];
  userId?: string;
}

const AUTH_CHECK_COOLDOWN = 2000; // 2 seconds between auth checks
let lastAuthCheckTime = 0;

const loopsCache = new Map();
const LOOPS_CACHE_TIMEOUT = 30000;

const cachedLoopsRequest = async (endpoint: string, email: string, body?: any) => {
  const cacheKey = `${endpoint}:${email}`;
  const cached = loopsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < LOOPS_CACHE_TIMEOUT) {
	return cached.data;
  }
  
  const method = body ? "POST" : "GET";
  const url = `/api/loops?endpoint=${endpoint}&email=${encodeURIComponent(email)}`;
  
  try {
	const response = await fetch(url, {
	  method,
	  headers: { "Content-Type": "application/json" },
	  ...(body ? { body: JSON.stringify(body) } : {})
	});
	
	if (!response.ok) {
	  throw new Error(`Loops API error: ${response.status}`);
	}
	
	const data = await response.json();
	loopsCache.set(cacheKey, { data, timestamp: Date.now() });
	return data;
  } catch (error) {
	console.error(`Loops ${endpoint} error:`, error);
	throw error;
  }
};

export const customAuthProvider: Required<AuthProvider> & {
  register: (params: any) => Promise<any>;
  forgotPassword: (params: any) => Promise<any>;
  updatePassword: (params: any) => Promise<any>;
  verifyEmail: (params: { token: string; email: string; password: string }) => Promise<any>;
} = {
  async login(params: any) {
	const { providerName, email, password } = params;
  
	// Handle social logins
	if (providerName === "auth0" || providerName === "google" || providerName === "github") {
	  const redirectUrl = providerName === "auth0" ? undefined : `${API_CONFIG.API_URL}/auth/${providerName}`;
	  if (redirectUrl) window.location.href = redirectUrl;
	  return { success: false, error: { message: `Redirecting to ${providerName}...`, name: providerName } };
	}
  
	// Handle registration
	if (providerName === "register") {
	  return customAuthProvider.register({ email, password });
	}
  
	try {
	  if (!navigator.onLine) {
		return { success: false, error: { message: "You are offline", name: "NetworkError" } };
	  }
  
	  // Email check with Loops (only if no password provided)
	  if (!password) {
		try {
		  // Use cachedLoopsRequest for finding contacts in Loops
		  const loopsResponse = await cachedLoopsRequest('contacts/find', email);
		  
		  // If contact exists in Loops, prompt for password
		  if (Array.isArray(loopsResponse) && loopsResponse.length > 0) {
			return { success: true }; // Prompt for password
		  }
		  
		  // Email not found in Loops, suggest registration
		  return { 
			success: false, 
			error: { message: "Email not found. Please register.", name: "RegistrationRequired" } 
		  };
		} catch (error) {
		  console.error("Loops check error:", error);
		  
		  // If Loops API fails, try direct auth check
		  try {
			const checkResponse = await fetch(`/api/auth-proxy/check-email`, {
			  method: "POST",
			  headers: { "Content-Type": "application/json" },
			  body: JSON.stringify({ email }),
			});
			
			if (checkResponse.ok) {
			  const checkData = await checkResponse.json();
			  if (checkData.exists) {
				return { success: true }; // Prompt for password
			  }
			}
		  } catch (fallbackError) {
			console.error("Fallback email check failed:", fallbackError);
		  }
		  
		  // If all checks fail, assume registration is required
		  return { 
			success: false, 
			error: { message: "Email not found. Please register.", name: "RegistrationRequired" } 
		  };
		}
	  }
  
	  // Full login
	  const response = await fetch(`/api/auth-proxy/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
		credentials: "include",
	  });
  
	  const data = await response.json();
	  if (!response.ok) {
		return { success: false, error: { message: data.message || "Login failed", name: "LoginError" } };
	  }
  
	  if (data.accessToken && data.refreshToken) {
		authUtils.saveTokens(data.accessToken, data.refreshToken);
		const profile = await authUtils.ensureUserProfile();
		if (!profile) {
		  authUtils.clearAuthStorage();
		  return { success: false, error: { message: "Failed to fetch profile", name: "ProfileError" } };
		}
		authUtils.setAuthenticatedState(true);
		return { success: true, redirectTo: "/jobs" };
	  }
  
	  return { success: false, error: { message: "Invalid response", name: "LoginError" } };
	} catch (error) {
	  authUtils.clearAuthStorage();
	  return {
		success: false,
		error: { message: error instanceof Error ? error.message : "Login failed", name: "LoginError" },
	  };
	}
  },

  async register(params: any) {
	const { email, password, username } = params;

	try {
	  // Check if email exists in Loops using cachedLoopsRequest
	  const checkData = await cachedLoopsRequest('contacts/find', email);
	  
	  if (Array.isArray(checkData) && checkData.length > 0) {
		return { success: false, error: { message: "Email already registered", name: "EmailExists" } };
	  }

	  // Generate token and create contact
	  const token = nanoid(21);
	  
	  // Use cachedLoopsRequest for contact creation
	  await cachedLoopsRequest('contacts/create', email, { 
		email, 
		registrationPending: true, 
		validationEmailSent: true 
	  });

	  // Send validation email
	  const validationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}&email=${encodeURIComponent(email)}`;
	  
	  // Use cachedLoopsRequest for sending transactional email
	  await cachedLoopsRequest('transactional', email, {
		transactionalId: "cm7wuis1m08624etab0lrimzz",
		email,
		dataVariables: { "verify-url": validationUrl },
	  });

	  // Store pending user data
	  localStorage.setItem("pendingUser", JSON.stringify({ 
		email, 
		username: username || email.split("@")[0], 
		token, 
		password 
	  }));
	  
	  return { success: true };
	} catch (error) {
	  return {
		success: false,
		error: { message: error instanceof Error ? error.message : "Registration failed", name: "RegistrationError" },
	  };
	}
  },

  async check() {
	const now = Date.now();
	if (now - lastAuthCheckTime < AUTH_CHECK_COOLDOWN) {
	  return { authenticated: authUtils.isAuthenticated() };
	}
	lastAuthCheckTime = now;

	const authenticated = authUtils.isAuthenticated();
	if (!authenticated) authUtils.clearAuthStorage();
	return { authenticated };
  },

  async logout() {
	try {
	  const refreshToken = authUtils.getRefreshToken();
	  if (refreshToken && navigator.onLine) {
		await fetch(`/api/auth-proxy/logout`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ refreshToken }),
		  credentials: "include",
		}).catch(() => {}); // Ignore server errors
	  }
	} finally {
	  authUtils.clearAuthStorage();
	  authUtils.setAuthenticatedState(false);
	  return { success: true, redirectTo: "/login" };
	}
  },

  async onError(error: any) {
	authUtils.handleAuthError(error);
	const status = error?.response?.status || error?.status || error?.statusCode;
	if (status === 401 || status === 403) {
	  const refreshSuccess = await authUtils.refreshToken();
	  if (!refreshSuccess) {
		authUtils.clearAuthStorage();
		return { logout: true, redirectTo: "/login", error };
	  }
	}
	return { error };
  },

  async getIdentity() {
	const userProfile = await authUtils.ensureUserProfile();
	if (!userProfile) return null;

	return {
	  id: userProfile.userId || userProfile._id || userProfile.id,
	  name: userProfile.username || userProfile.email,
	  email: userProfile.email,
	  avatar: userProfile.avatar || "",
	  roles: userProfile.roles || [],
	  token: authUtils.getAccessToken() || userProfile.accessToken,
	  subscriptionPlan: userProfile.subscriptionPlan,
	  apiKeys: userProfile.apiKeys || [],
	  userId: userProfile.userId || userProfile._id || userProfile.id,
	};
  },

  async getPermissions() {
	const userProfile = await authUtils.ensureUserProfile();
	return userProfile?.roles || null;
  },

  async forgotPassword(params: any) {
	try {
	  const response = await fetch(`/api/auth-proxy/forgot-password`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(params),
		credentials: "include",
	  });
	  if (!response.ok) {
		const errorData = await response.json();
		return { success: false, error: { message: errorData.message || "Request failed", name: "ForgotPasswordError" } };
	  }
	  return { success: true };
	} catch (error) {
	  return {
		success: false,
		error: { message: error instanceof Error ? error.message : "Request failed", name: "ForgotPasswordError" },
	  };
	}
  },

  async updatePassword(params: any) {
	try {
	  const token = await authUtils.ensureValidToken();
	  if (!token) return { success: false, error: { message: "No valid token", name: "AuthError" } };

	  const response = await fetch(`/api/auth-proxy/update-password`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify(params),
		credentials: "include",
	  });
	  if (!response.ok) {
		const errorData = await response.json();
		return { success: false, error: { message: errorData.message || "Update failed", name: "UpdatePasswordError" } };
	  }
	  return { success: true };
	} catch (error) {
	  return {
		success: false,
		error: { message: error instanceof Error ? error.message : "Update failed", name: "UpdatePasswordError" },
	  };
	}
  },

  async verifyEmail(params: { token: string; email: string; password: string }) {
	const { token, email, password } = params;

	try {
	  const pendingUserStr = localStorage.getItem("pendingUser");
	  if (!pendingUserStr) {
		return { success: false, error: { message: "No pending user found", name: "VerificationError" } };
	  }

	  const pendingUser = JSON.parse(pendingUserStr);
	  if (pendingUser.token !== token || pendingUser.email !== email) {
		return { success: false, error: { message: "Invalid token or email", name: "VerificationError" } };
	  }

	  const response = await fetch(`/api/auth-proxy/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password, username: pendingUser.username }),
		credentials: "include",
	  });
	  const data = await response.json();
	  if (!response.ok) {
		return { success: false, error: { message: data.message || "Registration failed", name: "RegistrationError" } };
	  }

	  authUtils.saveTokens(data.accessToken, data.refreshToken);
	  authUtils.setAuthenticatedState(true);

	  // Update Loops contact using cachedLoopsRequest
	  await cachedLoopsRequest('contacts/update', email, {
		email, 
		emailVerified: true, 
		registrationPending: false, 
		registrationComplete: true
	  }).catch(() => {}); // Ignore Loops update errors

	  localStorage.removeItem("pendingUser");
	  return { success: true, redirectTo: "/jobs" };
	} catch (error) {
	  return {
		success: false,
		error: { message: error instanceof Error ? error.message : "Verification failed", name: "VerificationError" },
	  };
	}
  },
};

// Initialize auth state on load
if (typeof window !== "undefined") {
  setTimeout(() => {
	if (authUtils.isAuthenticated()) {
	  authUtils.ensureUserProfile().then((profile) => {
		if (profile) authUtils.setAuthenticatedState(true);
		else authUtils.clearAuthStorage();
	  });
	} else {
	  authUtils.clearAuthStorage();
	}
  }, 100);
}