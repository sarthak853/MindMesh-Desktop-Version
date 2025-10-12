import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { aiService } from '@/lib/ai/ai-service'
import { SSRDocumentRepository } from '@/lib/repositories/document-ssr'
import { CognitiveMapRepository } from '@/lib/repositories/cognitive-map'
import { cache } from '@/lib/cache'

const documentRepository = new SSRDocumentRepository()
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
    console.log('Looking for document:', documentId)
    const document = await documentRepository.findById(documentId)
    if (!document) {
      console.error('Document not found with ID:', documentId)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    if (document.userId !== user.id) {
      console.error('Document access denied. Document user:', document.userId, 'Current user:', user.id)
      return NextResponse.json({ error: 'Access denied to document' }, { status: 403 })
    }

    // Get the cognitive map
    console.log('Looking for cognitive map:', mapId)
    console.log('Current user ID:', user.id)
    
    // Add a small delay to ensure any async operations complete
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const map = await cognitiveMapRepository.findById(mapId)
    if (!map) {
      console.error('Map not found with ID:', mapId)
      console.log('Available maps for user:', user.id)
      try {
        const userMaps = await cognitiveMapRepository.findByUserId(user.id)
        console.log('User maps:', userMaps.map(m => ({ id: m.id, title: m.title, userId: m.userId })))
        
        // Try to find the map in all maps (debug)
        const allMaps = await cognitiveMapRepository.findMany()
        console.log('All maps in system:', allMaps.map(m => ({ id: m.id, title: m.title, userId: m.userId })))
        
        // Check if the map exists but with different user ID
        const mapWithDifferentUser = allMaps.find(m => m.id === mapId)
        if (mapWithDifferentUser) {
          console.error('Map found but with different user ID:', {
            mapId: mapWithDifferentUser.id,
            mapUserId: mapWithDifferentUser.userId,
            currentUserId: user.id
          })
        }
      } catch (mapListError) {
        console.error('Error listing user maps:', mapListError)
      }
      return NextResponse.json({ 
        error: 'Map not found',
        mapId: mapId,
        userId: user.id,
        nodes: [],
        connections: [],
        success: false
      }, { status: 404 })
    }
    if (map.userId !== user.id) {
      console.error('Map access denied. Map user:', map.userId, 'Current user:', user.id)
      return NextResponse.json({ 
        error: 'Access denied to map',
        nodes: [],
        connections: [],
        success: false
      }, { status: 403 })
    }

    console.log('Map found successfully:', map.title)

    // Analyze document and extract concepts
    let analysis
    try {
      console.log('Analyzing document with AI service...')
      analysis = await aiService.analyzeDocument(document)
      console.log('AI analysis completed successfully')
    } catch (aiError) {
      console.error('AI analysis failed, using enhanced fallback:', aiError)
      
      // Enhanced fallback: Create meaningful nodes from document content
      const content = document.content || ''
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
      const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50)
      
      // Extract key concepts more intelligently
      const concepts = []
      
      // Add main document concept
      concepts.push({
        type: 'concept',
        title: document.title || 'Main Topic',
        description: `${document.title}. ${sentences[0] || content.substring(0, 150)}...`,
        relevance: 1.0
      })
      
      // Extract concepts from paragraphs (better than individual words)
      paragraphs.slice(0, Math.min(maxNodes - 1, 4)).forEach((paragraph, index) => {
        const firstSentence = paragraph.split(/[.!?]+/)[0].trim()
        const words = firstSentence.split(/\s+/)
        
        // Find the most significant word/phrase (usually nouns or key terms)
        let conceptTitle = 'Key Concept'
        if (words.length > 3) {
          // Look for capitalized words (proper nouns) or longer words
          const significantWords = words.filter(w => 
            w.length > 4 && (w[0] === w[0].toUpperCase() || w.length > 6)
          )
          if (significantWords.length > 0) {
            conceptTitle = significantWords[0]
          } else {
            // Fallback to the longest word
            conceptTitle = words.reduce((a, b) => a.length > b.length ? a : b)
          }
        }
        
        concepts.push({
          type: 'concept',
          title: conceptTitle.charAt(0).toUpperCase() + conceptTitle.slice(1).toLowerCase(),
          description: firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence,
          relevance: 0.9 - (index * 0.1)
        })
      })
      
      // If we don't have enough concepts from paragraphs, add some from key terms
      if (concepts.length < maxNodes) {
        const keyTerms = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []
        const uniqueTerms = [...new Set(keyTerms)].slice(0, maxNodes - concepts.length)
        
        uniqueTerms.forEach((term, index) => {
          const relatedSentence = sentences.find(s => s.includes(term))
          concepts.push({
            type: 'concept',
            title: term,
            description: relatedSentence ? relatedSentence.substring(0, 100) + '...' : `Key concept: ${term}`,
            relevance: 0.7 - (index * 0.1)
          })
        })
      }
      
      analysis = {
        keyTopics: concepts.slice(0, 5).map(c => c.title),
        summary: sentences[0] || content.substring(0, 200) + '...',
        concepts: concepts,
        suggestedNodes: []
      }
      console.log('Using enhanced fallback analysis with', analysis.concepts.length, 'concepts')
    }
    
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
    
    // Limit connections to avoid too many API calls
    const maxConnections = Math.min(3, Math.floor(nodes.length / 2))
    let connectionsCreated = 0
    
    for (let i = 0; i < nodes.length - 1 && connectionsCreated < maxConnections; i++) {
      for (let j = i + 1; j < nodes.length && connectionsCreated < maxConnections; j++) {
        try {
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
            connectionsCreated++
          }
        } catch (connectionError) {
          console.log('Connection generation failed, creating simple connection:', connectionError.message)
          // Create a simple fallback connection
          const conn = await cognitiveMapRepository.addConnection({
            sourceNodeId: nodes[i].id,
            targetNodeId: nodes[j].id,
            relationshipType: 'relates_to',
            label: 'related',
            strength: 0.5,
          })
          connections.push(conn)
          connectionsCreated++
        }
      }
    }

    // Clear map cache
    await cache.del(cache.keys.cognitiveMap(mapId))

    console.log('Successfully generated', nodes.length, 'nodes and', connections.length, 'connections')

    return NextResponse.json({
      nodes,
      connections,
      analysis: {
        summary: analysis.summary,
        keyTopics: analysis.keyTopics,
      },
      message: `Generated ${nodes.length} nodes and ${connections.length} connections from document`,
      success: true
    })

  } catch (error) {
    console.error('AI node generation error:', error)
    
    // Try to provide a minimal fallback response
    try {
      // At least create one node for the document itself
      const fallbackNode = await cognitiveMapRepository.addNode(mapId, {
        type: 'concept',
        title: document.title || 'Document Concept',
        content: document.content.substring(0, 200) + '...',
        positionX: 200,
        positionY: 200,
        metadata: {
          sourceDocument: document.id,
          relevanceScore: 1.0,
          aiGenerated: false,
          fallback: true,
        },
      })

      console.log('Created fallback node:', fallbackNode.id)

      return NextResponse.json({
        nodes: [fallbackNode],
        connections: [],
        analysis: {
          summary: document.content.substring(0, 200) + '...',
          keyTopics: [document.title || 'Document'],
        },
        message: 'Created basic mindmap node (AI generation failed)',
        success: true,
        fallback: true
      })
    } catch (fallbackError) {
      console.error('Even fallback node creation failed:', fallbackError)
      return NextResponse.json(
        { 
          error: 'Failed to generate nodes from document',
          details: error.message,
          nodes: [],
          connections: [],
          success: false
        },
        { status: 500 }
      )
    }
  }
}