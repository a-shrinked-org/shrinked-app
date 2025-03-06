"use client";

import { Refine, useNavigation, NotificationProvider } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider } from "@providers/data-provider";
import { customAuthProvider } from "@providers/customAuthProvider";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@styles/global.css";
import { authUtils, API_CONFIG } from "@/utils/authUtils";

interface RefineContextProps {}

// Define proper session types
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

// Simplified auth check timing
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
        autoClose: 3000,
      });
    } else {
      toast(content, {
        toastId: toastId,
        type: type === "error" ? "error" : type === "success" ? "success" : "info",
        autoClose: 3000,
      });
    }
  },
  close: (key) => {
    if (key) {
      toast.dismiss(String(key));
    }
  },
};

const App = (props: React.PropsWithChildren<{}>) => {
  // Type the session properly
  const { data: session, status } = useSession() as { 
    data: ExtendedSession | null; 
    status: "loading" | "authenticated" | "unauthenticated" 
  };
  
  const to = usePathname();
  const { push } = useNavigation();
  
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    initialized: false,
  });

  // Track ongoing auth check to prevent duplicate checks
  const isCheckingAuthRef = useRef(false);

  // Initialize token refresh mechanism
  useEffect(() => {
    // Check if we have tokens and set up refresh mechanism
    if (authUtils.isAuthenticated()) {
      console.log("[APP] Initializing token refresh mechanism");
      authUtils.setupRefreshTimer(true); // true forces immediate check
    }
  }, []);
  
  // Simplified auth check effect
  useEffect(() => {
    const checkAuthentication = async () => {
      // Skip check if already checking or still loading session
      if (isCheckingAuthRef.current || status === "loading") {
        return;
      }

      isCheckingAuthRef.current = true;

      try {
        // If NextAuth session exists, use that
        if (status === "authenticated" && session) {
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            initialized: true,
          });
          return;
        }

        // Otherwise use local token presence as a fast check
        const hasTokens = authUtils.isAuthenticated();
        setAuthState({
          isChecking: false,
          isAuthenticated: hasTokens,
          initialized: true,
        });
      } catch (error) {
        console.error("Auth check error:", error);
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          initialized: true,
        });
      } finally {
        isCheckingAuthRef.current = false;
      }
    };

    checkAuthentication();
  }, [status, session]); // Only run when these change

  const authProvider = {
    ...customAuthProvider,
    login: async (params: any) => {
      // Handle OAuth providers with NextAuth
      if (params.providerName === "auth0" || params.providerName === "google") {
        signIn(params.providerName, {
          callbackUrl: "/jobs",
          redirect: true,
        });
        return {
          success: false,
          error: {
            message: `Redirecting to ${params.providerName}...`,
            name: params.providerName
          }
        };
      }
      
      try {
        const result = await customAuthProvider.login(params);
        
        if (result.success) {
          // Reset auth validation time on successful login
          lastFullAuthCheckTime = Date.now();
          
          // Set up the token refresh timer
          authUtils.setupRefreshTimer(true);
          
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            initialized: true,
          });
          
          notificationProvider.open({
            message: "Welcome back!",
            type: "success",
            key: "login-success"
          });
          
          return {
            ...result,
            redirectTo: "/jobs"
          };
        }
        
        notificationProvider.open({
          message: "Login Failed",
          description: result.error?.message || "Invalid credentials",
          type: "error",
          key: "login-error"
        });
        
        return result;
      } catch (error) {
        console.error("Login error:", error);
        
        notificationProvider.open({
          message: "Login Error",
          description: "An unexpected error occurred",
          type: "error",
          key: "login-error"
        });
        
        return {
          success: false,
          error: {
            message: "Login failed",
            name: "Auth Error"
          }
        };
      }
    },
    check: async () => {
      try {
        // Skip check if we're on login page
        if (to === "/login") {
          return { authenticated: false };
        }

        // Check NextAuth session first
        if (status === "authenticated" && session) {
          return { authenticated: true };
        }
        
        // Use fast local token check for most requests
        const hasLocalTokens = authUtils.isAuthenticated();
        if (!hasLocalTokens) {
          return {
            authenticated: false,
            error: new Error("Not authenticated"),
            logout: true,
            redirectTo: "/login"
          };
        }
        
        // Only do full backend validation occasionally
        const now = Date.now();
        if (now - lastFullAuthCheckTime >= AUTH_CHECK_COOLDOWN) {
          lastFullAuthCheckTime = now;
          
          try {
            // Verify token with backend - based on Postman collection, use Bearer auth
            const accessToken = authUtils.getAccessToken();
            const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              // Remove credentials: 'include' to avoid CORS issues
            });
            
            if (!response.ok) {
              // Try to refresh token once before failing
              const refreshSuccess = await authUtils.refreshToken();
              if (!refreshSuccess) {
                return {
                  authenticated: false,
                  error: new Error("Invalid session"),
                  logout: true,
                  redirectTo: "/login"
                };
              }
            }
          } catch (error) {
            console.error("Backend validation error:", error);
            // Don't immediately log out for network errors
            if (navigator.onLine) {
              return {
                authenticated: false,
                error: new Error("Session validation failed"),
                logout: true,
                redirectTo: "/login"
              };
            }
          }
        }
        
        // Default to authenticated if we have tokens
        return { authenticated: true };
      } catch (error) {
        console.error("Auth check error:", error);
        return { authenticated: false };
      }
    },
    getIdentity: async () => {
      // First try to get session data (NextAuth)
      if (session?.user) {
        return {
          name: session.user.name || "",
          email: session.user.email || "",
          avatar: session.user.image || null,
          token: session.accessToken || "",
        };
      }
      
      // If no session, try custom auth - use cached identity when possible
      try {
        const identity = await customAuthProvider.getIdentity();
        if (identity) {
          return identity;
        }
      } catch (error) {
        console.error("Error getting identity:", error);
      }
      
      // If both fail, return null
      return null;
    },
    logout: async (params: any = {}) => {
      // Reset auth check time on logout
      lastFullAuthCheckTime = 0;
      
      // Sign out from NextAuth if we're using it
      if (status === "authenticated") {
        await signIn("logout");
      }
      
      // Clear any refresh timers
      if (window._refreshTimerId) {
        clearTimeout(window._refreshTimerId);
        window._refreshTimerId = undefined;
      }
      
      // Then normal logout
      const result = await customAuthProvider.logout(params);
      setAuthState({
        isChecking: false,
        isAuthenticated: false,
        initialized: true,
      });
      return {
        success: true,
        redirectTo: "/login"
      };
    },
  };

  if (status === "loading" || authState.isChecking) {
    return <span>Loading...</span>;
  }

  return (
    <>
      <RefineKbarProvider>
        <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider}
          authProvider={authProvider}
          notificationProvider={notificationProvider}
          resources={[
            {
              name: "jobs",
              list: "/jobs",
              create: "/jobs/create",
              edit: "/jobs/edit/:id",
              show: "/jobs/show/:id",
              meta: {
                canDelete: true,
              },
            },
            {
              name: "scheduled",
              list: "/scheduled",
              create: "/scheduled/create",
              edit: "/scheduled/edit/:id",
              show: "/scheduled/show/:id",
              meta: {
                canDelete: true,
              },
            },
            {
              name: "output",
              list: "/output",
              show: "/output/show/:id",
              meta: {
                canDelete: true,
              },
            },
          ]}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
            useNewQueryKeys: true
          }}
        >
          {props.children}
          <RefineKbar />
          <ToastContainer />
        </Refine>
      </RefineKbarProvider>
    </>
  );
};

export const RefineContext = (
  props: React.PropsWithChildren<RefineContextProps>
) => {
  return (
    <SessionProvider>
      <App {...props} />
    </SessionProvider>
  );
};

export default RefineContext;