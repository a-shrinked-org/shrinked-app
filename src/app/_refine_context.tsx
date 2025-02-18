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
    initialized: false,
    currentPath: ''
  });

  // Auth check effect
  useEffect(() => {
    if (status === "loading") {
      return;
    }

    const checkAuthentication = async () => {
      try {
        console.log("Starting auth check...");
        
        if (session) {
          console.log("Session found, setting authenticated");
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            initialized: true,
            currentPath: to || ''
          });
          return;
        }
        
        const result = await customAuthProvider.check();
        console.log("Auth check result:", result);

        setAuthState({
          isChecking: false,
          isAuthenticated: result.authenticated,
          initialized: true,
          currentPath: to || ''
        });
      } catch (error) {
        console.error("Auth check error:", error);
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          initialized: true,
          currentPath: to || ''
        });
      }
    };

    checkAuthentication();
  }, [status, session, to]);

  // Navigation effect
  useEffect(() => {
    const handleNavigation = async () => {
      if (!authState.initialized || authState.isChecking) {
        return;
      }

      console.log('Navigation check:', {
        isAuthenticated: authState.isAuthenticated,
        currentPath: authState.currentPath,
        targetPath: to
      });

      if (authState.isAuthenticated) {
        if (to === '/login' || to === '/') {
          console.log('Authenticated user redirecting to /jobs');
          router.replace('/jobs');
        }
      } else {
        if (to !== '/login') {
          console.log('Unauthenticated user redirecting to /login');
          router.replace('/login');
        }
      }
    };

    handleNavigation();
  }, [authState.isAuthenticated, authState.initialized, to]);

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
      
      try {
        const result = await customAuthProvider.login(params);
        console.log("Login result:", result);
        
        if (result.success && result.user) {
          console.log("Login successful, updating auth state");
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            initialized: true,
            currentPath: '/login'
          });
          
          // Force navigation after successful login
          console.log("Redirecting to /jobs after login");
          router.replace('/jobs');
        }
        return result;
      } catch (error) {
        console.error("Login error:", error);
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
      if (session) {
        return { authenticated: true };
      }
      
      try {
        const result = await customAuthProvider.check();
        return result;
      } catch (error) {
        console.error("Check error:", error);
        return { authenticated: false };
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
      
      try {
        const identity = await customAuthProvider.getIdentity();
        return identity;
      } catch (error) {
        console.error("GetIdentity error:", error);
        return null;
      }
    }
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