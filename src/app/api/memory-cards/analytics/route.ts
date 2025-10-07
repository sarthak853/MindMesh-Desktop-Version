import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { MemoryCardRepository } from '@/lib/repositories/memory-card'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'

    let analytics

    switch (type) {
      case 'overview':
        analytics = await getOverviewAnalytics(user.id)
        break
      
      case 'tags':
        analytics = await getTagAnalytics(user.id)
        break
      
      case 'difficulty':
        analytics = await getDifficultyAnalytics(user.id)
        break
      
      case 'progress':
        analytics = await getProgressAnalytics(user.id)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        )
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error fetching memory card analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

async function getOverviewAnalytics(userId: string) {
  const memoryCardRepository = new MemoryCardRepository()
  const [statistics, allTags] = await Promise.all([
    memoryCardRepository.getStatistics(userId),
    memoryCardRepository.getAllTags(userId)
  ])

  return {
    type: 'overview',
    statistics,
    totalTags: allTags.length,
    tags: allTags
  }
}

async function getTagAnalytics(userId: string) {
  const memoryCardRepository = new MemoryCardRepository()
  const tagStats = await memoryCardRepository.getTagStatistics(userId)
  
  return {
    type: 'tags',
    tagStatistics: tagStats,
    totalTags: tagStats.length,
    mostUsedTag: tagStats[0]?.tag || null,
    leastUsedTag: tagStats[tagStats.length - 1]?.tag || null
  }
}

async function getDifficultyAnalytics(userId: string) {
  const memoryCardRepository = new MemoryCardRepository()
  const cards = await memoryCardRepository.findByUserId(userId)
  
  const difficultyStats = {
    1: { count: 0, totalSuccessRate: 0 },
    2: { count: 0, totalSuccessRate: 0 },
    3: { count: 0, totalSuccessRate: 0 },
    4: { count: 0, totalSuccessRate: 0 },
    5: { count: 0, totalSuccessRate: 0 }
  }

  cards.forEach(card => {
    const difficulty = card.difficulty as keyof typeof difficultyStats
    if (difficultyStats[difficulty]) {
      difficultyStats[difficulty].count++
      difficultyStats[difficulty].totalSuccessRate += card.successRate
    }
  })

  const difficultyBreakdown = Object.entries(difficultyStats).map(([level, stats]) => ({
    difficulty: parseInt(level),
    count: stats.count,
    averageSuccessRate: stats.count > 0 ? stats.totalSuccessRate / stats.count : 0,
    percentage: cards.length > 0 ? (stats.count / cards.length) * 100 : 0
  }))

  return {
    type: 'difficulty',
    difficultyBreakdown,
    totalCards: cards.length,
    averageDifficulty: cards.length > 0 
      ? cards.reduce((sum, card) => sum + card.difficulty, 0) / cards.length 
      : 0
  }
}

async function getProgressAnalytics(userId: string) {
  const memoryCardRepository = new MemoryCardRepository()
  const cards = await memoryCardRepository.findByUserId(userId)
  const now = new Date()
  
  // Calculate various progress metrics
  const dueCards = cards.filter(card => new Date(card.nextReview) <= now)
  const overdueCards = cards.filter(card => new Date(card.nextReview) < new Date(now.getTime() - 24 * 60 * 60 * 1000))
  const masteredCards = cards.filter(card => card.successRate >= 0.8 && card.reviewCount >= 3)
  const strugglingCards = cards.filter(card => card.successRate < 0.5 && card.reviewCount >= 2)
  
  // Calculate review frequency over time (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recentlyReviewedCards = cards.filter(card => 
    card.reviewCount > 0 && new Date(card.updatedAt) >= thirtyDaysAgo
  )

  // Success rate distribution
  const successRateRanges = {
    '0-20%': cards.filter(card => card.successRate < 0.2).length,
    '20-40%': cards.filter(card => card.successRate >= 0.2 && card.successRate < 0.4).length,
    '40-60%': cards.filter(card => card.successRate >= 0.4 && card.successRate < 0.6).length,
    '60-80%': cards.filter(card => card.successRate >= 0.6 && card.successRate < 0.8).length,
    '80-100%': cards.filter(card => card.successRate >= 0.8).length,
  }

  return {
    type: 'progress',
    totalCards: cards.length,
    dueCards: dueCards.length,
    overdueCards: overdueCards.length,
    masteredCards: masteredCards.length,
    strugglingCards: strugglingCards.length,
    recentActivity: {
      cardsReviewedLast30Days: recentlyReviewedCards.length,
      averageReviewsPerCard: cards.length > 0 
        ? cards.reduce((sum, card) => sum + card.reviewCount, 0) / cards.length 
        : 0
    },
    successRateDistribution: successRateRanges,
    recommendations: generateRecommendations(cards, dueCards, overdueCards, masteredCards, strugglingCards)
  }
}

function generateRecommendations(
  allCards: any[],
  dueCards: any[],
  overdueCards: any[],
  masteredCards: any[],
  strugglingCards: any[]
) {
  const recommendations = []

  if (overdueCards.length > 0) {
    recommendations.push({
      type: 'urgent',
      message: `You have ${overdueCards.length} overdue cards that need immediate attention.`,
      action: 'Review overdue cards'
    })
  }

  if (dueCards.length > 5) {
    recommendations.push({
      type: 'review',
      message: `${dueCards.length} cards are due for review today.`,
      action: 'Start review session'
    })
  }

  if (strugglingCards.length > 0) {
    recommendations.push({
      type: 'improvement',
      message: `${strugglingCards.length} cards have low success rates and may need attention.`,
      action: 'Review struggling cards'
    })
  }

  if (masteredCards.length > 0) {
    const masteryPercentage = (masteredCards.length / allCards.length) * 100
    recommendations.push({
      type: 'achievement',
      message: `Great job! You've mastered ${masteredCards.length} cards (${masteryPercentage.toFixed(1)}%).`,
      action: 'Continue the momentum'
    })
  }

  if (allCards.length === 0) {
    recommendations.push({
      type: 'getting-started',
      message: 'Create your first memory cards to start learning!',
      action: 'Create cards'
    })
  }

  return recommendations
}