import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          // Restrict to Sapira domain
          hd: "sapira.ai",
        },
      },
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.password) {
          return null;
        }

        // Accept both email and username for backwards compatibility
        const { email, username, password } = credentials as any;
        const user = email || username;

        if (!user) {
          return null;
        }

        // Simple auth with env vars (fallback for demo/testing)
        const validUsername = process.env.AUTH_USERNAME || "admin";
        const validPassword = process.env.AUTH_PASSWORD || "demo123";

        // Check for demo credentials (accepts both formats)
        if ((user === "admin" || user === "admin@sapira.ai") && password === "demo123") {
          return {
            id: "1",
            name: "Admin",
            email: "admin@sapira.ai",
          };
        }

        // Check against configured credentials
        if (user === validUsername && password === validPassword) {
          return {
            id: "1",
            name: validUsername,
            email: `${validUsername}@sapira.ai`,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google provider, restrict to Sapira domain
      if (account?.provider === "google") {
        const email = user.email || "";
        if (!email.endsWith("@sapira.ai")) {
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
})
