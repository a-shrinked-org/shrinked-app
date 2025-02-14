// src/providers/customAuthProvider.ts
import { AuthProvider } from "@refinedev/core";

export const customAuthProvider: AuthProvider = {
  login: async ({ email, password }) => {
	try {
	  // First, get the tokens
	  const response = await fetch('https://api.shrinked.ai/auth/login', {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password }),
	  });

	  if (!response.ok) {
		throw new Error('Login failed');
	  }

	  const { accessToken, refreshToken } = await response.json();

	  // Store tokens
	  localStorage.setItem('accessToken', accessToken);
	  localStorage.setItem('refreshToken', refreshToken);

	  // Authenticate with the API using the access token
	  const authResponse = await fetch('https://api.shrinked.ai/api/auth', {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${accessToken}`,
		},
	  });

	  if (!authResponse.ok) {
		throw new Error('Authentication failed');
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
		error: new Error('Invalid email or password'),
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

	  if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.message || 'Registration failed');
	  }

	  return {
		success: true,
		redirectTo: "/login",
	  };
	} catch (error) {
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
		error: new Error('No credentials found'),
		logout: true,
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

	  // If access token is invalid, try to refresh
	  if (response.status === 401) {
		const newTokens = await refreshAccessToken(refreshToken);
		if (newTokens) {
		  return {
			authenticated: true,
		  };
		}
	  }

	  return {
		authenticated: false,
		error: new Error('Session expired'),
		logout: true,
		redirectTo: "/login",
	  };
	} catch (error) {
	  return {
		authenticated: false,
		error: new Error('Authentication check failed'),
		logout: true,
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
	if (error.status === 401 || error.status === 403) {
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

// Helper function to refresh the access token
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

	const { accessToken, newRefreshToken } = await response.json();
	localStorage.setItem('accessToken', accessToken);
	localStorage.setItem('refreshToken', newRefreshToken);
	return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
	return null;
  }
}