import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { MemoryCardRepository } from '@/lib/repositories/memory-card'
import { cache } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, cardIds, data } = body

    if (!action || !Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json(
        { error: 'Action and cardIds are required' },
        { status: 400 }
      )
    }

    const memoryCardRepository = new MemoryCardRepository()

    let result

    switch (action) {
      case 'delete':
        await memoryCardRepository.bulkDelete(cardIds, user.id)
        result = { message: `Deleted ${cardIds.length} memory cards` }
        break

      case 'updateTags':
        const { tagsToAdd = [], tagsToRemove = [] } = data || {}
        if (!Array.isArray(tagsToAdd) || !Array.isArray(tagsToRemove)) {
          return NextResponse.json(
            { error: 'tagsToAdd and tagsToRemove must be arrays' },
            { status: 400 }
          )
        }
        
        await memoryCardRepository.bulkUpdateTags(cardIds, user.id, tagsToAdd, tagsToRemove)
        result = { 
          message: `Updated tags for ${cardIds.length} memory cards`,
          tagsAdded: tagsToAdd.length,
          tagsRemoved: tagsToRemove.length
        }
        break

      case 'updateDifficulty':
        const { difficulty } = data || {}
        if (typeof difficulty !== 'number' || difficulty < 1 || difficulty > 5) {
          return NextResponse.json(
            { error: 'Difficulty must be a number between 1 and 5' },
            { status: 400 }
          )
        }

        // Update difficulty for all selected cards
        const updatePromises = cardIds.map(cardId =>
          memoryCardRepository.update(cardId, { difficulty })
        )
        await Promise.all(updatePromises)
        
        result = { message: `Updated difficulty for ${cardIds.length} memory cards` }
        break

      case 'resetProgress':
        // Reset review progress for selected cards
        const resetPromises = cardIds.map(cardId =>
          memoryCardRepository.update(cardId, {
            reviewCount: 0,
            successRate: 0.0,
            nextReview: new Date()
          })
        )
        await Promise.all(resetPromises)
        
        result = { message: `Reset progress for ${cardIds.length} memory cards` }
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    // Clear cache
    await cache.del(cache.keys.memoryCards(user.id))
    await cache.del(cache.keys.dueCards(user.id))

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in bulk memory card operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}

// Bulk create endpoint
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { cards } = body

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        { error: 'Cards array is required' },
        { status: 400 }
      )
    }

    // Validate each card
    for (const card of cards) {
      if (!card.front?.trim() || !card.back?.trim()) {
        return NextResponse.json(
          { error: 'Each card must have front and back content' },
          { status: 400 }
        )
      }
    }

    // Prepare cards for creation
    const cardsToCreate = cards.map(card => ({
      userId: user.id,
      front: card.front.trim(),
      back: card.back.trim(),
      difficulty: Math.max(1, Math.min(5, card.difficulty || 1)),
      nextReview: new Date(),
      reviewCount: 0,
      successRate: 0.0,
      tags: Array.isArray(card.tags) ? card.tags : [],
    }))

    const createdCards = await memoryCardRepository.bulkCreate(cardsToCreate)

    // Clear cache
    await cache.del(cache.keys.memoryCards(user.id))
    await cache.del(cache.keys.dueCards(user.id))

    return NextResponse.json({
      cards: createdCards,
      message: `Created ${createdCards.length} memory cards`,
      stats: {
        cardsCreated: createdCards.length,
        averageDifficulty: createdCards.reduce((sum, card) => sum + card.difficulty, 0) / createdCards.length,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in bulk memory card creation:', error)
    return NextResponse.json(
      { error: 'Failed to create memory cards' },
      { status: 500 }
    )
  }
}