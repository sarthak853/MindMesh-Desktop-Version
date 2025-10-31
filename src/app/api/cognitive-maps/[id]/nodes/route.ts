import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { CognitiveMapRepository } from '@/lib/repositories/cognitive-map'
import { cache } from '@/lib/cache'

const cognitiveMapRepository = new CognitiveMapRepository()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mapId = params.id

    // Check if map exists and user has access
    const map = await cognitiveMapRepository.findById(mapId)
    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    if (map.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ nodes: map.nodes })
  } catch (error) {
    console.error('Error fetching nodes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch nodes' },
      { status: 500 }
    )
  }
}

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
    const { type, title, content, positionX, positionY, metadata } = body

    // Validate required fields
    if (!type || !title?.trim() || positionX === undefined || positionY === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, positionX, positionY' },
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

    const node = await cognitiveMapRepository.addNode(mapId, {
      type,
      title: title.trim(),
      content: content?.trim(),
      positionX,
      positionY,
      metadata: metadata || {},
    })

    // Clear map cache
    await cache.del(cache.keys.cognitiveMap(mapId))

    return NextResponse.json({ node }, { status: 201 })
  } catch (error) {
    console.error('Error creating node:', error)
    return NextResponse.json(
      { error: 'Failed to create node' },
      { status: 500 }
    )
  }
}