import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { aiService } from '@/lib/ai/ai-service'
import { DocumentRepository } from '@/lib/repositories/document'
import { CognitiveMapRepository } from '@/lib/repositories/cognitive-map'
import { cache } from '@/lib/cache'

const documentRepository = new DocumentRepository()
const cognitiveMapRepository = new CognitiveMapRepository()

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { documentId, mapId, maxNodes = 5 } = body

    if (!documentId || !mapId) {
      return NextResponse.json(
        { error: 'Document ID and Map ID are required' },
        { status: 400 }
      )
    }

    // Get the document
    const document = await documentRepository.findById(documentId)
    if (!document || document.userId !== user.id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get the cognitive map
    const map = await cognitiveMapRepository.findById(mapId)
    if (!map || map.userId !== user.id) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    // Analyze document and extract concepts
    const analysis = await aiService.analyzeDocument(document)
    
    // Create nodes from the extracted concepts
    const nodes = []
    const concepts = analysis.concepts.slice(0, maxNodes)
    
    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i]
      
      const node = await cognitiveMapRepository.addNode(mapId, {
        type: concept.type === 'person' ? 'concept' : 
              concept.type === 'method' ? 'concept' : 
              concept.type === 'theory' ? 'concept' : 'concept',
        title: concept.title,
        content: concept.description,
        positionX: 100 + (i % 3) * 200,
        positionY: 100 + Math.floor(i / 3) * 150,
        metadata: {
          sourceDocument: document.id,
          relevanceScore: concept.relevance,
          aiGenerated: true,
          conceptType: concept.type,
        },
      })
      
      nodes.push(node)
    }

    // Create connections between related concepts
    const connections = []
    for (let i = 0; i < nodes.length - 1; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const connection = await aiService.suggestConnections(
          nodes[i].title,
          nodes[j].title
        )
        
        if (connection && connection.strength > 6) {
          const conn = await cognitiveMapRepository.addConnection({
            sourceNodeId: nodes[i].id,
            targetNodeId: nodes[j].id,
            relationshipType: connection.relationshipType,
            label: connection.label,
            strength: connection.strength / 10,
          })
          connections.push(conn)
        }
      }
    }

    // Clear map cache
    await cache.del(cache.keys.cognitiveMap(mapId))

    return NextResponse.json({
      nodes,
      connections,
      analysis: {
        summary: analysis.summary,
        keyTopics: analysis.keyTopics,
      },
      message: `Generated ${nodes.length} nodes and ${connections.length} connections from document`
    })

  } catch (error) {
    console.error('AI node generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate nodes from document' },
      { status: 500 }
    )
  }
}