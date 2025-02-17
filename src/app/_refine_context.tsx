// src/app/_refine_context.tsx
"use client";

import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import React from "react";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider } from "@providers/data-provider";
import { customAuthProvider } from "@providers/customAuthProvider";
import "@styles/global.css";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

type RefineContextProps = {};

// Export RefineContext component since it's imported in layout.tsx
export const RefineContext = (
  props: React.PropsWithChildren<RefineContextProps>
) => {
  return (
    <SessionProvider>
      <App {...props} />
    </SessionProvider>
  );
};

const App = (props: React.PropsWithChildren<{}>) => {
  const { data: session, status } = useSession();
  const to = usePathname();

  if (status === "loading") {
    return <span>loading...</span>;
  }

  // Only override what's needed for Auth0
  const authProvider = {
    ...customAuthProvider,
    login: async (params: any) => {
      if (params.providerName === "auth0") {
        signIn("auth0", {
          callbackUrl: to ? to.toString() : "/",
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
      return customAuthProvider.login(params);
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

  return (
    <>
      <RefineKbarProvider>
        <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider}
          authProvider={authProvider}
          resources={[]}
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