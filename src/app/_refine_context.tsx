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
        setAuthState(prev => ({
          ...prev,
          isChecking: false,
          isAuthenticated: true,
          initialized: true,
          currentPath: to || ''
        }));
        return;
      }
      
      const result = await customAuthProvider.check();
      console.log("Auth check result:", result);

      setAuthState(prev => ({
        ...prev,
        isChecking: false,
        isAuthenticated: result.authenticated,
        initialized: true,
        currentPath: to || ''
      }));
    } catch (error) {
      console.error("Auth check error:", error);
      setAuthState(prev => ({
        ...prev,
        isChecking: false,
        isAuthenticated: false,
        initialized: true,
        currentPath: to || ''
      }));
    }
  };

  checkAuthentication();
}, [status, session]);

// Navigation effect
useEffect(() => {
  if (authState.isChecking || !authState.initialized) {
    return;
  }

  // Prevent navigation if we're already on the target path
  if (authState.currentPath === to) {
    return;
  }

  const handleNavigation = async () => {
    if (authState.isAuthenticated) {
      if (to === '/login' || to === '/') {
        console.log('Authenticated user redirecting to /jobs from:', to);
        await router.replace('/jobs');
      }
    } else {
      if (to !== '/login') {
        console.log('Unauthenticated user redirecting to /login from:', to);
        await router.replace('/login');
      }
    }
  };

  handleNavigation();
}, [authState.isAuthenticated, authState.initialized, to, authState.currentPath]);

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
      setAuthState(prev => ({
        ...prev,
        isChecking: false,
        isAuthenticated: true,
        initialized: true,
        currentPath: '/login'
      }));
    }
    return result;
  },
  check: async () => {
    if (session) {
      return { authenticated: true };
    }

    if (!customAuthProvider.check) {
      return { authenticated: false };
    }
    
    const result = await customAuthProvider.check();
    return result;
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