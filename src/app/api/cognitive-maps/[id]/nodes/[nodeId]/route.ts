import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { CognitiveMapRepository } from '@/lib/repositories/cognitive-map'
import { cache } from '@/lib/cache'

const cognitiveMapRepository = new CognitiveMapRepository()

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mapId = params.id
    const nodeId = params.nodeId
    const body = await request.json()

    // Check if map exists and user has access
    const map = await cognitiveMapRepository.findById(mapId)
    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    if (map.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if node exists in this map
    const nodeExists = map.nodes.some(node => node.id === nodeId)
    if (!nodeExists) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }

    const updatedNode = await cognitiveMapRepository.updateNode(nodeId, body)

    // Clear map cache
    await cache.del(cache.keys.cognitiveMap(mapId))

    return NextResponse.json({ node: updatedNode })
  } catch (error) {
    console.error('Error updating node:', error)
    return NextResponse.json(
      { error: 'Failed to update node' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mapId = params.id
    const nodeId = params.nodeId

    // Check if map exists and user has access
    const map = await cognitiveMapRepository.findById(mapId)
    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    if (map.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if node exists in this map
    const nodeExists = map.nodes.some(node => node.id === nodeId)
    if (!nodeExists) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }

    await cognitiveMapRepository.deleteNode(nodeId)

    // Clear map cache
    await cache.del(cache.keys.cognitiveMap(mapId))

    return NextResponse.json({ message: 'Node deleted successfully' })
  } catch (error) {
    console.error('Error deleting node:', error)
    return NextResponse.json(
      { error: 'Failed to delete node' },
      { status: 500 }
    )
  }
}