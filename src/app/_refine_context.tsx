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
      // Handle Auth0 login
      if (params.providerName === "auth0") {
        signIn("auth0", {
          callbackUrl: to ? to.toString() : "/",
          redirect: true,
        });
        return {
          success: true,
        };
      }

      // Handle custom login
      const { email, password } = params;
      try {
        const response = await fetch('https://api.shrinked.ai/auth/login', {
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
        // Step 1: Register
        const registerResponse = await fetch('https://api.shrinked.ai/auth/register', {
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

        // Step 2: Auto login
        const loginResponse = await fetch('https://api.shrinked.ai/auth/login', {
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

        // Store tokens
        localStorage.setItem('accessToken', loginData.accessToken);
        localStorage.setItem('refreshToken', loginData.refreshToken);

        // Step 3: Create profile
        const profileResponse = await fetch('https://api.shrinked.ai/profile', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${loginData.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        });

        if (!profileResponse.ok) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          const profileData = await profileResponse.json();
          return {
            success: false,
            error: {
              message: profileData.message || 'Profile creation failed',
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
      // Handle both Auth0 and custom logout
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
      // Check Auth0 session
      if (session) {
        return {
          authenticated: true,
        };
      }

      // Check custom auth
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!accessToken || !refreshToken) {
        return {
          authenticated: false,
          redirectTo: "/login",
        };
      }

      try {
        const response = await fetch('https://api.shrinked.ai/api/auth', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
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
      // Try Auth0 session first
      if (session?.user) {
        return {
          name: session.user.name,
          avatar: session.user.image,
          token: session.accessToken,
          email: session.user.email,
        };
      }

      // Try custom auth
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
          resources={[
            // ... your resources
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