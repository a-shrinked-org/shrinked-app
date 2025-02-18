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

// Update the App component in _refine_context.tsx

const App = (props: React.PropsWithChildren<{}>) => {
  const { data: session, status } = useSession();
  const to = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    initialized: false
  });

  useEffect(() => {
    const checkAuthentication = async () => {
      // Skip if already initialized or session is loading
      if (authState.initialized || status === "loading") {
        return;
      }

      try {
        console.log("Starting auth check...");
        
        // First check for NextAuth session
        if (session) {
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            initialized: true
          });
          
          if (to === '/login' || to === '/') {
            router.push('/jobs');
          }
          return;
        }
        
        // If no session, check custom auth
        const result = await customAuthProvider.check();
        console.log("Auth check result:", result);

        setAuthState({
          isChecking: false,
          isAuthenticated: result.authenticated,
          initialized: true
        });

        // Handle redirects
        if (result.authenticated) {
          if (to === '/login' || to === '/') {
            router.push('/jobs');
          }
        } else if (to !== '/login') {
          router.push('/login');
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          initialized: true
        });
        
        if (to !== '/login') {
          router.push('/login');
        }
      }
    };

    checkAuthentication();
  }, [status, authState.initialized, to, router, session]);

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
      
      const result = await customAuthProvider.login(params);
      console.log("Login result:", result);
      
      if (result.success && result.user) {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true
        }));
        return result;
      }
      return result;
    },
    check: async () => {
      if (session) {
        return { authenticated: true };
      }
      if (authState.initialized) {
        return { authenticated: authState.isAuthenticated };
      }
      const result = await customAuthProvider.check();
      return result;
    },
    getIdentity: async () => {
      // First try to get identity from session
      if (session?.user) {
        return {
          name: session.user.name,
          avatar: session.user.image,
          token: session.accessToken,
          email: session.user.email,
        };
      }
      
      // Fall back to custom auth provider
      try {
        const identity = await customAuthProvider.getIdentity();
        console.log("GetIdentity result:", identity);
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