"use client";

const App = (props: React.PropsWithChildren<{}>) => {
  const { data: session, status } = useSession();
  const to = usePathname();

  if (status === "loading") {
    return <span>loading...</span>;
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
      // Store user data before redirecting
      if (result.success && result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
        // Force a check call to ensure all states are updated
        await customAuthProvider.check();
      }
      return result;
    },
    check: async () => {
      console.log('Refine Check - Session:', !!session);
      
      if (session) {
        console.log("Auth via session, returning authenticated true");
        return {
          authenticated: true,
        };
      }
      
      try {
        const result = await customAuthProvider.check();
        console.log('Refine Check - Custom auth result:', result);
        
        if (result.authenticated) {
          console.log("Custom auth authenticated, returning true");
          return {
            authenticated: true,
          };
        }

        console.log("Auth check failed, redirecting to login");
        return {
          authenticated: false,
          redirectTo: "/login",
          error: result.error
        };
      } catch (error) {
        console.log("Auth check error:", error);
        return {
          authenticated: false,
          redirectTo: "/login",
          error: new Error("Authentication check failed")
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

export default RefineContext;