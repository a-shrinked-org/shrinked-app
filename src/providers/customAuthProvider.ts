// src/providers/customAuthProvider.ts
import { AuthProvider } from "@refinedev/core";
import { authUtils, API_CONFIG } from "@/utils/authUtils";

interface UserData {
  id?: string;
  userId?: string;
  _id?: string;
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
  isVerified?: boolean;
}

let lastAuthCheckTime = 0;
const AUTH_CHECK_COOLDOWN = 2000; // 2 seconds

class AuthProviderClass implements AuthProvider {
  async callLoops(endpoint: string, method: string, body?: any) {
	const response = await fetch(`/api/auth/loops?loops=${encodeURIComponent(endpoint)}`, {
	  method,
	  headers: {
		"Content-Type": "application/json",
	  },
	  body: body ? JSON.stringify(body) : undefined,
	});
	return response.json();
  }

  async checkEmailInLoops(email: string) {
	const encodedEmail = encodeURIComponent(email);
	const data = await this.callLoops(`/contacts/find?email=${encodedEmail}`, "GET");
	return data.length > 0 ? data[0] : null; // Return contact if found, null if not
  }

  async sendValidationEmail(email: string, token: string) {
	const validationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}`;
	return this.callLoops("/transactional", "POST", {
	  transactionalId: "cm7wuis1m08624etab0lrimzz", // Your Loops transactional ID
	  email,
	  dataVariables: { validationUrl },
	});
  }

  async login(params: any) {
	const { providerName, email, password } = params;

	if (providerName === "auth0" || providerName === "google" || providerName === "github") {
	  const redirectUrl =
		providerName === "auth0"
		  ? undefined
		  : `${API_CONFIG.API_URL}/auth/${providerName}`;
	  if (redirectUrl) {
		window.location.href = redirectUrl;
	  }
	  return {
		success: false,
		error: { message: `Redirecting to ${providerName}...`, name: providerName },
	  };
	}

	try {
	  if (!navigator.onLine) {
		return {
		  success: false,
		  error: { message: "Network error: You appear to be offline", name: "Connection Error" },
		};
	  }

	  const loopsContact = await this.checkEmailInLoops(email);

	  if (!password) {
		// Email-only check
		if (loopsContact) {
		  return { success: true }; // Email exists in Loops, prompt for password
		} else {
		  return {
			success: false,
			error: { message: "Email not found. Please register.", name: "RegistrationRequired" },
		  };
		}
	  }

	  // Full login with password
	  if (loopsContact) {
		const loginResponse = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ email, password }),
		});

		if (!loginResponse.ok) {
		  const loginData = await loginResponse.json();
		  return {
			success: false,
			error: {
			  message: loginData.message || "Login failed",
			  name: "Invalid email or password",
			},
		  };
		}

		const loginData = await loginResponse.json();
		authUtils.saveTokens(loginData.accessToken, loginData.refreshToken);

		const profileResponse = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
		  headers: {
			Authorization: `Bearer ${loginData.accessToken}`,
			"Content-Type": "application/json",
		  },
		});

		if (!profileResponse.ok) {
		  authUtils.clearAuthStorage();
		  return {
			success: false,
			error: { message: "Could not verify user profile", name: "Login Error" },
		  };
		}

		const userData: UserData = await profileResponse.json();
		const userDataWithTokens = {
		  ...userData,
		  accessToken: loginData.accessToken,
		  refreshToken: loginData.refreshToken,
		};
		localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userDataWithTokens));

		return {
		  success: true,
		  redirectTo: "/jobs",
		  user: userDataWithTokens,
		};
	  } else {
		return {
		  success: false,
		  error: { message: "Email not found. Please register.", name: "RegistrationRequired" },
		};
	  }
	} catch (error) {
	  authUtils.clearAuthStorage();
	  return {
		success: false,
		error: {
		  message: error instanceof Error ? error.message : "Login failed",
		  name: "Login Error",
		},
	  };
	}
  }

  async register(params: any) {
	const { email, password, username } = params;
	try {
	  const loopsContact = await this.checkEmailInLoops(email);
	  if (loopsContact) {
		return {
		  success: false,
		  error: { message: "Email already registered", name: "EmailExists" },
		};
	  }

	  const token = Math.random().toString(36).substring(2); // Simple token, replace with secure method
	  await this.sendValidationEmail(email, token);

	  await this.callLoops("/contacts", "POST", {
		email,
		contactProperties: { validationEmailSent: true },
	  });

	  const tempUserData = { email, username, isVerified: false };
	  localStorage.setItem("pendingUser", JSON.stringify({ ...tempUserData, token, password }));
	  return { success: true, redirectTo: "/verify-email" };
	} catch (error) {
	  return {
		success: false,
		error: {
		  message: error instanceof Error ? error.message : "Registration failed",
		  name: "Registration Error",
		},
	  };
	}
  }

  async check() {
	const now = Date.now();
	if (now - lastAuthCheckTime < AUTH_CHECK_COOLDOWN) {
	  const authenticated = authUtils.isAuthenticated();
	  return { authenticated };
	}
	lastAuthCheckTime = now;

	const authenticated = authUtils.isAuthenticated();
	if (!authenticated) {
	  authUtils.clearAuthStorage();
	  return { authenticated: false };
	}

	try {
	  const accessToken = authUtils.getAccessToken();
	  const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
		headers: {
		  Authorization: `Bearer ${accessToken}`,
		  "Content-Type": "application/json",
		},
	  });

	  if (response.ok) {
		const userData = await response.json();
		const accessToken = authUtils.getAccessToken();
		const refreshToken = authUtils.getRefreshToken();

		if (accessToken && refreshToken) {
		  const updatedUserData = {
			...userData,
			accessToken,
			refreshToken,
		  };
		  localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
		}
		return { authenticated: true };
	  }

	  authUtils.clearAuthStorage();
	  return { authenticated: false };
	} catch (error) {
	  console.error("Auth check error:", error);
	  if (error instanceof Error && "status" in error && (error as any).status === 401) {
		authUtils.clearAuthStorage();
	  }
	  return { authenticated: false };
	}
  }

  async getIdentity() {
	const userStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	if (!userStr) {
	  return null;
	}

	try {
	  const userData: UserData = JSON.parse(userStr);
	  return {
		id: userData.userId || userData._id || userData.id,
		name: userData.username || userData.email,
		email: userData.email,
		avatar: userData.avatar || "",
		roles: userData.roles || [],
		token: userData.accessToken || authUtils.getAccessToken(),
		subscriptionPlan: userData.subscriptionPlan,
		apiKeys: userData.apiKeys || [],
		userId: userData.userId || userData._id || userData.id,
	  };
	} catch (error) {
	  console.error("Error parsing user data:", error);
	  return null;
	}
  }

  async getPermissions() {
	const userStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	if (!userStr) return null;

	try {
	  const userData: UserData = JSON.parse(userStr);
	  if (userData.roles && Array.isArray(userData.roles) && userData.roles.length > 0) {
		return userData.roles;
	  }

	  const accessToken = authUtils.getAccessToken();
	  const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PERMISSIONS}`, {
		headers: {
		  Authorization: `Bearer ${accessToken}`,
		  "Content-Type": "application/json",
		},
	  });

	  if (response.ok) {
		const { roles } = await response.json();
		try {
		  userData.roles = roles;
		  localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
		} catch (e) {
		  console.error("Error updating roles in localStorage:", e);
		}
		return roles;
	  }
	  return null;
	} catch (error) {
	  console.error("Error getting permissions:", error);
	  return null;
	}
  }

  async updatePassword(params: any) {
	try {
	  const accessToken = authUtils.getAccessToken();
	  const response = await fetch(`${API_CONFIG.API_URL}/auth/update-password`, {
		method: "POST",
		headers: {
		  Authorization: `Bearer ${accessToken}`,
		  "Content-Type": "application/json",
		},
		body: JSON.stringify(params),
	  });

	  if (!response.ok) {
		const errorData = await response.json();
		return {
		  success: false,
		  error: {
			message: errorData.message || "Invalid password",
			name: "Update password failed",
		  },
		};
	  }

	  return { success: true };
	} catch (error) {
	  return {
		success: false,
		error: {
		  message: "Update failed",
		  name: "Update password failed",
		},
	  };
	}
  }

  async forgotPassword(params: any) {
	try {
	  const response = await fetch(`${API_CONFIG.API_URL}/auth/forgot-password`, {
		method: "POST",
		headers: {
		  "Content-Type": "application/json",
		},
		body: JSON.stringify(params),
	  });

	  if (!response.ok) {
		const errorData = await response.json();
		return {
		  success: false,
		  error: {
			message: errorData.message || "Invalid email",
			name: "Forgot password failed",
		  },
		};
	  }

	  return { success: true };
	} catch (error) {
	  return {
		success: false,
		error: {
		  message: "Request failed",
		  name: "Forgot password failed",
		},
	  };
	}
  }

  async logout() {
	try {
	  const refreshToken = authUtils.getRefreshToken();
	  if (refreshToken) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000);

		await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
		  method: "POST",
		  headers: {
			"Content-Type": "application/json",
		  },
		  body: JSON.stringify({ refreshToken }),
		  signal: controller.signal,
		}).catch(() => {
		  // Ignore server errors during logout
		}).finally(() => {
		  clearTimeout(timeoutId);
		});
	  }
	} catch (error) {
	  // Continue with logout even if server request fails
	}

	authUtils.clearAuthStorage();

	return {
	  success: true,
	  redirectTo: "/login",
	};
  }

  async onError(error: any) {
	console.error("Auth error:", error);

	authUtils.handleAuthError(error);

	const status = error?.response?.status || error?.statusCode || error?.status;

	if (status === 401 || status === 403) {
	  const errorContext = error?.context;
	  const isFromRefresh = errorContext && errorContext.isRefreshAttempt;

	  if (!isFromRefresh) {
		const refreshSuccess = await authUtils.refreshToken();
		if (refreshSuccess) {
		  return { error };
		}
	  }

	  authUtils.clearAuthStorage();
	  return {
		logout: true,
		redirectTo: "/login",
		error,
	  };
	}

	return { error };
  }

  async verifyEmail(params: { token: string; email: string; password: string }) {
	const { token, email, password } = params;
	try {
	  const pendingUserStr = localStorage.getItem("pendingUser");
	  if (!pendingUserStr) throw new Error("No pending user found");

	  const pendingUser = JSON.parse(pendingUserStr);
	  if (pendingUser.token !== token || pendingUser.email !== email) {
		return {
		  success: false,
		  error: { message: "Invalid token or email", name: "VerificationError" },
		};
	  }

	  const verifiedUser = { email, password, isVerified: true };
	  localStorage.setItem("verifiedUser", JSON.stringify(verifiedUser));
	  localStorage.removeItem("pendingUser");

	  return { success: true, redirectTo: "/jobs" };
	} catch (error) {
	  return {
		success: false,
		error: {
		  message: error instanceof Error ? error.message : "Verification failed",
		  name: "VerificationError",
		},
	  };
	}
  }
}

const authProviderInstance = new AuthProviderClass();

type CustomAuthProvider = Required<AuthProvider> & {
  register: (params: any) => Promise<any>;
  forgotPassword?: (params: any) => Promise<any>;
  updatePassword?: (params: any) => Promise<any>;
  getPermissions?: (params?: any) => Promise<any>;
  verifyEmail?: (params: { token: string; email: string; password: string }) => Promise<any>;
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
  verifyEmail: authProviderInstance.verifyEmail.bind(authProviderInstance),
} as const;