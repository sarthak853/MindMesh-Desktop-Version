import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { DocumentRepository } from '@/lib/repositories/document'
import { DocumentAnalyzer } from '@/lib/document-processing/document-analyzer'
import { EmbeddingService } from '@/lib/document-processing/embedding-service'

const documentRepository = new DocumentRepository()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const documentId = params.id
    const body = await request.json()
    const { generateEmbeddings = true, updateMetadata = true } = body

    // Get the document
    const document = await documentRepository.findById(documentId)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Analyze the document
    const analysis = await DocumentAnalyzer.analyzeDocument(document.content)

    // Generate embeddings if requested
    if (generateEmbeddings) {
      try {
        await EmbeddingService.generateDocumentEmbeddings(documentId)
      } catch (error) {
        console.error('Error generating embeddings:', error)
        // Continue even if embeddings fail
      }
    }

    // Update document metadata if requested
    if (updateMetadata) {
      const updatedMetadata = {
        ...document.metadata,
        analysis,
        analyzedAt: new Date(),
      }

      await documentRepository.update(documentId, {
        metadata: updatedMetadata,
      })
    }

    return NextResponse.json({
      analysis,
      message: 'Document analysis completed successfully',
    })

  } catch (error) {
    console.error('Error analyzing document:', error)
    return NextResponse.json(
      { error: 'Failed to analyze document' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const documentId = params.id

    // Get the document
    const document = await documentRepository.findById(documentId)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Return existing analysis if available
    const existingAnalysis = document.metadata?.analysis
    
    if (existingAnalysis) {
      return NextResponse.json({
        analysis: existingAnalysis,
        analyzedAt: document.metadata?.analyzedAt,
        cached: true,
      })
    }

    return NextResponse.json({
      message: 'No analysis available. Use POST to generate analysis.',
      hasAnalysis: false,
    })

  } catch (error) {
    console.error('Error retrieving document analysis:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve document analysis' },
      { status: 500 }
    )
  }
}