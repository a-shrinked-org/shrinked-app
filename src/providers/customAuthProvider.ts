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

	  if (!response.ok) {
		throw new Error('Login failed');
	  }

	  const data = await response.json();
	  localStorage.setItem('auth', JSON.stringify(data));

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
		throw new Error('Registration failed');
	  }

	  return {
		success: true,
		redirectTo: "/login",
	  };
	} catch (error) {
	  return {
		success: false,
		error: new Error('Registration failed'),
	  };
	}
  },

  check: async () => {
	const auth = localStorage.getItem('auth');
	if (auth) {
	  return {
		authenticated: true,
	  };
	}

	return {
	  authenticated: false,
	  redirectTo: "/login",
	};
  },

  logout: async () => {
	localStorage.removeItem('auth');
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
	const auth = localStorage.getItem('auth');
	if (auth) {
	  const user = JSON.parse(auth);
	  return user;
	}
	return null;
  }
};