"use client";
import { Refine, type AuthProvider } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import React from "react";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider } from "@providers/data-provider";
import { Session } from "next-auth";
import "@styles/global.css";

interface CustomSession extends Session {
  accessToken?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}

type RefineContextProps = {};

export const RefineContext = (
  props: React.PropsWithChildren<RefineContextProps>
) => {
  return (
    <SessionProvider>
      <App {...props} />
    </SessionProvider>
  );
};

type AppProps = {};

const App = (props: React.PropsWithChildren<AppProps>) => {
  const { data: session, status } = useSession() as {
    data: CustomSession | null;
    status: "loading" | "authenticated" | "unauthenticated"
  };
  const to = usePathname();

  // Debug logs for session updates
  React.useEffect(() => {
    console.log("Session state:", {
      status,
      accessToken: session?.accessToken,
      user: session?.user
    });
  }, [session, status]);

  if (status === "loading") {
    return <span>loading...</span>;
  }

  const authProvider: AuthProvider = {
    login: async () => {
      signIn("auth0", {
        callbackUrl: to ? to.toString() : "/",
        redirect: true,
      });
      return {
        success: true,
      };
    },
    logout: async () => {
      signOut({
        redirect: true,
        callbackUrl: "/login",
      });
      return {
        success: true,
      };
    },
    onError: async (error) => {
      if (error.response?.status === 401) {
        return {
          logout: true,
        };
      }
      return {
        error,
      };
    },
    check: async () => {
      if (status === "unauthenticated") {
        return {
          authenticated: false,
          redirectTo: "/login",
        };
      }
      return {
        authenticated: true,
      };
    },
    getPermissions: async () => {
      return null;
    },
    getIdentity: async () => {
      if (session?.user) {
        // Debug log for token
        console.log("GetIdentity called with token:", session.accessToken);
        
        return {
          name: session.user.name || "",
          avatar: session.user.image || "",
          token: session.accessToken || "",
          email: session.user.email || "",
        };
      }
      return null;
    },
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
              name: "output",
              list: "/output",
              show: "/output/show/:id",
              meta: {
                canDelete: true,
                dataProviderName: "r2"
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
              name: "logic",
              list: "/logic",
              create: "/logic/create",
              edit: "/logic/edit/:id",
              show: "/logic/show/:id",
              meta: {
                canDelete: true,
              },
            }
          ]}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
            useNewQueryKeys: true,
          }}
        >
          {props.children}
          <RefineKbar />
        </Refine>
      </RefineKbarProvider>
    </>
  );
};

export default RefineContext;