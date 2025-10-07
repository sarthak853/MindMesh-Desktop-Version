import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { aiService } from '@/lib/ai/ai-service'
import { DocumentRepository } from '@/lib/repositories/document'

export async function POST(request: NextRequest) {
  try {
    const documentRepository = new DocumentRepository()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, response, documentIds, citationStyle = 'apa' } = body

    if (!query?.trim() || !response?.trim()) {
      return NextResponse.json(
        { error: 'Query and response are required' },
        { status: 400 }
      )
    }

    // Get user's documents
    let documents = await documentRepository.findByUserId(user.id)

    // Filter to specific documents if provided
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      documents = documents.filter(doc => documentIds.includes(doc.id))
    }

    // Generate citations
    const citations = await CitationService.generateCitations(
      response.trim(),
      query.trim(),
      documents
    )

    // Validate citations
    const validatedCitations = CitationService.validateCitations(citations, documents)

    // Enhanced confidence scoring for each citation
    const enhancedCitations = await Promise.all(
      validatedCitations.map(async (citation) => {
        const document = documents.find(doc => doc.id === citation.documentId)
        if (document) {
          const enhancedConfidence = await CitationService.enhancedConfidenceScoring(
            citation,
            document,
            query.trim(),
            response.trim()
          )
          return { ...citation, confidence: enhancedConfidence }
        }
        return citation
      })
    )

    // Format citations according to requested style
    const formattedCitations = enhancedCitations.map(citation => ({
      ...citation,
      formatted: CitationService.formatCitation(citation, citationStyle),
    }))

    // Analyze citation quality
    const citationAnalysis = await CitationService.analyzeCitationQuality(
      enhancedCitations,
      documents,
      query.trim()
    )

    // Generate fallback response if sources are insufficient
    let fallbackResponse = null
    if (citationAnalysis.hasInsufficientSources) {
      fallbackResponse = await CitationService.generateFallbackResponse(
        query.trim(),
        documents,
        true
      )
    }

    // Track source usage for analytics with enhanced tracking
    for (const citation of enhancedCitations) {
      await CitationService.trackSourceUsage(
        citation.documentId,
        query.trim(),
        citation.excerpt || '',
        citation.confidence,
        citation.excerpt?.startsWith('[Doc:') ? 'explicit' : 'implicit'
      )
    }

    return NextResponse.json({
      citations: formattedCitations,
      citationAnalysis,
      fallbackResponse,
      totalSources: documents.length,
      citedSources: enhancedCitations.length,
      citationStyle,
      query: query.trim(),
      qualityMetrics: {
        averageConfidence: citationAnalysis.averageConfidence,
        hasInsufficientSources: citationAnalysis.hasInsufficientSources,
        sourceUtilization: enhancedCitations.length / documents.length
      }
    })

  } catch (error) {
    console.error('Error generating citations:', error)
    return NextResponse.json(
      { error: 'Failed to generate citations' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    // Get user's documents
    const documents = await documentRepository.findByUserId(user.id)

    // Find relevant sources for the query
    const relevantSources = await CitationService.findRelevantSources(
      query.trim(),
      documents,
      limit
    )

    return NextResponse.json({
      sources: relevantSources,
      query: query.trim(),
      totalDocuments: documents.length,
      relevantSources: relevantSources.length,
    })

  } catch (error) {
    console.error('Error finding relevant sources:', error)
    return NextResponse.json(
      { error: 'Failed to find relevant sources' },
      { status: 500 }
    )
  }
}