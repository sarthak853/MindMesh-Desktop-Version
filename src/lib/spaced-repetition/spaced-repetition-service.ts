import { MemoryCard } from '@/types'

export interface ReviewPerformance {
  cardId: string
  quality: number // 0-5 scale (0 = complete blackout, 5 = perfect response)
  responseTime: number // in milliseconds
  timestamp: Date
}

export interface SpacedRepetitionResult {
  nextReview: Date
  interval: number // days until next review
  easinessFactor: number
  repetitions: number
}

export interface ReviewSession {
  id: string
  userId: string
  startTime: Date
  endTime?: Date
  cardsReviewed: number
  averageQuality: number
  totalResponseTime: number
  sessionType: 'due' | 'practice' | 'cram'
  completed: boolean
}

export interface RetentionMetrics {
  totalCards: number
  masteredCards: number
  strugglingCards: number
  averageRetention: number
  streakDays: number
  reviewsToday: number
  reviewsThisWeek: number
  projectedWorkload: Array<{ date: Date; cardCount: number }>
}

/**
 * Spaced Repetition Service implementing the SM-2 algorithm
 * with enhancements for better learning optimization
 */
export class SpacedRepetitionService {
  private static readonly MIN_EASINESS_FACTOR = 1.3
  private static readonly INITIAL_EASINESS_FACTOR = 2.5
  private static readonly INITIAL_INTERVAL = 1
  private static readonly SECOND_INTERVAL = 6

  /**
   * Calculate the next review date and update card parameters using SM-2 algorithm
   */
  static calculateNextReview(
    card: MemoryCard,
    quality: number,
    responseTime?: number
  ): SpacedRepetitionResult {
    // Ensure quality is within valid range (0-5)
    quality = Math.max(0, Math.min(5, quality))

    // Get current card parameters or initialize defaults
    const currentEF = card.metadata?.easinessFactor || this.INITIAL_EASINESS_FACTOR
    const currentInterval = card.metadata?.interval || 0
    const currentRepetitions = card.metadata?.repetitions || 0

    let newEF = currentEF
    let newInterval = 0
    let newRepetitions = currentRepetitions

    // SM-2 Algorithm implementation
    if (quality >= 3) {
      // Correct response
      if (currentRepetitions === 0) {
        newInterval = this.INITIAL_INTERVAL
      } else if (currentRepetitions === 1) {
        newInterval = this.SECOND_INTERVAL
      } else {
        newInterval = Math.round(currentInterval * currentEF)
      }
      newRepetitions = currentRepetitions + 1
    } else {
      // Incorrect response - reset repetitions but keep some interval
      newRepetitions = 0
      newInterval = this.INITIAL_INTERVAL
    }

    // Update easiness factor
    newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    newEF = Math.max(this.MIN_EASINESS_FACTOR, newEF)

    // Apply response time adjustment (optional enhancement)
    if (responseTime) {
      const responseTimeAdjustment = this.calculateResponseTimeAdjustment(responseTime, card.difficulty)
      newEF *= responseTimeAdjustment
      newEF = Math.max(this.MIN_EASINESS_FACTOR, newEF)
    }

    // Calculate next review date
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + newInterval)

    return {
      nextReview,
      interval: newInterval,
      easinessFactor: newEF,
      repetitions: newRepetitions
    }
  }

  /**
   * Update card with spaced repetition results
   */
  static async updateCardWithReview(
    card: MemoryCard,
    performance: ReviewPerformance
  ): Promise<Partial<MemoryCard>> {
    const result = this.calculateNextReview(card, performance.quality, performance.responseTime)
    
    // Calculate new success rate
    const newReviewCount = card.reviewCount + 1
    const qualityAsSuccess = performance.quality >= 3 ? 1 : 0
    const newSuccessRate = (card.successRate * card.reviewCount + qualityAsSuccess) / newReviewCount

    // Update card metadata with spaced repetition parameters
    const updatedMetadata = {
      ...card.metadata,
      easinessFactor: result.easinessFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      lastReviewQuality: performance.quality,
      lastReviewTime: performance.responseTime,
      lastReviewDate: performance.timestamp
    }

    return {
      nextReview: result.nextReview,
      reviewCount: newReviewCount,
      successRate: newSuccessRate,
      metadata: updatedMetadata
    }
  }

  /**
   * Get cards due for review
   */
  static filterDueCards(cards: MemoryCard[], includeOverdue: boolean = true): MemoryCard[] {
    const now = new Date()
    
    return cards.filter(card => {
      const reviewDate = new Date(card.nextReview)
      return includeOverdue ? reviewDate <= now : reviewDate.toDateString() === now.toDateString()
    }).sort((a, b) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime())
  }

  /**
   * Create an optimized review session
   */
  static createReviewSession(
    cards: MemoryCard[],
    sessionType: 'due' | 'practice' | 'cram' = 'due',
    maxCards: number = 20
  ): MemoryCard[] {
    let sessionCards: MemoryCard[] = []

    switch (sessionType) {
      case 'due':
        sessionCards = this.filterDueCards(cards).slice(0, maxCards)
        break
      
      case 'practice':
        // Mix of due cards and random selection for practice
        const dueCards = this.filterDueCards(cards)
        const practiceCards = cards
          .filter(card => !dueCards.includes(card))
          .sort(() => Math.random() - 0.5)
        
        sessionCards = [
          ...dueCards.slice(0, Math.floor(maxCards * 0.7)),
          ...practiceCards.slice(0, Math.floor(maxCards * 0.3))
        ]
        break
      
      case 'cram':
        // Focus on struggling cards (low success rate)
        sessionCards = cards
          .filter(card => card.successRate < 0.6)
          .sort((a, b) => a.successRate - b.successRate)
          .slice(0, maxCards)
        break
    }

    // Shuffle cards to avoid predictable patterns
    return this.shuffleCards(sessionCards)
  }

  /**
   * Calculate retention metrics for progress tracking
   */
  static calculateRetentionMetrics(
    cards: MemoryCard[],
    reviewHistory: ReviewPerformance[]
  ): RetentionMetrics {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Basic card statistics
    const totalCards = cards.length
    const masteredCards = cards.filter(card => 
      card.successRate >= 0.8 && card.reviewCount >= 3
    ).length
    const strugglingCards = cards.filter(card => 
      card.successRate < 0.5 && card.reviewCount >= 2
    ).length

    // Calculate average retention
    const averageRetention = totalCards > 0 
      ? cards.reduce((sum, card) => sum + card.successRate, 0) / totalCards 
      : 0

    // Calculate review statistics
    const reviewsToday = reviewHistory.filter(review => 
      new Date(review.timestamp) >= today
    ).length

    const reviewsThisWeek = reviewHistory.filter(review => 
      new Date(review.timestamp) >= weekAgo
    ).length

    // Calculate streak (consecutive days with reviews)
    const streakDays = this.calculateReviewStreak(reviewHistory)

    // Project future workload
    const projectedWorkload = this.calculateProjectedWorkload(cards)

    return {
      totalCards,
      masteredCards,
      strugglingCards,
      averageRetention,
      streakDays,
      reviewsToday,
      reviewsThisWeek,
      projectedWorkload
    }
  }

  /**
   * Analyze review performance and provide recommendations
   */
  static analyzePerformance(
    cards: MemoryCard[],
    reviewHistory: ReviewPerformance[]
  ): {
    overallPerformance: 'excellent' | 'good' | 'needs_improvement' | 'poor'
    recommendations: string[]
    insights: string[]
  } {
    const metrics = this.calculateRetentionMetrics(cards, reviewHistory)
    const recentReviews = reviewHistory.filter(review => 
      new Date(review.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    )

    let overallPerformance: 'excellent' | 'good' | 'needs_improvement' | 'poor'
    const recommendations: string[] = []
    const insights: string[] = []

    // Determine overall performance
    if (metrics.averageRetention >= 0.8 && metrics.streakDays >= 7) {
      overallPerformance = 'excellent'
      insights.push(`Excellent retention rate of ${Math.round(metrics.averageRetention * 100)}%`)
    } else if (metrics.averageRetention >= 0.6 && metrics.streakDays >= 3) {
      overallPerformance = 'good'
      insights.push(`Good retention rate of ${Math.round(metrics.averageRetention * 100)}%`)
    } else if (metrics.averageRetention >= 0.4) {
      overallPerformance = 'needs_improvement'
      insights.push(`Retention rate of ${Math.round(metrics.averageRetention * 100)}% needs improvement`)
    } else {
      overallPerformance = 'poor'
      insights.push(`Low retention rate of ${Math.round(metrics.averageRetention * 100)}% requires attention`)
    }

    // Generate recommendations
    if (metrics.strugglingCards > 0) {
      recommendations.push(`Focus on ${metrics.strugglingCards} struggling cards with low success rates`)
    }

    if (metrics.streakDays === 0) {
      recommendations.push('Start a daily review habit to improve retention')
    } else if (metrics.streakDays < 7) {
      recommendations.push('Try to maintain a longer review streak for better results')
    }

    const dueCards = this.filterDueCards(cards)
    if (dueCards.length > 20) {
      recommendations.push('You have many overdue cards - consider shorter, more frequent sessions')
    }

    if (recentReviews.length > 0) {
      const avgResponseTime = recentReviews.reduce((sum, r) => sum + r.responseTime, 0) / recentReviews.length
      if (avgResponseTime > 10000) { // 10 seconds
        recommendations.push('Try to respond more quickly to improve retention')
      }
    }

    return {
      overallPerformance,
      recommendations,
      insights
    }
  }

  /**
   * Calculate response time adjustment factor
   */
  private static calculateResponseTimeAdjustment(responseTime: number, difficulty: number): number {
    // Expected response times by difficulty (in milliseconds)
    const expectedTimes = {
      1: 3000,  // Easy: 3 seconds
      2: 5000,  // Medium: 5 seconds
      3: 8000,  // Hard: 8 seconds
      4: 12000, // Very Hard: 12 seconds
      5: 15000  // Extreme: 15 seconds
    }

    const expected = expectedTimes[difficulty as keyof typeof expectedTimes] || 8000
    const ratio = responseTime / expected

    // Adjust easiness factor based on response time
    if (ratio < 0.5) {
      return 1.1 // Very fast response - increase easiness
    } else if (ratio < 1.0) {
      return 1.05 // Fast response - slight increase
    } else if (ratio < 2.0) {
      return 1.0 // Normal response - no change
    } else if (ratio < 3.0) {
      return 0.95 // Slow response - slight decrease
    } else {
      return 0.9 // Very slow response - decrease easiness
    }
  }

  /**
   * Shuffle cards using Fisher-Yates algorithm
   */
  private static shuffleCards(cards: MemoryCard[]): MemoryCard[] {
    const shuffled = [...cards]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * Calculate consecutive review streak
   */
  private static calculateReviewStreak(reviewHistory: ReviewPerformance[]): number {
    if (reviewHistory.length === 0) return 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let streak = 0
    let currentDate = new Date(today)

    // Check each day going backwards
    for (let i = 0; i < 365; i++) { // Max 365 days
      const dayReviews = reviewHistory.filter(review => {
        const reviewDate = new Date(review.timestamp)
        reviewDate.setHours(0, 0, 0, 0)
        return reviewDate.getTime() === currentDate.getTime()
      })

      if (dayReviews.length > 0) {
        streak++
      } else if (i > 0) { // Don't break on first day (today might not have reviews yet)
        break
      }

      currentDate.setDate(currentDate.getDate() - 1)
    }

    return streak
  }

  /**
   * Calculate projected workload for the next 30 days
   */
  private static calculateProjectedWorkload(cards: MemoryCard[]): Array<{ date: Date; cardCount: number }> {
    const workload: Array<{ date: Date; cardCount: number }> = []
    const today = new Date()

    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      date.setHours(0, 0, 0, 0)

      const cardCount = cards.filter(card => {
        const reviewDate = new Date(card.nextReview)
        reviewDate.setHours(0, 0, 0, 0)
        return reviewDate.getTime() === date.getTime()
      }).length

      workload.push({ date, cardCount })
    }

    return workload
  }
}