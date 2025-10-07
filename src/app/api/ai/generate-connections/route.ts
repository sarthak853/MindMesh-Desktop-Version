import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { aiService } from '@/lib/ai/ai-service'
import { CognitiveMapRepository } from '@/lib/repositories/cognitive-map'
import { cache } from '@/lib/cache'

const cognitiveMapRepository = new CognitiveMapRepository()

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mapId, nodeIds, minStrength = 6 } = body

    if (!mapId) {
      return NextResponse.json({ error: 'Map ID is required' }, { status: 400 })
    }

    // Get the cognitive map
    const map = await cognitiveMapRepository.findById(mapId)
    if (!map || map.userId !== user.id) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    // Get nodes to analyze
    let nodesToAnalyze = map.nodes
    if (nodeIds && Array.isArray(nodeIds) && nodeIds.length > 0) {
      nodesToAnalyze = map.nodes.filter(node => nodeIds.includes(node.id))
    }

    if (nodesToAnalyze.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 nodes are required to generate connections' },
        { status: 400 }
      )
    }

    const connections = []
    const existingConnections = new Set(
      map.connections.map(conn => `${conn.sourceNodeId}-${conn.targetNodeId}`)
    )

    // Generate connections between all pairs of nodes
    for (let i = 0; i < nodesToAnalyze.length - 1; i++) {
      for (let j = i + 1; j < nodesToAnalyze.length; j++) {
        const node1 = nodesToAnalyze[i]
        const node2 = nodesToAnalyze[j]
        
        // Skip if connection already exists
        const connectionKey1 = `${node1.id}-${node2.id}`
        const connectionKey2 = `${node2.id}-${node1.id}`
        
        if (existingConnections.has(connectionKey1) || existingConnections.has(connectionKey2)) {
          continue
        }

        try {
          const suggestion = await aiService.suggestConnections(
            `${node1.title}: ${node1.content}`,
            `${node2.title}: ${node2.content}`
          )

          if (suggestion && suggestion.strength >= minStrength) {
            const connection = await cognitiveMapRepository.addConnection({
              sourceNodeId: node1.id,
              targetNodeId: node2.id,
              relationshipType: suggestion.relationshipType,
              label: suggestion.label,
              strength: suggestion.strength / 10,
            })

            connections.push({
              ...connection,
              explanation: suggestion.explanation,
            })

            // Add to existing connections set to avoid duplicates
            existingConnections.add(connectionKey1)
          }
        } catch (error) {
          console.warn(`Failed to generate connection between ${node1.title} and ${node2.title}:`, error)
        }
      }
    }

    // Clear map cache
    await cache.del(cache.keys.cognitiveMap(mapId))

    return NextResponse.json({
      connections,
      message: `Generated ${connections.length} new connections`,
      stats: {
        nodesAnalyzed: nodesToAnalyze.length,
        connectionsGenerated: connections.length,
        minStrength: minStrength,
      }
    })

  } catch (error) {
    console.error('AI connection generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate connections' },
      { status: 500 }
    )
  }
}