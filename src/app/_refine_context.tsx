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

useEffect(() => {
  if (status === "loading") {
    return;
  }

  const checkAuthentication = async () => {
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

      if (result.authenticated) {
        setAuthState({
          isChecking: false,
          isAuthenticated: true,
          initialized: true
        });
      } else {
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          initialized: true
        });
      }
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

// Handle redirects
useEffect(() => {
  if (authState.isChecking || !authState.initialized) {
    return;
  }

  const currentPath = to || '/';
  
  if (authState.isAuthenticated) {
    if (currentPath === '/login' || currentPath === '/') {
      console.log('Redirecting authenticated user to /jobs');
      router.push('/jobs');
    }
  } else {
    if (currentPath !== '/login') {
      console.log('Redirecting unauthenticated user to /login');
      router.push('/login');
    }
  }
}, [authState.isAuthenticated, authState.initialized, authState.isChecking, to]);

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
    if (session) {
      return { authenticated: true };
    }

    if (!authState.isChecking && authState.initialized && authState.isAuthenticated) {
      return { authenticated: true };
    }

    if (!customAuthProvider.check) {
      return { authenticated: false };
    }
    
    return await customAuthProvider.check();
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
    
    if (!customAuthProvider.getIdentity) {
      return null;
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