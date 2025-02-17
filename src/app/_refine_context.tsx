// src/app/_refine_context.tsx
import { customAuthProvider } from "@providers/customAuthProvider"; // Add this import

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
  );
};