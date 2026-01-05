'use client'

import { Component, ReactNode } from 'react'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                エラーが発生しました
              </h2>
              <p className="text-gray-600 mb-4">
                {this.state.error?.message || '予期しないエラーが発生しました'}
              </p>
              <Button
                onClick={() => {
                  this.setState({ hasError: false })
                  window.location.reload()
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                ページを再読み込み
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
