"use client";

import { Refine, useNavigation, NotificationProvider } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider } from "@providers/data-provider";
import { customAuthProvider } from "@providers/customAuthProvider";
import { toast, ToastContainer, Id } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@styles/global.css";
import { Session } from "next-auth"; // Import Session type

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

interface CustomSession extends Session {
  user?: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
    accessToken?: string;
    refreshToken?: string;
  };
}

const App = (props: React.PropsWithChildren<{}>) => {
  const { data: session, status } = useSession<CustomSession>(); // Type the useSession result
  const to = usePathname();
  const { push } = useNavigation();
  
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    initialized: false,
  });

  // Auth check effect with token refresh
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

        // Try to check authentication via custom provider if no session
        const checkResult = await customAuthProvider.check();
        if (checkResult.authenticated) {
          setAuthState({
            isChecking: false,
            isAuthenticated: true,
            initialized: true,
          });
        } else {
          setAuthState({
            isChecking: false,
            isAuthenticated: false,
            initialized: true,
          });
        }
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
      if (params.providerName === "google") {
        signIn("google", {
          callbackUrl: "/jobs",
          redirect: true,
        });
        return {
          success: false,
          error: {
            message: "Redirecting to Google...",
            name: "Google",
          },
        };
      } else if (params.email && params.password) {
        const result = await signIn("credentials", {
          email: params.email,
          password: params.password,
          redirect: false,
        });

        if (result?.error) {
          notificationProvider.open({
            message: "Login Failed",
            description: result.error,
            type: "error",
            key: "login-error",
          });
          return {
            success: false,
            error: {
              message: result.error,
              name: "Login Failed",
            },
          };
        }

        return {
          success: true,
          redirectTo: "/jobs",
        };
      }

      return {
        success: false,
        error: {
          message: "Invalid login parameters",
          name: "Login Error",
        },
      };
    },
    check: async () => {
      if (status === "loading") return { authenticated: false };
      if (to === "/login" || session) return { authenticated: !!session };
      const refreshToken = session?.user?.refreshToken || localStorage.getItem('refreshToken');
      if (refreshToken) {
        const newTokens = await customAuthProvider.refreshAccessToken(refreshToken);
        if (newTokens) {
          localStorage.setItem('accessToken', newTokens.accessToken);
          localStorage.setItem('refreshToken', newTokens.refreshToken);
          return { authenticated: true };
        }
      }
      return { authenticated: false, redirectTo: "/login" };
    },
    getIdentity: async () => {
      if (session?.user) {
        return {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image,
          token: session.user.accessToken,
        };
      }
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        return {
          id: userData.id,
          name: userData.username || userData.email,
          email: userData.email,
          avatar: userData.avatar,
          token: userData.accessToken,
        };
      }
      return null;
    },
    logout: async () => {
      await signOut({ callbackUrl: "/login" });
      return {
        success: true,
        redirectTo: "/login",
      };
    },
    onError: async (error) => {
      if (error?.response?.status === 401) {
        const refreshToken = session?.user?.refreshToken || localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const newTokens = await customAuthProvider.refreshAccessToken(refreshToken);
            if (newTokens) {
              // Update session or localStorage with new tokens
              localStorage.setItem('accessToken', newTokens.accessToken);
              localStorage.setItem('refreshToken', newTokens.refreshToken);
              return { error: null }; // Continue with refreshed token
            }
          } catch (refreshError) {
            console.error("Failed to refresh token:", refreshError);
          }
        }
        return { logout: true, redirectTo: "/login" };
      }
      return { error };
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
                icon: "chart-line",
                label: "Jobs",
                hide: false
              },
            },
            {
              name: "api-keys",
              list: "/api-keys",
              meta: {
                icon: "key",
                label: "API Keys",
                hide: false
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
                icon: "tag",
                label: "Categories",
                hide: false
              },
            },
            {
              name: "output",
              list: "/output",
              show: "/output/show/:id",
              meta: {
                canDelete: true,
                icon: "box",
                label: "Output",
                hide: false
              },
            },
          ]}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
            useNewQueryKeys: true,
            breadcrumb: false // Disable breadcrumbs
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