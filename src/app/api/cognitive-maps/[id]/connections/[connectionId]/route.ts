import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { CognitiveMapRepository } from '@/lib/repositories/cognitive-map'
import { cache } from '@/lib/cache'

const cognitiveMapRepository = new CognitiveMapRepository()

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; connectionId: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mapId = params.id
    const connectionId = params.connectionId
    const body = await request.json()

    // Check if map exists and user has access
    const map = await cognitiveMapRepository.findById(mapId)
    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    if (map.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if connection exists in this map
    const connectionExists = map.connections.some(conn => conn.id === connectionId)
    if (!connectionExists) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const updatedConnection = await cognitiveMapRepository.updateConnection(connectionId, body)

    // Clear map cache
    await cache.del(cache.keys.cognitiveMap(mapId))

    return NextResponse.json({ connection: updatedConnection })
  } catch (error) {
    console.error('Error updating connection:', error)
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; connectionId: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mapId = params.id
    const connectionId = params.connectionId

    // Check if map exists and user has access
    const map = await cognitiveMapRepository.findById(mapId)
    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    if (map.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if connection exists in this map
    const connectionExists = map.connections.some(conn => conn.id === connectionId)
    if (!connectionExists) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    await cognitiveMapRepository.deleteConnection(connectionId)

    // Clear map cache
    await cache.del(cache.keys.cognitiveMap(mapId))

    return NextResponse.json({ message: 'Connection deleted successfully' })
  } catch (error) {
    console.error('Error deleting connection:', error)
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    )
  }
}