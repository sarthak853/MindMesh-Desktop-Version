import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { aiService } from '@/lib/ai/ai-service'
import { DocumentRepository } from '@/lib/repositories/document'
import { AIContext } from '@/types'

const documentRepository = new DocumentRepository()

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      query, 
      mode = 'scholar', 
      documentIds = [], 
      conversationHistory = [],
      currentProject 
    } = body

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Validate mode
    if (!['scholar', 'explorer'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode. Must be "scholar" or "explorer"' }, { status: 400 })
    }

    // Get relevant documents
    let uploadedDocuments = []
    if (documentIds.length > 0) {
      const documents = await Promise.all(
        documentIds.map(async (id: string) => {
          const doc = await documentRepository.findById(id)
          if (doc && doc.userId === user.id) {
            return {
              id: doc.id,
              title: doc.title,
              content: doc.content,
              type: doc.type,
              embeddings: doc.embeddings,
              metadata: doc.metadata,
            }
          }
          return null
        })
      )
      uploadedDocuments = documents.filter(doc => doc !== null)
    } else {
      // If no specific documents provided, get user's recent documents
      const recentDocs = await documentRepository.findByUserId(user.id)
      uploadedDocuments = recentDocs.slice(0, 5).map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        type: doc.type,
        embeddings: doc.embeddings,
        metadata: doc.metadata,
      }))
    }

    // Create AI context
    const context: AIContext = {
      userId: user.id,
      mode: mode as 'scholar' | 'explorer',
      uploadedDocuments,
      conversationHistory: conversationHistory.slice(-10), // Keep last 10 messages
      currentProject,
    }

    // Generate streaming AI response
    const stream = await aiService.generateStreamingResponse(context, query.trim())

    // Return streaming response with proper headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error('Error in streaming AI chat:', error)
    
    // Return error as streaming response
    const errorStream = new ReadableStream({
      start(controller) {
        const errorData = JSON.stringify({
          type: 'error',
          error: 'Failed to generate streaming AI response'
        })
        controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
        controller.close()
      }
    })

    return new Response(errorStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }
}