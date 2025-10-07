import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { MemoryCardRepository } from '@/lib/repositories/memory-card'
import { SpacedRepetitionService, ReviewPerformance } from '@/lib/spaced-repetition/spaced-repetition-service'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'

    const memoryCardRepository = new MemoryCardRepository()
    const cards = await memoryCardRepository.findByUserId(user.id)
    
    // Mock review history - in production, this would come from a review_history table
    const reviewHistory: ReviewPerformance[] = cards.flatMap(card => {
      const performances: ReviewPerformance[] = []
      const reviewCount = card.reviewCount
      
      // Generate mock review history based on card data
      for (let i = 0; i < reviewCount; i++) {
        const daysAgo = Math.floor(Math.random() * 30) // Random day in last 30 days
        const timestamp = new Date()
        timestamp.setDate(timestamp.getDate() - daysAgo)
        
        performances.push({
          cardId: card.id,
          quality: Math.floor(card.successRate * 5) + Math.floor(Math.random() * 2), // Approximate quality
          responseTime: 3000 + Math.random() * 7000, // 3-10 seconds
          timestamp
        })
      }
      
      return performances
    })

    let analytics

    switch (type) {
      case 'overview':
        analytics = await getSpacedRepetitionOverview(cards, reviewHistory)
        break
      
      case 'retention':
        analytics = SpacedRepetitionService.calculateRetentionMetrics(cards, reviewHistory)
        break
      
      case 'performance':
        analytics = SpacedRepetitionService.analyzePerformance(cards, reviewHistory)
        break
      
      case 'due_cards':
        analytics = await getDueCardsAnalysis(cards)
        break
      
      case 'workload':
        analytics = await getWorkloadProjection(cards)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        )
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error fetching spaced repetition analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, cardId, quality, responseTime } = body

    if (action === 'update_card_review') {
      if (!cardId || typeof quality !== 'number') {
        return NextResponse.json(
          { error: 'Card ID and quality are required' },
          { status: 400 }
        )
      }

      const card = await memoryCardRepository.findById(cardId)
      if (!card || card.userId !== user.id) {
        return NextResponse.json(
          { error: 'Card not found or access denied' },
          { status: 404 }
        )
      }

      const performance: ReviewPerformance = {
        cardId,
        quality: Math.max(0, Math.min(5, quality)),
        responseTime: responseTime || 5000,
        timestamp: new Date()
      }

      const updates = await SpacedRepetitionService.updateCardWithReview(card, performance)
      const updatedCard = await memoryCardRepository.update(cardId, updates)

      return NextResponse.json({
        card: updatedCard,
        nextReview: updates.nextReview,
        performance,
        message: 'Card review updated successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error updating spaced repetition data:', error)
    return NextResponse.json(
      { error: 'Failed to update spaced repetition data' },
      { status: 500 }
    )
  }
}

async function getSpacedRepetitionOverview(cards: any[], reviewHistory: ReviewPerformance[]) {
  const retentionMetrics = SpacedRepetitionService.calculateRetentionMetrics(cards, reviewHistory)
  const performanceAnalysis = SpacedRepetitionService.analyzePerformance(cards, reviewHistory)
  const dueCards = SpacedRepetitionService.filterDueCards(cards)
  
  return {
    type: 'overview',
    retentionMetrics,
    performanceAnalysis,
    dueCards: {
      count: dueCards.length,
      overdue: dueCards.filter(card => new Date(card.nextReview) < new Date()).length
    },
    recommendations: performanceAnalysis.recommendations,
    insights: performanceAnalysis.insights
  }
}

async function getDueCardsAnalysis(cards: any[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const dueCards = SpacedRepetitionService.filterDueCards(cards)
  const overdueCards = cards.filter(card => new Date(card.nextReview) < today)
  const dueTodayCards = cards.filter(card => {
    const reviewDate = new Date(card.nextReview)
    reviewDate.setHours(0, 0, 0, 0)
    return reviewDate.getTime() === today.getTime()
  })

  // Group by difficulty
  const difficultyBreakdown = {
    1: dueCards.filter(card => card.difficulty === 1).length,
    2: dueCards.filter(card => card.difficulty === 2).length,
    3: dueCards.filter(card => card.difficulty === 3).length,
    4: dueCards.filter(card => card.difficulty === 4).length,
    5: dueCards.filter(card => card.difficulty === 5).length,
  }

  // Estimate review time
  const estimatedReviewTime = dueCards.reduce((total, card) => {
    const baseTime = 30 // 30 seconds base
    const difficultyMultiplier = card.difficulty * 0.5
    return total + (baseTime * (1 + difficultyMultiplier))
  }, 0)

  return {
    type: 'due_cards',
    totalDue: dueCards.length,
    overdue: overdueCards.length,
    dueToday: dueTodayCards.length,
    difficultyBreakdown,
    estimatedReviewTime: Math.round(estimatedReviewTime / 60), // in minutes
    priorityCards: dueCards
      .sort((a, b) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime())
      .slice(0, 10)
      .map(card => ({
        id: card.id,
        front: card.front.substring(0, 100),
        difficulty: card.difficulty,
        nextReview: card.nextReview,
        successRate: card.successRate
      }))
  }
}

async function getWorkloadProjection(cards: any[]) {
  const projectedWorkload = SpacedRepetitionService.calculateRetentionMetrics(cards, []).projectedWorkload
  
  // Calculate weekly summary
  const weeklyWorkload = []
  for (let week = 0; week < 4; week++) {
    const weekStart = week * 7
    const weekEnd = weekStart + 7
    const weekCards = projectedWorkload
      .slice(weekStart, weekEnd)
      .reduce((sum, day) => sum + day.cardCount, 0)
    
    weeklyWorkload.push({
      week: week + 1,
      cardCount: weekCards,
      averagePerDay: Math.round(weekCards / 7)
    })
  }

  // Find peak days
  const peakDays = projectedWorkload
    .sort((a, b) => b.cardCount - a.cardCount)
    .slice(0, 5)

  return {
    type: 'workload',
    dailyProjection: projectedWorkload,
    weeklyProjection: weeklyWorkload,
    peakDays,
    totalUpcoming: projectedWorkload.reduce((sum, day) => sum + day.cardCount, 0),
    averageDaily: Math.round(
      projectedWorkload.reduce((sum, day) => sum + day.cardCount, 0) / projectedWorkload.length
    )
  }
}