"use client";

import { Refine, useNavigation, NotificationProvider } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider } from "@providers/data-provider";
import { customAuthProvider } from "@providers/customAuthProvider";
import { toast, ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@styles/global.css";
import { authUtils, API_CONFIG } from "@/utils/authUtils";
import { HelmetProvider } from "react-helmet-async";
import { debounce } from 'lodash';

interface RefineContextProps {}

interface ExtendedSession {
  user?: {
    name?: string;
    email?: string;
    image?: string;
    refreshToken?: string;
  };
  accessToken?: string;
  error?: string;
}

const AUTH_CHECK_COOLDOWN = 60000; // 1 minute between full auth checks
let lastFullAuthCheckTime = 0;

const notificationProvider: NotificationProvider = {
  open: ({ message, description, type, key }) => {
    const content = description ? `${message}: ${description}` : message;
    const toastId = key ? String(key) : undefined;

    if (toastId && toast.isActive(toastId)) {
      toast.update(toastId, {
        render: content,
        type: type === "error" ? "error" : type === "success" ? "success" : "info",
        autoClose: 5000,
      });
    } else {
      toast(content, {
        toastId: toastId,
        type: type === "error" ? "error" : type === "success" ? "success" : "info",
        autoClose: 5000,
      });
    }
  },
  close: (key) => {
    if (key) toast.dismiss(String(key));
  },
};

const createUnifiedSession = async (nextAuthSession: ExtendedSession | null, customAuth: boolean) => {
  if (nextAuthSession?.user) {
    return {
      source: 'nextauth',
      user: {
        name: nextAuthSession.user.name || '',
        email: nextAuthSession.user.email || '',
        avatar: nextAuthSession.user.image || null
      },
      accessToken: nextAuthSession.accessToken || null,
      isAuthenticated: true
    };
  }
  
  if (customAuth) {
    try {
      // Ensure we have the latest user profile
      const userData = await authUtils.ensureUserProfile();
      
      if (userData) {
        return {
          source: 'custom',
          user: {
            name: userData.username || userData.email || '',
            email: userData.email || '',
            avatar: userData.avatar || null
          },
          accessToken: authUtils.getAccessToken(),
          isAuthenticated: true
        };
      }
    } catch (error) {
      console.error("Error getting unified session:", error);
    }
  }
  
  return { source: null, user: null, accessToken: null, isAuthenticated: false };
};

const App = (props: React.PropsWithChildren<{}>) => {
  const { data: session, status } = useSession() as {
    data: ExtendedSession | null;
    status: "loading" | "authenticated" | "unauthenticated";
  };
  const to = usePathname();
  const { push } = useNavigation();

  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    initialized: false,
  });

  const isCheckingAuthRef = useRef(false);
  const isInitialized = useRef(false);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    // Force exit loading state after a reasonable timeout (3 seconds)
    const loadingTimeoutId = setTimeout(() => {
      if (authState.isChecking) {
        console.log("[AUTH] Forcing exit from loading state after timeout");
        setAuthState({
          isChecking: false,
          isAuthenticated: false, 
          initialized: true
        });
      }
    }, 3000);

    return () => clearTimeout(loadingTimeoutId);
  }, [authState.isChecking]);

  // Initialize token refresh mechanism and load profile
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    // Immediately set to not checking if we're on the login page
    if (to === "/login") {
      setAuthState({
        isChecking: false,
        isAuthenticated: false,
        initialized: true
      });
      return;
    }
    
    if (authUtils.isAuthenticated()) {
      console.log("[APP] Initializing token refresh mechanism");
      authUtils.setupRefreshTimer();
      
      // Load user profile on initialization
      authUtils.ensureUserProfile().then(profile => {
        if (profile) {
          console.log("[APP] User profile loaded on initialization");
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            initialized: true
          });
        } else {
          console.error("[APP] Failed to load user profile on initialization");
          setAuthState({
            isChecking: false,
            isAuthenticated: false,
            initialized: true
          });
        }
      }).catch(error => {
        console.error("[APP] Error loading user profile:", error);
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          initialized: true
        });
      });
    } else {
      // If no auth, immediately set to not checking
      setAuthState({
        isChecking: false,
        isAuthenticated: false,
        initialized: true
      });
    }
  }, [to]);

  // Create a debounced version of the auth check function
  const debouncedAuthCheck = useRef(
    debounce(async () => {
      if (to === "/login" || isCheckingAuthRef.current) {
        if (authState.isChecking) {
          setAuthState({
            isChecking: false,
            isAuthenticated: false,
            initialized: true
          });
        }
        return;
      }
      
      if (isCheckingAuthRef.current) return;
      isCheckingAuthRef.current = true;

      try {
        // First check: NextAuth session
        if (status === "authenticated" && session) {
          setAuthState({ isChecking: false, isAuthenticated: true, initialized: true });
          isCheckingAuthRef.current = false;
          return;
        }

        // Second check: Local auth
        try {
          const hasTokens = authUtils.isAuthenticated();
          if (hasTokens) {
            // Ensure profile is loaded
            const profile = await authUtils.ensureUserProfile();
            setAuthState({ 
              isChecking: false, 
              isAuthenticated: !!profile, 
              initialized: true 
            });
          } else {
            setAuthState({ isChecking: false, isAuthenticated: false, initialized: true });
          }
        } catch (error) {
          console.error("Token check error:", error);
          // Fallback in case of error
          setAuthState({ isChecking: false, isAuthenticated: false, initialized: true });
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Always resolve the loading state
        setAuthState({ isChecking: false, isAuthenticated: false, initialized: true });
      } finally {
        isCheckingAuthRef.current = false;
      }
    }, 300) // 300ms debounce
  ).current;

  // Auth check effect with debouncing
  useEffect(() => {
    debouncedAuthCheck();
    
    // Clean up the debounced function when component unmounts
    return () => debouncedAuthCheck.cancel();
  }, [status, session]);

  const authProvider = {
    ...customAuthProvider,
    login: async (params: any) => {
      // Extract returnUrl if it exists
      const { providerName, email, password, returnUrl } = params;
      
      if (params.providerName === "auth0" || params.providerName === "google") {
        const callbackUrl = returnUrl || "/jobs";
        signIn(params.providerName, { callbackUrl, redirect: true });
        return { success: false, error: { message: `Redirecting to ${params.providerName}...`, name: params.providerName } };
      }
    
      try {
        // Debug log to check if login flow is being triggered
        console.log("[AUTH] Attempting login with email:", email);
        
        const result = await customAuthProvider.login(params);
        if (result.success && params.password) {
          // Debug log to verify we reached the success path
          console.log("[AUTH] Login successful, showing welcome toast");
          
          lastFullAuthCheckTime = Date.now();
          authUtils.setupRefreshTimer();
          setAuthState({ isChecking: false, isAuthenticated: true, initialized: true });
          
          // Use direct toast call instead of notificationProvider
          toast.success("Welcome back!", { 
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
          });
          
          return { ...result, redirectTo: returnUrl || "/jobs" };
        }
    
        if (!result.success) {
          console.log("[AUTH] Login failed:", result.error);
          toast.error(result.error?.message || "Invalid credentials", {
            position: "top-center",
            autoClose: 5000,
            theme: "dark",
          });
        }
        return result;
      } catch (error) {
        console.error("Login error:", error);
        
        // Enhanced error messages for common scenarios
        let errorMessage = "An unexpected error occurred";
        if (error instanceof Error) {
          if (!navigator.onLine) {
            errorMessage = "You appear to be offline. Please check your internet connection and try again.";
          } else if (error.message.includes("timeout") || error.message.includes("NetworkError")) {
            errorMessage = "Connection timed out. The server may be busy or experiencing issues.";
          }
        }
        
        toast.error(errorMessage, {
          position: "top-center",
          autoClose: 5000,
          theme: "dark",
        });
        
        return { success: false, error: { message: "Login failed", name: "Auth Error" } };
      }
    },
    check: async () => {
      try {
        if (to === "/login") return { authenticated: false };
    
        if (status === "authenticated" && session) return { authenticated: true };
    
        const hasLocalTokens = authUtils.isAuthenticated();
        if (!hasLocalTokens) {
          return { authenticated: false, logout: true, redirectTo: "/login" };
        }
    
        const now = Date.now();
        if (now - lastFullAuthCheckTime >= AUTH_CHECK_COOLDOWN) {
          lastFullAuthCheckTime = now;
          const accessToken = await authUtils.ensureValidToken();
          if (!accessToken) {
            return { authenticated: false, logout: true, redirectTo: "/login" };
          }
          
          // Always ensure profile is loaded during full auth check
          const profile = await authUtils.ensureUserProfile();
          if (!profile) {
            console.error("[AUTH] Failed to load user profile during auth check");
            return { authenticated: false, logout: true, redirectTo: "/login" };
          }
          
          console.log("[AUTH] Full token validation and profile loading completed");
        }
    
        return { authenticated: true };
      } catch (error) {
        console.error("Auth check error:", error);
        return { authenticated: false, logout: true, redirectTo: "/login" };
      }
    },
    getIdentity: async () => {
      // NextAuth session takes precedence
      if (status === "authenticated" && session) {
        return {
          name: session.user?.name || "",
          email: session.user?.email || "",
          avatar: session.user?.image || null,
          token: session.accessToken || "",
        };
      }
      
      // If using custom auth, always ensure we have the latest profile
      if (authUtils.isAuthenticated()) {
        try {
          // This will use cached profile if available, or fetch a new one if needed
          const userProfile = await authUtils.ensureUserProfile();
          
          if (userProfile) {
            return {
              id: userProfile.userId || userProfile._id || userProfile.id,
              name: userProfile.username || userProfile.email,
              email: userProfile.email,
              avatar: userProfile.avatar || "",
              roles: userProfile.roles || [],
              token: authUtils.getAccessToken() || userProfile.accessToken,
              subscriptionPlan: userProfile.subscriptionPlan,
              apiKeys: userProfile.apiKeys || [],
              userId: userProfile.userId || userProfile._id || userProfile.id,
              usage: userProfile.usage,
            };
          }
        } catch (error) {
          console.error("Error getting user profile:", error);
        }
      }
      
      // If all checks fail, return null
      return null;
    },
    logout: async (params: any = {}) => {
      lastFullAuthCheckTime = 0;
      if (status === "authenticated") await signIn("logout");
      if (window._refreshTimerId) {
        clearTimeout(window._refreshTimerId);
        window._refreshTimerId = undefined;
      }

      const result = await customAuthProvider.logout(params);
      setAuthState({ isChecking: false, isAuthenticated: false, initialized: true });
      return { success: true, redirectTo: "/login" };
    },
  };

  // Replace the simple loading span with a more robust fallback
  if (status === "loading" || authState.isChecking) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div>Loading authentication state...</div>
      </div>
    );
  }

  return (
    <RefineKbarProvider>
      <Refine
        routerProvider={routerProvider}
        dataProvider={dataProvider}
        authProvider={authProvider}
        notificationProvider={notificationProvider}
        resources={[
          { name: "jobs", list: "/jobs", create: "/jobs/create", edit: "/jobs/edit/:id", show: "/jobs/show/:id", meta: { canDelete: true } },
          { name: "scheduled", list: "/scheduled", create: "/scheduled/create", edit: "/scheduled/edit/:id", show: "/scheduled/show/:id", meta: { canDelete: true } },
          { name: "output", list: "/output", show: "/output/show/:id", meta: { canDelete: true } },
          { name: "logic", list: "/logic", meta: { canDelete: false } },
        ]}
        options={{ syncWithLocation: true, warnWhenUnsavedChanges: true, useNewQueryKeys: true }}
      >
        {props.children}
        <RefineKbar />
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          transition={Slide}
          icon={false}
        />
      </Refine>
    </RefineKbarProvider>
  );
};

export const RefineContext = (props: React.PropsWithChildren<RefineContextProps>) => {
  return (
    <HelmetProvider>
      <SessionProvider>
        <App {...props} />
      </SessionProvider>
    </HelmetProvider>
  );
};

export default RefineContext;