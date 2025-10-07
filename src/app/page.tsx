'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Brain, 
  BookOpen, 
  Map, 
  MessageSquare, 
  Plus,
  TrendingUp,
  Clock,
  Target,
  Sparkles,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  LogOut
} from 'lucide-react'

export default function HomePage() {
  const { user, isSignedIn, isLoaded } = useAuth()

  // Show loading while checking auth status
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading MindMesh...</p>
        </div>
      </div>
    )
  }

  // Show login page if not signed in
  if (!isSignedIn) {
    return <LoginPage />
  }

  // Show main dashboard if signed in
  return <Dashboard />
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn(email, password)
      if (!result.success) {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setError('')
    setIsLoading(true)
    
    try {
      const result = await signIn('demo@mindmesh.com', 'demo123')
      if (!result.success) {
        setError('Demo login failed')
      }
    } catch (err) {
      setError('Demo login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to MindMesh</h1>
          <p className="text-gray-600">Your AI-powered knowledge companion</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your knowledge companion
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <div className="border border-red-200 bg-red-50 text-red-800 p-3 rounded-lg">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-red-200 mr-2"></div>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or try demo</span>
              </div>
            </div>

            {/* Demo Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              <Sparkles className="mr-2 h-4 w-4 text-blue-500" />
              Try Demo Account
            </Button>

            {/* Demo Credentials Info */}
            <div className="text-center text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <p className="font-medium mb-1">Demo Credentials:</p>
              <p>Any email and password will work for demo</p>
              <p className="mt-1 text-gray-400">Or click "Try Demo Account" above</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Dashboard() {
  const { user, signOut } = useAuth()
  const [activeView, setActiveView] = useState('dashboard')
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
  }

  const displayUser = user || { firstName: 'Demo', lastName: 'User', email: 'demo@example.com' }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">MindMesh</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {displayUser?.firstName || displayUser?.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'maps', label: 'Cognitive Maps', icon: Map },
              { id: 'cards', label: 'Memory Cards', icon: Brain },
              { id: 'documents', label: 'Documents', icon: BookOpen },
              { id: 'ai', label: 'AI Assistant', icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'ai') {
                      router.push('/ai-assistant')
                    } else if (tab.id === 'maps') {
                      router.push('/cognitive-maps')
                    } else if (tab.id === 'cards') {
                      router.push('/memory-cards')
                    } else if (tab.id === 'documents') {
                      router.push('/documents')
                    } else {
                      setActiveView(tab.id)
                    }
                  }}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeView === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'maps' && <CognitiveMapsView />}
        {activeView === 'cards' && <MemoryCardsView />}
        {activeView === 'documents' && <DocumentsView />}
        {activeView === 'ai' && <AIAssistantView />}
      </main>
    </div>
  )
}

function DashboardView() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">Overview of your learning progress and activities</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cognitive Maps</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">+1 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Cards</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">5 due for review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">2 processed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">7</div>
            <p className="text-xs text-muted-foreground">Days in a row</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with your learning journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 flex flex-col items-center justify-center" onClick={() => router.push('/cognitive-maps')}>
              <Plus className="h-6 w-6 mb-2" />
              <span className="text-sm">New Map</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center" onClick={() => router.push('/memory-cards')}>
              <Brain className="h-6 w-6 mb-2" />
              <span className="text-sm">Review Cards</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center" onClick={() => router.push('/documents')}>
              <BookOpen className="h-6 w-6 mb-2" />
              <span className="text-sm">Upload Doc</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center" onClick={() => router.push('/ai-assistant')}>
              <MessageSquare className="h-6 w-6 mb-2" />
              <span className="text-sm">Ask AI</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CognitiveMapsView() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cognitive Maps</h2>
          <p className="text-gray-600">Visualize and organize your knowledge</p>
        </div>
        <Button onClick={() => router.push('/cognitive-maps')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Map
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Machine Learning Fundamentals</CardTitle>
            <CardDescription>Core concepts and algorithms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>15 nodes, 12 connections</span>
              <span>Updated 2 hours ago</span>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center h-32">
            <Plus className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-gray-500">Create New Map</span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MemoryCardsView() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Memory Cards</h2>
          <p className="text-gray-600">Spaced repetition for better retention</p>
        </div>
        <Button onClick={() => router.push('/memory-cards?tab=create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Cards
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Due for Review</CardTitle>
            <CardDescription>Cards ready for your next study session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">5</div>
            <Button className="w-full" onClick={() => router.push('/memory-cards?review=1')}>Start Review Session</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Study Statistics</CardTitle>
            <CardDescription>Your learning progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Success Rate</span>
                <span className="font-semibold">87%</span>
              </div>
              <div className="flex justify-between">
                <span>Cards Mastered</span>
                <span className="font-semibold">19/24</span>
              </div>
              <div className="flex justify-between">
                <span>Study Streak</span>
                <span className="font-semibold">7 days</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DocumentsView() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="text-gray-600">Your knowledge base and research materials</p>
        </div>
        <Button onClick={() => router.push('/documents')}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold">Introduction to Machine Learning</h3>
                  <p className="text-sm text-gray-500">PDF • 2.3 MB • Uploaded 2 days ago</p>
                </div>
              </div>
              <Button variant="outline" size="sm">View</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AIAssistantView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Assistant</h2>
        <p className="text-gray-600">Get help with research, explanations, and learning</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Assistant</h3>
            <p className="text-gray-500 mb-4">
              Chat with our AI to get explanations, generate study materials, and explore your knowledge base.
            </p>
            <Button>
              Start Conversation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}