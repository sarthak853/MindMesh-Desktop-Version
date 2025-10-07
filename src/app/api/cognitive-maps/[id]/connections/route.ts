import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { CognitiveMapRepository } from '@/lib/repositories/cognitive-map'
import { cache } from '@/lib/cache'

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

    const mapId = params.id
    const body = await request.json()
    const { sourceNodeId, targetNodeId, relationshipType, label, strength } = body

    // Validate required fields
    if (!sourceNodeId || !targetNodeId) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceNodeId, targetNodeId' },
        { status: 400 }
      )
    }

    if (sourceNodeId === targetNodeId) {
      return NextResponse.json(
        { error: 'Cannot connect a node to itself' },
        { status: 400 }
      )
    }

    // Check if map exists and user has access
    const map = await cognitiveMapRepository.findById(mapId)
    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    if (map.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if both nodes exist in this map
    const sourceNodeExists = map.nodes.some(node => node.id === sourceNodeId)
    const targetNodeExists = map.nodes.some(node => node.id === targetNodeId)

    if (!sourceNodeExists || !targetNodeExists) {
      return NextResponse.json(
        { error: 'One or both nodes not found in this map' },
        { status: 404 }
      )
    }

    // Check if connection already exists
    const connectionExists = map.connections.some(
      conn => conn.sourceNodeId === sourceNodeId && conn.targetNodeId === targetNodeId
    )

    if (connectionExists) {
      return NextResponse.json(
        { error: 'Connection already exists between these nodes' },
        { status: 409 }
      )
    }

    const connection = await cognitiveMapRepository.addConnection({
      sourceNodeId,
      targetNodeId,
      relationshipType: relationshipType || 'related',
      label: label?.trim(),
      strength: strength || 1.0,
    })

    // Clear map cache
    await cache.del(cache.keys.cognitiveMap(mapId))

    return NextResponse.json({ connection }, { status: 201 })
  } catch (error) {
    console.error('Error creating connection:', error)
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    )
  }
}