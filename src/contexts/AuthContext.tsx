'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  profileImage?: string
  createdAt: string
  updatedAt: string
}

interface AuthContextType {
  user: User | null
  isLoaded: boolean
  isSignedIn: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(true) // Start as loaded since we're using mock auth

  useEffect(() => {
    // Log auth initialization
    console.log('Auth context initialized')
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in with:', email)
      
      // Always use mock authentication for now
      const mockUser = {
        id: 'demo-user-1',
        email: email,
        firstName: 'Demo',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      setUser(mockUser)
      console.log('Sign in successful')
      return { success: true }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, error: 'Login failed' }
    }
  }

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      console.log('Attempting sign up with:', email)
      
      const mockUser = {
        id: 'demo-user-' + Date.now(),
        email: email,
        firstName: firstName || 'Demo',
        lastName: lastName || 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      setUser(mockUser)
      console.log('Sign up successful')
      return { success: true }
    } catch (error) {
      console.error('Sign up error:', error)
      return { success: false, error: 'Registration failed' }
    }
  }

  const signOut = async () => {
    try {
      console.log('Signing out')
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
      setUser(null)
    }
  }

  const updateProfile = async (data: Partial<User>) => {
    try {
      if (user) {
        const updatedUser = { ...user, ...data, updatedAt: new Date().toISOString() }
        setUser(updatedUser)
        return { success: true }
      }
      return { success: false, error: 'No user logged in' }
    } catch (error) {
      return { success: false, error: 'Update failed' }
    }
  }

  const value: AuthContextType = {
    user,
    isLoaded,
    isSignedIn: !!user,
    signIn,
    signUp,
    signOut,
    updateProfile
  }

  // Only log on state changes
  useEffect(() => {
    console.log('Auth context state:', { isLoaded, isSignedIn: !!user, user: user?.email })
  }, [isLoaded, user])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Compatibility hooks for existing Clerk code
export function useUser() {
  const { user, isLoaded } = useAuth()
  return { user, isLoaded }
}

export function useClerk() {
  const { signOut } = useAuth()
  return { signOut }
}