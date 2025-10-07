import { BaseRepository } from './base'

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

export class DocumentRepository extends BaseRepository<Document> {
  async create(data: Partial<Document>): Promise<Document> {
    try {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      
      await this.executeCommand(
        `INSERT INTO documents (id, user_id, title, content, type, file_url, embeddings, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.userId,
          data.title,
          data.content,
          data.type,
          data.fileUrl || null,
          JSON.stringify(data.embeddings || []),
          JSON.stringify(data.metadata || {}),
          now,
          now
        ]
      )
      
      return this.findById(id) as Promise<Document>
    } catch (error) {
      this.handleError(error, 'create document')
    }
  }

  async findById(id: string): Promise<Document | null> {
    try {
      const result = await this.executeQuery(
        'SELECT * FROM documents WHERE id = ?',
        [id]
      )
      
      if (!result || result.length === 0) return null
      
      return this.mapRowToDocument(result[0])
    } catch (error) {
      this.handleError(error, 'find document by id')
    }
  }

  async findMany(where?: any): Promise<Document[]> {
    try {
      const result = await this.executeQuery(
        'SELECT * FROM documents ORDER BY created_at DESC'
      )
      return result.map((row: any) => this.mapRowToDocument(row))
    } catch (error) {
      this.handleError(error, 'find many documents')
    }
  }

  async findByUserId(userId: string): Promise<Document[]> {
    try {
      const result = await this.executeQuery(
        'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      )
      return result.map((row: any) => this.mapRowToDocument(row))
    } catch (error) {
      this.handleError(error, 'find documents by user id')
    }
  }

  async findByType(userId: string, type: string): Promise<Document[]> {
    try {
      const result = await this.executeQuery(
        'SELECT * FROM documents WHERE user_id = ? AND type = ? ORDER BY created_at DESC',
        [userId, type]
      )
      return result.map((row: any) => this.mapRowToDocument(row))
    } catch (error) {
      this.handleError(error, 'find documents by type')
    }
  }

  async update(id: string, data: Partial<Document>): Promise<Document> {
    try {
      const updates: string[] = []
      const params: any[] = []
      
      if (data.title !== undefined) {
        updates.push('title = ?')
        params.push(data.title)
      }
      if (data.content !== undefined) {
        updates.push('content = ?')
        params.push(data.content)
      }
      if (data.type !== undefined) {
        updates.push('type = ?')
        params.push(data.type)
      }
      if (data.fileUrl !== undefined) {
        updates.push('file_url = ?')
        params.push(data.fileUrl)
      }
      if (data.embeddings !== undefined) {
        updates.push('embeddings = ?')
        params.push(JSON.stringify(data.embeddings))
      }
      if (data.metadata !== undefined) {
        updates.push('metadata = ?')
        params.push(JSON.stringify(data.metadata))
      }
      
      updates.push('updated_at = ?')
      params.push(new Date().toISOString())
      params.push(id)
      
      await this.executeCommand(
        `UPDATE documents SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
      
      return this.findById(id) as Promise<Document>
    } catch (error) {
      this.handleError(error, 'update document')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.executeCommand('DELETE FROM documents WHERE id = ?', [id])
    } catch (error) {
      this.handleError(error, 'delete document')
    }
  }

  async updateEmbeddings(id: string, embeddings: number[]): Promise<Document> {
    try {
      await this.executeCommand(
        'UPDATE documents SET embeddings = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(embeddings), new Date().toISOString(), id]
      )
      
      return this.findById(id) as Promise<Document>
    } catch (error) {
      this.handleError(error, 'update document embeddings')
    }
  }

  async searchBySimilarity(embeddings: number[], userId: string, limit: number = 10): Promise<Document[]> {
    try {
      // Note: This is a simplified version. In production, you'd use vector similarity search
      // For SQLite, we'll just return recent documents for now
      const result = await this.executeQuery(
        'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit]
      )
      return result.map((row: any) => this.mapRowToDocument(row))
    } catch (error) {
      this.handleError(error, 'search documents by similarity')
    }
  }

  private mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      content: row.content,
      type: row.type,
      fileUrl: row.file_url,
      embeddings: JSON.parse(row.embeddings || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}