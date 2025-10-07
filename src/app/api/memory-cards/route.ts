import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { SSRMemoryCardRepository } from '@/lib/repositories/memory-card-ssr'
import { cache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const dueOnly = searchParams.get('dueOnly') === 'true'

    const memoryCardRepository = new SSRMemoryCardRepository()

    // Try to get from cache first
    const cacheKey = cache.keys.memoryCards(user.id)
    let cards = await cache.get(cacheKey)

    if (!cards) {
      if (dueOnly) {
        cards = await memoryCardRepository.findDueCards(user.id)
      } else if (tags && tags.length > 0) {
        cards = await memoryCardRepository.findByTags(user.id, tags)
      } else {
        cards = await memoryCardRepository.findByUserId(user.id)
      }

      // Cache the results
      await cache.set(cacheKey, cards, 1800) // Cache for 30 minutes
    }

    // Apply pagination
    const paginatedCards = cards.slice(offset, offset + limit)

    // Get statistics
    const stats = await memoryCardRepository.getStatistics(user.id)

    return NextResponse.json({
      cards: paginatedCards,
      pagination: {
        limit,
        offset,
        total: cards.length,
        hasMore: offset + limit < cards.length,
      },
      statistics: stats,
    })

  } catch (error) {
    console.error('Error fetching memory cards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memory cards' },
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
    const { front, back, tags = [], difficulty = 1 } = body

    if (!front?.trim() || !back?.trim()) {
      return NextResponse.json(
        { error: 'Front and back content are required' },
        { status: 400 }
      )
    }

    const memoryCardRepository = new SSRMemoryCardRepository()

    const card = await memoryCardRepository.create({
      userId: user.id,
      front: front.trim(),
      back: back.trim(),
      difficulty: Math.max(1, Math.min(5, difficulty)),
      nextReview: new Date(),
      reviewCount: 0,
      successRate: 0.0,
      tags: Array.isArray(tags) ? tags : [],
    })

    // Clear cache
    await cache.del(cache.keys.memoryCards(user.id))

    return NextResponse.json({ card }, { status: 201 })

  } catch (error) {
    console.error('Error creating memory card:', error)
    return NextResponse.json(
      { error: 'Failed to create memory card' },
      { status: 500 }
    )
  }
}