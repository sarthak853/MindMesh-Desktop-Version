'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X, Save, RotateCcw } from 'lucide-react'

interface CardCreationFormProps {
  onCardCreated?: (card: {
    front: string
    back: string
    difficulty: number
    tags: string[]
  }) => void
  initialData?: {
    front?: string
    back?: string
    difficulty?: number
    tags?: string[]
  }
  className?: string
}

export function CardCreationForm({ 
  onCardCreated, 
  initialData,
  className = '' 
}: CardCreationFormProps) {
  const [front, setFront] = useState(initialData?.front || '')
  const [back, setBack] = useState(initialData?.back || '')
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || 1)
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [newTag, setNewTag] = useState('')
  const [isPreview, setIsPreview] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!front.trim() || !back.trim()) {
      return
    }

    const cardData = {
      front: front.trim(),
      back: back.trim(),
      difficulty,
      tags: tags.filter(tag => tag.trim().length > 0)
    }

    if (onCardCreated) {
      onCardCreated(cardData)
    }

    // Reset form
    setFront('')
    setBack('')
    setDifficulty(1)
    setTags([])
    setIsPreview(false)
  }

  const addTag = () => {
    const trimmedTag = newTag.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleReset = () => {
    setFront('')
    setBack('')
    setDifficulty(1)
    setTags([])
    setNewTag('')
    setIsPreview(false)
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

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Create Memory Card</CardTitle>
          <CardDescription>
            Create a new flashcard by entering the question and answer content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isPreview ? (
              // Edit Mode
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Front (Question) *
                  </label>
                  <Textarea
                    placeholder="Enter the question or prompt for this card..."
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    rows={4}
                    className="resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Back (Answer) *
                  </label>
                  <Textarea
                    placeholder="Enter the answer or explanation for this card..."
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    rows={4}
                    className="resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Difficulty Level
                  </label>
                  <Select
                    value={difficulty.toString()}
                    onValueChange={(value) => setDifficulty(parseInt(value))}
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
                    Tags (Optional)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add a tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Preview Mode
              <div className="space-y-4">
                <div className="text-center">
                  <Badge className={getDifficultyColor(difficulty)}>
                    {getDifficultyLabel(difficulty)}
                  </Badge>
                </div>

                <div className="border rounded-lg p-6 min-h-[200px] flex flex-col justify-center">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-4">Question</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {front}
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg p-6 min-h-[200px] flex flex-col justify-center">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-4">Answer</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {back}
                    </p>
                  </div>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPreview(!isPreview)}
                  disabled={!front.trim() || !back.trim()}
                >
                  {isPreview ? 'Edit' : 'Preview'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              <Button
                type="submit"
                disabled={!front.trim() || !back.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Create Card
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}