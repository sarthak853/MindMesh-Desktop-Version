import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { NotificationService, NotificationPreferences } from '@/lib/notifications/notification-service'

// In production, this would be stored in the database
// For now, we'll use in-memory storage
const userPreferences = new Map<string, NotificationPreferences>()

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user preferences or return defaults
    const preferences = userPreferences.get(user.id) || NotificationService.getDefaultPreferences()

    return NextResponse.json({ preferences })

  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { preferences } = body

    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences are required' },
        { status: 400 }
      )
    }

    // Validate and merge with defaults
    const validatedPreferences = NotificationService.validatePreferences(preferences)

    // Store preferences (in production, save to database)
    userPreferences.set(user.id, validatedPreferences)

    return NextResponse.json({
      preferences: validatedPreferences,
      message: 'Notification preferences updated successfully'
    })

  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
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
    const { action } = body

    switch (action) {
      case 'reset_to_defaults':
        const defaultPreferences = NotificationService.getDefaultPreferences()
        userPreferences.set(user.id, defaultPreferences)
        return NextResponse.json({
          preferences: defaultPreferences,
          message: 'Preferences reset to defaults'
        })

      case 'test_notification':
        // Send a test notification to verify settings
        const testNotification = {
          id: `test_${Date.now()}`,
          userId: user.id,
          type: 'review_reminder' as const,
          title: 'Test Notification',
          message: 'This is a test notification to verify your settings.',
          scheduledFor: new Date(),
          delivered: false,
          dismissed: false,
          priority: 'medium' as const
        }

        // This would trigger the notification system
        return NextResponse.json({
          message: 'Test notification sent',
          notification: testNotification
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error handling notification preferences action:', error)
    return NextResponse.json(
      { error: 'Failed to process preferences action' },
      { status: 500 }
    )
  }
}