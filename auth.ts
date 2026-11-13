import "server-only";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { loginSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { adminAccountEmail, adminLogin } from "@/lib/admin-login";

const DUMMY_PASSWORD_HASH = "$2b$12$djHZBgrsccHOcLlt8SQXCeHWCZRa1pndazV9WsNwsdnZrJYemSphO";
const authSecret = process.env.AUTH_SECRET;

if (process.env.NODE_ENV === "production" && (!authSecret || Buffer.byteLength(authSecret) < 32)) {
  throw new Error("AUTH_SECRET must contain at least 32 bytes in production.");
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const login = parsed.data.email.toLowerCase();
        const email = login === adminLogin ? adminAccountEmail : login;
        const user = await prisma.user.findUnique({ where: { email } });
        const passwordIsValid = await compare(
          parsed.data.password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH,
        );
        if (!user || !passwordIsValid) {
          return null;
        }

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const account = await prisma.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true } });
        if (!account) return {};
        token.id = user.id;
        token.sessionVersion = account.sessionVersion;
      } else if (typeof token.id === "string") {
        const account = await prisma.user.findUnique({ where: { id: token.id }, select: { sessionVersion: true, name: true, email: true } });
        if (!account || token.sessionVersion !== account.sessionVersion) return {};
        token.name = account.name;
        token.email = account.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user || typeof token.id !== "string") {
        return { expires: session.expires };
      }
      session.user.id = token.id;
      return session;
    },
  },
};
