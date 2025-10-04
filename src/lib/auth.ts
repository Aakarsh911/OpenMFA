import NextAuth, { type NextAuthConfig, type Session } from 'next-auth';
import Google from 'next-auth/providers/google';
import type { JWT } from 'next-auth/jwt';

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    // Protect routes in middleware
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      if (path.startsWith('/dashboard')) {
        return isLoggedIn;
      }
      return true;
    },
  async jwt({ token, account, profile }: { token: JWT; account?: unknown; profile?: unknown }) {
      if (account && profile) {
    const p = profile as { email?: string; name?: string; picture?: string };
    token.email = p.email;
    token.name = p.name;
    token.picture = p.picture;
      }
      return token;
    },
  async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
    (session.user as { id?: string }).id = token.sub || token.email || undefined;
      }
      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export function getUserIdFromSession(session: Session | null): string | null {
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}
