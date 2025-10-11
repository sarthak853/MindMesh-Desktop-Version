import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { aiService } from '@/lib/ai/ai-service'
import { SSRDocumentRepository } from '@/lib/repositories/document-ssr'
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

    const documentRepository = new SSRDocumentRepository()
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
    let generatedCards
    try {
      console.log('Generating memory cards with AI service...')
      generatedCards = await aiService.generateMemoryCards(sourceContent, user.id)
      console.log('AI memory card generation completed successfully')
    } catch (aiError) {
      console.error('AI memory card generation failed, using enhanced fallback:', aiError)
      
      // Enhanced fallback: Create meaningful memory cards from content
      const sentences = sourceContent.split(/[.!?]+/).filter(s => s.trim().length > 20)
      const paragraphs = sourceContent.split(/\n\s*\n/).filter(p => p.trim().length > 50)
      const lines = sourceContent.split('\n').filter(l => l.trim().length > 30 && !l.startsWith('#'))
      
      generatedCards = []
      const maxCards = Math.min(count, 8)
      
      console.log('Creating fallback memory cards from content:', {
        sentences: sentences.length,
        paragraphs: paragraphs.length,
        lines: lines.length,
        maxCards
      })
      
      // Strategy 1: Create definition cards from key sentences
      sentences.slice(0, Math.ceil(maxCards * 0.4)).forEach((sentence, index) => {
        const cleanSentence = sentence.trim()
        if (cleanSentence.length > 30) {
          // Extract key terms (words longer than 4 characters)
          const keyTerms = cleanSentence.split(' ').filter(word => 
            word.length > 4 && 
            !['that', 'with', 'from', 'they', 'this', 'have', 'been', 'will', 'were', 'their'].includes(word.toLowerCase())
          )
          
          if (keyTerms.length > 0) {
            const keyTerm = keyTerms[0]
            generatedCards.push({
              front: `What is ${keyTerm.toLowerCase()}?`,
              back: cleanSentence,
              difficulty: 1,
              tags: [sourceTitle.split(' ')[0] || 'General']
            })
          }
        }
      })
      
      // Strategy 2: Create fill-in-the-blank cards
      sentences.slice(0, Math.ceil(maxCards * 0.3)).forEach((sentence, index) => {
        const cleanSentence = sentence.trim()
        const words = cleanSentence.split(' ')
        
        if (words.length > 6) {
          // Find important words (nouns, adjectives) to blank out
          const importantWords = words.filter(word => 
            word.length > 4 && 
            !['the', 'and', 'that', 'with', 'from', 'they', 'this', 'have', 'been', 'will', 'were'].includes(word.toLowerCase())
          )
          
          if (importantWords.length > 0) {
            const wordToBlank = importantWords[Math.floor(Math.random() * importantWords.length)]
            const questionSentence = cleanSentence.replace(new RegExp(`\\b${wordToBlank}\\b`, 'i'), '____')
            
            generatedCards.push({
              front: `Fill in the blank: ${questionSentence}`,
              back: wordToBlank,
              difficulty: 2,
              tags: [sourceTitle.split(' ')[0] || 'General']
            })
          }
        }
      })
      
      // Strategy 3: Create concept explanation cards
      paragraphs.slice(0, Math.ceil(maxCards * 0.3)).forEach((paragraph, index) => {
        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 10)
        if (sentences.length >= 2) {
          const firstSentence = sentences[0].trim()
          const explanation = sentences.slice(1).join('. ').trim()
          
          if (firstSentence && explanation) {
            generatedCards.push({
              front: `Explain: ${firstSentence}`,
              back: explanation.substring(0, 200) + (explanation.length > 200 ? '...' : ''),
              difficulty: 2,
              tags: [sourceTitle.split(' ')[0] || 'General']
            })
          }
        }
      })
      
      // Fallback: Create basic Q&A cards from lines
      if (generatedCards.length < 2) {
        lines.slice(0, maxCards).forEach((line, index) => {
          const cleanLine = line.trim()
          if (cleanLine.length > 20) {
            generatedCards.push({
              front: `What does this statement mean: "${cleanLine.substring(0, 60)}${cleanLine.length > 60 ? '...' : ''}"?`,
              back: cleanLine,
              difficulty: 1,
              tags: [sourceTitle.split(' ')[0] || 'General']
            })
          }
        })
      }
      
      // Ensure we have at least one card
      if (generatedCards.length === 0) {
        generatedCards.push({
          front: `What is the main topic of this document?`,
          back: sourceTitle || 'Document content',
          difficulty: 1,
          tags: ['General']
        })
      }
      
      console.log('Using enhanced fallback memory cards:', generatedCards.length)
    }

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