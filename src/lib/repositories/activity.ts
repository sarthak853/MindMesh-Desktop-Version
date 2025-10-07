import { BaseRepository } from './base'

interface UserActivity {
  id: string
  userId: string
  activityType: string
  entityType?: string
  entityId?: string
  metadata: any
  timestamp: Date
}

export class ActivityRepository extends BaseRepository<UserActivity> {
  async create(data: Partial<UserActivity>): Promise<UserActivity> {
    try {
      const id = crypto.randomUUID()
      const timestamp = data.timestamp?.toISOString() || new Date().toISOString()
      
      await this.executeCommand(
        `INSERT INTO user_activities (id, user_id, activity_type, entity_type, entity_id, metadata, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.userId,
          data.activityType,
          data.entityType || null,
          data.entityId || null,
          JSON.stringify(data.metadata || {}),
          timestamp
        ]
      )
      
      return this.findById(id) as Promise<UserActivity>
    } catch (error) {
      this.handleError(error, 'create user activity')
    }
  }

  async findById(id: string): Promise<UserActivity | null> {
    try {
      const result = await this.executeQuery(
        'SELECT * FROM user_activities WHERE id = ?',
        [id]
      )
      
      if (!result || result.length === 0) return null
      
      return this.mapRowToActivity(result[0])
    } catch (error) {
      this.handleError(error, 'find activity by id')
    }
  }

  async findMany(where?: any): Promise<UserActivity[]> {
    try {
      const result = await this.executeQuery(
        'SELECT * FROM user_activities ORDER BY timestamp DESC'
      )
      return result.map((row: any) => this.mapRowToActivity(row))
    } catch (error) {
      this.handleError(error, 'find many activities')
    }
  }

  async findByUserId(userId: string, limit: number = 50): Promise<UserActivity[]> {
    try {
      const result = await this.executeQuery(
        'SELECT * FROM user_activities WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
        [userId, limit]
      )
      return result.map((row: any) => this.mapRowToActivity(row))
    } catch (error) {
      this.handleError(error, 'find activities by user id')
    }
  }

  async findByType(userId: string, activityType: string, limit: number = 50): Promise<UserActivity[]> {
    try {
      return await this.db.userActivity.findMany({
        where: {
          userId,
          activityType,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      })
    } catch (error) {
      this.handleError(error, 'find activities by type')
    }
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UserActivity[]> {
    try {
      return await this.db.userActivity.findMany({
        where: {
          userId,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      })
    } catch (error) {
      this.handleError(error, 'find activities by date range')
    }
  }

  async update(id: string, data: Partial<UserActivity>): Promise<UserActivity> {
    try {
      return await this.db.userActivity.update({
        where: { id },
        data,
      })
    } catch (error) {
      this.handleError(error, 'update activity')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.userActivity.delete({
        where: { id },
      })
    } catch (error) {
      this.handleError(error, 'delete activity')
    }
  }

  async getActivityStats(userId: string, days: number = 30): Promise<{
    totalActivities: number
    activitiesByType: Record<string, number>
    dailyActivity: Array<{ date: string; count: number }>
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const activities = await this.db.userActivity.findMany({
        where: {
          userId,
          timestamp: {
            gte: startDate,
          },
        },
        select: {
          activityType: true,
          timestamp: true,
        },
      })

      const activitiesByType: Record<string, number> = {}
      const dailyActivity: Record<string, number> = {}

      activities.forEach(activity => {
        // Count by type
        activitiesByType[activity.activityType] = 
          (activitiesByType[activity.activityType] || 0) + 1

        // Count by day
        const dateKey = activity.timestamp.toISOString().split('T')[0]
        dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1
      })

      const dailyActivityArray = Object.entries(dailyActivity).map(([date, count]) => ({
        date,
        count,
      })).sort((a, b) => a.date.localeCompare(b.date))

      return {
        totalActivities: activities.length,
        activitiesByType,
        dailyActivity: dailyActivityArray,
      }
    } catch (error) {
      this.handleError(error, 'get activity statistics')
    }
  }

  async logActivity(
    userId: string,
    activityType: string,
    entityType?: string,
    entityId?: string,
    metadata?: any
  ): Promise<UserActivity> {
    return this.create({
      userId,
      activityType,
      entityType,
      entityId,
      metadata,
    })
  }

  async cleanupOldActivities(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const result = await this.db.userActivity.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      })

      return result.count
    } catch (error) {
      this.handleError(error, 'cleanup old activities')
    }
  }

  private mapRowToActivity(row: any): UserActivity {
    return {
      id: row.id,
      userId: row.user_id,
      activityType: row.activity_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: JSON.parse(row.metadata || '{}'),
      timestamp: new Date(row.timestamp)
    }
  }
}