import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ReviewSessionManager } from '@/lib/spaced-repetition/review-session-manager'

// Import the active sessions from the main route
// In production, this would be stored in Redis or a database
declare global {
  var activeSessions: Map<string, ReviewSessionManager>
}

// Use globalThis for cross-environment compatibility
const globalRef = globalThis as any
if (!globalRef.activeSessions) {
  globalRef.activeSessions = new Map()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const body = await request.json()
    const { action, quality } = body

    const sessionManager = globalRef.activeSessions.get(sessionId)
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

    let result

    switch (action) {
      case 'submit_review':
        if (typeof quality !== 'number' || quality < 0 || quality > 5) {
          return NextResponse.json(
            { error: 'Quality must be a number between 0 and 5' },
            { status: 400 }
          )
        }

        const performance = sessionManager.submitReview(quality)
        const updatedState = sessionManager.getCurrentState()
        
        result = {
          performance,
          currentCard: updatedState?.currentCard,
          progress: sessionManager.getProgress(),
          isComplete: updatedState?.isComplete,
          statistics: updatedState?.isComplete ? sessionManager.completeSession() : null
        }
        break

      case 'skip_card':
        sessionManager.skipCard()
        const skippedState = sessionManager.getCurrentState()
        
        result = {
          currentCard: skippedState?.currentCard,
          progress: sessionManager.getProgress(),
          isComplete: skippedState?.isComplete,
          statistics: skippedState?.isComplete ? sessionManager.completeSession() : null
        }
        break

      case 'pause_session':
        sessionManager.pauseSession()
        result = {
          message: 'Session paused',
          progress: sessionManager.getProgress()
        }
        break

      case 'resume_session':
        sessionManager.resumeSession()
        result = {
          message: 'Session resumed',
          currentCard: sessionState.currentCard,
          progress: sessionManager.getProgress()
        }
        break

      case 'complete_session':
        const statistics = sessionManager.completeSession()
        globalRef.activeSessions.delete(sessionId)
        
        result = {
          message: 'Session completed',
          statistics
        }
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error handling review session action:', error)
    return NextResponse.json(
      { error: 'Failed to process session action' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    const sessionManager = globalRef.activeSessions.get(sessionId)
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
      performances: sessionState.performances,
      remainingCards: sessionManager.getRemainingCards().length,
      reviewedCards: sessionManager.getReviewedCards().length
    })

  } catch (error) {
    console.error('Error fetching session details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session details' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    const sessionManager = globalRef.activeSessions.get(sessionId)
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

    // Remove session
    globalRef.activeSessions.delete(sessionId)

    return NextResponse.json({
      message: 'Session deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting review session:', error)
    return NextResponse.json(
      { error: 'Failed to delete review session' },
      { status: 500 }
    )
  }
}