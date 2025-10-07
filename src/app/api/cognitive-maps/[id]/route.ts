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

    // Try to get from cache first
    const cacheKey = cache.keys.cognitiveMap(mapId)
    const cachedMap = await cache.get(cacheKey)
    
    if (cachedMap) {
      return NextResponse.json({ map: cachedMap })
    }

    const map = await cognitiveMapRepository.findById(mapId)

    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    // Check if user has access to this map
    if (map.userId !== user.id && !map.isPublic) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Cache the result
    await cache.set(cacheKey, map, 1800) // Cache for 30 minutes

    return NextResponse.json({ map })
  } catch (error) {
    console.error('Error fetching cognitive map:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cognitive map' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { title, description, isPublic } = body

    const existingMap = await cognitiveMapRepository.findById(mapId)

    if (!existingMap) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    // Check if user owns this map
    if (existingMap.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updatedMap = await cognitiveMapRepository.update(mapId, {
      title: title?.trim(),
      description: description?.trim(),
      isPublic,
    })

    // Clear caches
    await cache.del(cache.keys.cognitiveMap(mapId))
    await cache.del(cache.keys.userMaps(user.id))

    return NextResponse.json({ map: updatedMap })
  } catch (error) {
    console.error('Error updating cognitive map:', error)
    return NextResponse.json(
      { error: 'Failed to update cognitive map' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mapId = params.id

    const existingMap = await cognitiveMapRepository.findById(mapId)

    if (!existingMap) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 })
    }

    // Check if user owns this map
    if (existingMap.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await cognitiveMapRepository.delete(mapId)

    // Clear caches
    await cache.del(cache.keys.cognitiveMap(mapId))
    await cache.del(cache.keys.userMaps(user.id))

    return NextResponse.json({ message: 'Map deleted successfully' })
  } catch (error) {
    console.error('Error deleting cognitive map:', error)
    return NextResponse.json(
      { error: 'Failed to delete cognitive map' },
      { status: 500 }
    )
  }
}