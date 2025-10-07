import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { SSRMemoryCardRepository } from '@/lib/repositories/memory-card-ssr'
import { ReviewSessionManager, ReviewSessionConfig } from '@/lib/spaced-repetition/review-session-manager'
import { SpacedRepetitionService } from '@/lib/spaced-repetition/spaced-repetition-service'
import { cache } from '@/lib/cache'

// Store active sessions in memory (in production, use Redis or database)
// Use globalThis to persist across hot reloads in development
declare global {
  var reviewSessions: Map<string, ReviewSessionManager> | undefined
}

const activeSessions = globalThis.reviewSessions ?? new Map<string, ReviewSessionManager>()
if (!globalThis.reviewSessions) {
  globalThis.reviewSessions = activeSessions
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      sessionType = 'due',
      maxCards = 20,
      timeLimit,
      shuffleCards = true,
      includeOverdue = true
    } = body

const memoryCardRepository = new SSRMemoryCardRepository()

    // Get user's memory cards
    let cards = await memoryCardRepository.findByUserId(user.id)

    // Fallback: if repo has no cards (e.g., after HMR), try cache
    if (!cards || cards.length === 0) {
      const cached = await cache.get(cache.keys.memoryCards(user.id))
      if (Array.isArray(cached) && cached.length > 0) {
        cards = cached
      }
    }

    if (cards.length === 0) {
      return NextResponse.json(
        { error: 'No memory cards found' },
        { status: 404 }
      )
    }

    // Create session configuration
    const config: ReviewSessionConfig = {
      maxCards,
      sessionType,
      timeLimit,
      shuffleCards,
      includeOverdue
    }

    // Create session manager
    const sessionManager = new ReviewSessionManager(
      config,
      // On card reviewed callback
      async (performance) => {
        try {
          // Update card with spaced repetition algorithm
          const card = cards.find(c => c.id === performance.cardId)
          if (card) {
            const updates = await SpacedRepetitionService.updateCardWithReview(card, performance)
            await memoryCardRepository.update(card.id, updates)
          }
        } catch (error) {
          console.error('Error updating card after review:', error)
        }
      },
      // On session complete callback
      async (statistics) => {
        // Clear cache after session completion
        await cache.del(cache.keys.memoryCards(user.id))
        await cache.del(cache.keys.dueCards(user.id))
      }
    )

    // Start the session
    const sessionState = sessionManager.startSession(user.id, cards)

    // Store session manager
    activeSessions.set(sessionState.session.id, sessionManager)

    // Clean up old sessions (older than 2 hours)
    cleanupOldSessions()

    return NextResponse.json({
      sessionId: sessionState.session.id,
      session: sessionState.session,
      currentCard: sessionState.currentCard,
      progress: sessionManager.getProgress(),
      totalCards: sessionState.cards.length
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating review session:', error)
    return NextResponse.json(
      { error: 'Failed to create review session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const sessionManager = activeSessions.get(sessionId)
    if (!sessionManager) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      )
    }

    const sessionState = sessionManager.getCurrentState()
    if (!sessionState || sessionState.session.userId !== user.id) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      session: sessionState.session,
      currentCard: sessionState.currentCard,
      progress: sessionManager.getProgress(),
      isComplete: sessionState.isComplete,
      remainingCards: sessionManager.getRemainingCards().length
    })

  } catch (error) {
    console.error('Error fetching review session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch review session' },
      { status: 500 }
    )
  }
}

// Clean up sessions older than 2 hours
function cleanupOldSessions() {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
  
  for (const [sessionId, manager] of activeSessions.entries()) {
    const state = manager.getCurrentState()
    if (state && state.startTime.getTime() < twoHoursAgo) {
      activeSessions.delete(sessionId)
    }
  }
}