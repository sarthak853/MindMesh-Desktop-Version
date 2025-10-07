import { MemoryCard } from '@/types'

export interface NotificationPreferences {
  reviewReminders: {
    enabled: boolean
    frequency: 'immediate' | 'daily' | 'twice_daily' | 'custom'
    customTimes?: string[] // HH:MM format
    advanceNotice: number // minutes before due
    maxDailyNotifications: number
  }
  reflectionPrompts: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly'
    preferredTime: string // HH:MM format
    weekdays: number[] // 0-6, Sunday = 0
    promptTypes: ('progress' | 'insights' | 'goals' | 'challenges')[]
  }
  achievements: {
    enabled: boolean
    streakMilestones: boolean
    masteryNotifications: boolean
    progressMilestones: boolean
  }
  delivery: {
    methods: ('browser' | 'email' | 'push')[]
    quietHours: {
      enabled: boolean
      start: string // HH:MM
      end: string // HH:MM
    }
  }
}

export interface NotificationData {
  id: string
  userId: string
  type: 'review_reminder' | 'reflection_prompt' | 'achievement' | 'streak_reminder'
  title: string
  message: string
  data?: Record<string, any>
  scheduledFor: Date
  delivered: boolean
  deliveredAt?: Date
  dismissed: boolean
  dismissedAt?: Date
  priority: 'low' | 'medium' | 'high'
  expiresAt?: Date
}

export interface ReflectionPrompt {
  id: string
  type: 'progress' | 'insights' | 'goals' | 'challenges'
  title: string
  question: string
  followUpQuestions?: string[]
  context?: {
    timeframe: string
    metrics?: Record<string, any>
    suggestions?: string[]
  }
}

export interface AchievementNotification {
  type: 'streak' | 'mastery' | 'milestone' | 'improvement'
  title: string
  description: string
  icon: string
  value?: number
  previousValue?: number
  context?: Record<string, any>
}

/**
 * Service for managing review reminders, reflection prompts, and achievement notifications
 */
export class NotificationService {
  private static readonly DEFAULT_PREFERENCES: NotificationPreferences = {
    reviewReminders: {
      enabled: true,
      frequency: 'daily',
      advanceNotice: 60, // 1 hour
      maxDailyNotifications: 3
    },
    reflectionPrompts: {
      enabled: true,
      frequency: 'weekly',
      preferredTime: '19:00',
      weekdays: [0], // Sunday
      promptTypes: ['progress', 'insights', 'goals']
    },
    achievements: {
      enabled: true,
      streakMilestones: true,
      masteryNotifications: true,
      progressMilestones: true
    },
    delivery: {
      methods: ['browser'],
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00'
      }
    }
  }

  /**
   * Generate review reminder notifications based on due cards
   */
  static generateReviewReminders(
    userId: string,
    cards: MemoryCard[],
    preferences: NotificationPreferences
  ): NotificationData[] {
    if (!preferences.reviewReminders.enabled) {
      return []
    }

    const now = new Date()
    const notifications: NotificationData[] = []
    
    // Get cards due for review
    const dueCards = cards.filter(card => {
      const dueDate = new Date(card.nextReview)
      const advanceTime = preferences.reviewReminders.advanceNotice * 60 * 1000
      return dueDate.getTime() - now.getTime() <= advanceTime && dueDate > now
    })

    const overdueCards = cards.filter(card => new Date(card.nextReview) < now)

    // Create notifications based on frequency
    switch (preferences.reviewReminders.frequency) {
      case 'immediate':
        // Create individual notifications for each due card
        dueCards.slice(0, preferences.reviewReminders.maxDailyNotifications).forEach(card => {
          notifications.push({
            id: `review_${card.id}_${Date.now()}`,
            userId,
            type: 'review_reminder',
            title: 'Card Ready for Review',
            message: `Time to review: "${card.front.substring(0, 50)}${card.front.length > 50 ? '...' : ''}"`,
            data: { cardId: card.id, cardFront: card.front },
            scheduledFor: new Date(card.nextReview),
            delivered: false,
            dismissed: false,
            priority: 'medium'
          })
        })
        break

      case 'daily':
        if (dueCards.length > 0 || overdueCards.length > 0) {
          const totalCards = dueCards.length + overdueCards.length
          notifications.push({
            id: `daily_review_${userId}_${now.toDateString()}`,
            userId,
            type: 'review_reminder',
            title: 'Daily Review Ready',
            message: `You have ${totalCards} card${totalCards !== 1 ? 's' : ''} ready for review`,
            data: { 
              dueCards: dueCards.length, 
              overdueCards: overdueCards.length,
              cardIds: [...dueCards, ...overdueCards].map(c => c.id)
            },
            scheduledFor: this.getNextScheduledTime(preferences.reviewReminders.customTimes?.[0] || '09:00'),
            delivered: false,
            dismissed: false,
            priority: overdueCards.length > 0 ? 'high' : 'medium'
          })
        }
        break

      case 'twice_daily':
        if (dueCards.length > 0 || overdueCards.length > 0) {
          const morningTime = this.getNextScheduledTime('09:00')
          const eveningTime = this.getNextScheduledTime('18:00')
          
          [morningTime, eveningTime].forEach((time, index) => {
            notifications.push({
              id: `twice_daily_review_${userId}_${time.toISOString()}_${index}`,
              userId,
              type: 'review_reminder',
              title: `${index === 0 ? 'Morning' : 'Evening'} Review`,
              message: `Time for your ${index === 0 ? 'morning' : 'evening'} review session`,
              data: { 
                dueCards: dueCards.length, 
                overdueCards: overdueCards.length,
                sessionType: index === 0 ? 'morning' : 'evening'
              },
              scheduledFor: time,
              delivered: false,
              dismissed: false,
              priority: 'medium'
            })
          })
        }
        break
    }

    return notifications
  }

  /**
   * Generate reflection prompts based on user preferences and learning data
   */
  static generateReflectionPrompts(
    userId: string,
    preferences: NotificationPreferences,
    learningData: {
      cards: MemoryCard[]
      recentSessions: any[]
      streakDays: number
      averageSuccessRate: number
    }
  ): NotificationData[] {
    if (!preferences.reflectionPrompts.enabled) {
      return []
    }

    const notifications: NotificationData[] = []
    const now = new Date()
    
    // Determine if it's time for a reflection prompt
    const shouldSendPrompt = this.shouldSendReflectionPrompt(now, preferences.reflectionPrompts)
    
    if (!shouldSendPrompt) {
      return notifications
    }

    // Generate prompts based on enabled types
    preferences.reflectionPrompts.promptTypes.forEach(promptType => {
      const prompt = this.generateReflectionPrompt(promptType, learningData)
      
      if (prompt) {
        notifications.push({
          id: `reflection_${promptType}_${userId}_${now.toDateString()}`,
          userId,
          type: 'reflection_prompt',
          title: prompt.title,
          message: prompt.question,
          data: {
            promptType,
            prompt,
            context: prompt.context
          },
          scheduledFor: this.getNextScheduledTime(preferences.reflectionPrompts.preferredTime),
          delivered: false,
          dismissed: false,
          priority: 'low',
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
        })
      }
    })

    return notifications
  }

  /**
   * Generate achievement notifications
   */
  static generateAchievementNotifications(
    userId: string,
    preferences: NotificationPreferences,
    achievements: AchievementNotification[]
  ): NotificationData[] {
    if (!preferences.achievements.enabled) {
      return []
    }

    return achievements.map(achievement => ({
      id: `achievement_${achievement.type}_${userId}_${Date.now()}`,
      userId,
      type: 'achievement',
      title: achievement.title,
      message: achievement.description,
      data: {
        achievement,
        icon: achievement.icon,
        value: achievement.value
      },
      scheduledFor: new Date(),
      delivered: false,
      dismissed: false,
      priority: 'medium'
    }))
  }

  /**
   * Check if notifications should be sent based on quiet hours
   */
  static shouldSendNotification(
    scheduledTime: Date,
    preferences: NotificationPreferences
  ): boolean {
    if (!preferences.delivery.quietHours.enabled) {
      return true
    }

    const hour = scheduledTime.getHours()
    const minute = scheduledTime.getMinutes()
    const currentTime = hour * 60 + minute

    const [startHour, startMinute] = preferences.delivery.quietHours.start.split(':').map(Number)
    const [endHour, endMinute] = preferences.delivery.quietHours.end.split(':').map(Number)
    
    const quietStart = startHour * 60 + startMinute
    const quietEnd = endHour * 60 + endMinute

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (quietStart > quietEnd) {
      return !(currentTime >= quietStart || currentTime <= quietEnd)
    } else {
      return !(currentTime >= quietStart && currentTime <= quietEnd)
    }
  }

  /**
   * Get default notification preferences
   */
  static getDefaultPreferences(): NotificationPreferences {
    return { ...this.DEFAULT_PREFERENCES }
  }

  /**
   * Validate notification preferences
   */
  static validatePreferences(preferences: Partial<NotificationPreferences>): NotificationPreferences {
    return {
      reviewReminders: {
        ...this.DEFAULT_PREFERENCES.reviewReminders,
        ...preferences.reviewReminders
      },
      reflectionPrompts: {
        ...this.DEFAULT_PREFERENCES.reflectionPrompts,
        ...preferences.reflectionPrompts
      },
      achievements: {
        ...this.DEFAULT_PREFERENCES.achievements,
        ...preferences.achievements
      },
      delivery: {
        ...this.DEFAULT_PREFERENCES.delivery,
        ...preferences.delivery
      }
    }
  }

  /**
   * Generate reflection prompt based on type and learning data
   */
  private static generateReflectionPrompt(
    type: 'progress' | 'insights' | 'goals' | 'challenges',
    learningData: any
  ): ReflectionPrompt | null {
    const prompts = {
      progress: [
        {
          id: 'weekly_progress',
          type: 'progress' as const,
          title: 'Weekly Progress Reflection',
          question: 'How do you feel about your learning progress this week?',
          followUpQuestions: [
            'What concepts are becoming clearer to you?',
            'Which areas still feel challenging?',
            'What study strategies worked best for you?'
          ],
          context: {
            timeframe: 'This week',
            metrics: {
              cardsReviewed: learningData.recentSessions.length,
              averageSuccessRate: learningData.averageSuccessRate,
              streakDays: learningData.streakDays
            }
          }
        }
      ],
      insights: [
        {
          id: 'learning_insights',
          type: 'insights' as const,
          title: 'Learning Insights',
          question: 'What new insights or connections have you discovered recently?',
          followUpQuestions: [
            'How do these insights relate to what you already knew?',
            'What surprised you most in your recent learning?',
            'How might you apply these insights in practice?'
          ]
        }
      ],
      goals: [
        {
          id: 'learning_goals',
          type: 'goals' as const,
          title: 'Learning Goals Check-in',
          question: 'Are you making progress toward your learning goals?',
          followUpQuestions: [
            'What goals would you like to focus on next week?',
            'What obstacles are preventing you from reaching your goals?',
            'How can you adjust your study approach to better meet your goals?'
          ]
        }
      ],
      challenges: [
        {
          id: 'learning_challenges',
          type: 'challenges' as const,
          title: 'Overcoming Challenges',
          question: 'What learning challenges are you currently facing?',
          followUpQuestions: [
            'What strategies have you tried to overcome these challenges?',
            'What resources or support might help you?',
            'How can you break down difficult concepts into smaller parts?'
          ]
        }
      ]
    }

    const typePrompts = prompts[type]
    return typePrompts[Math.floor(Math.random() * typePrompts.length)]
  }

  /**
   * Check if it's time to send a reflection prompt
   */
  private static shouldSendReflectionPrompt(
    now: Date,
    settings: NotificationPreferences['reflectionPrompts']
  ): boolean {
    const dayOfWeek = now.getDay()
    
    // Check if today is a preferred weekday
    if (!settings.weekdays.includes(dayOfWeek)) {
      return false
    }

    // Check frequency (simplified - in production, you'd track last sent dates)
    switch (settings.frequency) {
      case 'daily':
        return true
      case 'weekly':
        return dayOfWeek === settings.weekdays[0]
      case 'bi_weekly':
        // Simplified - would need to track last sent date
        return dayOfWeek === settings.weekdays[0] && Math.random() < 0.5
      case 'monthly':
        // Simplified - would need to track last sent date
        return dayOfWeek === settings.weekdays[0] && now.getDate() <= 7
      default:
        return false
    }
  }

  /**
   * Get next scheduled time for a given time string
   */
  private static getNextScheduledTime(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number)
    const now = new Date()
    const scheduled = new Date()
    
    scheduled.setHours(hours, minutes, 0, 0)
    
    // If the time has passed today, schedule for tomorrow
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1)
    }
    
    return scheduled
  }
}