// src/app/api/auth/[...nextauth]/options.ts
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

interface CustomToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  user?: any;
}

// Fix the session type to match NextAuth's expected shape
interface CustomSession extends Session {
  accessToken?: string;
  refreshToken?: string;
  // Ensure user matches the Session's user structure (using null instead of undefined)
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    // Allow additional properties
    [key: string]: any;
  };
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: "766372410745-62h4u9a79hetvm4858o5e95eg8jvapv8.apps.googleusercontent.com",
      clientSecret: "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",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        }
      }
    }),
    CredentialsProvider({
      name: "Custom",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        username: { label: "Username", type: "text" }
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
          return user;
        } catch (error) {
          return null;
        }
      }
    })
  ],
  secret: `UItTuD1HcGXIj8ZfHUswhYdNd40Lc325R8VlxQPUoR0=`,
  callbacks: {
    async jwt({ token, account, user }: { token: CustomToken; account: any; user: any }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          user,
        };
      }
      
      // Return previous token if the access token has not expired yet
      return token;
    },
    async session({ session, token }: { session: CustomSession; token: CustomToken }) {
      // Make sure session.user exists and has the expected structure
      session.user = session.user || { name: null, email: null, image: null };
      
      if (token) {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        
        // Pass user info to the client
        if (token.user) {
          session.user = {
            ...session.user,
            ...token.user
          };
        }
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === 'development',
  pages: {
    signIn: '/login',
  },
  // Enable JWT for handling sessions
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  }
};

export default authOptions;