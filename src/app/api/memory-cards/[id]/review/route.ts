import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { SSRMemoryCardRepository } from '@/lib/repositories/memory-card-ssr'
import { SpacedRepetitionService } from '@/lib/spaced-repetition/spaced-repetition-service'
import { cache } from '@/lib/cache'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { quality, responseTime } = await request.json()

    if (typeof quality !== 'number' || quality < 0 || quality > 5) {
      return NextResponse.json(
        { error: 'Quality must be a number between 0 and 5' },
        { status: 400 }
      )
    }

    // Use SSR repository for web/SSR mode to avoid Electron DB dependency
    const memoryCardRepository = new SSRMemoryCardRepository()

    // Get the memory card
    const { id } = await params
    const card = await memoryCardRepository.findById(id)
    
    if (!card || card.userId !== user.id) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Create review performance record
    const performance = {
      cardId: card.id,
      quality,
      responseTime: responseTime || 0,
      timestamp: new Date()
    }

    // Calculate spaced repetition updates
    const updates = await SpacedRepetitionService.updateCardWithReview(card, performance)

    // Update the card in database
    const updatedCard = await memoryCardRepository.update(card.id, {
      ...updates,
      // Keep metadata as an object for SSR repository
      metadata: updates.metadata
    })

    // Clear cache
    await cache.del(cache.keys.memoryCards(user.id))

    return NextResponse.json({
      card: {
        ...updatedCard,
        metadata: updatedCard.metadata
      },
      performance
    })

  } catch (error) {
    console.error('Error reviewing memory card:', error)
    return NextResponse.json(
      { error: 'Failed to review memory card' },
      { status: 500 }
    )
  }
}