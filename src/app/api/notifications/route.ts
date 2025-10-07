import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { MemoryCardRepository } from '@/lib/repositories/memory-card'
import { NotificationService, NotificationPreferences } from '@/lib/notifications/notification-service'
import { NotificationManager } from '@/lib/notifications/notification-manager'
import { SpacedRepetitionService } from '@/lib/spaced-repetition/spaced-repetition-service'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    const notificationManager = NotificationManager.getInstance()
    const notifications = notificationManager.getNotifications(user.id)

    let result
    switch (type) {
      case 'pending':
        result = { notifications: notifications.pending }
        break
      case 'delivered':
        result = { notifications: notifications.delivered.filter(n => !n.dismissed) }
        break
      case 'dismissed':
        result = { notifications: notifications.dismissed }
        break
      case 'unread_count':
        result = { count: notificationManager.getUnreadCount(user.id) }
        break
      default:
        result = {
          pending: notifications.pending,
          delivered: notifications.delivered.filter(n => !n.dismissed),
          dismissed: notifications.dismissed.slice(0, 20), // Last 20 dismissed
          unreadCount: notificationManager.getUnreadCount(user.id)
        }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
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
    const { action, notificationId, snoozeMinutes } = body

    const notificationManager = NotificationManager.getInstance()

    switch (action) {
      case 'dismiss':
        if (!notificationId) {
          return NextResponse.json(
            { error: 'Notification ID is required for dismiss action' },
            { status: 400 }
          )
        }
        notificationManager.dismissNotification(user.id, notificationId)
        return NextResponse.json({ message: 'Notification dismissed' })

      case 'snooze':
        if (!notificationId) {
          return NextResponse.json(
            { error: 'Notification ID is required for snooze action' },
            { status: 400 }
          )
        }
        notificationManager.snoozeNotification(user.id, notificationId, snoozeMinutes || 60)
        return NextResponse.json({ message: 'Notification snoozed' })

      case 'generate_review_reminders':
        await generateReviewReminders(user.id)
        return NextResponse.json({ message: 'Review reminders generated' })

      case 'generate_reflection_prompts':
        await generateReflectionPrompts(user.id)
        return NextResponse.json({ message: 'Reflection prompts generated' })

      case 'clear_all':
        notificationManager.clearAllNotifications(user.id)
        return NextResponse.json({ message: 'All notifications cleared' })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error handling notification action:', error)
    return NextResponse.json(
      { error: 'Failed to process notification action' },
      { status: 500 }
    )
  }
}

async function generateReviewReminders(userId: string) {
  try {
    const memoryCardRepository = new MemoryCardRepository()
    
    // Get user's memory cards
    const cards = await memoryCardRepository.findByUserId(userId)
    
    // Get user preferences (in production, this would come from user settings)
    const preferences = NotificationService.getDefaultPreferences()
    
    // Generate review reminders
    const reminders = NotificationService.generateReviewReminders(userId, cards, preferences)
    
    // Add to notification queue
    const notificationManager = NotificationManager.getInstance()
    notificationManager.addNotifications(userId, reminders)
    
    return reminders
  } catch (error) {
    console.error('Error generating review reminders:', error)
    throw error
  }
}

async function generateReflectionPrompts(userId: string) {
  try {
    const memoryCardRepository = new MemoryCardRepository()
    
    // Get user's learning data
    const cards = await memoryCardRepository.findByUserId(userId)
    const statistics = await memoryCardRepository.getStatistics(userId)
    
    // Mock recent sessions data (in production, this would come from session history)
    const recentSessions = [] // Would fetch from session history
    
    const learningData = {
      cards,
      recentSessions,
      streakDays: 0, // Would calculate from review history
      averageSuccessRate: statistics.averageSuccessRate
    }
    
    // Get user preferences
    const preferences = NotificationService.getDefaultPreferences()
    
    // Generate reflection prompts
    const prompts = NotificationService.generateReflectionPrompts(userId, preferences, learningData)
    
    // Add to notification queue
    const notificationManager = NotificationManager.getInstance()
    notificationManager.addNotifications(userId, prompts)
    
    return prompts
  } catch (error) {
    console.error('Error generating reflection prompts:', error)
    throw error
  }
}