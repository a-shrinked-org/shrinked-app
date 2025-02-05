import Auth0Provider from "next-auth/providers/auth0";
import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

interface CustomToken extends JWT {
  accessToken?: string;
}

interface CustomSession extends Session {
  accessToken?: string;
}

export const authOptions: NextAuthOptions = {
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
  callbacks: {
    async jwt({ token, account }): Promise<CustomToken> {
      if (account && account.access_token) {
        token.accessToken = account.access_token;
      }
      return token as CustomToken;
    },
    async session({ session, token }): Promise<CustomSession> {
      return {
        ...session,
        accessToken: (token as CustomToken).accessToken
      };
    }
  }
};

export default authOptions;