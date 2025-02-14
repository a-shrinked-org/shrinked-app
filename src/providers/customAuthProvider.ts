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
	  // Step 1: Login and get tokens
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

	  // Step 2: Verify profile exists
	  const profileResponse = await fetch(`${API_URL}/auth/profile`, {
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

	  // Store user data
	  const userData = await profileResponse.json();
	  localStorage.setItem('user', JSON.stringify(userData));

	  return {
		success: true,
		redirectTo: "/",
	  };
	} catch (error) {
	  localStorage.removeItem('accessToken');
	  localStorage.removeItem('refreshToken');
	  localStorage.removeItem('user');
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
	  // Step 1: Register user
	  const registerResponse = await fetch(`${API_URL}/auth/register`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password, username }),
	  });

	  const registerData = await registerResponse.json();

	  if (!registerResponse.ok) {
		return {
		  success: false,
		  error: {
			message: registerData.message || 'Registration failed',
			name: 'Registration Error'
		  }
		};
	  }

	  // Step 2: Login to get tokens
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
			message: loginData.message || 'Auto-login after registration failed',
			name: 'Registration Error'
		  }
		};
	  }

	  // Store tokens
	  localStorage.setItem('accessToken', loginData.accessToken);
	  localStorage.setItem('refreshToken', loginData.refreshToken);

	  // Step 3: Verify profile exists
	  const profileResponse = await fetch(`${API_URL}/auth/profile`, {
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
			name: 'Registration Error'
		  }
		};
	  }

	  // Store user data
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