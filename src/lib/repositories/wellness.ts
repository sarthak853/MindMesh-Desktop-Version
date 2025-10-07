import { WellnessData, FocusSession } from '@prisma/client'
import { BaseRepository } from './base'

export class WellnessRepository extends BaseRepository<WellnessData> {
  async create(data: Partial<WellnessData>): Promise<WellnessData> {
    try {
      return await this.db.wellnessData.create({
        data: {
          userId: data.userId!,
          date: data.date!,
          stressLevel: data.stressLevel,
          energyLevel: data.energyLevel,
          focusQuality: data.focusQuality,
          sleepHours: data.sleepHours,
          exerciseMinutes: data.exerciseMinutes,
          meditationMinutes: data.meditationMinutes,
          notes: data.notes,
        },
      })
    } catch (error) {
      this.handleError(error, 'create wellness data')
    }
  }

  async findById(id: string): Promise<WellnessData | null> {
    try {
      return await this.db.wellnessData.findUnique({
        where: { id },
      })
    } catch (error) {
      this.handleError(error, 'find wellness data by id')
    }
  }

  async findMany(where?: any): Promise<WellnessData[]> {
    try {
      return await this.db.wellnessData.findMany({
        where,
        orderBy: {
          date: 'desc',
        },
      })
    } catch (error) {
      this.handleError(error, 'find many wellness data')
    }
  }

  async findByUserId(userId: string, limit: number = 30): Promise<WellnessData[]> {
    try {
      return await this.db.wellnessData.findMany({
        where: { userId },
        orderBy: {
          date: 'desc',
        },
        take: limit,
      })
    } catch (error) {
      this.handleError(error, 'find wellness data by user id')
    }
  }

  async findByUserAndDate(userId: string, date: Date): Promise<WellnessData | null> {
    try {
      return await this.db.wellnessData.findUnique({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
      })
    } catch (error) {
      this.handleError(error, 'find wellness data by user and date')
    }
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WellnessData[]> {
    try {
      return await this.db.wellnessData.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      })
    } catch (error) {
      this.handleError(error, 'find wellness data by date range')
    }
  }

  async update(id: string, data: Partial<WellnessData>): Promise<WellnessData> {
    try {
      return await this.db.wellnessData.update({
        where: { id },
        data,
      })
    } catch (error) {
      this.handleError(error, 'update wellness data')
    }
  }

  async upsertByUserAndDate(
    userId: string,
    date: Date,
    data: Partial<WellnessData>
  ): Promise<WellnessData> {
    try {
      return await this.db.wellnessData.upsert({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
        update: data,
        create: {
          userId,
          date,
          ...data,
        },
      })
    } catch (error) {
      this.handleError(error, 'upsert wellness data')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.wellnessData.delete({
        where: { id },
      })
    } catch (error) {
      this.handleError(error, 'delete wellness data')
    }
  }

  async getWellnessStats(userId: string, days: number = 30): Promise<{
    averageStress: number
    averageEnergy: number
    averageFocus: number
    averageSleep: number
    totalExercise: number
    totalMeditation: number
    dataPoints: number
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const stats = await this.db.wellnessData.aggregate({
        where: {
          userId,
          date: {
            gte: startDate,
          },
        },
        _avg: {
          stressLevel: true,
          energyLevel: true,
          focusQuality: true,
          sleepHours: true,
        },
        _sum: {
          exerciseMinutes: true,
          meditationMinutes: true,
        },
        _count: true,
      })

      return {
        averageStress: stats._avg.stressLevel || 0,
        averageEnergy: stats._avg.energyLevel || 0,
        averageFocus: stats._avg.focusQuality || 0,
        averageSleep: stats._avg.sleepHours || 0,
        totalExercise: stats._sum.exerciseMinutes || 0,
        totalMeditation: stats._sum.meditationMinutes || 0,
        dataPoints: stats._count,
      }
    } catch (error) {
      this.handleError(error, 'get wellness statistics')
    }
  }

  async getWellnessTrends(userId: string, days: number = 30): Promise<{
    stressTrend: 'improving' | 'declining' | 'stable'
    energyTrend: 'improving' | 'declining' | 'stable'
    focusTrend: 'improving' | 'declining' | 'stable'
    sleepTrend: 'improving' | 'declining' | 'stable'
  }> {
    try {
      const endDate = new Date()
      const midDate = new Date()
      midDate.setDate(endDate.getDate() - Math.floor(days / 2))
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - days)

      const [firstHalf, secondHalf] = await Promise.all([
        this.db.wellnessData.aggregate({
          where: {
            userId,
            date: {
              gte: startDate,
              lt: midDate,
            },
          },
          _avg: {
            stressLevel: true,
            energyLevel: true,
            focusQuality: true,
            sleepHours: true,
          },
        }),
        this.db.wellnessData.aggregate({
          where: {
            userId,
            date: {
              gte: midDate,
              lte: endDate,
            },
          },
          _avg: {
            stressLevel: true,
            energyLevel: true,
            focusQuality: true,
            sleepHours: true,
          },
        }),
      ])

      const getTrend = (first: number | null, second: number | null): 'improving' | 'declining' | 'stable' => {
        if (!first || !second) return 'stable'
        const diff = second - first
        if (Math.abs(diff) < 0.5) return 'stable'
        return diff > 0 ? 'improving' : 'declining'
      }

      // For stress, lower is better, so we invert the trend
      const getStressTrend = (first: number | null, second: number | null): 'improving' | 'declining' | 'stable' => {
        if (!first || !second) return 'stable'
        const diff = second - first
        if (Math.abs(diff) < 0.5) return 'stable'
        return diff < 0 ? 'improving' : 'declining'
      }

      return {
        stressTrend: getStressTrend(firstHalf._avg.stressLevel, secondHalf._avg.stressLevel),
        energyTrend: getTrend(firstHalf._avg.energyLevel, secondHalf._avg.energyLevel),
        focusTrend: getTrend(firstHalf._avg.focusQuality, secondHalf._avg.focusQuality),
        sleepTrend: getTrend(firstHalf._avg.sleepHours, secondHalf._avg.sleepHours),
      }
    } catch (error) {
      this.handleError(error, 'get wellness trends')
    }
  }
}

export class FocusSessionRepository extends BaseRepository<FocusSession> {
  async create(data: Partial<FocusSession>): Promise<FocusSession> {
    try {
      return await this.db.focusSession.create({
        data: {
          userId: data.userId!,
          sessionType: data.sessionType!,
          plannedDuration: data.plannedDuration!,
          actualDuration: data.actualDuration,
          isCompleted: data.isCompleted || false,
          productivity: data.productivity,
          distractions: data.distractions || 0,
          notes: data.notes,
          startedAt: data.startedAt!,
          completedAt: data.completedAt,
        },
      })
    } catch (error) {
      this.handleError(error, 'create focus session')
    }
  }

  async findById(id: string): Promise<FocusSession | null> {
    try {
      return await this.db.focusSession.findUnique({
        where: { id },
      })
    } catch (error) {
      this.handleError(error, 'find focus session by id')
    }
  }

  async findMany(where?: any): Promise<FocusSession[]> {
    try {
      return await this.db.focusSession.findMany({
        where,
        orderBy: {
          startedAt: 'desc',
        },
      })
    } catch (error) {
      this.handleError(error, 'find many focus sessions')
    }
  }

  async findByUserId(userId: string, limit: number = 50): Promise<FocusSession[]> {
    try {
      return await this.db.focusSession.findMany({
        where: { userId },
        orderBy: {
          startedAt: 'desc',
        },
        take: limit,
      })
    } catch (error) {
      this.handleError(error, 'find focus sessions by user id')
    }
  }

  async findActiveSession(userId: string): Promise<FocusSession | null> {
    try {
      return await this.db.focusSession.findFirst({
        where: {
          userId,
          isCompleted: false,
        },
        orderBy: {
          startedAt: 'desc',
        },
      })
    } catch (error) {
      this.handleError(error, 'find active focus session')
    }
  }

  async update(id: string, data: Partial<FocusSession>): Promise<FocusSession> {
    try {
      return await this.db.focusSession.update({
        where: { id },
        data,
      })
    } catch (error) {
      this.handleError(error, 'update focus session')
    }
  }

  async completeSession(
    id: string,
    actualDuration: number,
    productivity?: number,
    distractions?: number,
    notes?: string
  ): Promise<FocusSession> {
    try {
      return await this.db.focusSession.update({
        where: { id },
        data: {
          isCompleted: true,
          actualDuration,
          productivity,
          distractions,
          notes,
          completedAt: new Date(),
        },
      })
    } catch (error) {
      this.handleError(error, 'complete focus session')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.focusSession.delete({
        where: { id },
      })
    } catch (error) {
      this.handleError(error, 'delete focus session')
    }
  }

  async getFocusStats(userId: string, days: number = 30): Promise<{
    totalSessions: number
    completedSessions: number
    totalFocusTime: number
    averageProductivity: number
    averageDistractions: number
    completionRate: number
    sessionsByType: Record<string, number>
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const [sessions, stats] = await Promise.all([
        this.db.focusSession.findMany({
          where: {
            userId,
            startedAt: {
              gte: startDate,
            },
          },
          select: {
            sessionType: true,
            isCompleted: true,
            actualDuration: true,
            productivity: true,
            distractions: true,
          },
        }),
        this.db.focusSession.aggregate({
          where: {
            userId,
            startedAt: {
              gte: startDate,
            },
            isCompleted: true,
          },
          _avg: {
            productivity: true,
            distractions: true,
          },
          _sum: {
            actualDuration: true,
          },
        }),
      ])

      const totalSessions = sessions.length
      const completedSessions = sessions.filter(s => s.isCompleted).length
      const sessionsByType: Record<string, number> = {}

      sessions.forEach(session => {
        sessionsByType[session.sessionType] = (sessionsByType[session.sessionType] || 0) + 1
      })

      return {
        totalSessions,
        completedSessions,
        totalFocusTime: stats._sum.actualDuration || 0,
        averageProductivity: stats._avg.productivity || 0,
        averageDistractions: stats._avg.distractions || 0,
        completionRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
        sessionsByType,
      }
    } catch (error) {
      this.handleError(error, 'get focus statistics')
    }
  }
}