import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { AuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt"
import { Session } from "next-auth"
import { getUserByEmail, createUser, updateUserLastLogin } from "./database/users"

export type UserRole = 'admin' | 'analyst' | 'viewer'

export interface ExtendedUser {
  id: string
  email: string
  name: string
  image?: string
  role: UserRole
}

export interface ExtendedSession extends Session {
  user: ExtendedUser
}

export interface ExtendedJWT extends JWT {
  role: UserRole
  userId: string
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    // Auth0 provider configuration
    {
      id: "auth0",
      name: "Auth0",
      type: "oauth",
      wellKnown: `${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/openid_configuration`,
      authorization: { params: { scope: "openid email profile" } },
      idToken: true,
      checks: ["pkce", "state"],
      client: {
        id: process.env.AUTH0_CLIENT_ID!,
        secret: process.env.AUTH0_CLIENT_SECRET!,
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    },
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (!user.email) {
          return false
        }

        // Check if user exists in database
        let dbUser = await getUserByEmail(user.email)
        
        if (!dbUser) {
          // Create new user with default viewer role
          dbUser = await createUser({
            email: user.email,
            name: user.name || 'Unknown User',
            image: user.image,
            role: 'viewer' // Default role for new users
          })
        } else {
          // Update last login
          await updateUserLastLogin(dbUser.id)
        }

        return true
      } catch (error) {
        console.error('Error during sign in:', error)
        return false
      }
    },
    async jwt({ token, user, account }) {
      if (user && user.email) {
        try {
          const dbUser = await getUserByEmail(user.email)
          if (dbUser) {
            token.role = dbUser.role
            token.userId = dbUser.id
          }
        } catch (error) {
          console.error('Error fetching user role:', error)
          token.role = 'viewer' // Default fallback
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session as ExtendedSession).user = {
          ...session.user,
          id: token.userId as string,
          role: token.role as UserRole,
        } as ExtendedUser
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}