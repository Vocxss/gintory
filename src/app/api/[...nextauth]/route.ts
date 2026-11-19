import bcrypt from "bcrypt";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { pool } from "@/lib/db";
import type { IUserRow } from "@/lib/types/database";
import { loginSchema } from "@/lib/validations/auth";

const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credential) {
        const parsed = loginSchema.safeParse(credential);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const { rows } = await pool.query<
          Pick<
            IUserRow,
            | "id"
            | "full_name"
            | "email"
            | "password"
            | "role"
            | "company_name"
            | "supplier_status"
          >
        >(
          "SELECT id, full_name, email, password, role, company_name, supplier_status FROM users WHERE email = $1",
          [email],
        );
        if (rows.length === 0) return null;

        const checked = await bcrypt.compare(password, rows[0].password);
        if (!checked) return null;

        const user = rows[0];
        if (
          user.role === "supplier" &&
          (user.supplier_status === "Pending" ||
            user.supplier_status === "Rejected")
        ) {
          return null;
        }

        return {
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: user.role,
          company_name: user.company_name,
          supplier_status: user.supplier_status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.company_name = user.company_name;
        token.supplier_status = user.supplier_status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.company_name = token.company_name;
        session.user.supplier_status = token.supplier_status;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);

export const { GET, POST } = handlers;
