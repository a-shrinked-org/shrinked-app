import Auth0Provider from "next-auth/providers/auth0";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

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

const authOptions = {
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
    async jwt({ token, account }: { token: CustomToken; account: any }) {
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
  // Events with proper type declarations
  events: {
    async signIn(message: { user: any; account: any; profile: any; isNewUser?: boolean }) {
      console.log("SignIn event:", message);
    },
    async signOut(message: { session: any; trigger: string }) {
      console.log("SignOut event:", message);
    },
    async session(message: { session: any; token: any }) {
      console.log("Session event:", message);
    }
  }
};

export default authOptions;