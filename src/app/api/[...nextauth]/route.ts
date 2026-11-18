import { pool } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import bcrypt from "bcrypt";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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

        const {rows} = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (rows.length == 0) return null;

        const checked = await bcrypt.compare(password, rows[0].password);
        if (!checked) return null;

        const {rows: users} = await pool.query('SELECT u.id, u.full_name, u.role FROM users u WHERE u.id = $1', [rows[0].user_id]);
        if (users.length == 0) return null;

        const user = users[0];

        return {
          id: user.id,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};

export const {handlers, signIn, signOut, auth } = NextAuth(authOptions);

export const { GET, POST } = handlers;
