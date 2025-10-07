'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X, Save, RotateCcw, Trash2, Copy } from 'lucide-react'

interface BulkCardCreationProps {
  onCardsCreated?: (cards: Array<{
    front: string
    back: string
    difficulty: number
    tags: string[]
  }>) => void
  className?: string
}

interface CardData {
  id: string
  front: string
  back: string
  difficulty: number
  tags: string[]
}

export function BulkCardCreation({ onCardsCreated, className = '' }: BulkCardCreationProps) {
  const [cards, setCards] = useState<CardData[]>([
    { id: '1', front: '', back: '', difficulty: 1, tags: [] }
  ])
  const [globalTags, setGlobalTags] = useState<string[]>([])
  const [newGlobalTag, setNewGlobalTag] = useState('')
  const [globalDifficulty, setGlobalDifficulty] = useState(1)

  const addCard = () => {
    const newCard: CardData = {
      id: Date.now().toString(),
      front: '',
      back: '',
      difficulty: globalDifficulty,
      tags: [...globalTags]
    }
    setCards([...cards, newCard])
  }

  const removeCard = (id: string) => {
    if (cards.length > 1) {
      setCards(cards.filter(card => card.id !== id))
    }
  }

  const updateCard = (id: string, updates: Partial<CardData>) => {
    setCards(cards.map(card => 
      card.id === id ? { ...card, ...updates } : card
    ))
  }

  const duplicateCard = (id: string) => {
    const cardToDuplicate = cards.find(card => card.id === id)
    if (cardToDuplicate) {
      const newCard: CardData = {
        ...cardToDuplicate,
        id: Date.now().toString()
      }
      const cardIndex = cards.findIndex(card => card.id === id)
      const newCards = [...cards]
      newCards.splice(cardIndex + 1, 0, newCard)
      setCards(newCards)
    }
  }

  const addGlobalTag = () => {
    const trimmedTag = newGlobalTag.trim()
    if (trimmedTag && !globalTags.includes(trimmedTag)) {
      setGlobalTags([...globalTags, trimmedTag])
      setNewGlobalTag('')
    }
  }

  const removeGlobalTag = (tagToRemove: string) => {
    setGlobalTags(globalTags.filter(tag => tag !== tagToRemove))
  }

  const addTagToCard = (cardId: string, tag: string) => {
    const card = cards.find(c => c.id === cardId)
    if (card && !card.tags.includes(tag)) {
      updateCard(cardId, { tags: [...card.tags, tag] })
    }
  }

  const removeTagFromCard = (cardId: string, tagToRemove: string) => {
    const card = cards.find(c => c.id === cardId)
    if (card) {
      updateCard(cardId, { tags: card.tags.filter(tag => tag !== tagToRemove) })
    }
  }

  const applyGlobalSettings = () => {
    setCards(cards.map(card => ({
      ...card,
      difficulty: globalDifficulty,
      tags: [...new Set([...card.tags, ...globalTags])]
    })))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const validCards = cards.filter(card => 
      card.front.trim() && card.back.trim()
    ).map(card => ({
      front: card.front.trim(),
      back: card.back.trim(),
      difficulty: card.difficulty,
      tags: card.tags.filter(tag => tag.trim().length > 0)
    }))

    if (validCards.length === 0) {
      return
    }

    if (onCardsCreated) {
      onCardsCreated(validCards)
    }

    // Reset form
    setCards([{ id: '1', front: '', back: '', difficulty: 1, tags: [] }])
    setGlobalTags([])
    setGlobalDifficulty(1)
  }

  const handleReset = () => {
    setCards([{ id: '1', front: '', back: '', difficulty: 1, tags: [] }])
    setGlobalTags([])
    setNewGlobalTag('')
    setGlobalDifficulty(1)
  }

  const getDifficultyLabel = (difficulty: number) => {
    const labels = ['', 'Easy', 'Medium', 'Hard', 'Very Hard', 'Extreme']
    return labels[difficulty] || 'Unknown'
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

  const validCardsCount = cards.filter(card => card.front.trim() && card.back.trim()).length

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Create Multiple Memory Cards</CardTitle>
          <CardDescription>
            Create multiple flashcards at once. Use global settings to apply common properties to all cards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Global Settings */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-4">Global Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Default Difficulty
                </label>
                <Select
                  value={globalDifficulty.toString()}
                  onValueChange={(value) => setGlobalDifficulty(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(level => (
                      <SelectItem key={level} value={level.toString()}>
                        {getDifficultyLabel(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Global Tags
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a global tag"
                    value={newGlobalTag}
                    onChange={(e) => setNewGlobalTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGlobalTag())}
                  />
                  <Button type="button" onClick={addGlobalTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {globalTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {globalTags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeGlobalTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <Button 
              type="button" 
              onClick={applyGlobalSettings}
              size="sm"
              variant="outline"
            >
              Apply to All Cards
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cards */}
            <div className="space-y-4">
              {cards.map((card, index) => (
                <Card key={card.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Card {index + 1}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => duplicateCard(card.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {cards.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeCard(card.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Front (Question) *
                        </label>
                        <Textarea
                          placeholder="Enter the question..."
                          value={card.front}
                          onChange={(e) => updateCard(card.id, { front: e.target.value })}
                          rows={3}
                          className="resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Back (Answer) *
                        </label>
                        <Textarea
                          placeholder="Enter the answer..."
                          value={card.back}
                          onChange={(e) => updateCard(card.id, { back: e.target.value })}
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Difficulty
                        </label>
                        <Select
                          value={card.difficulty.toString()}
                          onValueChange={(value) => updateCard(card.id, { difficulty: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(level => (
                              <SelectItem key={level} value={level.toString()}>
                                {getDifficultyLabel(level)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {card.tags.map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="flex items-center gap-1">
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTagFromCard(card.id, tag)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {globalTags.map(tag => (
                            !card.tags.includes(tag) && (
                              <Button
                                key={tag}
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => addTagToCard(card.id, tag)}
                                className="h-6 px-2 text-xs"
                              >
                                + {tag}
                              </Button>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                type="button"
                onClick={addCard}
                variant="outline"
                className="w-full max-w-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Card
              </Button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {validCardsCount} of {cards.length} cards ready to create
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All
                </Button>

                <Button
                  type="submit"
                  disabled={validCardsCount === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create {validCardsCount} Card{validCardsCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}