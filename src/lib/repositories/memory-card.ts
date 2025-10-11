import { BaseRepository } from './base'

interface MemoryCard {
  id: string
  userId: string
  front: string
  back: string
  difficulty: number
  nextReview: Date
  reviewCount: number
  successRate: number
  tags: string[]
  metadata: any
  createdAt: Date
  updatedAt: Date
}

// Simple in-memory store used during web/SSR when Electron DB is unavailable
const InMemoryMemoryCardStore: { cards: Map<string, MemoryCard> } = ((): { cards: Map<string, MemoryCard> } => {
  const globalKey = '__SSR_MEMORY_CARD_STORE__'
  const g = globalThis as any
  if (!g[globalKey]) {
    g[globalKey] = { cards: new Map<string, MemoryCard>() }
  }
  return g[globalKey]
})()

export class MemoryCardRepository extends BaseRepository<MemoryCard> {
  async create(data: Partial<MemoryCard>): Promise<MemoryCard> {
    try {
      // Fallback to in-memory store when Electron DB is not available
      if (!this.isElectronAvailable()) {
        const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
        const now = new Date()

        const card: MemoryCard = {
          id,
          userId: String(data.userId),
          front: String(data.front || ''),
          back: String(data.back || ''),
          difficulty: Number(data.difficulty || 1),
          nextReview: data.nextReview || now,
          reviewCount: Number(data.reviewCount || 0),
          successRate: Number(data.successRate || 0.0),
          tags: Array.isArray(data.tags) ? data.tags : [],
          metadata: data.metadata || {},
          createdAt: now,
          updatedAt: now,
        }

        InMemoryMemoryCardStore.cards.set(id, card)
        return card
      }

      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      
      await this.executeCommand(
        `INSERT INTO memory_cards (id, user_id, front, back, difficulty, next_review, review_count, success_rate, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.userId,
          data.front,
          data.back,
          data.difficulty || 1,
          data.nextReview?.toISOString() || new Date().toISOString(),
          data.reviewCount || 0,
          data.successRate || 0.0,
          JSON.stringify(data.tags || []),
          now,
          now
        ]
      )
      
      return this.findById(id) as Promise<MemoryCard>
    } catch (error) {
      this.handleError(error, 'create memory card')
    }
  }

  async findById(id: string): Promise<MemoryCard | null> {
    try {
      // In-memory fallback
      if (!this.isElectronAvailable()) {
        return InMemoryMemoryCardStore.cards.get(id) || null
      }

      const result = await this.executeQuery(
        'SELECT * FROM memory_cards WHERE id = ?',
        [id]
      )
      
      if (!result || result.length === 0) return null
      
      return this.mapRowToMemoryCard(result[0])
    } catch (error) {
      this.handleError(error, 'find memory card by id')
    }
  }

  async findMany(where?: any): Promise<MemoryCard[]> {
    try {
      const result = await this.executeQuery(
        'SELECT * FROM memory_cards ORDER BY next_review ASC'
      )
      return result.map((row: any) => this.mapRowToMemoryCard(row))
    } catch (error) {
      this.handleError(error, 'find many memory cards')
    }
  }

  async findByUserId(userId: string): Promise<MemoryCard[]> {
    try {
      // In-memory fallback
      if (!this.isElectronAvailable()) {
        const cards = Array.from(InMemoryMemoryCardStore.cards.values())
          .filter(card => card.userId === userId)
          .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime())
        return cards
      }

      const result = await this.executeQuery(
        'SELECT * FROM memory_cards WHERE user_id = ? ORDER BY next_review ASC',
        [userId]
      )
      return result.map((row: any) => this.mapRowToMemoryCard(row))
    } catch (error) {
      this.handleError(error, 'find memory cards by user id')
    }
  }

  async findDueCards(userId: string): Promise<MemoryCard[]> {
    try {
      const now = new Date().toISOString()
      const result = await this.executeQuery(
        'SELECT * FROM memory_cards WHERE user_id = ? AND next_review <= ? ORDER BY next_review ASC',
        [userId, now]
      )
      return result.map((row: any) => this.mapRowToMemoryCard(row))
    } catch (error) {
      this.handleError(error, 'find due memory cards')
    }
  }

  async findByTags(userId: string, tags: string[]): Promise<MemoryCard[]> {
    try {
      // For SQLite, we'll use a simple LIKE query for tag matching
      const tagConditions = tags.map(() => 'tags LIKE ?').join(' OR ')
      const tagParams = tags.map(tag => `%"${tag}"%`)
      
      const result = await this.executeQuery(
        `SELECT * FROM memory_cards WHERE user_id = ? AND (${tagConditions}) ORDER BY next_review ASC`,
        [userId, ...tagParams]
      )
      return result.map((row: any) => this.mapRowToMemoryCard(row))
    } catch (error) {
      this.handleError(error, 'find memory cards by tags')
    }
  }

  async update(id: string, data: Partial<MemoryCard>): Promise<MemoryCard> {
    try {
      const updates: string[] = []
      const params: any[] = []
      
      if (data.front !== undefined) {
        updates.push('front = ?')
        params.push(data.front)
      }
      if (data.back !== undefined) {
        updates.push('back = ?')
        params.push(data.back)
      }
      if (data.difficulty !== undefined) {
        updates.push('difficulty = ?')
        params.push(data.difficulty)
      }
      if (data.nextReview !== undefined) {
        updates.push('next_review = ?')
        params.push(data.nextReview.toISOString())
      }
      if (data.reviewCount !== undefined) {
        updates.push('review_count = ?')
        params.push(data.reviewCount)
      }
      if (data.successRate !== undefined) {
        updates.push('success_rate = ?')
        params.push(data.successRate)
      }
      if (data.tags !== undefined) {
        updates.push('tags = ?')
        params.push(JSON.stringify(data.tags))
      }
      if (data.metadata !== undefined) {
        updates.push('metadata = ?')
        params.push(JSON.stringify(data.metadata))
      }
      
      updates.push('updated_at = ?')
      params.push(new Date().toISOString())
      params.push(id)
      
      await this.executeCommand(
        `UPDATE memory_cards SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
      
      return this.findById(id) as Promise<MemoryCard>
    } catch (error) {
      this.handleError(error, 'update memory card')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.executeCommand('DELETE FROM memory_cards WHERE id = ?', [id])
    } catch (error) {
      this.handleError(error, 'delete memory card')
    }
  }

  async updateReviewPerformance(
    id: string,
    performance: number,
    nextReview: Date
  ): Promise<MemoryCard> {
    try {
      const card = await this.findById(id)
      if (!card) {
        throw new Error('Memory card not found')
      }

      const newReviewCount = card.reviewCount + 1
      const newSuccessRate = (card.successRate * card.reviewCount + performance) / newReviewCount

      return await this.update(id, {
        reviewCount: newReviewCount,
        successRate: newSuccessRate,
        nextReview,
      })
    } catch (error) {
      this.handleError(error, 'update memory card review performance')
    }
  }

  async getStatistics(userId: string): Promise<{
    total: number
    due: number
    averageSuccessRate: number
    totalReviews: number
  }> {
    try {
      const now = new Date().toISOString()
      
      const [totalResult, dueResult, statsResult] = await Promise.all([
        this.executeQuery('SELECT COUNT(*) as count FROM memory_cards WHERE user_id = ?', [userId]),
        this.executeQuery('SELECT COUNT(*) as count FROM memory_cards WHERE user_id = ? AND next_review <= ?', [userId, now]),
        this.executeQuery('SELECT AVG(success_rate) as avg_success, SUM(review_count) as total_reviews FROM memory_cards WHERE user_id = ?', [userId])
      ])

      return {
        total: totalResult[0]?.count || 0,
        due: dueResult[0]?.count || 0,
        averageSuccessRate: statsResult[0]?.avg_success || 0,
        totalReviews: statsResult[0]?.total_reviews || 0,
      }
    } catch (error) {
      this.handleError(error, 'get memory card statistics')
    }
  }

  async getAllTags(userId: string): Promise<string[]> {
    try {
      const result = await this.executeQuery(
        'SELECT tags FROM memory_cards WHERE user_id = ?',
        [userId]
      )

      const tagSet = new Set<string>()
      result.forEach((row: any) => {
        try {
          const tags = JSON.parse(row.tags || '[]')
          tags.forEach((tag: string) => tagSet.add(tag))
        } catch (e) {
          // Skip invalid JSON
        }
      })

      return Array.from(tagSet).sort()
    } catch (error) {
      this.handleError(error, 'get all tags')
    }
  }

  async getTagStatistics(userId: string): Promise<Array<{
    tag: string
    count: number
    averageSuccessRate: number
  }>> {
    try {
      const result = await this.executeQuery(
        'SELECT tags, success_rate FROM memory_cards WHERE user_id = ?',
        [userId]
      )

      const tagStats = new Map<string, { count: number; totalSuccessRate: number }>()

      result.forEach((row: any) => {
        try {
          const tags = JSON.parse(row.tags || '[]')
          tags.forEach((tag: string) => {
            const existing = tagStats.get(tag) || { count: 0, totalSuccessRate: 0 }
            tagStats.set(tag, {
              count: existing.count + 1,
              totalSuccessRate: existing.totalSuccessRate + (row.success_rate || 0)
            })
          })
        } catch (e) {
          // Skip invalid JSON
        }
      })

      return Array.from(tagStats.entries()).map(([tag, stats]) => ({
        tag,
        count: stats.count,
        averageSuccessRate: stats.count > 0 ? stats.totalSuccessRate / stats.count : 0
      })).sort((a, b) => b.count - a.count)
    } catch (error) {
      this.handleError(error, 'get tag statistics')
    }
  }

  async bulkCreate(cards: Array<Partial<MemoryCard>>): Promise<MemoryCard[]> {
    try {
      const createdCards: MemoryCard[] = []
      
      for (const cardData of cards) {
        const card = await this.create(cardData)
        createdCards.push(card)
      }

      return createdCards
    } catch (error) {
      this.handleError(error, 'bulk create memory cards')
    }
  }

  async bulkDelete(ids: string[], userId: string): Promise<void> {
    try {
      const placeholders = ids.map(() => '?').join(',')
      await this.executeCommand(
        `DELETE FROM memory_cards WHERE id IN (${placeholders}) AND user_id = ?`,
        [...ids, userId]
      )
    } catch (error) {
      this.handleError(error, 'bulk delete memory cards')
    }
  }

  async bulkUpdateTags(ids: string[], userId: string, tagsToAdd: string[], tagsToRemove: string[] = []): Promise<void> {
    try {
      const placeholders = ids.map(() => '?').join(',')
      const result = await this.executeQuery(
        `SELECT id, tags FROM memory_cards WHERE id IN (${placeholders}) AND user_id = ?`,
        [...ids, userId]
      )

      for (const row of result) {
        try {
          let newTags = JSON.parse(row.tags || '[]')
          
          // Remove tags
          if (tagsToRemove.length > 0) {
            newTags = newTags.filter((tag: string) => !tagsToRemove.includes(tag))
          }
          
          // Add new tags
          tagsToAdd.forEach(tag => {
            if (!newTags.includes(tag)) {
              newTags.push(tag)
            }
          })

          await this.executeCommand(
            'UPDATE memory_cards SET tags = ?, updated_at = ? WHERE id = ?',
            [JSON.stringify(newTags), new Date().toISOString(), row.id]
          )
        } catch (e) {
          // Skip invalid JSON
        }
      }
    } catch (error) {
      this.handleError(error, 'bulk update tags')
    }
  }

  private mapRowToMemoryCard(row: any): MemoryCard {
    return {
      id: row.id,
      userId: row.user_id,
      front: row.front,
      back: row.back,
      difficulty: row.difficulty,
      nextReview: new Date(row.next_review),
      reviewCount: row.review_count,
      successRate: row.success_rate,
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}