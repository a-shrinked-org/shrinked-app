import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

interface CustomToken extends JWT {
  accessToken?: string;
}

interface CustomSession extends Session {
  accessToken?: string;
}

export const authOptions = {
  providers: [
    // Google Provider for OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Credentials Provider for Email/Password (Shrinked API)
    CredentialsProvider({
      name: "Custom",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        username: { label: "Username", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch('https://api.shrinked.ai/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const user = await response.json();
          return user; // Returns user object with accessToken, refreshToken, etc.
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXT_AUTH_SECRET, // Use environment variable for security
  callbacks: {
    async jwt({ token, account, user }: { token: CustomToken; account: any; user: any }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.user = user;
        token.accessToken = user.accessToken || token.accessToken; // Handle Shrinked API tokens
      }
      return token;
    },
    async session({ session, token }: { session: CustomSession; token: CustomToken }) {
      session.accessToken = token.accessToken;
      if (token.user) {
        session.user = token.user;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

export default authOptions;