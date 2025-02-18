"use client";

import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
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
const [isCheckingAuth, setIsCheckingAuth] = useState(true);
const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(undefined); // Initial state is undefined
const [initialized, setInitialized] = useState(false);

useEffect(() => {
  const checkAuthentication = async () => {
    try {
      // Only check if we're not already checking and session status is determined
      if (status === "loading" || initialized) return;
      
      console.log("Starting initial auth check...");
      setIsCheckingAuth(true);

      const result = await customAuthProvider.check();
      console.log("Initial auth check result:", result);

      // Set the authentication state
      setIsAuthenticated(result.authenticated);
      
      // Only handle redirects after we're sure about auth state
      if (result.authenticated) {
        if (to === '/login') {
          console.log("Authenticated user at login, redirecting to jobs");
          window.location.href = '/jobs';
        }
      } else {
        if (to !== '/login') {
          console.log("Unauthenticated user, redirecting to login");
          window.location.href = '/login';
        }
      }

      setInitialized(true);
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      if (to !== '/login') {
        window.location.href = '/login';
      }
    } finally {
      setIsCheckingAuth(false);
    }
  };

  checkAuthentication();
}, [status, initialized, to]);

// Show loading state while:
// 1. Session is loading
// 2. Initial auth check is running
// 3. Authentication state is undefined
if (status === "loading" || isCheckingAuth || isAuthenticated === undefined) {
  console.log("Showing loading state:", {
    sessionLoading: status === "loading",
    isCheckingAuth,
    authState: isAuthenticated
  });
  return <span>Loading...</span>;
}

const authProvider = {
  ...customAuthProvider,
  login: async (params: any) => {
    if (params.providerName === "auth0") {
      signIn("auth0", {
        callbackUrl: to ? to.toString() : "/jobs",
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
    
    try {
      console.log("Starting login process...");
      const result = await customAuthProvider.login(params);
      console.log("Login result:", result);
      
      if (result.success && result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
        setIsAuthenticated(true);
        console.log("Login successful, redirecting to jobs");
        window.location.href = '/jobs';
        return result;
      }
      setIsAuthenticated(false);
      return result;
    } catch (error) {
      console.error("Login error:", error);
      setIsAuthenticated(false);
      return {
        success: false,
        error: {
          message: "Login failed",
          name: "Login Error"
        }
      };
    }
  },
  check: async () => {
    console.log('Running auth check...');
    
    try {
      if (session) {
        console.log("Auth via session");
        return {
          authenticated: true
        };
      }
      
      if (isAuthenticated === undefined) {
        console.log("Auth state undefined, checking with provider...");
        const result = await customAuthProvider.check();
        return result;
      }

      console.log("Returning current auth state:", { isAuthenticated });
      return {
        authenticated: isAuthenticated
      };
    } catch (error) {
      console.error("Auth check error:", error);
      return {
        authenticated: false,
        error: {
          message: "Authentication check failed",
          name: "Auth Error"
        }
      };
    }
  },
    getIdentity: async () => {
      if (session?.user) {
        return {
          name: session.user.name,
          avatar: session.user.image,
          token: session.accessToken,
          email: session.user.email,
        };
      }
      
      const identity = await customAuthProvider.getIdentity!();
      console.log("GetIdentity result:", identity);
      return identity;
    }
  };

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