'use client'

import React, { useState } from 'react'
import { MemoryCard } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

interface MemoryCardProps {
  card: MemoryCard
  onEdit?: (card: MemoryCard) => void
  onDelete?: (cardId: string) => void
  onReview?: (cardId: string, performance: number) => void
  showActions?: boolean
  isReviewMode?: boolean
}

export function MemoryCardComponent({
  card,
  onEdit,
  onDelete,
  onReview,
  showActions = true,
  isReviewMode = false,
}: MemoryCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
    if (!isFlipped) {
      setShowAnswer(true)
    }
  }

  const handleReview = (performance: number) => {
    if (onReview) {
      onReview(card.id, performance)
    }
    setIsFlipped(false)
    setShowAnswer(false)
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const isOverdue = new Date(card.nextReview) < new Date()

  return (
    <Card className={`relative transition-all duration-300 ${isOverdue ? 'ring-2 ring-orange-200' : ''}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge className={getDifficultyColor(card.difficulty)}>
              {getDifficultyLabel(card.difficulty)}
            </Badge>
            {card.successRate > 0 && (
              <Badge variant="outline">
                {Math.round(card.successRate * 100)}% success
              </Badge>
            )}
            {isOverdue && (
              <Badge variant="destructive">
                Overdue
              </Badge>
            )}
          </div>
          
          {showActions && !isReviewMode && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onEdit?.(card)}
                title="Edit card"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onDelete?.(card.id)}
                title="Delete card"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="min-h-[120px] flex flex-col justify-center">
          {!isFlipped ? (
            // Front of card
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Question</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {card.front}
              </p>
            </div>
          ) : (
            // Back of card
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Answer</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {card.back}
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-4">
            {card.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <div>Reviews: {card.reviewCount}</div>
            <div>Next: {formatDate(card.nextReview)}</div>
          </div>

          {isReviewMode ? (
            // Review mode actions
            <div className="flex items-center gap-2">
              {!showAnswer ? (
                <Button onClick={handleFlip} className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Show Answer
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReview(0)}
                  >
                    Hard
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReview(0.5)}
                  >
                    Good
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleReview(1)}
                  >
                    Easy
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // Normal mode actions
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleFlip}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {isFlipped ? 'Show Question' : 'Show Answer'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}