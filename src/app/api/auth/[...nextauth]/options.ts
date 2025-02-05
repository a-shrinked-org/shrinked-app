import Auth0Provider from "next-auth/providers/auth0";
import { JWT } from "next-auth/jwt";
import type { NextAuthOptions } from "next-auth";
import { Session } from "next-auth";
import type { User, Account, Profile } from "next-auth";

interface CustomToken extends JWT {
  accessToken?: string;
}

interface CustomSession extends Omit<Session, "user"> {
  accessToken?: string;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const authOptions: NextAuthOptions = {
  providers: [
    Auth0Provider({
      clientId: "iFAGGfUgqtWx7VuuQAVAgABC1Knn7viR",
      clientSecret:
        "Nfayt26AhphY4q_qzANYIIgNDFQ4Sh8lM_NKoDPVpmb9NCsiPW7uLPeT1yilNVPV",
      issuer: "https://dev-w0dm4z23pib7oeui.us.auth0.com",
      authorization: {
        params: {
          audience: "https://platogram.vercel.app/",
          scope: "openid profile email",
          response_type: "code",
        }
      }
    }),
  ],
  secret: `UItTuD1HcGXIj8ZfHUswhYdNd40Lc325R8VlxQPUoR0=`,
  callbacks: {
    async jwt({ token, account }: { token: CustomToken; account: Account | null }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }: { session: CustomSession; token: CustomToken }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }: {
      user: User,
      account: Account | null,
      profile?: Profile,
      isNewUser?: boolean
    }) {
      console.log("SignIn event:", { user, account, profile, isNewUser });
    },
    async signOut({ session, trigger }: {
      session: Session,
      trigger: "signout" | "session"
    }) {
      console.log("SignOut event:", { session, trigger });
    },
    async session({ session, token }: {
      session: Session,
      token: JWT
    }) {
      console.log("Session event:", { session, token });
    }
  }
};

export default authOptions;