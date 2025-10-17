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
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'  // 本番環境: __Secure- プレフィックス
        : 'next-auth.session-token',           // 開発環境: 通常の名前
      options: {
        httpOnly: true,      // XSS対策: JavaScriptからアクセス不可
        sameSite: 'lax',     // CSRF対策: クロスサイトリクエスト制限
        path: '/',
        secure: process.env.NODE_ENV === 'production',  // 本番環境: HTTPS必須
        domain: process.env.NODE_ENV === 'production' 
          ? process.env.COOKIE_DOMAIN    // 本番環境: カスタムドメイン (.shiftmatch.net)
          : undefined,                   // 開発環境: ドメイン指定なし
        maxAge: 15 * 24 * 60 * 60,      // 15日間 (1,296,000秒)
      },
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
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
  debug: process.env.NODE_ENV === 'development',
}

