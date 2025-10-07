'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo })
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto my-8 p-6 border border-red-300 bg-red-50 rounded-md">
          <h2 className="text-lg font-semibold text-red-700 mb-2">An error occurred while rendering this page.</h2>
          {this.state.error && (
            <div className="mb-3">
              <div className="text-sm text-red-800 font-mono">{this.state.error.name}: {this.state.error.message}</div>
            </div>
          )}
          {this.state.errorInfo && (
            <details className="mt-2 whitespace-pre-wrap text-xs text-red-900">
              {this.state.errorInfo.componentStack}
            </details>
          )}
          <p className="text-sm text-red-800 mt-3">Try refreshing. If it persists, this output helps pinpoint the source.</p>
        </div>
      )
    }

    return this.props.children
  }
}