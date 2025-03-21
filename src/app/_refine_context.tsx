"use client";

import { Refine, useNavigation, NotificationProvider } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider } from "@providers/data-provider";
import { customAuthProvider } from "@providers/customAuthProvider";
import { toast, ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@styles/global.css";
import { authUtils, API_CONFIG } from "@/utils/authUtils";
import { HelmetProvider } from "react-helmet-async";

interface RefineContextProps {}

interface ExtendedSession {
  user?: {
    name?: string;
    email?: string;
    image?: string;
    refreshToken?: string;
  };
  accessToken?: string;
  error?: string;
}

const AUTH_CHECK_COOLDOWN = 60000; // 1 minute between full auth checks
let lastFullAuthCheckTime = 0;

const notificationProvider: NotificationProvider = {
  open: ({ message, description, type, key }) => {
    const content = description ? `${message}: ${description}` : message;
    const toastId = key ? String(key) : undefined;

    if (toastId && toast.isActive(toastId)) {
      toast.update(toastId, {
        render: content,
        type: type === "error" ? "error" : type === "success" ? "success" : "info",
        autoClose: 5000,
      });
    } else {
      toast(content, {
        toastId: toastId,
        type: type === "error" ? "error" : type === "success" ? "success" : "info",
        autoClose: 5000,
      });
    }
  },
  close: (key) => {
    if (key) toast.dismiss(String(key));
  },
};

const createUnifiedSession = (nextAuthSession: ExtendedSession | null, customAuth: boolean) => {
  if (nextAuthSession?.user) {
    return {
      source: 'nextauth',
      user: {
        name: nextAuthSession.user.name || '',
        email: nextAuthSession.user.email || '',
        avatar: nextAuthSession.user.image || null
      },
      accessToken: nextAuthSession.accessToken || null,
      isAuthenticated: true
    };
  }
  
  if (customAuth) {
    const userData = authUtils.getUserData();
    return {
      source: 'custom',
      user: {
        name: userData?.username || userData?.email || '',
        email: userData?.email || '',
        avatar: userData?.avatar || null
      },
      accessToken: authUtils.getAccessToken(),
      isAuthenticated: true
    };
  }
  
  return { source: null, user: null, accessToken: null, isAuthenticated: false };
};

const App = (props: React.PropsWithChildren<{}>) => {
  const { data: session, status } = useSession() as {
    data: ExtendedSession | null;
    status: "loading" | "authenticated" | "unauthenticated";
  };
  const to = usePathname();
  const { push } = useNavigation();

  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    initialized: false,
  });

  const isCheckingAuthRef = useRef(false);

  // Initialize token refresh mechanism
  useEffect(() => {
    if (authUtils.isAuthenticated()) {
      console.log("[APP] Initializing token refresh mechanism");
      authUtils.setupRefreshTimer(); // No parameters as per updated authUtils
    }
  }, []);

  // Auth check effect
  useEffect(() => {
    const checkAuthentication = async () => {
      if (isCheckingAuthRef.current || status === "loading") return;
      isCheckingAuthRef.current = true;

      try {
        if (status === "authenticated" && session) {
          setAuthState({ isChecking: false, isAuthenticated: true, initialized: true });
          return;
        }

        const hasTokens = authUtils.isAuthenticated();
        setAuthState({ isChecking: false, isAuthenticated: hasTokens, initialized: true });
      } catch (error) {
        console.error("Auth check error:", error);
        setAuthState({ isChecking: false, isAuthenticated: false, initialized: true });
      } finally {
        isCheckingAuthRef.current = false;
      }
    };

    checkAuthentication();
  }, [status, session]);

  const authProvider = {
    ...customAuthProvider,
    login: async (params: any) => {
      const { providerName, email, password, returnUrl } = params;
      
      if (params.providerName === "auth0" || params.providerName === "google") {
        signIn(params.providerName, { callbackUrl: "/jobs", redirect: true });
        return { success: false, error: { message: `Redirecting to ${params.providerName}...`, name: params.providerName } };
      }

      try {
        const result = await customAuthProvider.login(params);
        if (result.success && params.password) {
          lastFullAuthCheckTime = Date.now();
          authUtils.setupRefreshTimer();
          setAuthState({ isChecking: false, isAuthenticated: true, initialized: true });
          notificationProvider.open({ message: "Welcome back!", type: "success", key: "login-success" });
          return { ...result, redirectTo: "/jobs" };
        }

        if (!result.success) {
          notificationProvider.open({
            message: "Login Failed",
            description: result.error?.message || "Invalid credentials",
            type: "error",
            key: "login-error",
          });
        }
        return result;
      } catch (error) {
        console.error("Login error:", error);
        notificationProvider.open({
          message: "Login Error",
          description: "An unexpected error occurred",
          type: "error",
          key: "login-error",
        });
        return { success: false, error: { message: "Login failed", name: "Auth Error" } };
      }
    },
    check: async () => {
      try {
        if (to === "/login") return { authenticated: false };
    
        if (status === "authenticated" && session) return { authenticated: true };
    
        const hasLocalTokens = authUtils.isAuthenticated();
        if (!hasLocalTokens) {
          return { authenticated: false, logout: true, redirectTo: "/login" };
        }
    
        const now = Date.now();
        if (now - lastFullAuthCheckTime >= AUTH_CHECK_COOLDOWN) {
          lastFullAuthCheckTime = now;
          const accessToken = await authUtils.ensureValidToken();
          if (!accessToken) {
            return { authenticated: false, logout: true, redirectTo: "/login" };
          }
          console.log("[AUTH] Full token validation completed"); // Log only on full check
        }
    
        return { authenticated: true };
      } catch (error) {
        console.error("Auth check error:", error);
        return { authenticated: false, logout: true, redirectTo: "/login" };
      }
    },
    getIdentity: async () => {
      const unifiedSession = createUnifiedSession(session, authUtils.isAuthenticated());
      
      if (unifiedSession.isAuthenticated) {
        return {
          name: unifiedSession.user?.name || "",
          email: unifiedSession.user?.email || "",
          avatar: unifiedSession.user?.avatar || null,
          token: unifiedSession.accessToken || "",
        };
      }
      
      try {
        const identity = await customAuthProvider.getIdentity();
        return identity || null;
      } catch (error) {
        console.error("Error getting identity:", error);
        return null;
      }
    },
    logout: async (params: any = {}) => {
      lastFullAuthCheckTime = 0;
      if (status === "authenticated") await signIn("logout");
      if (window._refreshTimerId) {
        clearTimeout(window._refreshTimerId);
        window._refreshTimerId = undefined;
      }

      const result = await customAuthProvider.logout(params);
      setAuthState({ isChecking: false, isAuthenticated: false, initialized: true });
      return { success: true, redirectTo: "/login" };
    },
  };

  if (status === "loading" || authState.isChecking) return <span>Loading...</span>;

  return (
    <RefineKbarProvider>
      <Refine
        routerProvider={routerProvider}
        dataProvider={dataProvider}
        authProvider={authProvider}
        notificationProvider={notificationProvider}
        resources={[
          { name: "jobs", list: "/jobs", create: "/jobs/create", edit: "/jobs/edit/:id", show: "/jobs/show/:id", meta: { canDelete: true } },
          { name: "scheduled", list: "/scheduled", create: "/scheduled/create", edit: "/scheduled/edit/:id", show: "/scheduled/show/:id", meta: { canDelete: true } },
          { name: "output", list: "/output", show: "/output/show/:id", meta: { canDelete: true } },
          { name: "logic", list: "/logic", meta: { canDelete: false } },
        ]}
        options={{ syncWithLocation: true, warnWhenUnsavedChanges: true, useNewQueryKeys: true }}
      >
        {props.children}
        <RefineKbar />
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          transition={Slide}
          icon={false}
        />
      </Refine>
    </RefineKbarProvider>
  );
};

export const RefineContext = (props: React.PropsWithChildren<RefineContextProps>) => {
  return (
    <HelmetProvider>
      <SessionProvider>
        <App {...props} />
      </SessionProvider>
    </HelmetProvider>
  );
};

export default RefineContext;