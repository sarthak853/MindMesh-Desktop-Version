import { MemoryCard } from '@/types'
import { SpacedRepetitionService, ReviewPerformance, ReviewSession } from './spaced-repetition-service'

export interface ReviewSessionConfig {
  maxCards: number
  sessionType: 'due' | 'practice' | 'cram'
  timeLimit?: number // in minutes
  shuffleCards: boolean
  includeOverdue: boolean
}

export interface ReviewSessionState {
  session: ReviewSession
  cards: MemoryCard[]
  currentCardIndex: number
  currentCard: MemoryCard | null
  isComplete: boolean
  startTime: Date
  cardStartTime: Date | null
  performances: ReviewPerformance[]
}

export interface SessionStatistics {
  totalCards: number
  cardsCompleted: number
  averageQuality: number
  averageResponseTime: number
  accuracyRate: number
  sessionDuration: number
  cardsPerMinute: number
  qualityDistribution: Record<number, number>
}

/**
 * Manages review sessions and tracks performance
 */
export class ReviewSessionManager {
  private sessionState: ReviewSessionState | null = null
  private sessionConfig: ReviewSessionConfig
  private onCardReviewed?: (performance: ReviewPerformance) => void
  private onSessionComplete?: (statistics: SessionStatistics) => void

  constructor(
    config: ReviewSessionConfig,
    onCardReviewed?: (performance: ReviewPerformance) => void,
    onSessionComplete?: (statistics: SessionStatistics) => void
  ) {
    this.sessionConfig = config
    this.onCardReviewed = onCardReviewed
    this.onSessionComplete = onSessionComplete
  }

  /**
   * Start a new review session
   */
  startSession(userId: string, availableCards: MemoryCard[]): ReviewSessionState {
    // Create session cards based on configuration
    const sessionCards = SpacedRepetitionService.createReviewSession(
      availableCards,
      this.sessionConfig.sessionType,
      this.sessionConfig.maxCards
    )

    if (sessionCards.length === 0) {
      throw new Error('No cards available for review session')
    }

    // Initialize session state
    const session: ReviewSession = {
      id: this.generateSessionId(),
      userId,
      startTime: new Date(),
      cardsReviewed: 0,
      averageQuality: 0,
      totalResponseTime: 0,
      sessionType: this.sessionConfig.sessionType,
      completed: false
    }

    this.sessionState = {
      session,
      cards: sessionCards,
      currentCardIndex: 0,
      currentCard: sessionCards[0],
      isComplete: false,
      startTime: new Date(),
      cardStartTime: new Date(),
      performances: []
    }

    return this.sessionState
  }

  /**
   * Get current session state
   */
  getCurrentState(): ReviewSessionState | null {
    return this.sessionState
  }

  /**
   * Submit a review for the current card
   */
  submitReview(quality: number): ReviewPerformance | null {
    if (!this.sessionState || !this.sessionState.currentCard || !this.sessionState.cardStartTime) {
      throw new Error('No active session or current card')
    }

    const responseTime = Date.now() - this.sessionState.cardStartTime.getTime()
    
    const performance: ReviewPerformance = {
      cardId: this.sessionState.currentCard.id,
      quality: Math.max(0, Math.min(5, quality)),
      responseTime,
      timestamp: new Date()
    }

    // Add performance to session
    this.sessionState.performances.push(performance)
    this.sessionState.session.cardsReviewed++

    // Update session statistics
    this.updateSessionStatistics(performance)

    // Notify callback
    if (this.onCardReviewed) {
      this.onCardReviewed(performance)
    }

    // Move to next card or complete session
    this.moveToNextCard()

    return performance
  }

  /**
   * Skip the current card
   */
  skipCard(): void {
    if (!this.sessionState) {
      throw new Error('No active session')
    }

    // Treat skip as a quality 0 review
    this.submitReview(0)
  }

  /**
   * Move to the next card in the session
   */
  private moveToNextCard(): void {
    if (!this.sessionState) return

    this.sessionState.currentCardIndex++

    if (this.sessionState.currentCardIndex >= this.sessionState.cards.length) {
      // Session complete
      this.completeSession()
    } else {
      // Move to next card
      this.sessionState.currentCard = this.sessionState.cards[this.sessionState.currentCardIndex]
      this.sessionState.cardStartTime = new Date()
    }
  }

  /**
   * Complete the current session
   */
  completeSession(): SessionStatistics {
    if (!this.sessionState) {
      throw new Error('No active session to complete')
    }

    this.sessionState.isComplete = true
    this.sessionState.session.completed = true
    this.sessionState.session.endTime = new Date()

    const statistics = this.calculateSessionStatistics()

    // Notify callback
    if (this.onSessionComplete) {
      this.onSessionComplete(statistics)
    }

    return statistics
  }

  /**
   * Pause the current session
   */
  pauseSession(): void {
    if (!this.sessionState) {
      throw new Error('No active session to pause')
    }

    // Reset card start time when resuming
    this.sessionState.cardStartTime = null
  }

  /**
   * Resume a paused session
   */
  resumeSession(): void {
    if (!this.sessionState) {
      throw new Error('No session to resume')
    }

    this.sessionState.cardStartTime = new Date()
  }

  /**
   * Get session progress
   */
  getProgress(): {
    completed: number
    total: number
    percentage: number
    timeElapsed: number
    estimatedTimeRemaining: number
  } {
    if (!this.sessionState) {
      return {
        completed: 0,
        total: 0,
        percentage: 0,
        timeElapsed: 0,
        estimatedTimeRemaining: 0
      }
    }

    const completed = this.sessionState.currentCardIndex
    const total = this.sessionState.cards.length
    const percentage = total > 0 ? (completed / total) * 100 : 0
    const timeElapsed = Date.now() - this.sessionState.startTime.getTime()
    
    // Estimate remaining time based on average time per card
    const avgTimePerCard = completed > 0 ? timeElapsed / completed : 30000 // 30 seconds default
    const estimatedTimeRemaining = (total - completed) * avgTimePerCard

    return {
      completed,
      total,
      percentage,
      timeElapsed,
      estimatedTimeRemaining
    }
  }

  /**
   * Check if session should end due to time limit
   */
  shouldEndDueToTimeLimit(): boolean {
    if (!this.sessionConfig.timeLimit || !this.sessionState) {
      return false
    }

    const timeElapsed = Date.now() - this.sessionState.startTime.getTime()
    const timeLimitMs = this.sessionConfig.timeLimit * 60 * 1000

    return timeElapsed >= timeLimitMs
  }

  /**
   * Get remaining cards in session
   */
  getRemainingCards(): MemoryCard[] {
    if (!this.sessionState) {
      return []
    }

    return this.sessionState.cards.slice(this.sessionState.currentCardIndex + 1)
  }

  /**
   * Get cards already reviewed in this session
   */
  getReviewedCards(): MemoryCard[] {
    if (!this.sessionState) {
      return []
    }

    return this.sessionState.cards.slice(0, this.sessionState.currentCardIndex)
  }

  /**
   * Update session statistics with new performance
   */
  private updateSessionStatistics(performance: ReviewPerformance): void {
    if (!this.sessionState) return

    const session = this.sessionState.session
    const performances = this.sessionState.performances

    // Update average quality
    const totalQuality = performances.reduce((sum, p) => sum + p.quality, 0)
    session.averageQuality = totalQuality / performances.length

    // Update total response time
    session.totalResponseTime = performances.reduce((sum, p) => sum + p.responseTime, 0)
  }

  /**
   * Calculate comprehensive session statistics
   */
  private calculateSessionStatistics(): SessionStatistics {
    if (!this.sessionState) {
      throw new Error('No session state available')
    }

    const performances = this.sessionState.performances
    const sessionDuration = Date.now() - this.sessionState.startTime.getTime()

    // Basic statistics
    const totalCards = this.sessionState.cards.length
    const cardsCompleted = performances.length
    const averageQuality = performances.length > 0 
      ? performances.reduce((sum, p) => sum + p.quality, 0) / performances.length 
      : 0
    const averageResponseTime = performances.length > 0
      ? performances.reduce((sum, p) => sum + p.responseTime, 0) / performances.length
      : 0

    // Accuracy rate (quality >= 3 is considered correct)
    const correctAnswers = performances.filter(p => p.quality >= 3).length
    const accuracyRate = cardsCompleted > 0 ? correctAnswers / cardsCompleted : 0

    // Cards per minute
    const sessionMinutes = sessionDuration / (1000 * 60)
    const cardsPerMinute = sessionMinutes > 0 ? cardsCompleted / sessionMinutes : 0

    // Quality distribution
    const qualityDistribution: Record<number, number> = {}
    for (let i = 0; i <= 5; i++) {
      qualityDistribution[i] = performances.filter(p => p.quality === i).length
    }

    return {
      totalCards,
      cardsCompleted,
      averageQuality,
      averageResponseTime,
      accuracyRate,
      sessionDuration,
      cardsPerMinute,
      qualityDistribution
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create a review session with recommended settings
   */
  static createRecommendedSession(
    cards: MemoryCard[],
    userPreferences?: {
      preferredSessionLength?: number
      maxDailyReviews?: number
      difficultyPreference?: 'mixed' | 'easy_first' | 'hard_first'
    }
  ): ReviewSessionConfig {
    const dueCards = SpacedRepetitionService.filterDueCards(cards)
    const strugglingCards = cards.filter(card => card.successRate < 0.5 && card.reviewCount >= 2)

    let sessionType: 'due' | 'practice' | 'cram' = 'due'
    let maxCards = 20

    // Determine session type based on card states
    if (dueCards.length === 0 && strugglingCards.length > 0) {
      sessionType = 'cram'
      maxCards = Math.min(15, strugglingCards.length)
    } else if (dueCards.length === 0) {
      sessionType = 'practice'
      maxCards = 10
    } else {
      sessionType = 'due'
      maxCards = Math.min(25, dueCards.length)
    }

    // Apply user preferences
    if (userPreferences?.preferredSessionLength) {
      maxCards = Math.min(maxCards, userPreferences.preferredSessionLength)
    }

    if (userPreferences?.maxDailyReviews) {
      maxCards = Math.min(maxCards, userPreferences.maxDailyReviews)
    }

    return {
      maxCards,
      sessionType,
      timeLimit: 30, // 30 minutes default
      shuffleCards: true,
      includeOverdue: true
    }
  }
}