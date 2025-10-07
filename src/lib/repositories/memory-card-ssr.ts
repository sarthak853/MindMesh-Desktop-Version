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
// Persisted on globalThis to survive module reloads in dev/HMR and be shared across routes
const InMemoryCardStore: { cards: Map<string, MemoryCard> } = ((): { cards: Map<string, MemoryCard> } => {
  const globalKey = '__SSR_MEMORY_CARD_STORE__'
  const g = globalThis as any
  if (!g[globalKey]) {
    g[globalKey] = { cards: new Map<string, MemoryCard>() }
  }
  return g[globalKey]
})()

export class SSRMemoryCardRepository {
  async create(data: Partial<MemoryCard>): Promise<MemoryCard> {
    const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
    const now = new Date()
    const card: MemoryCard = {
      id,
      userId: String(data.userId),
      front: String(data.front || ''),
      back: String(data.back || ''),
      difficulty: Number(data.difficulty ?? 1),
      nextReview: data.nextReview ? new Date(data.nextReview) : new Date(),
      reviewCount: Number(data.reviewCount ?? 0),
      successRate: Number(data.successRate ?? 0),
      tags: Array.isArray(data.tags) ? data.tags : [],
      metadata: data.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    }
    InMemoryCardStore.cards.set(id, card)
    return card
  }

  async findById(id: string): Promise<MemoryCard | null> {
    return InMemoryCardStore.cards.get(id) || null
  }

  async findByUserId(userId: string): Promise<MemoryCard[]> {
    return Array.from(InMemoryCardStore.cards.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => +a.nextReview - +b.nextReview)
  }

  async findDueCards(userId: string): Promise<MemoryCard[]> {
    const now = new Date()
    return Array.from(InMemoryCardStore.cards.values())
      .filter(c => c.userId === userId && new Date(c.nextReview) <= now)
      .sort((a, b) => +a.nextReview - +b.nextReview)
  }

  async findByTags(userId: string, tags: string[]): Promise<MemoryCard[]> {
    return Array.from(InMemoryCardStore.cards.values())
      .filter(c => c.userId === userId && tags.some(t => c.tags?.includes(t)))
      .sort((a, b) => +a.nextReview - +b.nextReview)
  }

  async update(id: string, data: Partial<MemoryCard>): Promise<MemoryCard> {
    const existing = InMemoryCardStore.cards.get(id)
    if (!existing) throw new Error('Memory card not found')
    const updated: MemoryCard = {
      ...existing,
      front: data.front !== undefined ? String(data.front) : existing.front,
      back: data.back !== undefined ? String(data.back) : existing.back,
      difficulty: data.difficulty !== undefined ? Number(data.difficulty) : existing.difficulty,
      nextReview: data.nextReview !== undefined ? new Date(data.nextReview) : existing.nextReview,
      reviewCount: data.reviewCount !== undefined ? Number(data.reviewCount) : existing.reviewCount,
      successRate: data.successRate !== undefined ? Number(data.successRate) : existing.successRate,
      tags: data.tags !== undefined ? (Array.isArray(data.tags) ? data.tags : existing.tags) : existing.tags,
      metadata: data.metadata !== undefined ? data.metadata : existing.metadata,
      updatedAt: new Date(),
    }
    InMemoryCardStore.cards.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    InMemoryCardStore.cards.delete(id)
  }

  async getStatistics(userId: string): Promise<{
    total: number
    due: number
    averageSuccessRate: number
    totalReviews: number
  }> {
    const now = new Date()
    const userCards = Array.from(InMemoryCardStore.cards.values()).filter(c => c.userId === userId)
    const dueCards = userCards.filter(c => new Date(c.nextReview) <= now)
    const totalReviews = userCards.reduce((sum, c) => sum + (c.reviewCount || 0), 0)
    const averageSuccessRate = userCards.length > 0
      ? userCards.reduce((sum, c) => sum + (c.successRate || 0), 0) / userCards.length
      : 0
    return {
      total: userCards.length,
      due: dueCards.length,
      averageSuccessRate,
      totalReviews,
    }
  }

  async getAllTags(userId: string): Promise<string[]> {
    const userCards = Array.from(InMemoryCardStore.cards.values()).filter(c => c.userId === userId)
    const tagSet = new Set<string>()
    userCards.forEach(c => c.tags?.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }

  async getTagStatistics(userId: string): Promise<Array<{
    tag: string
    count: number
    averageSuccessRate: number
  }>> {
    const userCards = Array.from(InMemoryCardStore.cards.values()).filter(c => c.userId === userId)
    const tagStats = new Map<string, { count: number; totalSuccessRate: number }>()
    userCards.forEach(c => {
      c.tags?.forEach(tag => {
        const existing = tagStats.get(tag) || { count: 0, totalSuccessRate: 0 }
        tagStats.set(tag, {
          count: existing.count + 1,
          totalSuccessRate: existing.totalSuccessRate + (c.successRate || 0)
        })
      })
    })
    return Array.from(tagStats.entries()).map(([tag, stats]) => ({
      tag,
      count: stats.count,
      averageSuccessRate: stats.count > 0 ? stats.totalSuccessRate / stats.count : 0
    })).sort((a, b) => b.count - a.count)
  }

  async bulkCreate(cards: Array<Partial<MemoryCard>>): Promise<MemoryCard[]> {
    const createdCards: MemoryCard[] = []
    for (const data of cards) {
      const card = await this.create(data)
      createdCards.push(card)
    }
    return createdCards
  }

  async bulkDelete(ids: string[], userId: string): Promise<void> {
    ids.forEach(id => {
      const card = InMemoryCardStore.cards.get(id)
      if (card && card.userId === userId) {
        InMemoryCardStore.cards.delete(id)
      }
    })
  }

  async bulkUpdateTags(ids: string[], userId: string, tagsToAdd: string[], tagsToRemove: string[] = []): Promise<void> {
    ids.forEach(id => {
      const card = InMemoryCardStore.cards.get(id)
      if (card && card.userId === userId) {
        let newTags = Array.isArray(card.tags) ? [...card.tags] : []
        if (tagsToRemove.length > 0) {
          newTags = newTags.filter(t => !tagsToRemove.includes(t))
        }
        tagsToAdd.forEach(tag => {
          if (!newTags.includes(tag)) newTags.push(tag)
        })
        InMemoryCardStore.cards.set(id, { ...card, tags: newTags, updatedAt: new Date() })
      }
    })
  }
}