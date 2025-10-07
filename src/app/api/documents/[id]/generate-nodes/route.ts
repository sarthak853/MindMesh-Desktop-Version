import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { DocumentRepository } from '@/lib/repositories/document'
import { CognitiveMapRepository } from '@/lib/repositories/cognitive-map'
import { aiService } from '@/lib/ai/ai-service'
import { cache } from '@/lib/cache'

const documentRepository = new DocumentRepository()
const cognitiveMapRepository = new CognitiveMapRepository()
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
    const { mapId } = body

    if (!mapId) {
      return NextResponse.json({ error: 'Map ID is required' }, { status: 400 })
    }

    // Get the document
    const document = await documentRepository.findById(documentId)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the cognitive map
    const map = await cognitiveMapRepository.findById(mapId)
    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    if (map.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate nodes from document content
    const nodes = await generateNodesFromDocument(document, map)

    // Clear map cache
    await cache.del(cache.keys.cognitiveMap(mapId))

    return NextResponse.json({ 
      nodes,
      message: `Generated ${nodes.length} nodes from document`
    })

  } catch (error) {
    console.error('Error generating nodes from document:', error)
    return NextResponse.json(
      { error: 'Failed to generate nodes from document' },
      { status: 500 }
    )
  }
}

async function generateNodesFromDocument(document: any, map: any) {
  const nodes = []
  
  // Simple content analysis to create nodes
  // In a real implementation, this would use AI to analyze content and extract key concepts
  
  // Create a main document node
  const documentNode = await cognitiveMapRepository.addNode(map.id, {
    type: 'article',
    title: document.title,
    content: document.content.substring(0, 200) + (document.content.length > 200 ? '...' : ''),
    positionX: Math.random() * 400 + 100,
    positionY: Math.random() * 300 + 100,
    metadata: {
      documentId: document.id,
      source: 'document',
      originalUrl: document.metadata?.url,
    },
  })
  
  nodes.push(documentNode)

  // Extract key concepts (simplified approach)
  const content = document.content.toLowerCase()
  const keyPhrases = extractKeyPhrases(content)
  
  // Create concept nodes for key phrases
  for (let i = 0; i < Math.min(keyPhrases.length, 5); i++) {
    const phrase = keyPhrases[i]
    
    const conceptNode = await cognitiveMapRepository.addNode(map.id, {
      type: 'concept',
      title: phrase.charAt(0).toUpperCase() + phrase.slice(1),
      content: `Key concept extracted from: ${document.title}`,
      positionX: Math.random() * 400 + 100,
      positionY: Math.random() * 300 + 100,
      metadata: {
        extractedFrom: document.id,
        source: 'auto-generated',
      },
    })
    
    nodes.push(conceptNode)
    
    // Create connection between document and concept
    await cognitiveMapRepository.addConnection({
      sourceNodeId: documentNode.id,
      targetNodeId: conceptNode.id,
      relationshipType: 'contains',
      label: 'mentions',
      strength: 0.8,
    })
  }

  return nodes
}

function extractKeyPhrases(content: string): string[] {
  // Very simple key phrase extraction
  // In a real implementation, you'd use NLP libraries or AI services
  
  const words = content
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !isStopWord(word))
  
  // Count word frequency
  const wordCount: { [key: string]: number } = {}
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1
  })
  
  // Get most frequent words
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word)
}

function isStopWord(word: string): boolean {
  const stopWords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'can', 'shall', 'from', 'up', 'out', 'down', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
  ]
  
  return stopWords.includes(word.toLowerCase())
}