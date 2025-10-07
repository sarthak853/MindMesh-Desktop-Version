'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, toast.duration || 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'info': return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getBgColor = () => {
    switch (toast.type) {
      case 'success': return 'bg-green-50 border-green-200'
      case 'error': return 'bg-red-50 border-red-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'info': return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className={`${getBgColor()} border rounded-lg p-4 shadow-lg max-w-sm animate-in slide-in-from-right`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{toast.title}</h4>
          {toast.description && (
            <p className="text-sm text-gray-600 mt-1">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-gray-400 hover:text-gray-600"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}