import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { CognitiveMapRepository } from '@/lib/repositories/cognitive-map'
import { cache } from '@/lib/cache'

const cognitiveMapRepository = new CognitiveMapRepository()

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to get from cache first
    const cacheKey = cache.keys.userMaps(user.id)
    const cachedMaps = await cache.get(cacheKey)
    
    if (cachedMaps) {
      return NextResponse.json({ maps: cachedMaps })
    }

    const maps = await cognitiveMapRepository.findByUserId(user.id)
    
    // Cache the results
    await cache.set(cacheKey, maps, 1800) // Cache for 30 minutes

    return NextResponse.json({ maps })
  } catch (error) {
    console.error('Error fetching cognitive maps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cognitive maps' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, isPublic } = body

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const map = await cognitiveMapRepository.create({
      userId: user.id,
      title: title.trim(),
      description: description?.trim(),
      isPublic: isPublic || false,
    })

    // Clear user maps cache
    await cache.del(cache.keys.userMaps(user.id))

    return NextResponse.json({ map }, { status: 201 })
  } catch (error) {
    console.error('Error creating cognitive map:', error)
    return NextResponse.json(
      { error: 'Failed to create cognitive map' },
      { status: 500 }
    )
  }
}