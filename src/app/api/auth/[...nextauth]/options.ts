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
  providers: [
    Auth0Provider({
      clientId: "iFAGGfUgqtWx7VuuQAVAgABC1Knn7viR",
      clientSecret: "Nfayt26AhphY4q_qzANYIIgNDFQ4Sh8lM_NKoDPVpmb9NCsiPW7uLPeT1yilNVPV",
      issuer: "https://dev-w0dm4z23pib7oeui.us.auth0.com",
      authorization: {
        params: {
          audience: "https://platogram.vercel.app/",
          scope: "openid profile email"
        }
      }
    }),
  ],
  // Using the hardcoded secret that worked before
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
    }
  }
};

export default authOptions;