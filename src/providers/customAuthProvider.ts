// src/providers/customAuthProvider.ts
import { AuthProvider } from "@refinedev/core";

// Base URL for API requests
const API_URL = '/api/shrinked';

export const customAuthProvider: AuthProvider = {
  login: async (params) => {
	// Handle Auth0 login
	if (params.providerName === "auth0") {
	  return {
		success: false, // Let NextAuth handle Auth0
		error: {
		  message: "Redirecting to Auth0...",
		  name: "Auth0"
		}
	  };
	}

	const { email, password } = params;
	
	try {
	  const response = await fetch(`${API_URL}/auth/login`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password }),
	  });

	  const data = await response.json();

	  if (!response.ok) {
		throw new Error(data.message || 'Login failed');
	  }

	  // Store tokens
	  localStorage.setItem('accessToken', data.accessToken);
	  localStorage.setItem('refreshToken', data.refreshToken);

	  // Get user profile after successful login
	  const profileResponse = await fetch(`${API_URL}/auth/profile`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${data.accessToken}`,
		},
	  });

	  if (profileResponse.ok) {
		const userData = await profileResponse.json();
		localStorage.setItem('user', JSON.stringify(userData));
	  }

	  return {
		success: true,
		redirectTo: "/",
	  };
	} catch (error) {
	  return {
		success: false,
		error: {
		  message: error instanceof Error ? error.message : 'Login failed',
		  name: 'Login Error'
		}
	  };
	}
  },

  register: async (params) => {
	const { email, password, username } = params;
	try {
	  // Step 1: Register
	  const registerResponse = await fetch(`${API_URL}/auth/register`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password, username }),
	  });

	  if (!registerResponse.ok) {
		const registerData = await registerResponse.json().catch(() => ({}));
		return {
		  success: false,
		  error: {
			message: registerData.message || 'Registration failed',
			name: 'Registration Error'
		  }
		};
	  }

	  const registerData = await registerResponse.json();

	  // Step 2: Auto login
	  const loginResponse = await fetch(`${API_URL}/auth/login`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password }),
	  });

	  if (!loginResponse.ok) {
		return {
		  success: false,
		  error: {
			message: 'Auto-login after registration failed',
			name: 'Registration Error'
		  }
		};
	  }

	  const loginData = await loginResponse.json();

	  // Store tokens
	  localStorage.setItem('accessToken', loginData.accessToken);
	  localStorage.setItem('refreshToken', loginData.refreshToken);

	  // Step 3: Get profile
	  const profileResponse = await fetch(`${API_URL}/auth/profile`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${loginData.accessToken}`,
		},
	  });

	  if (!profileResponse.ok) {
		localStorage.removeItem('accessToken');
		localStorage.removeItem('refreshToken');
		const profileData = await profileResponse.json().catch(() => ({}));
		return {
		  success: false,
		  error: {
			message: profileData.message || 'Profile fetch failed',
			name: 'Registration Error'
		  }
		};
	  }

	  const userData = await profileResponse.json();
	  localStorage.setItem('user', JSON.stringify(userData));

	  return {
		success: true,
		redirectTo: "/",
	  };
	} catch (error) {
	  console.error('Registration error:', error);
	  localStorage.removeItem('accessToken');
	  localStorage.removeItem('refreshToken');
	  localStorage.removeItem('user');
	  
	  return {
		success: false,
		error: {
		  message: error instanceof Error ? error.message : 'Registration process failed',
		  name: 'Registration Error'
		}
	  };
	}
  },

  check: async () => {
	const accessToken = localStorage.getItem('accessToken');
	const refreshToken = localStorage.getItem('refreshToken');

	if (!accessToken || !refreshToken) {
	  return {
		authenticated: false,
		redirectTo: "/login",
	  };
	}

	try {
	  // First try with current access token
	  const response = await fetch(`${API_URL}/auth/profile`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${accessToken}`,
		},
	  });

	  if (response.ok) {
		// Update stored user data
		const userData = await response.json();
		localStorage.setItem('user', JSON.stringify(userData));
		return {
		  authenticated: true,
		};
	  }

	  // If access token failed, try to refresh
	  const newTokens = await refreshAccessToken(refreshToken);
	  if (newTokens) {
		// Verify the new token works
		const retryResponse = await fetch(`${API_URL}/auth/profile`, {
		  method: 'GET',
		  headers: {
			'Authorization': `Bearer ${newTokens.accessToken}`,
		  },
		});

		if (retryResponse.ok) {
		  const userData = await retryResponse.json();
		  localStorage.setItem('user', JSON.stringify(userData));
		  return {
			authenticated: true,
		  };
		}
	  }

	  // If we get here, authentication failed
	  localStorage.removeItem('accessToken');
	  localStorage.removeItem('refreshToken');
	  localStorage.removeItem('user');
	  
	  return {
		authenticated: false,
		redirectTo: "/login",
	  };
	} catch (error) {
	  return {
		authenticated: false,
		redirectTo: "/login",
	  };
	}
  },

  logout: async () => {
	localStorage.removeItem('accessToken');
	localStorage.removeItem('refreshToken');
	localStorage.removeItem('user');
	return {
	  success: true,
	  redirectTo: "/login",
	};
  },

  onError: async (error) => {
	const status = error?.response?.status || error?.status;
	if (status === 401 || status === 403) {
	  return {
		logout: true,
		redirectTo: "/login",
		error,
	  };
	}
	return {};
  },

  getIdentity: async () => {
	const userStr = localStorage.getItem('user');
	if (userStr) {
	  return JSON.parse(userStr);
	}
	return null;
  }
};

async function refreshAccessToken(refreshToken: string) {
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