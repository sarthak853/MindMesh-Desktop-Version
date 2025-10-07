'use client'

import React, { useState, useEffect } from 'react'
import { MemoryCard } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Clock, 
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface ReviewSessionProps {
  onSessionComplete?: (statistics: SessionStatistics) => void
  className?: string
}

interface SessionStatistics {
  totalCards: number
  cardsCompleted: number
  averageQuality: number
  averageResponseTime: number
  accuracyRate: number
  sessionDuration: number
  cardsPerMinute: number
  qualityDistribution: Record<number, number>
}

interface SessionProgress {
  completed: number
  total: number
  percentage: number
  timeElapsed: number
  estimatedTimeRemaining: number
}

export function ReviewSession({ onSessionComplete, className = '' }: ReviewSessionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentCard, setCurrentCard] = useState<MemoryCard | null>(null)
  const [progress, setProgress] = useState<SessionProgress>({
    completed: 0,
    total: 0,
    percentage: 0,
    timeElapsed: 0,
    estimatedTimeRemaining: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [cardStartTime, setCardStartTime] = useState<Date | null>(null)
  const [sessionStatistics, setSessionStatistics] = useState<SessionStatistics | null>(null)

  const startSession = async (sessionType: 'due' | 'practice' | 'cram' = 'due') => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/memory-cards/review-session/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionType,
          maxCards: 20,
          shuffleCards: true,
          includeOverdue: true
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSessionId(data.sessionId)
        setCurrentCard(data.currentCard)
        setProgress(data.progress)
        setIsSessionActive(true)
        setShowAnswer(false)
        setCardStartTime(new Date())
      } else {
        const error = await response.json()
        console.error('Failed to start session:', error)
      }
    } catch (error) {
      console.error('Error starting session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const submitReview = async (quality: number) => {
    if (!sessionId || !currentCard) return

    const responseTime = cardStartTime ? Date.now() - cardStartTime.getTime() : 0
    
    try {
      // Submit review to API with spaced repetition
      const response = await fetch(`/api/memory-cards/${currentCard.id}/review/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quality,
          responseTime
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit review')
      }

      const result = await response.json()
      
      // Update local state with spaced repetition results
      setCurrentCard(result.card)
      
      // Continue with existing session logic
      await continueSession(quality, responseTime)
      
    } catch (error) {
      console.error('Error submitting review:', error)
      // Fallback to local session management
      await continueSession(quality, responseTime)
    }
  }

  const continueSession = async (quality: number, responseTime: number) => {
    if (!sessionId) return

    try {
      const response = await fetch(`/api/memory-cards/review-session/${sessionId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit_review',
          quality
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.isComplete) {
          setSessionStatistics(data.statistics)
          setIsSessionActive(false)
          if (onSessionComplete) {
            onSessionComplete(data.statistics)
          }
        } else {
          setCurrentCard(data.currentCard)
          setProgress(data.progress)
          setShowAnswer(false)
          setCardStartTime(new Date())
        }
      } else {
        // If session is not found, end the session gracefully
        console.warn('Session not found, ending session')
        setIsSessionActive(false)
      }
    } catch (error) {
      console.error('Error continuing session:', error)
      // On error, end the session gracefully
      setIsSessionActive(false)
    }
  }

  const skipCard = async () => {
    if (!sessionId) return

    try {
      const response = await fetch(`/api/memory-cards/review-session/${sessionId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'skip_card'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.isComplete) {
          setSessionStatistics(data.statistics)
          setIsSessionActive(false)
          if (onSessionComplete) {
            onSessionComplete(data.statistics)
          }
        } else {
          setCurrentCard(data.currentCard)
          setProgress(data.progress)
          setShowAnswer(false)
          setCardStartTime(new Date())
        }
      }
    } catch (error) {
      console.error('Error skipping card:', error)
    }
  }

  const pauseSession = async () => {
    if (!sessionId) return

    try {
      const response = await fetch(`/api/memory-cards/review-session/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isPaused ? 'resume_session' : 'pause_session'
        }),
      })

      if (response.ok) {
        setIsPaused(!isPaused)
        if (!isPaused) {
          setCardStartTime(null)
        } else {
          setCardStartTime(new Date())
        }
      }
    } catch (error) {
      console.error('Error pausing/resuming session:', error)
    }
  }

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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

  // Session complete view
  if (sessionStatistics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Session Complete!
            </CardTitle>
            <CardDescription>
              Great job! Here's how you performed in this review session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {sessionStatistics.cardsCompleted}
                </div>
                <div className="text-sm text-muted-foreground">Cards Reviewed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(sessionStatistics.accuracyRate * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatTime(sessionStatistics.sessionDuration)}
                </div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {sessionStatistics.cardsPerMinute.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Cards/Min</div>
              </div>
            </div>

            {/* Quality Distribution */}
            <div>
              <h4 className="font-medium mb-3">Response Quality Distribution</h4>
              <div className="space-y-2">
                {Object.entries(sessionStatistics.qualityDistribution).map(([quality, count]) => (
                  <div key={quality} className="flex items-center gap-3">
                    <div className="w-16 text-sm">
                      Quality {quality}
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${sessionStatistics.cardsCompleted > 0 ? (count / sessionStatistics.cardsCompleted) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <div className="w-8 text-sm text-muted-foreground">
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => startSession('due')} className="flex-1">
                Start New Session
              </Button>
              <Button variant="outline" onClick={() => setSessionStatistics(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Session not started view
  if (!isSessionActive) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle>Review Session</CardTitle>
            <CardDescription>
              Choose a review session type to start practicing your memory cards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => startSession('due')}
                disabled={isLoading}
                className="h-20 flex flex-col gap-2"
              >
                <Target className="h-6 w-6" />
                <div>
                  <div className="font-medium">Due Cards</div>
                  <div className="text-xs opacity-80">Review cards that are due</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => startSession('practice')}
                disabled={isLoading}
                className="h-20 flex flex-col gap-2"
              >
                <Play className="h-6 w-6" />
                <div>
                  <div className="font-medium">Practice</div>
                  <div className="text-xs opacity-80">Mixed practice session</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => startSession('cram')}
                disabled={isLoading}
                className="h-20 flex flex-col gap-2"
              >
                <AlertCircle className="h-6 w-6" />
                <div>
                  <div className="font-medium">Cram</div>
                  <div className="text-xs opacity-80">Focus on struggling cards</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Active session view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium">
                Progress: {progress.completed} / {progress.total}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTime(progress.timeElapsed)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={pauseSession}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Current Card */}
      {currentCard && (
        <Card className="min-h-[400px]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className={getDifficultyColor(currentCard.difficulty)}>
                {getDifficultyLabel(currentCard.difficulty)}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={skipCard}
                className="hover:bg-gray-100"
              >
                <SkipForward className="h-4 w-4 mr-1" />
                Skip
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!showAnswer ? (
              // Question view
              <div className="text-center space-y-4">
                <h3 className="text-xl font-medium">Question</h3>
                <div className="min-h-[200px] flex items-center justify-center">
                  <p className="text-lg whitespace-pre-wrap">
                    {currentCard.front}
                  </p>
                </div>
                <Button 
                  onClick={() => setShowAnswer(true)}
                  className="w-full"
                  disabled={isPaused}
                >
                  Show Answer
                </Button>
              </div>
            ) : (
              // Answer view
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-medium">Answer</h3>
                  <div className="min-h-[200px] flex items-center justify-center">
                    <p className="text-lg whitespace-pre-wrap">
                      {currentCard.back}
                    </p>
                  </div>
                </div>

                {/* Quality Rating Buttons */}
                <div className="space-y-3">
                  <h4 className="text-center font-medium">How well did you know this?</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => submitReview(0)}
                      className="flex flex-col gap-1 h-16 hover:scale-105 transition-transform"
                      disabled={isPaused}
                    >
                      <XCircle className="h-5 w-5" />
                      <span className="text-xs">No Idea</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => submitReview(1)}
                      className="flex flex-col gap-1 h-16 hover:scale-105 transition-transform border-orange-200 hover:bg-orange-50"
                      disabled={isPaused}
                    >
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <span className="text-xs">Hard</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => submitReview(3)}
                      className="flex flex-col gap-1 h-16 hover:scale-105 transition-transform border-blue-200 hover:bg-blue-50"
                      disabled={isPaused}
                    >
                      <RotateCcw className="h-5 w-5 text-blue-600" />
                      <span className="text-xs">Good</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => submitReview(4)}
                      className="flex flex-col gap-1 h-16 hover:scale-105 transition-transform border-green-200 hover:bg-green-50"
                      disabled={isPaused}
                    >
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="text-xs">Easy</span>
                    </Button>
                    <Button
                      onClick={() => submitReview(5)}
                      className="flex flex-col gap-1 h-16 hover:scale-105 transition-transform bg-green-600 hover:bg-green-700"
                      disabled={isPaused}
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-xs">Perfect</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}