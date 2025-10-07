import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { UserRepository } from '@/lib/repositories/user'
import { cache } from '@/lib/cache'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ preferences: user.preferences })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userRepository = new UserRepository()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { preferences } = body

    // Validate preferences structure
    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences format' },
        { status: 400 }
      )
    }

    const updatedUser = await userRepository.updatePreferences(user.id, preferences)

    // Clear user cache
    await cache.del(cache.keys.user(user.id))

    return NextResponse.json({ 
      preferences: updatedUser.preferences,
      message: 'Preferences updated successfully'
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    )
  }
}