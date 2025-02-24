"use client";

import { Refine, useNavigation, NotificationProvider } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider } from "@providers/data-provider";
import { customAuthProvider } from "@providers/customAuthProvider";
import { toast, ToastContainer, Id } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@styles/global.css";

interface RefineContextProps {}

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
  const { data: session, status } = useSession();
  const to = usePathname();
  const { push } = useNavigation();
  
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
  
        // Let the authProvider.check handle the rest
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
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
      // Skip check if we're on login page or have a session
      if (to === "/login" || session) {
        return { authenticated: !!session };
      }
  
      try {
        const result = await customAuthProvider.check();
        
        // Not authenticated and not on login page - redirect to login
        if (!result.authenticated && to !== "/login") {
          return {
            authenticated: false,
            error: new Error("Not authenticated"),
            logout: true,
            redirectTo: "/login"
          };
        }
        
        // Authenticated but on login page - redirect to jobs
        if (result.authenticated && to === "/login") {
          return {
            authenticated: true,
            redirectTo: "/jobs"
          };
        }
        
        // Just return authentication status in other cases
        return {
          authenticated: result.authenticated
        };
      } catch (error) {
        return {
          authenticated: false,
          error: new Error("Authentication check failed"),
          logout: true,
          redirectTo: "/login"
        };
      }
    },
  
    getIdentity: async () => {
      // Prioritize session data
      if (session?.user) {
        return {
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image,
          token: session.accessToken,
        };
      }
      
      // Only try custom auth if no session exists
      try {
        const identity = await customAuthProvider.getIdentity();
        return identity;
      } catch (error) {
        return null;
      }
    },
  
    logout: async (params: any = {}) => {
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