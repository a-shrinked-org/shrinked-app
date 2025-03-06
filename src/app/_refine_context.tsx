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
import { authUtils } from "@/utils/authUtils";

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

// Keep track of auth check count to reduce excessive checking
let authCheckCount = 0;
const MAX_AUTH_CHECKS = 3; // Maximum number of auth checks per session
let lastAuthCheckTime = 0;
const AUTH_CHECK_DEBOUNCE = 2000; // 2 seconds

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

  // Auth check effect with debouncing
  useEffect(() => {
    const checkAuthentication = async () => {
      // Skip check if already checking
      if (isCheckingAuthRef.current) {
        return;
      }

      // Skip check if we're still loading session
      if (status === "loading") {
        return;
      }

      // Debounce auth checks
      const now = Date.now();
      if (now - lastAuthCheckTime < AUTH_CHECK_DEBOUNCE) {
        return;
      }
      lastAuthCheckTime = now;

      // Limit number of auth checks per session
      if (authCheckCount >= MAX_AUTH_CHECKS) {
        // Only reset the counter if we've been authenticated for a while
        const authenticatedForAWhile = authState.isAuthenticated && (now - lastAuthCheckTime > 30000);
        if (authenticatedForAWhile) {
          authCheckCount = 0;
        } else {
          return;
        }
      }

      isCheckingAuthRef.current = true;
      authCheckCount++;

      try {
        // If NextAuth session exists, use that
        if (status === "authenticated" && session) {
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            initialized: true,
          });
          isCheckingAuthRef.current = false;
          return;
        }

        // Otherwise check custom auth provider
        const result = await customAuthProvider.check();
        
        setAuthState({
          isChecking: false,
          isAuthenticated: result.authenticated,
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
  }, [status, session, authState.isAuthenticated]);

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
          // Reset auth check count on successful login
          authCheckCount = 0;
          
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

        // Debounce auth checks
        const now = Date.now();
        if (now - lastAuthCheckTime < AUTH_CHECK_DEBOUNCE) {
          // Just use current auth state for faster response
          return { authenticated: authState.isAuthenticated };
        }
        lastAuthCheckTime = now;
        
        // Check NextAuth session first
        if (status === "authenticated" && session) {
          return { authenticated: true };
        }
        
        // Otherwise check if we're authenticated using a faster local check
        if (authUtils.isAuthenticated()) {
          // Only check with the server if we haven't checked too frequently
          if (authCheckCount < MAX_AUTH_CHECKS) {
            authCheckCount++;
            const result = await customAuthProvider.check();
            return { authenticated: result.authenticated };
          }
          return { authenticated: true };
        }
        
        // If we're not authenticated and not on login page, redirect
        if (to !== "/login") {
          return {
            authenticated: false,
            error: new Error("Not authenticated"),
            logout: true,
            redirectTo: "/login"
          };
        }
        
        return { authenticated: false };
      } catch (error) {
        console.error("Auth check error in route guard:", error);
        return {
          authenticated: false,
          error: new Error("Authentication check failed"),
          logout: true,
          redirectTo: "/login"
        };
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
      // Reset auth check count on logout
      authCheckCount = 0;
      
      // Sign out from NextAuth if we're using it
      if (status === "authenticated") {
        await signIn("logout");
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
              name: "categories",
              list: "/categories",
              create: "/categories/create",
              edit: "/categories/edit/:id",
              show: "/categories/show/:id",
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