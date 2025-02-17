import { AuthProvider } from "@refinedev/core";

const API_URL = '/api/shrinked';

export const customAuthProvider: AuthProvider = {
  login: async (params) => {
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
	  const loginResponse = await fetch(`${API_URL}/login`, {
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

	  localStorage.setItem('accessToken', loginData.accessToken);
	  localStorage.setItem('refreshToken', loginData.refreshToken);

	  const profileResponse = await fetch(`${API_URL}/profile`, {
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
	  const registerResponse = await fetch(`${API_URL}/register`, {
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

	  // After registration, proceed with login
	  return this.login({ email, password });
	} catch (error) {
	  console.error('Registration error:', error);
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
	  const response = await fetch(`${API_URL}/profile`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${accessToken}`,
		},
	  });

	  if (response.ok) {
		const userData = await response.json();
		localStorage.setItem('user', JSON.stringify(userData));
		return {
		  authenticated: true,
		};
	  }

	  const newTokens = await refreshAccessToken(refreshToken);
	  if (newTokens) {
		const retryResponse = await fetch(`${API_URL}/profile`, {
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