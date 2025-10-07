import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, updateUserProfile, logSecurityEvent } from '@/lib/auth'
import { UserRepository } from '@/lib/repositories/user'
import { cache } from '@/lib/cache'
import { ActivityRepository } from '@/lib/repositories/activity'

const activityRepository = new ActivityRepository()

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
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
    const { name, avatarUrl, preferences } = body

    // Use the enhanced updateUserProfile function
    await updateUserProfile(user.id, {
      name,
      avatarUrl,
      preferences,
    })

    // Get the updated user
    const updatedUser = await userRepository.findById(user.id)

    // Log the profile update activity
    await activityRepository.logActivity(
      user.id,
      'profile_updated',
      'user',
      user.id,
      {
        updatedFields: Object.keys(body),
        timestamp: new Date().toISOString(),
      }
    )

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user profile:', error)
    
    // Log security event for failed profile update
    await logSecurityEvent(
      user?.id || null,
      'profile_update_failed',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      request.ip,
      request.headers.get('user-agent')
    )

    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    )
  }
}