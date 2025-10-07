'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileText, Plus, X, Sparkles } from 'lucide-react'

interface GeneratedCard {
  front: string
  back: string
  difficulty: number
  tags: string[]
}

interface ContentConverterProps {
  onCardsGenerated?: (cards: GeneratedCard[]) => void
  onCreateCards?: (cards: GeneratedCard[]) => Promise<void>
  className?: string
}

export function ContentConverter({ 
  onCardsGenerated, 
  onCreateCards,
  className = '' 
}: ContentConverterProps) {
  const [content, setContent] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([])
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set())
  const [customTags, setCustomTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  const handleGenerateCards = async () => {
    if (!content.trim()) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate-memory-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          documentId: documentId || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate memory cards')
      }

      const data = await response.json()
      const cards = data.memoryCards || []
      
      setGeneratedCards(cards)
      setSelectedCards(new Set(cards.map((_, index) => index)))
      
      if (onCardsGenerated) {
        onCardsGenerated(cards)
      }
    } catch (error) {
      console.error('Error generating memory cards:', error)
      // TODO: Show error toast
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateSelectedCards = async () => {
    const cardsToCreate = generatedCards
      .filter((_, index) => selectedCards.has(index))
      .map(card => ({
        ...card,
        tags: [...card.tags, ...customTags]
      }))

    if (onCreateCards) {
      await onCreateCards(cardsToCreate)
    }

    // Reset state
    setGeneratedCards([])
    setSelectedCards(new Set())
    setContent('')
    setCustomTags([])
  }

  const toggleCardSelection = (index: number) => {
    const newSelected = new Set(selectedCards)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedCards(newSelected)
  }

  const addCustomTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      setCustomTags([...customTags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeCustomTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter(tag => tag !== tagToRemove))
  }

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 2: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 3: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 4: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 5: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getDifficultyLabel = (difficulty: number) => {
    const labels = ['', 'Easy', 'Medium', 'Hard', 'Very Hard', 'Extreme']
    return labels[difficulty] || 'Unknown'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Content Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Convert Content to Memory Cards
          </CardTitle>
          <CardDescription>
            Paste your content below and AI will generate flashcards to help you learn and remember key concepts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Content to Convert
            </label>
            <Textarea
              placeholder="Paste your notes, article text, or any content you want to convert into flashcards..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Document ID (Optional)
            </label>
            <Input
              placeholder="Enter document ID if converting from a specific document"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleGenerateCards}
            disabled={!content.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Cards...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Memory Cards
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Cards */}
      {generatedCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Memory Cards</CardTitle>
            <CardDescription>
              Review and select the cards you want to create. You can add custom tags that will be applied to all selected cards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Custom Tags */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Add Custom Tags (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Enter a tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                />
                <Button onClick={addCustomTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {customTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {customTags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => removeCustomTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Card Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Select Cards to Create ({selectedCards.size}/{generatedCards.length})
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedCards(new Set(generatedCards.map((_, i) => i)))}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedCards(new Set())}
                  >
                    Select None
                  </Button>
                </div>
              </div>

              {generatedCards.map((card, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedCards.has(index) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => toggleCardSelection(index)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCards.has(index)}
                        onChange={() => toggleCardSelection(index)}
                        className="rounded"
                      />
                      <Badge className={getDifficultyColor(card.difficulty)}>
                        {getDifficultyLabel(card.difficulty)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Front (Question)</h4>
                      <p className="text-sm text-muted-foreground">{card.front}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Back (Answer)</h4>
                      <p className="text-sm text-muted-foreground">{card.back}</p>
                    </div>
                  </div>

                  {card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {card.tags.map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleCreateSelectedCards}
              disabled={selectedCards.size === 0}
              className="w-full"
            >
              Create {selectedCards.size} Selected Card{selectedCards.size !== 1 ? 's' : ''}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}