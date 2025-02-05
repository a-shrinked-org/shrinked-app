import Auth0Provider from "next-auth/providers/auth0";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

interface CustomToken extends JWT {
  accessToken?: string;
}

interface CustomSession extends Session {
  accessToken?: string;
}

const authOptions = {
  debug: true, // Add this for debugging
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
    async jwt({ token, account, user }: { token: CustomToken; account: any; user: any }) {
      // Initial sign in
      if (account && user) {
        console.log("JWT callback - initial sign in:", { account, user });
        return {
          ...token,
          accessToken: account.access_token,
        };
      }

      // Return previous token if the access token has not expired yet
      return token;
    },
    async session({ session, token }: { session: CustomSession; token: CustomToken }) {
      console.log("Session callback - token:", token);
      
      session.accessToken = token.accessToken;
      console.log("Session callback - modified session:", session);
      
      return session;
    },
  },
  // Add these events for debugging
  events: {
    async signIn(message) { console.log("SignIn event:", message); },
    async signOut(message) { console.log("SignOut event:", message); },
    async session(message) { console.log("Session event:", message); }
  }
};

export default authOptions;