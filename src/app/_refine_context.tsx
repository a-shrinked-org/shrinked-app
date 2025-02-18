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
const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(undefined);
const [initialized, setInitialized] = useState(false);

useEffect(() => {
  const checkAuthentication = async () => {
    try {
      // Don't check if we're loading or already initialized
      if (status === "loading" || initialized) return;
      
      console.log("Starting initial auth check...");
      setIsCheckingAuth(true);

      const result = await customAuthProvider.check();
      console.log("Initial auth check result:", result);

      // Set authentication state first
      setIsAuthenticated(result.authenticated);
      setInitialized(true);
      
      // Handle redirects after state is set
      if (result.authenticated) {
        if (to === '/login' || to === '/') {
          console.log("Authenticated user at login/root, redirecting to jobs");
          window.location.href = '/jobs';
        }
      } else {
        console.log("User not authenticated, redirecting to login");
        if (to !== '/login') {
          window.location.href = '/login';
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      setInitialized(true);
      if (to !== '/login') {
        window.location.href = '/login';
      }
    } finally {
      setIsCheckingAuth(false);
    }
  };

  checkAuthentication();
}, [status, initialized, to]);

const authProvider = {
  ...customAuthProvider,
  check: async () => {
    try {
      // If we have a session, we're authenticated
      if (session) {
        console.log("Auth via session");
        return {
          authenticated: true
        };
      }

      // Get stored tokens
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!accessToken || !refreshToken) {
        console.log("No tokens found");
        return {
          authenticated: false
        };
      }

      // Verify tokens with API
      const result = await customAuthProvider.check();
      console.log("Auth check result:", result);
      
      // Update local state
      setIsAuthenticated(result.authenticated);
      
      return result;
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
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
  
  if (status === "loading" || isCheckingAuth || isAuthenticated === undefined) {
    console.log("Showing loading state:", {
      sessionLoading: status === "loading",
      isCheckingAuth,
      authState: isAuthenticated,
      initialized
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