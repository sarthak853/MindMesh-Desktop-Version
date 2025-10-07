interface Document {
  id: string
  userId: string
  title: string
  content: string
  type: string
  fileUrl?: string
  embeddings?: number[]
  metadata: any
  createdAt: Date
  updatedAt: Date
}

// Simple in-memory store used during web/SSR when Electron DB is unavailable
// Persisted on globalThis to survive module reloads in dev/HMR and be shared across routes
const InMemoryDocumentStore: { docs: Map<string, Document> } = ((): { docs: Map<string, Document> } => {
  const globalKey = '__SSR_DOCUMENT_STORE__'
  const g = globalThis as any
  if (!g[globalKey]) {
    g[globalKey] = { docs: new Map<string, Document>() }
  }
  return g[globalKey]
})()

export class SSRDocumentRepository {
  async create(data: Partial<Document>): Promise<Document> {
    const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? (globalThis.crypto as any).randomUUID()
      : `${Date.now()}-${Math.random()}`
    const now = new Date()

    const doc: Document = {
      id,
      userId: String(data.userId),
      title: String(data.title || ''),
      content: String(data.content || ''),
      type: String(data.type || 'text'),
      fileUrl: data.fileUrl,
      embeddings: Array.isArray(data.embeddings) ? (data.embeddings as number[]) : [],
      metadata: data.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    }

    InMemoryDocumentStore.docs.set(id, doc)
    return doc
  }

  async findById(id: string): Promise<Document | null> {
    return InMemoryDocumentStore.docs.get(id) || null
  }

  async findMany(): Promise<Document[]> {
    return Array.from(InMemoryDocumentStore.docs.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async findByUserId(userId: string): Promise<Document[]> {
    return Array.from(InMemoryDocumentStore.docs.values())
      .filter(d => d.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async update(id: string, data: Partial<Document>): Promise<Document> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Document not found')

    const updated: Document = {
      ...existing,
      title: data.title !== undefined ? String(data.title) : existing.title,
      content: data.content !== undefined ? String(data.content) : existing.content,
      type: data.type !== undefined ? String(data.type) : existing.type,
      fileUrl: data.fileUrl !== undefined ? data.fileUrl : existing.fileUrl,
      embeddings: data.embeddings !== undefined ? (Array.isArray(data.embeddings) ? data.embeddings as number[] : existing.embeddings) : existing.embeddings,
      metadata: data.metadata !== undefined ? data.metadata : existing.metadata,
      updatedAt: new Date(),
    }

    InMemoryDocumentStore.docs.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    InMemoryDocumentStore.docs.delete(id)
  }
}