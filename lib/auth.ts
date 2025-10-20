import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('メールアドレスとパスワードを入力してください')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { company: true, office: true }
        })

        if (!user || !user.password) {
          throw new Error('ユーザーが見つかりません')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('パスワードが正しくありません')
        }

        // ユーザーステータスチェック
        if (user.status !== 'ACTIVE') {
          throw new Error('このアカウントは現在利用できません')
        }

        // 会社情報チェック
        if (!user.company) {
          throw new Error('会社情報が見つかりません。管理者にお問い合わせください。')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          officeId: user.officeId || undefined,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 15 * 24 * 60 * 60, // 15 days (15日間)
    updateAge: 24 * 60 * 60, // 24時間ごとにセッションを更新
  },
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        domain: process.env.NODE_ENV === 'production' 
          ? 'shiftmatch-eight.vercel.app'
          : undefined,
      },
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  trustHost: true, // URLを固定してセッション生成時の不一致を防止
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.companyId = user.companyId
        token.officeId = user.officeId
        // トークン発行時刻を記録
        token.iat = Math.floor(Date.now() / 1000)
        token.exp = Math.floor(Date.now() / 1000) + (15 * 24 * 60 * 60) // 15日後
      }
      
      // トークンリフレッシュ時も有効期限を延長
      if (trigger === 'update') {
        token.exp = Math.floor(Date.now() / 1000) + (15 * 24 * 60 * 60)
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.companyId = token.companyId as string
        session.user.officeId = token.officeId as string | undefined
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NEXTAUTH_DEBUG === 'true' || process.env.NODE_ENV === 'development',
  // デバッグ用イベントハンドラ（ログイン画面フリーズ問題調査用）
  events: {
    async signIn(message) {
      console.log('✅ NextAuth Event: signIn', {
        user: message.user.email,
        timestamp: new Date().toISOString(),
      })
    },
    async signOut(message) {
      console.log('🚪 NextAuth Event: signOut', {
        timestamp: new Date().toISOString(),
      })
    },
    async session(message) {
      console.log('🔐 NextAuth Event: session', {
        user: message.session?.user?.email || 'unknown',
        timestamp: new Date().toISOString(),
      })
    },
  },
}

