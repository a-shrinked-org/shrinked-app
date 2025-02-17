// src/app/_refine_context.tsx
"use client";
import { Refine, type AuthProvider } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import React from "react";
import routerProvider from "@refinedev/nextjs-router";
import { dataProvider } from "@providers/data-provider";
import "@styles/global.css";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
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

const App = (props: React.PropsWithChildren<{}>) => {
  const { data: session, status } = useSession();
  const to = usePathname();

  if (status === "loading") {
    return <span>loading...</span>;
  }

  const authProvider: AuthProvider = {
    login: async (params) => {
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

      const { email, password } = params;
      try {
        const response = await fetch('/api/shrinked/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: {
              message: data.message || 'Login failed',
              name: 'Login Error'
            }
          };
        }

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));

        return {
          success: true,
          redirectTo: "/",
        };
      } catch (error) {
        return {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Login failed',
            name: 'Login Error'
          }
        };
      }
    },

    register: async (params) => {
      const { email, password, username } = params;
      try {
        const registerResponse = await fetch('/api/shrinked/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, username }),
        });

        const registerData = await registerResponse.json();

        if (!registerResponse.ok) {
          return {
            success: false,
            error: {
              message: registerData.message || 'Registration failed',
              name: 'Registration Error'
            }
          };
        }

        const loginResponse = await fetch('/api/shrinked/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          return {
            success: false,
            error: {
              message: 'Auto-login after registration failed',
              name: 'Registration Error'
            }
          };
        }

        localStorage.setItem('accessToken', loginData.accessToken);
        localStorage.setItem('refreshToken', loginData.refreshToken);

        const profileResponse = await fetch('/api/shrinked/users/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginData.accessToken}`,
          },
        });

        if (!profileResponse.ok) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          return {
            success: false,
            error: {
              message: 'Could not verify user profile',
              name: 'Registration Error'
            }
          };
        }

        const userData = await profileResponse.json();
        localStorage.setItem('user', JSON.stringify(userData));

        return {
          success: true,
          redirectTo: "/",
        };
      } catch (error) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        return {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Registration process failed',
            name: 'Registration Error'
          }
        };
      }
    },

    logout: async () => {
      if (session) {
        signOut({
          redirect: true,
          callbackUrl: "/login",
        });
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
      return {
        success: true,
        redirectTo: "/login",
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
      if (session) {
        return {
          authenticated: true,
        };
      }

      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!accessToken || !refreshToken) {
        return {
          authenticated: false,
          redirectTo: "/login",
        };
      }

      try {
        const response = await fetch('/api/shrinked/users/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          localStorage.setItem('user', JSON.stringify(userData));
          return {
            authenticated: true,
          };
        }

        return {
          authenticated: false,
          redirectTo: "/login",
        };
      } catch (error) {
        return {
          authenticated: false,
          redirectTo: "/login",
        };
      }
    },

    getPermissions: async () => null,

    getIdentity: async () => {
      if (session?.user) {
        return {
          name: session.user.name,
          avatar: session.user.image,
          token: session.accessToken,
          email: session.user.email,
        };
      }

      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          name: user.username,
          email: user.email,
          token: localStorage.getItem('accessToken'),
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