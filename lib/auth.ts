import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development', // 開発環境でデバッグログを出力
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const startTime = Date.now()
        console.log('[auth] authorize start:', credentials?.email, 'timestamp:', new Date().toISOString())
        
        try {
          // 入力チェック
          if (!credentials?.email || !credentials?.password) {
            console.log('[auth] ❌ 認証失敗: メールアドレスまたはパスワードが未入力')
            return null
          }

          console.log('[auth] 🔍 ユーザー検索中:', credentials.email)

          // タイムアウト付きユーザー検索（10秒）
          const userPromise = prisma.user.findUnique({
            where: { email: credentials.email },
            include: { company: true, office: true }
          })
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DB query timeout')), 10000)
          )

          const user = await Promise.race([userPromise, timeoutPromise]) as any

          if (!user || !user.password) {
            console.log('[auth] ❌ 認証失敗: ユーザーが見つかりません')
            return null
          }

          console.log('[auth] ✅ ユーザー発見:', user.email, 'ステータス:', user.status)

          // タイムアウト付きパスワード検証（5秒）
          const bcryptPromise = bcrypt.compare(credentials.password, user.password)
          const bcryptTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('bcrypt timeout')), 5000)
          )

          const isPasswordValid = await Promise.race([bcryptPromise, bcryptTimeoutPromise]) as boolean

          if (!isPasswordValid) {
            console.log('[auth] ❌ 認証失敗: パスワードが正しくありません')
            return null
          }

          // ユーザーステータスチェック
          if (user.status !== 'ACTIVE') {
            console.log('[auth] ❌ 認証失敗: アカウントが無効です (status:', user.status, ')')
            return null
          }

          // 会社情報チェック
          if (!user.company) {
            console.log('[auth] ❌ 認証失敗: 会社情報が見つかりません')
            return null
          }

          const duration = Date.now() - startTime
          console.log('[auth] ✅ 認証成功:', user.email, 'Role:', user.role, '処理時間:', duration, 'ms')

          // 成功時のユーザー情報を返す
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
            officeId: user.officeId || undefined,
          }
        } catch (error) {
          const duration = Date.now() - startTime
          console.error('[auth] 🔥 authorize()内でエラー発生:', error, '処理時間:', duration, 'ms')
          return null
        } finally {
          const duration = Date.now() - startTime
          console.log('[auth] authorize end, 総処理時間:', duration, 'ms')
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

