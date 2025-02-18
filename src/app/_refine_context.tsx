"use client";

import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
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
  const isNavigating = useRef(false);
  
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    initialized: false,
  });

  // Auth check effect
  useEffect(() => {
    const checkAuthentication = async () => {
      if (status === "loading") return;

      try {
        if (session) {
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            initialized: true,
          });
          return;
        }

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
      }
    };

    checkAuthentication();
  }, [status, session]);

  // Navigation effect with lock mechanism
  useEffect(() => {
    const handleNavigation = async () => {
      if (!authState.initialized || authState.isChecking || isNavigating.current) {
        return;
      }

      const currentPath = to || "";
      
      // Set destinations based on auth state
      const authenticatedRedirect = currentPath === "/login" || currentPath === "/" ? "/jobs" : null;
      const unauthenticatedRedirect = currentPath !== "/login" ? "/login" : null;
      
      // Determine if navigation is needed
      const redirectPath = authState.isAuthenticated ? authenticatedRedirect : unauthenticatedRedirect;
      
      if (redirectPath) {
        try {
          isNavigating.current = true;
          await router.replace(redirectPath);
        } finally {
          // Reset navigation lock after a short delay
          setTimeout(() => {
            isNavigating.current = false;
          }, 100);
        }
      }
    };

    handleNavigation();
  }, [authState.isAuthenticated, authState.initialized, authState.isChecking, to, router]);

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
        
        if (result.success) {
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            initialized: true,
          });
          
          // Use the navigation lock for login redirect
          if (!isNavigating.current) {
            isNavigating.current = true;
            await router.replace("/jobs");
            setTimeout(() => {
              isNavigating.current = false;
            }, 100);
          }
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
      return customAuthProvider.check();
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
      return customAuthProvider.getIdentity();
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