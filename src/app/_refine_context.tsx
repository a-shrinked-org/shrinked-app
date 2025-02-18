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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        if (status === "loading") return;

        const result = await customAuthProvider.check();
        setIsAuthenticated(result.authenticated);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthentication();
  }, [status]);

  if (isCheckingAuth || status === "loading") {
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
      
      const result = await customAuthProvider.login(params);
      console.log("Login result:", result);
      
      if (result.success && result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
        setIsAuthenticated(true);
        return result;
      }
      return result;
    },
    register: async (params: any) => {
      if (!customAuthProvider.register) {
        return {
          success: false,
          error: {
            message: "Registration not supported",
            name: "Registration Error"
          }
        };
      }
      try {
        const result = await customAuthProvider.register(params);
        if (result.success && result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
          setIsAuthenticated(true);
        }
        return result;
      } catch (error) {
        return {
          success: false,
          error: {
            message: "Registration failed",
            name: "Registration Error"
          }
        };
      }
    },
    check: async () => {
      console.log('Refine Check - Session:', !!session);
      setIsCheckingAuth(true);
      
      try {
        if (session) {
          console.log("Auth via session, returning authenticated true");
          setIsAuthenticated(true);
          setIsCheckingAuth(false);
          return {
            authenticated: true,
            redirectTo: "/jobs"
          };
        }
        
        const result = await customAuthProvider.check();
        console.log('Refine Check - Custom auth result:', result);
        setIsAuthenticated(result.authenticated);
        setIsCheckingAuth(false);
        return result;
      } catch (error) {
        console.log("Auth check error:", error);
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return {
          authenticated: false,
          redirectTo: "/login",
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