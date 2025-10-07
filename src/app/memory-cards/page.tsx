'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Brain, Plus, Play, ArrowLeft } from 'lucide-react'
import { MemoryCardManager } from '@/components/memory-cards/memory-card-manager'
import { ErrorBoundary } from '@/components/debug/error-boundary'
import { useSearchParams, useRouter } from 'next/navigation'

export default function MemoryCardsPage() {
  const [initialTab, setInitialTab] = useState<'browse' | 'create' | 'bulk' | 'convert'>('browse')
  const [startInReview, setStartInReview] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Initialize from query params so dashboard links can preselect flows
  useEffect(() => {
    const tab = searchParams.get('tab')
    const review = searchParams.get('review')
    if (tab === 'browse' || tab === 'create' || tab === 'bulk' || tab === 'convert') {
      setInitialTab(tab)
    }
    if (review) {
      setStartInReview(review === '1' || review === 'true')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => router.push('/')} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Brain className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Memory Cards</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setInitialTab('bulk')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Cards
              </Button>
              <Button variant="outline" onClick={() => {
                console.log('Header: Starting review session')
                setStartInReview(true)
              }}>
                <Play className="h-4 w-4 mr-2" />
                Start Review Session
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary>
          <MemoryCardManager 
            onBack={() => { router.push('/') }}
            initialTab={initialTab}
            startInReview={startInReview}
            className=""
          />
        </ErrorBoundary>
      </main>
    </div>
  )
}