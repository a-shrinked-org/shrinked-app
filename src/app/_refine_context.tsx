"use client";

import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider } from "@providers/data-provider";
import { customAuthProvider } from "@providers/customAuthProvider";
import "@styles/global.css";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

interface RefineContextProps {}

const App = (props: React.PropsWithChildren<{}>) => {
const { data: session, status } = useSession();
const to = usePathname();
const router = useRouter();
const [authState, setAuthState] = useState({
  isChecking: true,
  isAuthenticated: false,
  initialized: false
});

// Effect to handle initial authentication check
useEffect(() => {
  const checkAuthentication = async () => {
    // Skip if session is loading
    if (status === "loading") {
      console.log("Session is loading, skipping check");
      return;
    }

    try {
      console.log("Starting auth check...");
      
      // First check for NextAuth session
      if (session) {
        console.log("Session found:", session);
        setAuthState({
          isChecking: false,
          isAuthenticated: true,
          initialized: true
        });
        return;
      }
      
      // If no session, check custom auth
      const result = await customAuthProvider.check();
      console.log("Auth check result:", result);

      const newAuthState = {
        isChecking: false,
        isAuthenticated: result.authenticated,
        initialized: true
      };
      console.log("Setting new auth state:", newAuthState);
      setAuthState(newAuthState);
    } catch (error) {
      console.error("Auth check error:", error);
      setAuthState({
        isChecking: false,
        isAuthenticated: false,
        initialized: true
      });
    }
  };

  checkAuthentication();
}, [status, session]);

// Separate effect to handle redirects based on auth state

useEffect(() => {
  const handleRedirect = async () => {
    if (!authState.isChecking && authState.initialized) {
      console.log("Handling redirect with auth state:", authState);
      if (authState.isAuthenticated) {
        if (to === '/login' || to === '/') {
          console.log("Authenticated user at login/root, redirecting to /jobs");
          router.push('/jobs');
        }
      } else {
        if (to !== '/login') {
          console.log("Unauthenticated user, redirecting to /login");
          router.push('/login');
        }
      }
    }
  };

  handleRedirect();
}, [authState, to, router]);

const authProvider = {
  ...customAuthProvider,
  login: async (params: any) => {
    if (params.providerName === "auth0") {
      signIn("auth0", {
        callbackUrl: "/jobs",
        redirect: true,
      });
      return {
        success: false,
        error: {
          message: "Redirecting to Auth0...",
          name: "Auth0"
        }
      };
    }
    
    if (!customAuthProvider.login) {
      return {
        success: false,
        error: {
          message: "Login method not available",
          name: "Auth Error"
        }
      };
    }
  
    const result = await customAuthProvider.login(params);
    console.log("Login result:", result);
    
    if (result.success && result.user) {
      console.log("Setting authenticated state after successful login");
      setAuthState({
        isChecking: false,
        isAuthenticated: true,
        initialized: true
      });
      return result;
    }
    return result;
  },
  check: async () => {
    console.log("Check auth called. Current state:", { session, authState });
    
    if (session) {
      return { authenticated: true };
    }
    
    if (!authState.isChecking && authState.initialized && authState.isAuthenticated) {
      return { authenticated: true };
    }
    
    // Check local storage first
    const accessToken = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    
    if (accessToken && userStr) {
      console.log("Found stored credentials");
      if (!customAuthProvider.check) {
        return { authenticated: true };
      }
      const result = await customAuthProvider.check();
      console.log("Custom auth check result:", result);
      return result;
    }
    
    if (!customAuthProvider.check) {
      return { authenticated: false };
    }
    
    const result = await customAuthProvider.check();
    return result;
  },
  getIdentity: async () => {
    console.log("getIdentity called. Session:", session?.user);
    
    // First try to get identity from session
    if (session?.user) {
      const sessionIdentity = {
        name: session.user.name,
        avatar: session.user.image,
        token: session.accessToken,
        email: session.user.email,
      };
      console.log("Returning session identity:", sessionIdentity);
      return sessionIdentity;
    }
    
    // Fall back to custom auth provider
    if (!customAuthProvider.getIdentity) {
      console.log("No getIdentity method available");
      return null;
    }
    
    try {
      const identity = await customAuthProvider.getIdentity();
      console.log("Custom auth identity result:", identity);
      return identity;
    } catch (error) {
      console.error("GetIdentity error:", error);
      return null;
    }
  }
};

  // Show loading state while checking auth
  if (status === "loading" || authState.isChecking) {
    console.log("Loading state:", {
      sessionLoading: status === "loading",
      ...authState
    });
    return <span>Loading...</span>;
  }

  return (
    <>
      <RefineKbarProvider>
        <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider}
          authProvider={authProvider}
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