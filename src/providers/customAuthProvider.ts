// customAuthProvider.ts
import { AuthProvider } from "@refinedev/core";

const API_URL = 'https://api.shrinked.ai';

class AuthProviderClass {
  constructor() {
	this.login = this.login.bind(this);
	this.register = this.register.bind(this);
	this.check = this.check.bind(this);
	this.logout = this.logout.bind(this);
	this.onError = this.onError.bind(this);
	this.getIdentity = this.getIdentity.bind(this);
  }

  async login(params: any) {
	if (params.providerName === "auth0") {
	  return {
		success: false,
		error: {
		  message: "Redirecting to Auth0...",
		  name: "Auth0"
		}
	  };
	}

	const { email, password } = params;
	
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
			name: 'Login Error'
		  }
		};
	  }

	  // Store tokens
	  localStorage.setItem('accessToken', loginData.accessToken);
	  localStorage.setItem('refreshToken', loginData.refreshToken);

	  // Fetch user profile
	  const profileResponse = await fetch(`${API_URL}/users/profile`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${loginData.accessToken}`,
		},
	  });

	  if (!profileResponse.ok) {
		localStorage.removeItem('accessToken');
		localStorage.removeItem('refreshToken');
		return {
		  success: false,
		  error: {
			message: 'Could not verify user profile',
			name: 'Login Error'
		  }
		};
	  }

	  const userData = await profileResponse.json();
	  
	  // Store full user data including tokens
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

  async check() {
	const accessToken = localStorage.getItem('accessToken');
	const refreshToken = localStorage.getItem('refreshToken');
	
	console.log('Auth Check - Tokens exist:', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });
  
	if (!accessToken || !refreshToken) {
	  return {
		authenticated: false,
		error: "No valid credentials",
		redirectTo: "/login",
	  };
	}
  
	try {
	  const response = await fetch(`${API_URL}/users/profile`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${accessToken}`,
		},
	  });
  
	  if (response.ok) {
		const userData = await response.json();
		// Store user data with tokens
		const userDataWithTokens = {
		  ...userData,
		  accessToken,
		  refreshToken
		};
		localStorage.setItem('user', JSON.stringify(userDataWithTokens));
		console.log('Auth Check - Profile valid, user authenticated');
		return {
		  authenticated: true,
		};
	  }
  
	  // Try token refresh
	  const newTokens = await this.refreshAccessToken(refreshToken);
	  if (newTokens) {
		const retryResponse = await fetch(`${API_URL}/users/profile`, {
		  method: 'GET',
		  headers: {
			'Authorization': `Bearer ${newTokens.accessToken}`,
		  },
		});
  
		if (retryResponse.ok) {
		  const userData = await retryResponse.json();
		  const userDataWithTokens = {
			...userData,
			accessToken: newTokens.accessToken,
			refreshToken: newTokens.refreshToken
		  };
		  localStorage.setItem('user', JSON.stringify(userDataWithTokens));
		  return {
			authenticated: true,
		  };
		}
	  }
  
	  this.clearStorage();
	  return {
		authenticated: false,
		error: "Failed to authenticate",
		redirectTo: "/login",
	  };
	} catch (error) {
	  console.log('Auth Check - Error:', error);
	  this.clearStorage();
	  return {
		authenticated: false,
		error: "Authentication check failed",
		redirectTo: "/login",
	  };
	}
  }

  async getIdentity() {
	const userStr = localStorage.getItem('user');
	if (userStr) {
	  const userData = JSON.parse(userStr);
	  return {
		...userData,
		name: userData.username || userData.email,
		avatar: userData.avatar || null,
	  };
	}
	return null;
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

	  localStorage.setItem('accessToken', data.accessToken);
	  localStorage.setItem('refreshToken', data.refreshToken);
	  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
	} catch (error) {
	  return null;
	}
  }

  private clearStorage() {
	localStorage.removeItem('accessToken');
	localStorage.removeItem('refreshToken');
	localStorage.removeItem('user');
  }
}

// Create a single instance and export its methods as the auth provider
const authProviderInstance = new AuthProviderClass();

export const customAuthProvider: AuthProvider = {
  login: authProviderInstance.login,
  register: authProviderInstance.register,
  logout: authProviderInstance.logout,
  check: authProviderInstance.check,
  onError: authProviderInstance.onError,
  getIdentity: authProviderInstance.getIdentity,
};