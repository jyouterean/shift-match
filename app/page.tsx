'use client'

import Link from 'next/link'
import { Calendar, FileText, Users, TrendingUp, Sparkles, Zap, Shield, Globe, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Home() {
  const router = useRouter()
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [isPressed, setIsPressed] = useState(false)

  const handleLogoPress = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setIsPressed(true)
    const timer = setTimeout(() => {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(200)
      }
      router.push('/admin/secret')
    }, 1500)
    setPressTimer(timer)
  }

  const handleLogoRelease = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (pressTimer) {
      clearTimeout(pressTimer)
      setPressTimer(null)
    }
    setIsPressed(false)
  }

  useEffect(() => {
    return () => {
      if (pressTimer) {
        clearTimeout(pressTimer)
      }
    }
  }, [pressTimer])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 relative overflow-hidden">
      {/* 動く背景要素 - さらに強化 */}
      <div className="absolute inset-0">
        {/* 大きなBlob（5個に増加） */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob-reverse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob-reverse animation-delay-3000"></div>
        
        {/* グリッドパターン */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptLTQgMTZ2MmgtMnYtMmgyek0zMiAyNnYyaC0ydi0yaDJ6bTAtNHYyaC0ydi0yaDJ6bTAtNHYyaC0ydi0yaDJ6bTAtNHYyaC0ydi0yaDJ6bS00IDE2djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        {/* 浮遊する点（増量） */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-ping"></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-cyan-300 rounded-full animate-ping animation-delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-blue-300 rounded-full animate-ping animation-delay-2000"></div>
        <div className="absolute top-2/3 right-1/4 w-2 h-2 bg-sky-300 rounded-full animate-ping animation-delay-3000"></div>
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-cyan-200 rounded-full animate-ping animation-delay-4000"></div>
        
        {/* 動く線 */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-slide-horizontal"></div>
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-slide-horizontal animation-delay-2000"></div>
        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-slide-horizontal animation-delay-4000"></div>
        
        {/* 回転する円 */}
        <div className="absolute top-20 right-20 w-32 h-32 border-2 border-cyan-400/20 rounded-full animate-spin-very-slow"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 border-2 border-blue-400/20 rounded-full animate-spin-very-slow-reverse"></div>
      </div>

      {/* ヘッダー */}
      <header className="relative border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div
            className={`text-2xl sm:text-3xl font-bold text-white select-none touch-none transition-all duration-300 ${
              isPressed ? 'scale-95 opacity-70' : 'hover:scale-105'
            }`}
            onTouchStart={handleLogoPress}
            onTouchEnd={handleLogoRelease}
            onTouchCancel={handleLogoRelease}
            onMouseDown={handleLogoPress}
            onMouseUp={handleLogoRelease}
            onMouseLeave={handleLogoRelease}
            onContextMenu={(e) => e.preventDefault()}
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
          >
            <span className="flex items-center gap-2">
              <div className="relative">
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-cyan-400 animate-spin-slow" />
                <div className="absolute inset-0 bg-cyan-400 rounded-full blur-lg opacity-50 animate-pulse"></div>
              </div>
              ShiftMatch
            </span>
          </div>
          <Link href="/auth/signin">
            <Button variant="outline" size="sm" className="border-2 border-white/20 hover:border-cyan-400 bg-white/10 hover:bg-cyan-400/20 text-white backdrop-blur-sm transition-all duration-300">
              ログイン
            </Button>
          </Link>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="relative container mx-auto px-4 sm:px-6 py-20 sm:py-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* バッジ */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-8 animate-fade-in-up">
            <Zap className="h-5 w-5 text-yellow-300 animate-pulse" />
            <span className="text-sm font-semibold text-white">
              AI搭載・次世代シフト管理
            </span>
            <Sparkles className="h-4 w-4 text-cyan-300" />
          </div>
          
          {/* メインタイトル */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-8 leading-tight">
            <span className="block text-white mb-4 animate-fade-in-up animation-delay-200">配送業界の</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 animate-fade-in-up animation-delay-400 animate-text-shimmer">
              未来を創る
            </span>
          </h1>
          
          {/* サブタイトル */}
          <p className="text-xl sm:text-2xl text-cyan-50 mb-12 leading-relaxed max-w-3xl mx-auto animate-fade-in-up animation-delay-600">
            シフト管理から日報提出まで、すべてを一元管理。<br className="hidden sm:inline" />
            チームの業務効率を<span className="font-bold text-cyan-300">劇的に向上</span>させます。
          </p>
          
          {/* CTAボタン */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-800">
            <Link href="/auth/signin">
              <Button size="lg" className="group w-full sm:w-auto text-lg px-10 py-7 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 transform hover:scale-110 border-0">
                <Shield className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                管理者ログイン
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/auth/join">
              <Button size="lg" variant="outline" className="group w-full sm:w-auto text-lg px-10 py-7 border-2 border-white/30 hover:border-cyan-400 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all duration-300 transform hover:scale-105">
                <Globe className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                会社に参加
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 機能カードセクション */}
      <section className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              充実した機能
            </h2>
            <p className="text-xl text-cyan-100">業務効率化に必要なすべてがここに</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Calendar className="h-12 w-12" />}
              title="スマートシフト"
              description="AIが最適なシフトを自動提案。作成時間を90%削減"
              delay="0"
            />
            <FeatureCard
              icon={<FileText className="h-12 w-12" />}
              title="ワンタップ日報"
              description="スマホから10秒で日報提出。音声入力にも対応"
              delay="100"
            />
            <FeatureCard
              icon={<Users className="h-12 w-12" />}
              title="統合管理"
              description="メンバー情報を一元管理。リアルタイム同期"
              delay="200"
            />
            <FeatureCard
              icon={<TrendingUp className="h-12 w-12" />}
              title="高度な分析"
              description="詳細なレポートで業務を可視化。改善点を自動検出"
              delay="300"
            />
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="relative border-t border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-cyan-100 flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            © 2025 ShiftMatch. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description, delay }: { 
  icon: React.ReactNode
  title: string
  description: string
  delay: string
}) {
  return (
    <div 
      className="group relative bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:border-cyan-400 transition-all duration-500 transform hover:-translate-y-3 hover:shadow-2xl hover:shadow-cyan-500/50"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* アイコン */}
      <div className="mb-6 inline-flex p-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
        {icon}
      </div>
      
      {/* コンテンツ */}
      <h3 className="text-xl font-bold text-white mb-3">
        {title}
      </h3>
      <p className="text-cyan-100 leading-relaxed">
        {description}
      </p>
      
      {/* ホバー時の光 */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    </div>
  )
}
