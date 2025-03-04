import { AuthProvider } from "@refinedev/core";

interface UserData {
  id?: string;
  userId?: string; // Add this property
  _id?: string;    // Add this property
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

const API_URL = 'https://api.shrinked.ai';

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
	this.refreshAccessToken = this.refreshAccessToken.bind(this);
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
	  window.location.href = `${API_URL}/auth/google`;
	  return {
		success: true
	  };
	}

	if (providerName === "github") {
	  window.location.href = `${API_URL}/auth/github`;
	  return {
		success: true
	  };
	}

	// Handle email/password login
	try {
	  const loginResponse = await fetch(`${API_URL}/auth/login`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password }),
	  });

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

	  localStorage.setItem('accessToken', loginData.accessToken);
	  localStorage.setItem('refreshToken', loginData.refreshToken);

	  // Fetch user profile after successful login
	  const profileResponse = await fetch(`${API_URL}/users/profile`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${loginData.accessToken}`,
		},
	  });

	  if (!profileResponse.ok) {
		this.clearStorage();
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
	  
	  localStorage.setItem('user', JSON.stringify(userDataWithTokens));

	  return {
		success: true,
		redirectTo: "/jobs",
		user: userDataWithTokens
	  };
	} catch (error) {
	  this.clearStorage();
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
	  const registerResponse = await fetch(`${API_URL}/auth/register`, {
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
	const userStr = localStorage.getItem('user');
	const accessToken = localStorage.getItem('accessToken');
	const refreshToken = localStorage.getItem('refreshToken');
  
	if (!accessToken || !refreshToken || !userStr) {
	  console.log("No tokens or user data found");
	  this.clearStorage();
	  return { authenticated: false };
	}
  
	try {
	  // Try to validate the current token
	  const response = await fetch(`${API_URL}/users/profile`, {
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
		localStorage.setItem('user', JSON.stringify(updatedUserData));
		return { authenticated: true };
	  }
  
	  // If token is invalid, try refresh
	  if (response.status === 401 || response.status === 403) {
		const newTokens = await this.refreshAccessToken(refreshToken);
		return { authenticated: !!newTokens };
	  }
  
	  this.clearStorage();
	  return { authenticated: false };
	} catch (error) {
	  console.error("Auth check error:", error);
	  this.clearStorage();
	  return { authenticated: false };
	}
  }

  async getIdentity() {
	const userStr = localStorage.getItem('user');
	if (!userStr) {
	  return null;
	}
	
	try {
	  const userData: UserData = JSON.parse(userStr);
	  return {
		id: userData.userId || userData._id || userData.id, // Include userData.id as fallback
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
	const userStr = localStorage.getItem('user');
	if (!userStr) return null;

	try {
	  const userData: UserData = JSON.parse(userStr);
	  const accessToken = userData.accessToken || localStorage.getItem('accessToken');
	  
	  if (!accessToken) return null;
	  
	  // Try to get permissions with current token
	  const response = await fetch(`${API_URL}/users/permissions`, {
		headers: {
		  'Authorization': `Bearer ${accessToken}`,
		},
	  });

	  // If token invalid, try to refresh
	  if (response.status === 401 || response.status === 403) {
		const refreshToken = userData.refreshToken || localStorage.getItem('refreshToken');
		if (!refreshToken) return null;
		
		const newTokens = await this.refreshAccessToken(refreshToken);
		if (!newTokens) return null;
		
		// Retry with new token
		const newResponse = await fetch(`${API_URL}/users/permissions`, {
		  headers: {
			'Authorization': `Bearer ${newTokens.accessToken}`,
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
	const userStr = localStorage.getItem('user');
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
	  const accessToken = userData.accessToken || localStorage.getItem('accessToken');
	  
	  if (!accessToken) {
		return {
		  success: false,
		  error: {
			message: "Not authenticated",
			name: "Update password failed"
		  }
		};
	  }
	  
	  const response = await fetch(`${API_URL}/auth/update-password`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		  'Authorization': `Bearer ${accessToken}`,
		},
		body: JSON.stringify(params),
	  });

	  // If token invalid, try to refresh
	  if (response.status === 401 || response.status === 403) {
		const refreshToken = userData.refreshToken || localStorage.getItem('refreshToken');
		if (!refreshToken) {
		  return {
			success: false,
			error: {
			  message: "Session expired",
			  name: "Update password failed"
			}
		  };
		}
		
		const newTokens = await this.refreshAccessToken(refreshToken);
		if (!newTokens) {
		  return {
			success: false,
			error: {
			  message: "Session expired",
			  name: "Update password failed"
			}
		  };
		}
		
		// Retry with new token
		const newResponse = await fetch(`${API_URL}/auth/update-password`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${newTokens.accessToken}`,
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
	  const response = await fetch(`${API_URL}/auth/forgot-password`, {
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
	  const refreshToken = localStorage.getItem('refreshToken');
	  if (refreshToken) {
		await fetch(`${API_URL}/auth/logout`, {
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
	
	this.clearStorage();
	return {
	  success: true,
	  redirectTo: "/login",
	};
  }

  async onError(error: any) {
	console.error("Auth error:", error);
	const status = error?.response?.status || error?.statusCode || error?.status;
	
	// Handle authentication errors
	if (status === 401 || status === 403) {
	  // Try to refresh token if possible
	  const refreshToken = localStorage.getItem('refreshToken');
	  if (refreshToken) {
		try {
		  const newTokens = await this.refreshAccessToken(refreshToken);
		  if (newTokens) {
			// Successfully refreshed, don't log out
			return { error };
		  }
		} catch (refreshError) {
		  console.error("Failed to refresh token:", refreshError);
		}
	  }
	  
	  // If refresh failed or no refresh token, log out
	  this.clearStorage();
	  return {
		logout: true,
		redirectTo: "/login",
		error
	  };
	}
	
	// For other errors, just pass through
	return { error };
  }

  async refreshAccessToken(refreshToken: string) {
	try {
	  console.log("Attempting to refresh token");
	  const response = await fetch(`${API_URL}/auth/refresh`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ refreshToken }),
	  });

	  if (!response.ok) {
		console.error("Token refresh failed:", response.status);
		return null;
	  }

	  const data = await response.json();
	  if (!data.accessToken || !data.refreshToken) {
		console.error("Invalid refresh token response");
		return null;
	  }

	  console.log("Token refresh successful");
	  
	  // Update tokens in localStorage
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

	  return { 
		accessToken: data.accessToken, 
		refreshToken: data.refreshToken 
	  };
	} catch (error) {
	  console.error("Error refreshing token:", error);
	  return null;
	}
  }

  private clearStorage() {
	localStorage.removeItem('accessToken');
	localStorage.removeItem('refreshToken');
	localStorage.removeItem('user');
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