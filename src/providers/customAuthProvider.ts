// src/providers/customAuthProvider.ts
import { AuthProvider } from "@refinedev/core";

export const customAuthProvider: AuthProvider = {
  login: async ({ email, password }) => {
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
		return {
		  success: false,
		  error: new Error(data.message || 'Login failed'),
		};
	  }

	  if (!data.accessToken || !data.refreshToken) {
		return {
		  success: false,
		  error: new Error('Invalid response from server'),
		};
	  }

	  // Store tokens
	  localStorage.setItem('accessToken', data.accessToken);
	  localStorage.setItem('refreshToken', data.refreshToken);

	  // Authenticate with the API using the access token
	  const authResponse = await fetch('https://api.shrinked.ai/api/auth', {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${data.accessToken}`,
		},
	  });

	  if (!authResponse.ok) {
		localStorage.removeItem('accessToken');
		localStorage.removeItem('refreshToken');
		return {
		  success: false,
		  error: new Error('Authentication failed'),
		};
	  }

	  const userData = await authResponse.json();
	  localStorage.setItem('user', JSON.stringify(userData));

	  return {
		success: true,
		redirectTo: "/",
	  };
	} catch (error) {
	  return {
		success: false,
		error: new Error(error instanceof Error ? error.message : 'Login failed'),
	  };
	}
  },

  register: async ({ email, password, username }) => {
	try {
	  const response = await fetch('https://api.shrinked.ai/auth/register', {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password, username }),
	  });

	  const data = await response.json();

	  if (!response.ok) {
		return {
		  success: false,
		  error: new Error(data.message || 'Registration failed'),
		};
	  }

	  return {
		success: true,
		redirectTo: "/login",
	  };
	} catch (error) {
	  console.error('Registration error:', error);
	  return {
		success: false,
		error: new Error(error instanceof Error ? error.message : 'Registration failed'),
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