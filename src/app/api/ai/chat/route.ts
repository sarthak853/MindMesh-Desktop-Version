import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { aiService } from '@/lib/ai/ai-service'
import { SSRDocumentRepository } from '@/lib/repositories/document-ssr'

const documentRepository = new SSRDocumentRepository()

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, mode = 'scholar', conversationHistory = [] } = body

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    console.log('AI Chat request:', { query, mode, userId: user.id })

    try {
      // Get user's documents for context
      const userDocuments = await documentRepository.findByUserId(user.id)
      console.log(`Found ${userDocuments.length} documents for user context`)
      
      // Create AI context
      const context = {
        userId: user.id,
        mode: mode as 'scholar' | 'explorer',
        uploadedDocuments: userDocuments.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content.substring(0, 2000) // Limit content for context
        })),
        conversationHistory: conversationHistory.slice(-10) // Keep last 10 messages
      }

      // Generate AI response (this now includes fallback handling)
      const response = await aiService.generateResponse(context, query)

      console.log('AI chat response generated successfully')

      return NextResponse.json({
        response: {
          content: response.content,
          citations: response.citations || [],
          confidence: response.confidence || 0.8,
          suggestedActions: response.suggestedActions || [],
          relatedConcepts: response.relatedConcepts || []
        }
      })

    } catch (aiError) {
      console.error('Unexpected AI chat error:', aiError)
      
      // Final fallback if even the AI service fallback fails
      const emergencyFallback = {
        content: `I'm experiencing technical difficulties right now, but I'm still here to help!

🤖 **What I can suggest:**
• Your question "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}" is interesting
• Try exploring your uploaded documents for relevant information
• Consider breaking complex questions into smaller parts
• Use the other features like cognitive maps and memory cards

💡 **Alternative approaches:**
• Create a cognitive map to visualize your thoughts
• Generate memory cards from your documents
• Upload relevant materials to build your knowledge base

I'll be back to full functionality soon. Thanks for your patience!`,
        citations: [],
        confidence: 0.2,
        suggestedActions: [
          'Try again in a moment',
          'Explore your documents',
          'Create a cognitive map',
          'Generate memory cards'
        ],
        relatedConcepts: ['knowledge management', 'learning', 'research']
      }

      return NextResponse.json({ response: emergencyFallback })
    }

  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}