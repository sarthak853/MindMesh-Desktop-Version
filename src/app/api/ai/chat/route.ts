import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { aiService } from '@/lib/ai/ai-service'
import { DocumentRepository } from '@/lib/repositories/document'
import { AIContext } from '@/types'
import { openaiClient } from '@/lib/ai/openai-client'
import { huggingFaceClient } from '@/lib/ai/huggingface-client'
import { bytezClient } from '@/lib/ai/bytez-client'

const documentRepository = new DocumentRepository()

export async function POST(request: NextRequest) {
  try {
    // Check if any AI provider is configured
    const provider = process.env.AI_PROVIDER || 'huggingface'
    let isProviderAvailable = false
    
    if (provider === 'bytez') {
      isProviderAvailable = bytezClient.isAvailable()
    } else if (provider === 'huggingface') {
      isProviderAvailable = huggingFaceClient.isAvailable()
    } else {
      isProviderAvailable = openaiClient.isAvailable()
    }
    
    if (!isProviderAvailable) {
      return NextResponse.json(
        { error: `AI provider (${provider}) not configured. Please check your API key configuration.` },
        { status: 503 }
      )
    }

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

    // Generate AI response
    const response = await aiService.generateResponse(context, query.trim())

    // Analyze citation quality and provide fallback suggestions if needed
    let citationAnalysis = null
    let fallbackResponse = null
    
    if (context.mode === 'scholar' && response.citations) {
      const { CitationService } = await import('@/lib/ai/citation-service')
      
      citationAnalysis = await CitationService.analyzeCitationQuality(
        response.citations,
        uploadedDocuments,
        query.trim()
      )

      // Generate fallback response if sources are insufficient
      if (citationAnalysis.hasInsufficientSources) {
        fallbackResponse = await CitationService.generateFallbackResponse(
          query.trim(),
          uploadedDocuments,
          true
        )
      }
    }

    return NextResponse.json({
      response,
      citationAnalysis,
      fallbackResponse,
      context: {
        mode,
        documentsUsed: uploadedDocuments.length,
        hasConversationHistory: conversationHistory.length > 0,
        sourceQuality: citationAnalysis ? {
          averageConfidence: citationAnalysis.averageConfidence,
          citedSources: citationAnalysis.citedSources,
          totalSources: citationAnalysis.totalSources
        } : null
      }
    })

  } catch (error) {
    const message = (error as any)?.message || 'Failed to generate AI response'
    console.error('Error in AI chat:', message)
    // Map known error messages to HTTP status codes for clearer diagnostics
    let status = 500
    if (message.includes('Unauthorized')) status = 401
    else if (message.includes('Invalid API key')) status = 401
    else if (message.includes('Rate limit')) status = 429
    else if (message.includes('temporarily unavailable')) status = 503
    else if (message.includes('AI provider not configured')) status = 503

    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}