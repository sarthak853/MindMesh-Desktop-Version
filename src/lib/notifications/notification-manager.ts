import { NotificationData, NotificationPreferences, NotificationService } from './notification-service'

export interface NotificationQueue {
  pending: NotificationData[]
  delivered: NotificationData[]
  dismissed: NotificationData[]
}

export interface BrowserNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

/**
 * Manages notification delivery, queuing, and user interactions
 */
export class NotificationManager {
  private static instance: NotificationManager
  private notificationQueue: Map<string, NotificationQueue> = new Map()
  private deliveryCallbacks: Map<string, (notification: NotificationData) => void> = new Map()
  private permissionStatus: NotificationPermission = 'default'

  private constructor() {
    this.initializeBrowserNotifications()
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  /**
   * Initialize browser notification permissions
   */
  private async initializeBrowserNotifications(): Promise<void> {
    if ('Notification' in window) {
      this.permissionStatus = Notification.permission
      
      if (this.permissionStatus === 'default') {
        // Don't request permission automatically - let user trigger it
        console.log('Browser notifications available but not yet permitted')
      }
    }
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      this.permissionStatus = permission
      return permission
    }
    return 'denied'
  }

  /**
   * Add notifications to the queue for a user
   */
  addNotifications(userId: string, notifications: NotificationData[]): void {
    const queue = this.getOrCreateQueue(userId)
    
    notifications.forEach(notification => {
      // Check for duplicates
      const exists = queue.pending.some(n => n.id === notification.id)
      if (!exists) {
        queue.pending.push(notification)
      }
    })

    // Sort by scheduled time
    queue.pending.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
  }

  /**
   * Process pending notifications for a user
   */
  async processNotifications(
    userId: string, 
    preferences: NotificationPreferences
  ): Promise<NotificationData[]> {
    const queue = this.getOrCreateQueue(userId)
    const now = new Date()
    const deliveredNotifications: NotificationData[] = []

    // Find notifications ready to be delivered
    const readyNotifications = queue.pending.filter(notification => {
      return notification.scheduledFor <= now && 
             !notification.delivered &&
             NotificationService.shouldSendNotification(notification.scheduledFor, preferences)
    })

    // Deliver notifications
    for (const notification of readyNotifications) {
      try {
        await this.deliverNotification(notification, preferences)
        
        // Move from pending to delivered
        queue.pending = queue.pending.filter(n => n.id !== notification.id)
        queue.delivered.push(notification)
        deliveredNotifications.push(notification)
        
        // Call delivery callback if registered
        const callback = this.deliveryCallbacks.get(notification.type)
        if (callback) {
          callback(notification)
        }
      } catch (error) {
        console.error('Failed to deliver notification:', error)
      }
    }

    // Clean up expired notifications
    this.cleanupExpiredNotifications(userId)

    return deliveredNotifications
  }

  /**
   * Deliver a single notification
   */
  private async deliverNotification(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): Promise<void> {
    const deliveryMethods = preferences.delivery.methods

    // Browser notification
    if (deliveryMethods.includes('browser') && this.permissionStatus === 'granted') {
      await this.sendBrowserNotification(notification)
    }

    // Email notification (would integrate with email service)
    if (deliveryMethods.includes('email')) {
      await this.sendEmailNotification(notification)
    }

    // Push notification (would integrate with push service)
    if (deliveryMethods.includes('push')) {
      await this.sendPushNotification(notification)
    }

    // Mark as delivered
    notification.delivered = true
    notification.deliveredAt = new Date()
  }

  /**
   * Send browser notification
   */
  private async sendBrowserNotification(notification: NotificationData): Promise<void> {
    if (!('Notification' in window) || this.permissionStatus !== 'granted') {
      return
    }

    const options: BrowserNotificationOptions = {
      title: notification.title,
      body: notification.message,
      icon: '/icons/notification-icon.png',
      badge: '/icons/notification-badge.png',
      tag: notification.type,
      requireInteraction: notification.priority === 'high'
    }

    // Add action buttons based on notification type
    if (notification.type === 'review_reminder') {
      options.actions = [
        {
          action: 'start_review',
          title: 'Start Review',
          icon: '/icons/play-icon.png'
        },
        {
          action: 'snooze',
          title: 'Remind Later',
          icon: '/icons/snooze-icon.png'
        }
      ]
    } else if (notification.type === 'reflection_prompt') {
      options.actions = [
        {
          action: 'reflect_now',
          title: 'Reflect Now',
          icon: '/icons/reflect-icon.png'
        },
        {
          action: 'remind_later',
          title: 'Remind Later',
          icon: '/icons/snooze-icon.png'
        }
      ]
    }

    const browserNotification = new Notification(options.title, options)

    // Handle notification clicks
    browserNotification.onclick = () => {
      this.handleNotificationClick(notification)
      browserNotification.close()
    }

    // Auto-close after 10 seconds for low priority notifications
    if (notification.priority === 'low') {
      setTimeout(() => {
        browserNotification.close()
      }, 10000)
    }
  }

  /**
   * Send email notification (placeholder - would integrate with email service)
   */
  private async sendEmailNotification(notification: NotificationData): Promise<void> {
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    console.log('Email notification would be sent:', notification)
    
    // Example implementation:
    // await emailService.send({
    //   to: user.email,
    //   subject: notification.title,
    //   body: notification.message,
    //   template: notification.type
    // })
  }

  /**
   * Send push notification (placeholder - would integrate with push service)
   */
  private async sendPushNotification(notification: NotificationData): Promise<void> {
    // This would integrate with a push service like Firebase Cloud Messaging
    console.log('Push notification would be sent:', notification)
  }

  /**
   * Handle notification click events
   */
  private handleNotificationClick(notification: NotificationData): void {
    // Focus the window
    if (window.focus) {
      window.focus()
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'review_reminder':
        // Navigate to review session
        window.location.href = '/review'
        break
      case 'reflection_prompt':
        // Navigate to reflection interface
        window.location.href = '/reflection'
        break
      case 'achievement':
        // Show achievement details
        window.location.href = '/progress'
        break
      default:
        // Navigate to dashboard
        window.location.href = '/dashboard'
    }

    // Mark as dismissed
    this.dismissNotification(notification.userId, notification.id)
  }

  /**
   * Dismiss a notification
   */
  dismissNotification(userId: string, notificationId: string): void {
    const queue = this.getOrCreateQueue(userId)
    
    // Find and move notification to dismissed
    const notification = queue.delivered.find(n => n.id === notificationId) ||
                        queue.pending.find(n => n.id === notificationId)
    
    if (notification) {
      notification.dismissed = true
      notification.dismissedAt = new Date()
      
      // Remove from pending/delivered and add to dismissed
      queue.pending = queue.pending.filter(n => n.id !== notificationId)
      queue.delivered = queue.delivered.filter(n => n.id !== notificationId)
      queue.dismissed.push(notification)
    }
  }

  /**
   * Snooze a notification (reschedule for later)
   */
  snoozeNotification(userId: string, notificationId: string, snoozeMinutes: number = 60): void {
    const queue = this.getOrCreateQueue(userId)
    
    const notification = queue.delivered.find(n => n.id === notificationId)
    if (notification) {
      // Reschedule notification
      notification.scheduledFor = new Date(Date.now() + snoozeMinutes * 60 * 1000)
      notification.delivered = false
      notification.deliveredAt = undefined
      
      // Move back to pending
      queue.delivered = queue.delivered.filter(n => n.id !== notificationId)
      queue.pending.push(notification)
      queue.pending.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
    }
  }

  /**
   * Get notifications for a user
   */
  getNotifications(userId: string): NotificationQueue {
    return this.getOrCreateQueue(userId)
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(userId: string): number {
    const queue = this.getOrCreateQueue(userId)
    return queue.delivered.filter(n => !n.dismissed).length
  }

  /**
   * Register a callback for when notifications are delivered
   */
  onNotificationDelivered(type: string, callback: (notification: NotificationData) => void): void {
    this.deliveryCallbacks.set(type, callback)
  }

  /**
   * Clean up expired notifications
   */
  private cleanupExpiredNotifications(userId: string): void {
    const queue = this.getOrCreateQueue(userId)
    const now = new Date()

    // Remove expired notifications from all queues
    queue.pending = queue.pending.filter(n => !n.expiresAt || n.expiresAt > now)
    queue.delivered = queue.delivered.filter(n => !n.expiresAt || n.expiresAt > now)
    queue.dismissed = queue.dismissed.filter(n => !n.expiresAt || n.expiresAt > now)

    // Keep only last 100 dismissed notifications to prevent memory bloat
    if (queue.dismissed.length > 100) {
      queue.dismissed = queue.dismissed
        .sort((a, b) => (b.dismissedAt?.getTime() || 0) - (a.dismissedAt?.getTime() || 0))
        .slice(0, 100)
    }
  }

  /**
   * Get or create notification queue for user
   */
  private getOrCreateQueue(userId: string): NotificationQueue {
    if (!this.notificationQueue.has(userId)) {
      this.notificationQueue.set(userId, {
        pending: [],
        delivered: [],
        dismissed: []
      })
    }
    return this.notificationQueue.get(userId)!
  }

  /**
   * Clear all notifications for a user
   */
  clearAllNotifications(userId: string): void {
    this.notificationQueue.delete(userId)
  }

  /**
   * Get notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return this.permissionStatus
  }
}