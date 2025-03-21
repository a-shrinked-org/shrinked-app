// src/providers/customAuthProvider.ts
import { AuthProvider } from "@refinedev/core";
import { authUtils, API_CONFIG } from "@/utils/authUtils";
import { nanoid } from 'nanoid'; // Add nanoid import for secure token generation

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

// Reduced cooldown for faster auth checks
const AUTH_CHECK_COOLDOWN = 2000; // 2 seconds between auth checks
let lastAuthCheckTime = 0;

// Debug helper function
const debug = {
  log: (area: string, message: string, data?: any) => {
	console.log(`[AUTH:${area}] ${message}`, data || '');
  },
  error: (area: string, message: string, error?: any) => {
	console.error(`[AUTH:${area}] ERROR: ${message}`, error || '');
  },
  warn: (area: string, message: string, data?: any) => {
	console.warn(`[AUTH:${area}] WARNING: ${message}`, data || '');
  }
};

class AuthProviderClass implements AuthProvider {
  async callLoops(endpoint: string, method: string, body?: any) {
	debug.log('callLoops', `Calling Loops API: ${method} ${endpoint}`);
	
	// Ensure endpoint doesn't have duplicated leading slashes
	const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
	
	try {
	  const apiUrl = `/api/loops?loops=${encodeURIComponent(cleanEndpoint)}`;
	  debug.log('callLoops', `Making request to: ${apiUrl}`);
	  
	  if (body) {
		debug.log('callLoops', 'Request body:', body);
	  }
	  
	  const response = await fetch(apiUrl, {
		method,
		headers: {
		  "Content-Type": "application/json",
		},
		body: body ? JSON.stringify(body) : undefined,
	  });
	  
	  debug.log('callLoops', `Response status: ${response.status}`);
	  
	  const data = await response.json();
	  
	  if (!response.ok) {
		debug.error('callLoops', `Error response from Loops API:`, data);
		throw new Error(data.message || `Loops API request failed with status ${response.status}`);
	  }
	  
	  debug.log('callLoops', 'Response data:', data);
	  return data;
	} catch (error) {
	  debug.error('callLoops', `Error calling Loops API ${endpoint}:`, error);
	  throw error;
	}
  }

  async checkEmailInLoops(email: string) {
	debug.log('checkEmailInLoops', `Checking if email exists: ${email}`);
	
	try {
	  const encodedEmail = encodeURIComponent(email);
	  debug.log('checkEmailInLoops', `Encoded email: ${encodedEmail}`);
	  
	  const data = await this.callLoops(`contacts/find?email=${encodedEmail}`, "GET");
	  
	  debug.log('checkEmailInLoops', `Loops contact data:`, data);
	  
	  // Check if the response is an array and has content
	  if (Array.isArray(data) && data.length > 0) {
		debug.log('checkEmailInLoops', `Contact found for email: ${email}`);
		return data[0]; // Return contact if found
	  }
	  
	  debug.log('checkEmailInLoops', `No contact found for email: ${email}`);
	  return null;
	} catch (error) {
	  debug.error('checkEmailInLoops', `Error checking email in Loops:`, error);
	  // Don't throw the error, just return null to indicate no contact found
	  return null;
	}
  }

  async createContact(email: string, properties = {}) {
	debug.log('createContact', `Creating contact for email: ${email}`);
	
	try {
	  // Construct payload according to Loops API documentation
	  const payload = {
		email,
		// Include properties directly at the top level as per Loops API docs
		...properties
	  };
	  
	  // Use the correct endpoint for contact creation
	  const response = await this.callLoops("contacts/create", "POST", payload);
	  debug.log('createContact', `Contact created successfully:`, response);
	  return response;
	} catch (error) {
	  debug.error('createContact', `Error creating contact:`, error);
	  throw error;
	}
  }

  async sendValidationEmail(email: string, token: string) {
	debug.log('sendValidationEmail', `Sending validation email to: ${email}`);
	
	try {
	  // Check if environment variable is set
	  if (!process.env.NEXT_PUBLIC_APP_URL) {
		debug.error('sendValidationEmail', "NEXT_PUBLIC_APP_URL environment variable is not set!");
		throw new Error("NEXT_PUBLIC_APP_URL environment variable is not set");
	  }
	  
	  // Create the full verification URL
	  const validationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}&email=${encodeURIComponent(email)}`;
	  debug.log('sendValidationEmail', `Validation URL: ${validationUrl}`);
	  
	  // The payload to send to Loops - simplify to match expected format
	  const payload = {
		transactionalId: "cm7wuis1m08624etab0lrimzz", // Your Loops transactional ID
		email,
		dataVariables: { 
		  "verify-url": validationUrl
		}
	  };
	  
	  debug.log('sendValidationEmail', `Sending with payload:`, payload);
	  
	  const response = await this.callLoops("transactional", "POST", payload);
	  debug.log('sendValidationEmail', `Validation email sent successfully:`, response);
	  return response;
	} catch (error) {
	  debug.error('sendValidationEmail', `Error sending validation email:`, error);
	  throw error;
	}
  }

  async login(params: any) {
	const { providerName, email, password, skipEmailCheck } = params;
	
	debug.log('login', `Login attempt with params:`, { 
	  email, 
	  hasPassword: !!password,
	  providerName,
	  skipEmailCheck
	});
  
	// Handle social logins
	if (providerName === "auth0" || providerName === "google" || providerName === "github") {
	  debug.log('login', `Social login with provider: ${providerName}`);
	  
	  const redirectUrl =
		providerName === "auth0"
		  ? undefined
		  : `${API_CONFIG.API_URL}/auth/${providerName}`;
		  
	  if (redirectUrl) {
		debug.log('login', `Redirecting to: ${redirectUrl}`);
		window.location.href = redirectUrl;
	  }
	  
	  return {
		success: false,
		error: { message: `Redirecting to ${providerName}...`, name: providerName },
	  };
	}
  
	// Handle registration request
	if (providerName === "register") {
	  debug.log('login', `Registration requested for email: ${email}`);
	  return this.register({ email, password });
	}
  
	try {
	  if (!navigator.onLine) {
		debug.error('login', `Network connection unavailable`);
		return {
		  success: false,
		  error: { message: "Network error: You appear to be offline", name: "Connection Error" },
		};
	  }
  
	  // Skip email check for password step
	  if (skipEmailCheck && password) {
		debug.log('login', `Skipping email check and proceeding with full login`);
		
		try {
		  debug.log('login', `Making login API request through proxy`);
		  const loginResponse = await fetch(`/api/auth-proxy/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
			credentials: 'include'
		  });
  
		  if (!loginResponse.ok) {
			const loginData = await loginResponse.json();
			debug.error('login', `Login failed:`, loginData);
			return {
			  success: false,
			  error: {
				message: loginData.message || "Login failed",
				name: "Invalid email or password",
			  },
			};
		  }
  
		  const loginData = await loginResponse.json();
		  debug.log('login', `Login successful, clearing previous auth data and saving tokens`);
		  
		  // Clear any existing auth data first
		  authUtils.clearAuthStorage();
		  
		  // Save tokens - this now also stores token metadata
		  authUtils.saveTokens(loginData.accessToken, loginData.refreshToken);
		  
		  // Set authenticated state
		  authUtils.setAuthenticatedState(true);
		  
		  // Set up the silent refresh timer immediately after successful login
		  authUtils.setupRefreshTimer(true);
  
		  debug.log('login', `Fetching user profile`);
		  const profileResponse = await fetch(`/api/user-proxy/profile`, {
			headers: {
			  Authorization: `Bearer ${loginData.accessToken}`,
			  "Content-Type": "application/json",
			},
			credentials: 'include'
		  });
  
		  if (!profileResponse.ok) {
			debug.error('login', `Could not fetch user profile`);
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
		  
		  debug.log('login', `Saving user data to localStorage`);
		  localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userDataWithTokens));
  
		  debug.log('login', `Login complete, redirecting to /jobs`);
		  return {
			success: true,
			redirectTo: "/jobs",
			user: userDataWithTokens,
		  };
		} catch (error) {
		  debug.error('login', `Error during login:`, error);
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
  
	  // Regular email check flow
	  debug.log('login', `Checking if email exists in Loops: ${email}`);
	  const loopsContact = await this.checkEmailInLoops(email);
  
	  if (!password) {
		// Email-only check
		debug.log('login', `Email-only check for: ${email}`);
		
		if (loopsContact) {
		  debug.log('login', `Email exists in Loops, prompting for password`);
		  return { success: true }; // Email exists in Loops, prompt for password
		} else {
		  debug.log('login', `Email not found in Loops, registration required`);
		  return {
			success: false,
			error: { message: "Email not found. Please register.", name: "RegistrationRequired" }
		  };
		}
	  }
  
	  // Full login with password (after email check)
	  if (loopsContact) {
		debug.log('login', `Attempting full login for: ${email}`);
		
		debug.log('login', `Making login API request through proxy`);
		const loginResponse = await fetch(`/api/auth-proxy/login`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ email, password }),
		  credentials: 'include'
		});
  
		if (!loginResponse.ok) {
		  const loginData = await loginResponse.json();
		  debug.error('login', `Login failed:`, loginData);
		  return {
			success: false,
			error: {
			  message: loginData.message || "Login failed",
			  name: "Invalid email or password",
			},
		  };
		}
  
		const loginData = await loginResponse.json();
		debug.log('login', `Login successful, clearing previous auth data and saving tokens`);
		
		// Clear any existing auth data first
		authUtils.clearAuthStorage();
		
		// Save tokens - this now also stores token metadata
		authUtils.saveTokens(loginData.accessToken, loginData.refreshToken);
		
		// Set authenticated state
		authUtils.setAuthenticatedState(true);
		
		// Set up the silent refresh timer immediately after successful login
		authUtils.setupRefreshTimer(true);
  
		debug.log('login', `Fetching user profile`);
		const profileResponse = await fetch(`/api/user-proxy/profile`, {
		  headers: {
			Authorization: `Bearer ${loginData.accessToken}`,
			"Content-Type": "application/json",
		  },
		  credentials: 'include'
		});
  
		if (!profileResponse.ok) {
		  debug.error('login', `Could not fetch user profile`);
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
		
		debug.log('login', `Saving user data to localStorage`);
		localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userDataWithTokens));
  
		debug.log('login', `Login complete, redirecting to /jobs`);
		return {
		  success: true,
		  redirectTo: "/jobs",
		  user: userDataWithTokens,
		};
	  } else {
		debug.log('login', `Email not found in Loops during full login`);
		return {
		  success: false,
		  error: { message: "Email not found. Please register.", name: "RegistrationRequired" },
		};
	  }
	} catch (error) {
	  debug.error('login', `Login error:`, error);
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
	debug.log('register', `Registration attempt for email: ${params.email}`);
	const { email, password, username } = params;
	
	try {
	  // Step 1: Check if email already exists
	  debug.log('register', `Checking if email already exists in Loops`);
	  const loopsContact = await this.checkEmailInLoops(email);
	  
	  if (loopsContact) {
		debug.log('register', `Email already registered: ${email}`);
		return {
		  success: false,
		  error: { message: "Email already registered", name: "EmailExists" },
		};
	  }
	  
	  // Step 2: Generate a secure token using nanoid
	  const token = nanoid(21); // Generate a 21-character random string
	  debug.log('register', `Generated token: ${token.substring(0, 5)}...`);
	  
	  // Step 3: Create the contact in Loops with all necessary properties
	  debug.log('register', `Creating contact in Loops for: ${email}`);
	  try {
		const contactResult = await this.createContact(email, { 
		  registrationPending: true,
		  validationEmailSent: true
		});
		debug.log('register', `Contact created in Loops:`, contactResult);
	  } catch (contactError) {
		debug.error('register', `Failed to create contact in Loops:`, contactError);
		throw new Error(`Failed to create contact: ${contactError instanceof Error ? contactError.message : 'Unknown error'}`);
	  }
	  
	  // Step 4: Send validation email
	  debug.log('register', `Sending validation email to: ${email}`);
	  try {
		const emailResult = await this.sendValidationEmail(email, token);
		debug.log('register', `Validation email sent:`, emailResult);
	  } catch (emailError) {
		debug.error('register', `Failed to send validation email:`, emailError);
		throw new Error(`Failed to send validation email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
	  }
	
	  // Step 5: Store temporary user data
	  const tempUserData = { email, username, isVerified: false };
	  debug.log('register', `Storing pending user data in localStorage`);
	  localStorage.setItem("pendingUser", JSON.stringify({ ...tempUserData, token, password }));
	  
	  debug.log('register', `Registration successful, staying on verification page`);
	  // Change: return success without redirectTo to prevent automatic redirection
	  return { success: true };
	} catch (error) {
	  debug.error('register', `Registration failed:`, error);
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
	  debug.log('check', `Using cached auth status: ${authenticated} (cooldown active)`);
	  return { authenticated };
	}
	lastAuthCheckTime = now;
  
	debug.log('check', "Performing full auth check");
	const authenticated = authUtils.isAuthenticated();
	if (!authenticated) {
	  debug.log('check', "No local tokens found, clearing auth storage");
	  authUtils.clearAuthStorage();
	  return { authenticated: false };
	}
  
	try {
	  debug.log('check', "Validating token with server");
	  const accessToken = authUtils.getAccessToken();
	  const response = await fetch(`/api/user-proxy/profile`, {
		headers: {
		  Authorization: `Bearer ${accessToken}`,
		  "Content-Type": "application/json",
		},
		credentials: 'include'
	  });
  
	  if (response.ok) {
		debug.log('check', "Token validation successful");
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
		  
		  // Set authenticated state
		  authUtils.setAuthenticatedState(true);
		}
		return { authenticated: true };
	  }
  
	  debug.log('check', `Token validation failed with status: ${response.status}`);
	  if (response.status === 401 || response.status === 403) {
		// Try to refresh token before giving up
		debug.log('check', "Attempting token refresh during check");
		const refreshSuccess = await authUtils.refreshToken();
		if (refreshSuccess) {
		  debug.log('check', "Token refresh successful during check");
		  
		  // Set authenticated state
		  authUtils.setAuthenticatedState(true);
		  return { authenticated: true };
		}
	  }
  
	  authUtils.clearAuthStorage();
	  return { authenticated: false };
	} catch (error) {
	  debug.error('check', 'Auth check error:', error);
	  if (error instanceof Error && "status" in error && ((error as any).status === 401 || (error as any).status === 403)) {
		// Try to refresh token before giving up
		debug.log('check', "Attempting token refresh after error");
		const refreshSuccess = await authUtils.refreshToken();
		if (refreshSuccess) {
		  debug.log('check', "Token refresh successful after error");
		  return { authenticated: true };
		}
		authUtils.clearAuthStorage();
	  }
	  return { authenticated: false };
	}
  }

  async getIdentity() {
	debug.log('getIdentity', "Getting user identity");
	const userStr = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	
	// Try to fetch user profile if we have tokens but no user data
	if (!userStr) {
	  debug.log('getIdentity', "No user data found in localStorage");
	  
	  if (authUtils.isAuthenticated()) {
		debug.log('getIdentity', "Tokens found but no user data, fetching profile");
		const userProfile = await authUtils.ensureUserProfile();
		if (userProfile) {
		  debug.log('getIdentity', "Profile fetched successfully");
		  return {
			id: userProfile.userId || userProfile._id || userProfile.id,
			name: userProfile.username || userProfile.email,
			email: userProfile.email,
			avatar: userProfile.avatar || "",
			roles: userProfile.roles || [],
			token: userProfile.accessToken || authUtils.getAccessToken(),
			subscriptionPlan: userProfile.subscriptionPlan,
			apiKeys: userProfile.apiKeys || [],
			userId: userProfile.userId || userProfile._id || userProfile.id,
		  };
		}
	  }
	  return null;
	}

	try {
	  debug.log('getIdentity', "Parsing user data from localStorage");
	  const userData: UserData = JSON.parse(userStr);
	  
	  // Make sure we're returning the latest token
	  const accessToken = authUtils.getAccessToken() || userData.accessToken;
	  
	  // Verify if we need to refresh tokens in user data
	  if (accessToken && accessToken !== userData.accessToken) {
		debug.log('getIdentity', "Updating token in user data");
		userData.accessToken = accessToken;
		localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
	  }
	  
	  return {
		id: userData.userId || userData._id || userData.id,
		name: userData.username || userData.email,
		email: userData.email,
		avatar: userData.avatar || "",
		roles: userData.roles || [],
		token: accessToken,
		subscriptionPlan: userData.subscriptionPlan,
		apiKeys: userData.apiKeys || [],
		userId: userData.userId || userData._id || userData.id,
	  };
	} catch (error) {
	  debug.error('getIdentity', `Error parsing user data:`, error);
	  
	  // Clear invalid data and try to fetch profile
	  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
	  
	  if (authUtils.isAuthenticated()) {
		debug.log('getIdentity', "Fetching profile after error");
		return this.getIdentity(); // Recursive call will use the ensureUserProfile path
	  }
	  
	  return null;
	}