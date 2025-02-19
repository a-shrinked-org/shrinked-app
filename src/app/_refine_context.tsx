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

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

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

  const authProvider = {
    ...customAuthProvider,
    login: async (params: any) => {

      try {
        const result = await customAuthProvider.login(params);
        
        if (result.success) {
          
          notificationProvider.open({
            message: "Welcome back!",
            type: "success",
            key: "login-success"
          });
          
          return result
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
    },
    logout: async () => {
      const result = await customAuthProvider.logout();
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