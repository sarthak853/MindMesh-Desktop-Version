import { BaseRepository } from './base'

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  isRead: boolean
  priority: string
  metadata: any
  createdAt: Date
  readAt?: Date
}

export class NotificationRepository extends BaseRepository<Notification> {
  async create(data: Partial<Notification>): Promise<Notification> {
    try {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      
      await this.executeCommand(
        `INSERT INTO notifications (id, user_id, type, title, message, is_read, priority, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.userId,
          data.type,
          data.title,
          data.message,
          data.isRead ? 1 : 0,
          data.priority || 'normal',
          JSON.stringify(data.metadata || {}),
          now
        ]
      )
      
      return this.findById(id) as Promise<Notification>
    } catch (error) {
      this.handleError(error, 'create notification')
    }
  }

  async findById(id: string): Promise<Notification | null> {
    try {
      return await this.db.notification.findUnique({
        where: { id },
      })
    } catch (error) {
      this.handleError(error, 'find notification by id')
    }
  }

  async findMany(where?: any): Promise<Notification[]> {
    try {
      return await this.db.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      })
    } catch (error) {
      this.handleError(error, 'find many notifications')
    }
  }

  async findByUserId(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      return await this.db.notification.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      })
    } catch (error) {
      this.handleError(error, 'find notifications by user id')
    }
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    try {
      return await this.db.notification.findMany({
        where: {
          userId,
          isRead: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } catch (error) {
      this.handleError(error, 'find unread notifications by user id')
    }
  }

  async findByType(userId: string, type: string): Promise<Notification[]> {
    try {
      return await this.db.notification.findMany({
        where: {
          userId,
          type,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } catch (error) {
      this.handleError(error, 'find notifications by type')
    }
  }

  async findByPriority(userId: string, priority: string): Promise<Notification[]> {
    try {
      return await this.db.notification.findMany({
        where: {
          userId,
          priority,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } catch (error) {
      this.handleError(error, 'find notifications by priority')
    }
  }

  async update(id: string, data: Partial<Notification>): Promise<Notification> {
    try {
      return await this.db.notification.update({
        where: { id },
        data,
      })
    } catch (error) {
      this.handleError(error, 'update notification')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.notification.delete({
        where: { id },
      })
    } catch (error) {
      this.handleError(error, 'delete notification')
    }
  }

  async markAsRead(id: string): Promise<Notification> {
    try {
      return await this.db.notification.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
    } catch (error) {
      this.handleError(error, 'mark notification as read')
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await this.db.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })

      return result.count
    } catch (error) {
      this.handleError(error, 'mark all notifications as read')
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.db.notification.count({
        where: {
          userId,
          isRead: false,
        },
      })
    } catch (error) {
      this.handleError(error, 'get unread notification count')
    }
  }

  async createBulk(notifications: Array<Partial<Notification>>): Promise<Notification[]> {
    try {
      const createdNotifications: Notification[] = []
      
      for (const notificationData of notifications) {
        const notification = await this.create(notificationData)
        createdNotifications.push(notification)
      }

      return createdNotifications
    } catch (error) {
      this.handleError(error, 'create bulk notifications')
    }
  }

  async deleteOldNotifications(userId: string, olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const result = await this.db.notification.deleteMany({
        where: {
          userId,
          createdAt: {
            lt: cutoffDate,
          },
          isRead: true, // Only delete read notifications
        },
      })

      return result.count
    } catch (error) {
      this.handleError(error, 'delete old notifications')
    }
  }

  async getNotificationStats(userId: string): Promise<{
    total: number
    unread: number
    byType: Record<string, number>
    byPriority: Record<string, number>
  }> {
    try {
      const [total, unread, notifications] = await Promise.all([
        this.db.notification.count({ where: { userId } }),
        this.db.notification.count({ where: { userId, isRead: false } }),
        this.db.notification.findMany({
          where: { userId },
          select: { type: true, priority: true },
        }),
      ])

      const byType: Record<string, number> = {}
      const byPriority: Record<string, number> = {}

      notifications.forEach(notification => {
        byType[notification.type] = (byType[notification.type] || 0) + 1
        byPriority[notification.priority] = (byPriority[notification.priority] || 0) + 1
      })

      return {
        total,
        unread,
        byType,
        byPriority,
      }
    } catch (error) {
      this.handleError(error, 'get notification statistics')
    }
  }

  async scheduleNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    scheduledFor: Date,
    priority: string = 'normal',
    metadata?: any
  ): Promise<Notification> {
    // For now, create immediately. In production, you'd use a job queue
    return this.create({
      userId,
      type,
      title,
      message,
      priority,
      metadata: {
        ...metadata,
        scheduledFor: scheduledFor.toISOString(),
        isScheduled: true,
      },
    })
  }
}