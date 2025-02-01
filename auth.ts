import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User>`SELECT * FROM users WHERE email=${email} LIMIT 1`;
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

const authOptions = {
  ...authConfig,
  providers: [Credentials({
    async authorize(credentials) {
      const parsedCredentials = z
        .object({ email: z.string().email(), password: z.string().min(6) })
        .safeParse(credentials);

      if (!parsedCredentials.success) return null
      const { email, password } = parsedCredentials.data;
      const user = await getUser(email);
      if (!user) return null;

      const passwordsMatch = await bcrypt.compare(password, user.password);
      return passwordsMatch ? user : null;
    },
  }),
  ],
};
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
