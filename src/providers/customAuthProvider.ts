// src/providers/customAuthProvider.ts
import { AuthProvider } from "@refinedev/core";

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
	  const response = await fetch('https://api.shrinked.ai/auth/login', {
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
	  // Step 1: Register the user
	  const registerResponse = await fetch('https://api.shrinked.ai/auth/register', {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password, username }),
	  });

	  const registerData = await registerResponse.json();

	  if (!registerResponse.ok) {
		throw new Error(registerData.message || 'Registration failed');
	  }

	  // Step 2: Login to get tokens
	  const loginResponse = await fetch('https://api.shrinked.ai/auth/login', {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password }),
	  });

	  const loginData = await loginResponse.json();

	  if (!loginResponse.ok) {
		throw new Error('Login after registration failed');
	  }

	  // Store tokens
	  localStorage.setItem('accessToken', loginData.accessToken);
	  localStorage.setItem('refreshToken', loginData.refreshToken);

	  // Step 3: Create profile
	  const profileResponse = await fetch('https://api.shrinked.ai/profile', {
		method: 'POST',
		headers: {
		  'Authorization': `Bearer ${loginData.accessToken}`,
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ username }),
	  });

	  if (!profileResponse.ok) {
		// Clean up stored tokens if profile creation fails
		localStorage.removeItem('accessToken');
		localStorage.removeItem('refreshToken');
		const profileData = await profileResponse.json();
		throw new Error(profileData.message || 'Profile creation failed');
	  }

	  const userData = await profileResponse.json();
	  localStorage.setItem('user', JSON.stringify(userData));

	  return {
		success: true,
		redirectTo: "/",
	  };
	} catch (error) {
	  // Clean up any stored data
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
	  const response = await fetch('https://api.shrinked.ai/api/auth', {
		headers: {
		  'Authorization': `Bearer ${accessToken}`,
		},
	  });

	  if (response.ok) {
		return {
		  authenticated: true,
		};
	  }

	  if (response.status === 401) {
		// Try to refresh the token
		const newTokens = await refreshAccessToken(refreshToken);
		if (newTokens) {
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
	const response = await fetch('https://api.shrinked.ai/auth/refresh', {
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