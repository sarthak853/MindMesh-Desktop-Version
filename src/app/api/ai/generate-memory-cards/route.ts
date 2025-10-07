import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { aiService } from '@/lib/ai/ai-service'
import { DocumentRepository } from '@/lib/repositories/document'
import { MemoryCardRepository } from '@/lib/repositories/memory-card'
import { cache } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { documentId, nodeContent, customContent, count = 5 } = body

    if (!documentId && !nodeContent && !customContent) {
      return NextResponse.json(
        { error: 'Document ID, node content, or custom content is required' },
        { status: 400 }
      )
    }

    const documentRepository = new DocumentRepository()
    const memoryCardRepository = new MemoryCardRepository()

    let sourceContent = ''
    let sourceTitle = 'Custom Content'

    if (documentId) {
      const document = await documentRepository.findById(documentId)
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      if (document.userId !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      sourceContent = document.content
      sourceTitle = document.title
    } else if (nodeContent) {
      sourceContent = nodeContent
      sourceTitle = 'Cognitive Map Node'
    } else {
      sourceContent = customContent
    }

    // Generate memory cards using AI
    const generatedCards = await generateMemoryCards(sourceContent, count)

    // Save the generated cards
    const memoryCards = []
    for (const cardData of generatedCards) {
      const card = await memoryCardRepository.create({
        userId: user.id,
        front: cardData.front,
        back: cardData.back,
        difficulty: cardData.difficulty || 1,
        nextReview: new Date(), // Available for immediate review
        tags: cardData.tags || [],
      })
      memoryCards.push(card)
    }

    // Clear user memory cards cache
    await cache.del(cache.keys.memoryCards(user.id))
    await cache.del(cache.keys.dueCards(user.id))

    return NextResponse.json({
      memoryCards,
      message: `Generated ${memoryCards.length} memory cards from ${sourceTitle}`,
      stats: {
        cardsGenerated: memoryCards.length,
        sourceType: documentId ? 'document' : nodeContent ? 'node' : 'custom',
        averageDifficulty: memoryCards.reduce((sum, card) => sum + card.difficulty, 0) / memoryCards.length,
      }
    })

  } catch (error) {
    console.error('AI memory card generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate memory cards' },
      { status: 500 }
    )
  }
}