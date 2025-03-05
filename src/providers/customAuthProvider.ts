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

class AuthProviderClass implements AuthProvider {
  constructor() {
	this.login = this.login.bind(this);
	this.register = this.register.bind(this);
	this.check = this.check.bind(this);
	this.logout = this.logout.bind(this);
	this.onError = this.onError.bind(this);
	this.getIdentity = this.getIdentity.bind(this);
	this.forgotPassword = this.forgotPassword.bind(this);
	this.updatePassword = this.updatePassword.bind(this);
	this.getPermissions = this.getPermissions.bind(this);
  }

  async login(params: any) {
	const { providerName, email, password } = params;

	// Handle different OAuth providers
	if (providerName === "auth0") {
	  return {
		success: false,
		error: {
		  message: "Redirecting to Auth0...",
		  name: "Auth0"
		}
	  };
	}

	if (providerName === "google") {
	  window.location.href = `${API_CONFIG.API_URL}/auth/google`;
	  return {
		success: true
	  };
	}

	if (providerName === "github") {
	  window.location.href = `${API_CONFIG.API_URL}/auth/github`;
	  return {
		success: true
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
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, loginData.accessToken);
	  localStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, loginData.refreshToken);

	  // Fetch user profile after successful login
	  try {
		const profileResponse = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
		  method: 'GET',
		  headers: {
			'Authorization': `Bearer ${loginData.accessToken}`,
		  },
		});

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
	const userStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	const accessToken = authUtils.getAccessToken();
	const refreshToken = authUtils.getRefreshToken();
  
	if (!accessToken || !refreshToken || !userStr) {
	  console.log("No tokens or user data found");
	  authUtils.clearAuthStorage();
	  return { authenticated: false };
	}
  
	try {
	  // Try to validate the current token
	  const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${accessToken}`,
		},
	  });
  
	  if (response.ok) {
		// Update user data in localStorage to ensure it's fresh
		const userData = await response.json();
		const updatedUserData = {
		  ...userData,
		  accessToken,
		  refreshToken
		};
		localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
		return { authenticated: true };
	  }
  
	  // If token is invalid, try refresh using our centralized utility
	  if (response.status === 401 || response.status === 403) {
		const refreshSuccess = await authUtils.refreshToken(); // Use centralized refresh
		return { authenticated: refreshSuccess };
	  }
  
	  authUtils.clearAuthStorage();
	  return { authenticated: false };
	} catch (error) {
	  console.error("Auth check error:", error);
	  authUtils.clearAuthStorage();
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
		token: userData.accessToken,
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
	const userStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	if (!userStr) return null;

	try {
	  const userData: UserData = JSON.parse(userStr);
	  const accessToken = userData.accessToken || authUtils.getAccessToken();
	  
	  if (!accessToken) return null;
	  
	  // Try to get permissions with current token
	  const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PERMISSIONS}`, {
		headers: {
		  'Authorization': `Bearer ${accessToken}`,
		},
	  });

	  // If token invalid, try to refresh using our centralized utility
	  if (response.status === 401 || response.status === 403) {
		const refreshSuccess = await authUtils.refreshToken(); // Use centralized refresh
		if (!refreshSuccess) return null;
		
		// Get fresh token after refresh
		const newAccessToken = authUtils.getAccessToken();
		if (!newAccessToken) return null;
		
		// Retry with new token
		const newResponse = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PERMISSIONS}`, {
		  headers: {
			'Authorization': `Bearer ${newAccessToken}`,
		  },
		});
		
		if (newResponse.ok) {
		  const { roles } = await newResponse.json();
		  return roles;
		}
		return null;
	  }

	  if (response.ok) {
		const { roles } = await response.json();
		return roles;
	  }
	  return null;
	} catch (error) {
	  return null;
	}
  }

  async updatePassword(params: any) {
	const userStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	if (!userStr) {
	  return {
		success: false,
		error: {
		  message: "Not authenticated",
		  name: "Update password failed"
		}
	  };
	}

	try {
	  const userData: UserData = JSON.parse(userStr);
	  const accessToken = userData.accessToken || authUtils.getAccessToken();
	  
	  if (!accessToken) {
		return {
		  success: false,
		  error: {
			message: "Not authenticated",
			name: "Update password failed"
		  }
		};
	  }
	  
	  const response = await fetch(`${API_CONFIG.API_URL}/auth/update-password`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		  'Authorization': `Bearer ${accessToken}`,
		},
		body: JSON.stringify(params),
	  });

	  // If token invalid, try to refresh using our centralized utility
	  if (response.status === 401 || response.status === 403) {
		const refreshSuccess = await authUtils.refreshToken(); // Use centralized refresh
		if (!refreshSuccess) {
		  return {
			success: false,
			error: {
			  message: "Session expired",
			  name: "Update password failed"
			}
		  };
		}
		
		// Get fresh token after refresh
		const newAccessToken = authUtils.getAccessToken();
		if (!newAccessToken) {
		  return {
			success: false,
			error: {
			  message: "Authentication failed",
			  name: "Update password failed"
			}
		  };
		}
		
		// Retry with new token
		const newResponse = await fetch(`${API_CONFIG.API_URL}/auth/update-password`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${newAccessToken}`,
		  },
		  body: JSON.stringify(params),
		});
		
		if (!newResponse.ok) {
		  const errorData = await newResponse.json();
		  return {
			success: false,
			error: {
			  message: errorData.message || "Invalid password",
			  name: "Update password failed"
			}
		  };
		}
		
		return { success: true };
	  }

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
		await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify({ refreshToken }),
		}).catch(() => {
		  // Ignore server errors during logout
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
	const status = error?.response?.status || error?.statusCode || error?.status;
	
	// Handle authentication errors using our centralized utility
	if (status === 401 || status === 403) {
	  // Try to refresh token using the centralized utility
	  const refreshSuccess = await authUtils.refreshToken();
	  if (refreshSuccess) {
		// Successfully refreshed, don't log out
		return { error };
	  }
	  
	  // If refresh failed, log out
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