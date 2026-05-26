import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PASSWORD_PREFIX = 'scrypt';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${PASSWORD_PREFIX}$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;

  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== PASSWORD_PREFIX || !salt || !hash) {
    // Backward-compatible plaintext check so existing seeded users can still
    // sign in once and be upgraded to a hashed password below.
    return stored === password;
  }

  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function isHashedPassword(stored: string | null | undefined): boolean {
  return stored?.startsWith(`${PASSWORD_PREFIX}$`) ?? false;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  debug: false,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const email = credentials.email.trim().toLowerCase();
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) return null;

          const allowDevBypass =
            process.env.NODE_ENV === 'development' &&
            process.env.ALLOW_DEV_ANY_PASSWORD_FOR_TEST_USER === 'true' &&
            email === 'test@example.com';

          if (allowDevBypass || verifyPassword(credentials.password, user.password)) {
            if (!allowDevBypass && !isHashedPassword(user.password)) {
              await prisma.user.update({
                where: { id: user.id },
                data: { password: hashPassword(credentials.password) },
              });
            }
            return user;
          }

          return null;
        } catch (error) {
          console.error('NextAuth Authorize Error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        const user = session.user as typeof session.user & { id?: string };
        user.id = String(token.id || token.sub || '');
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    }
  }
};
