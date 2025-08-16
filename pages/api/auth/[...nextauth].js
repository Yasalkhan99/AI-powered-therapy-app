// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import prisma from '../../../lib/prisma';

// Define authOptions as a variable and EXPORT it
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          throw new Error('No user found with this email');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName || user.email,
          setupCompleted: user.setupCompleted,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Always fetch latest user profile fields from DB
      let dbUser = null;
      if (user) {
        dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      } else if (token?.email) {
        dbUser = await prisma.user.findUnique({ where: { email: token.email } });
      }
      if (dbUser) {
        token.id = dbUser.id;
        token.email = dbUser.email;
        token.name = dbUser.fullName || dbUser.email;
        token.fullName = dbUser.fullName || '';
        token.therapyFocus = dbUser.therapyFocus || '';
        token.therapyType = dbUser.therapyType || '';
        token.country = dbUser.country || '';
        token.age = dbUser.age || null;
        token.gender = dbUser.gender || '';
        token.setupCompleted = dbUser.setupCompleted;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.fullName = token.fullName;
        session.user.therapyFocus = token.therapyFocus;
        session.user.therapyType = token.therapyType;
        session.user.country = token.country;
        session.user.age = token.age;
        session.user.gender = token.gender;
        session.user.setupCompleted = token.setupCompleted;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Default export the NextAuth handler
export default NextAuth(authOptions);