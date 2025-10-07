'use client'

import React, { useState, useEffect } from 'react'
import { MemoryCard } from '@/types'
import { MemoryCardComponent } from './memory-card'
import { ContentConverter } from './content-converter'
import { CardCreationForm } from './card-creation-form'
import { BulkCardCreation } from './bulk-card-creation'
import { SimpleReviewSession } from './simple-review-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit, 
  Download, 
  Upload,
  BarChart3,
  Calendar,
  Tag,
  Sparkles,
  Play
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { CardSkeleton, StatsSkeleton } from '@/components/ui/skeleton'

interface MemoryCardManagerProps {
  className?: string
  onBack?: () => void
  initialTab?: 'browse' | 'create' | 'bulk' | 'convert'
  startInReview?: boolean
}

interface CardFilters {
  search: string
  tags: string[]
  difficulty: number | null
  dueOnly: boolean
  sortBy: 'nextReview' | 'difficulty' | 'successRate' | 'reviewCount'
  sortOrder: 'asc' | 'desc'
}

interface CardStatistics {
  total: number
  due: number
  averageSuccessRate: number
  totalReviews: number
}

export function MemoryCardManager({ className = '', onBack, initialTab = 'browse', startInReview = false }: MemoryCardManagerProps) {
  const [cards, setCards] = useState<MemoryCard[]>([])
  const [filteredCards, setFilteredCards] = useState<MemoryCard[]>([])
  const [statistics, setStatistics] = useState<CardStatistics | null>(null)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isReviewSession, setIsReviewSession] = useState(startInReview)
  const [practiceAllCards, setPracticeAllCards] = useState(false)
  const { addToast } = useToast()
  
  const [filters, setFilters] = useState<CardFilters>({
    search: '',
    tags: [],
    difficulty: null,
    dueOnly: false,
    sortBy: 'nextReview',
    sortOrder: 'asc'
  })

  const [availableTags, setAvailableTags] = useState<string[]>([])

  useEffect(() => {
    // Use setTimeout to defer loading and improve perceived performance
    const timer = setTimeout(() => {
      loadCards()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Reflect changes to initialTab prop by updating activeTab
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  // Allow triggering review session from prop
  useEffect(() => {
    if (startInReview) {
      setIsReviewSession(true)
    }
  }, [startInReview])

  useEffect(() => {
    applyFilters()
  }, [cards, filters])

  const loadCards = async () => {
    setIsLoading(true)
    try {
      // Use a smaller initial limit for faster loading
      const response = await fetch('/api/memory-cards?limit=100&offset=0')
      if (response.ok) {
        const contentType = response.headers.get('content-type') || ''
        let data: any = {}
        if (contentType.includes('application/json')) {
          data = await response.json()
        } else {
          const text = await response.text()
          throw new Error(`Expected JSON from /api/memory-cards, got: ${contentType}. First 200 chars: ${text.slice(0,200)}`)
        }
        setCards(data.cards || [])
        setStatistics(data.statistics)
        
        // Extract unique tags efficiently
        const tags = new Set<string>()
        data.cards?.forEach((card: MemoryCard) => {
          card.tags?.forEach(tag => tags.add(tag))
        })
        setAvailableTags(Array.from(tags).sort())
      }
    } catch (error) {
      console.error('Error loading memory cards:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...cards]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(card => 
        card.front.toLowerCase().includes(searchLower) ||
        card.back.toLowerCase().includes(searchLower) ||
        card.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(card =>
        filters.tags.some(tag => card.tags?.includes(tag))
      )
    }

    // Difficulty filter
    if (filters.difficulty !== null) {
      filtered = filtered.filter(card => card.difficulty === filters.difficulty)
    }

    // Due only filter
    if (filters.dueOnly) {
      const now = new Date()
      filtered = filtered.filter(card => new Date(card.nextReview) <= now)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (filters.sortBy) {
        case 'nextReview':
          aValue = new Date(a.nextReview)
          bValue = new Date(b.nextReview)
          break
        case 'difficulty':
          aValue = a.difficulty
          bValue = b.difficulty
          break
        case 'successRate':
          aValue = a.successRate
          bValue = b.successRate
          break
        case 'reviewCount':
          aValue = a.reviewCount
          bValue = b.reviewCount
          break
        default:
          aValue = a.nextReview
          bValue = b.nextReview
      }

      if (filters.sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      }
    })

    setFilteredCards(filtered)
  }

  const handleCreateCard = async (cardData: Partial<MemoryCard>) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/memory-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      })

      if (response.ok) {
        await loadCards()
        setActiveTab('browse')
        addToast({
          type: 'success',
          title: 'Card Created!',
          description: 'Your memory card has been created successfully.'
        })
      }
    } catch (error) {
      console.error('Error creating memory card:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkCreateCards = async (cards: Array<{
    front: string
    back: string
    difficulty: number
    tags: string[]
  }>) => {
    try {
      setIsLoading(true)
      const promises = cards.map(card => 
        fetch('/api/memory-cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(card),
        })
      )

      await Promise.all(promises)
      await loadCards()
      
      // Switch to browse tab to see created cards
      setActiveTab('browse')
      
      // Show success feedback
      addToast({
        type: 'success',
        title: 'Cards Created!',
        description: `Successfully created ${cards.length} memory card${cards.length !== 1 ? 's' : ''}.`
      })
    } catch (error) {
      console.error('Error creating memory cards:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      const response = await fetch(`/api/memory-cards/${cardId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadCards()
        setSelectedCards(prev => {
          const newSet = new Set(prev)
          newSet.delete(cardId)
          return newSet
        })
      }
    } catch (error) {
      console.error('Error deleting memory card:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCards.size === 0) return

    try {
      const promises = Array.from(selectedCards).map(cardId =>
        fetch(`/api/memory-cards/${cardId}`, { method: 'DELETE' })
      )

      await Promise.all(promises)
      await loadCards()
      setSelectedCards(new Set())
    } catch (error) {
      console.error('Error deleting memory cards:', error)
    }
  }

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else {
        newSet.add(cardId)
      }
      return newSet
    })
  }

  const selectAllCards = () => {
    setSelectedCards(new Set(filteredCards.map(card => card.id)))
  }

  const clearSelection = () => {
    setSelectedCards(new Set())
  }

  const updateFilters = (updates: Partial<CardFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }

  const getDifficultyLabel = (difficulty: number) => {
    const labels = ['', 'Easy', 'Medium', 'Hard', 'Very Hard', 'Extreme']
    return labels[difficulty] || 'Unknown'
  }

  // Early return for review session
  if (isReviewSession) {
    const now = new Date()
    const dueCards = cards.filter(card => {
      const nextReview = new Date(card.nextReview)
      return nextReview <= now
    })
    
    // Choose cards based on practice mode
    const reviewCards = practiceAllCards ? cards : dueCards
    
    console.log('Review session starting with:', {
      totalCards: cards.length,
      dueCards: dueCards.length,
      practiceAllCards,
      reviewCards: reviewCards.length
    })
    
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            {practiceAllCards ? 'Practice Session' : 'Review Session'}
          </h1>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsReviewSession(false)
              setPracticeAllCards(false)
            }}
          >
            Exit Review
          </Button>
        </div>
        {!practiceAllCards && dueCards.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-medium mb-2">No Cards Due for Review</h3>
              <p className="text-muted-foreground mb-4">
                All your cards are up to date! Come back later or practice with all cards.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => {
                  setIsReviewSession(false)
                  setPracticeAllCards(false)
                }}>
                  Back to Cards
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    console.log('Starting practice with all cards:', cards.length)
                    setPracticeAllCards(true)
                  }}
                >
                  Practice All Cards ({cards.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <SimpleReviewSession 
            cards={reviewCards}
            onSessionComplete={() => {
              setIsReviewSession(false)
              setPracticeAllCards(false)
              loadCards() // Refresh cards after review
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Back Navigation */}
      {onBack && (
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Memory Cards</h1>
          <p className="text-gray-600 mt-2">
            Use spaced repetition to enhance your learning and retention
          </p>
        </div>
      )}
      
      {/* Statistics */}
      {isLoading ? (
        <StatsSkeleton />
      ) : statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due for Review</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{statistics.due}</div>
              {statistics.due > 0 && (
                <Button 
                  size="sm" 
                  className="mt-2 w-full"
                  onClick={() => {
                    console.log('Starting review session with', statistics.due, 'due cards')
                    setIsReviewSession(true)
                    setPracticeAllCards(false)
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Review Session
                </Button>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(statistics.averageSuccessRate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalReviews}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="browse">Browse Cards</TabsTrigger>
          <TabsTrigger value="create">Create Card</TabsTrigger>
          <TabsTrigger value="bulk">Create Multiple</TabsTrigger>
          <TabsTrigger value="convert">Convert Content</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search cards..."
                      value={filters.search}
                      onChange={(e) => updateFilters({ search: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <Select
                    value={filters.difficulty?.toString() || 'all'}
                    onValueChange={(value) => 
                      updateFilters({ difficulty: value === 'all' ? null : parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      {[1, 2, 3, 4, 5].map(diff => (
                        <SelectItem key={diff} value={diff.toString()}>
                          {getDifficultyLabel(diff)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select
                    value={`${filters.sortBy}-${filters.sortOrder}`}
                    onValueChange={(value) => {
                      const [sortBy, sortOrder] = value.split('-') as [typeof filters.sortBy, typeof filters.sortOrder]
                      updateFilters({ sortBy, sortOrder })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nextReview-asc">Next Review (Earliest)</SelectItem>
                      <SelectItem value="nextReview-desc">Next Review (Latest)</SelectItem>
                      <SelectItem value="difficulty-asc">Difficulty (Easy to Hard)</SelectItem>
                      <SelectItem value="difficulty-desc">Difficulty (Hard to Easy)</SelectItem>
                      <SelectItem value="successRate-desc">Success Rate (High to Low)</SelectItem>
                      <SelectItem value="successRate-asc">Success Rate (Low to High)</SelectItem>
                      <SelectItem value="reviewCount-desc">Review Count (Most to Least)</SelectItem>
                      <SelectItem value="reviewCount-asc">Review Count (Least to Most)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={filters.dueOnly ? "default" : "outline"}
                  onClick={() => updateFilters({ dueOnly: !filters.dueOnly })}
                >
                  Due Only
                </Button>
                
                {availableTags.map(tag => (
                  <Button
                    key={tag}
                    size="sm"
                    variant={filters.tags.includes(tag) ? "default" : "outline"}
                    onClick={() => {
                      const newTags = filters.tags.includes(tag)
                        ? filters.tags.filter(t => t !== tag)
                        : [...filters.tags, tag]
                      updateFilters({ tags: newTags })
                    }}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedCards.size > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={clearSelection}>
                      Clear Selection
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cards Grid */}
          <div className="space-y-4">
            {filteredCards.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredCards.length} of {cards.length} cards
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAllCards}>
                    Select All
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No memory cards found.</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setActiveTab('create')}
                >
                  Create Your First Card
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCards.map(card => (
                  <div key={card.id} className="relative">
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedCards.has(card.id)}
                        onChange={() => toggleCardSelection(card.id)}
                        className="rounded"
                      />
                    </div>
                    <MemoryCardComponent
                      card={card}
                      onDelete={handleDeleteCard}
                      showActions={true}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="create">
          <CardCreationForm onCardCreated={handleCreateCard} />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkCardCreation onCardsCreated={handleBulkCreateCards} />
        </TabsContent>

        <TabsContent value="convert">
          <ContentConverter onCreateCards={handleBulkCreateCards} />
        </TabsContent>
      </Tabs>
    </div>
  )
}