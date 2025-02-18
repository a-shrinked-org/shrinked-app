import { AuthProvider } from "@refinedev/core";

interface UserData {
  id?: string;
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
  private authCheckPromise: Promise<{ authenticated: boolean }> | null = null;

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
	
		  // Store tokens in localStorage with expiration
		  const expiresIn = 3600; // 1 hour - adjust based on your token expiration
		  const expiresAt = new Date().getTime() + expiresIn * 1000;
		  
		  localStorage.setItem('accessToken', loginData.accessToken);
		  localStorage.setItem('refreshToken', loginData.refreshToken);
		  localStorage.setItem('tokenExpiration', expiresAt.toString());
	
		  // Fetch user profile
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
	
	async validateToken(token: string): Promise<boolean> {
	  try {
		const response = await fetch(`${API_URL}/users/profile`, {
		  method: 'GET',
		  headers: {
			'Authorization': `Bearer ${token}`,
		  },
		});
		return response.ok;
	  } catch (error) {
		return false;
	  }
	}
	
	private isRefreshing = false;
	private refreshSubscribers: Array<(token: string) => void> = [];
	
	private addRefreshSubscriber(callback: (token: string) => void) {
	  this.refreshSubscribers.push(callback);
	}
	
	private onRefreshComplete(token: string) {
	  this.refreshSubscribers.forEach((callback) => callback(token));
	  this.refreshSubscribers = [];
	}
	
	async refreshAndValidate(): Promise<boolean> {
	  if (this.isRefreshing) {
		// Return a new promise that will be resolved when refresh is complete
		return new Promise((resolve) => {
		  this.addRefreshSubscriber((token: string) => {
			resolve(this.validateToken(token));
		  });
		});
	  }
	
	  this.isRefreshing = true;
	  try {
		const refreshToken = localStorage.getItem('refreshToken');
		if (!refreshToken) return false;
	
		const refreshedTokens = await this.refreshAccessToken(refreshToken);
		if (!refreshedTokens) {
		  this.clearStorage();
		  return false;
		}
	
		this.onRefreshComplete(refreshedTokens.accessToken);
		return await this.validateToken(refreshedTokens.accessToken);
	  } finally {
		this.isRefreshing = false;
	  }
	}
	
	// Update the check method to include this section
	async check(): Promise<{ authenticated: boolean; redirectTo?: string; }> {
	  if (this.authCheckPromise) {
		return this.authCheckPromise;
	  }
	
	  this.authCheckPromise = (async () => {
		try {
		  const accessToken = localStorage.getItem('accessToken');
		  const tokenExpiration = localStorage.getItem('tokenExpiration');
		  
		  if (!accessToken) {
			return { authenticated: false, redirectTo: '/login' };
		  }
	
		  // Check if token is expired
		  const now = new Date().getTime();
		  const expiration = tokenExpiration ? parseInt(tokenExpiration) : 0;
		  const isExpired = now >= expiration;
	
		  // If token is not expired, validate it
		  if (!isExpired && await this.validateToken(accessToken)) {
			return { authenticated: true };
		  }
	
		  // If token is expired or invalid, try to refresh
		  if (await this.refreshAndValidate()) {
			return { authenticated: true };
		  }
	
		  this.clearStorage();
		  return { authenticated: false, redirectTo: '/login' };
		} catch (error) {
		  this.clearStorage();
		  return { authenticated: false, redirectTo: '/login' };
		} finally {
		  this.authCheckPromise = null;
		}
	  })();
	
	  return this.authCheckPromise;
	}
	
	  private async refreshAccessToken(refreshToken: string) {
		try {
		  const response = await fetch(`${API_URL}/auth/refresh`, {
			method: 'POST',
			headers: {
			  'Content-Type': 'application/json',
			},
			body: JSON.stringify({ refreshToken }),
		  });
	
		  if (!response.ok) {
			return null;
		  }
	
		  const data = await response.json();
		  if (!data.accessToken || !data.refreshToken) {
			return null;
		  }
	
		  // Update stored tokens
		  localStorage.setItem('accessToken', data.accessToken);
		  localStorage.setItem('refreshToken', data.refreshToken);
		  
		  // Update expiration
		  const newExpiration = new Date().getTime() + 3600 * 1000;
		  localStorage.setItem('tokenExpiration', newExpiration.toString());
	
		  return { 
			accessToken: data.accessToken, 
			refreshToken: data.refreshToken 
		  };
		} catch (error) {
		  return null;
		}
	  }
	
	  private clearStorage() {
		localStorage.removeItem('accessToken');
		localStorage.removeItem('refreshToken');
		localStorage.removeItem('tokenExpiration');
		localStorage.removeItem('user');
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
  
  async getIdentity() {
	const userStr = localStorage.getItem('user');
	if (!userStr) return null;
  
	try {
	  const userData: UserData = JSON.parse(userStr);
	  return {
		id: userData.id,
		name: userData.username || userData.email,
		email: userData.email,
		avatar: userData.avatar || null,
		roles: userData.roles || [],
		token: userData.accessToken,
		subscriptionPlan: userData.subscriptionPlan
	  };
	} catch (error) {
	  console.error("GetIdentity error:", error);
	  return null;
	}
  }

  async getPermissions() {
	const userStr = localStorage.getItem('user');
	if (!userStr) return null;

	try {
	  const userData: UserData = JSON.parse(userStr);
	  const response = await fetch(`${API_URL}/users/permissions`, {
		headers: {
		  'Authorization': `Bearer ${userData.accessToken}`,
		},
	  });

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
	  const response = await fetch(`${API_URL}/auth/update-password`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		  'Authorization': `Bearer ${userData.accessToken}`,
		},
		body: JSON.stringify(params),
	  });

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

	  return {
		success: true
	  };
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
	this.clearStorage();
	return {
	  success: true,
	  redirectTo: "/login",
	};
  }

  async onError(error: any) {
	console.error(error);
	const status = error?.response?.status || error?.status;
	if (status === 401 || status === 403) {
	  this.clearStorage();
	  return {
		logout: true,
		redirectTo: "/login",
		error
	  };
	}
	return { error };
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