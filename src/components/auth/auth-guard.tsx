'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export default function AuthGuard({ children, requireAuth = false }: AuthGuardProps) {
  const { user, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && requireAuth && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, requireAuth, router])

  // Show loading while checking auth status
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // If auth is required but user is not logged in, don't render children
  if (requireAuth && !user) {
    return null
  }

  return <>{children}</>
}