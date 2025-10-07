import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { MemoryCardRepository } from '@/lib/repositories/memory-card'
import { cache } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memoryCardRepository = new MemoryCardRepository()
    const { id: cardId } = await params
    const card = await memoryCardRepository.findById(cardId)

    if (!card) {
      return NextResponse.json({ error: 'Memory card not found' }, { status: 404 })
    }

    if (card.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ card })

  } catch (error) {
    console.error('Error fetching memory card:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memory card' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: cardId } = await params
    const body = await request.json()

    const existingCard = await memoryCardRepository.findById(cardId)

    if (!existingCard) {
      return NextResponse.json({ error: 'Memory card not found' }, { status: 404 })
    }

    if (existingCard.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updatedCard = await memoryCardRepository.update(cardId, body)

    // Clear cache
    await cache.del(cache.keys.memoryCards(user.id))

    return NextResponse.json({ card: updatedCard })

  } catch (error) {
    console.error('Error updating memory card:', error)
    return NextResponse.json(
      { error: 'Failed to update memory card' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: cardId } = await params

    const memoryCardRepository = new MemoryCardRepository()
    const existingCard = await memoryCardRepository.findById(cardId)

    if (!existingCard) {
      return NextResponse.json({ error: 'Memory card not found' }, { status: 404 })
    }

    if (existingCard.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await memoryCardRepository.delete(cardId)

    // Clear cache
    await cache.del(cache.keys.memoryCards(user.id))

    return NextResponse.json({ message: 'Memory card deleted successfully' })

  } catch (error) {
    console.error('Error deleting memory card:', error)
    return NextResponse.json(
      { error: 'Failed to delete memory card' },
      { status: 500 }
    )
  }
}