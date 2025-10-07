import { BaseRepository } from './base'

interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  preferences: any
  role: string
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super()
    // Safe constructor - no database operations during instantiation
  }

  async create(data: Partial<User>): Promise<User> {
    try {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      
      await this.executeCommand(
        `INSERT INTO users (id, email, name, avatar_url, preferences, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.email,
          data.name,
          data.avatarUrl || null,
          JSON.stringify(data.preferences || {}),
          data.role || 'user',
          data.isActive !== false ? 1 : 0,
          now,
          now
        ]
      )
      
      return this.findById(id) as Promise<User>
    } catch (error) {
      this.handleError(error, 'create user')
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const result = await this.executeQuery(
        'SELECT * FROM users WHERE id = ?',
        [id]
      )
      
      if (!result || result.length === 0) return null
      
      return this.mapRowToUser(result[0])
    } catch (error) {
      this.handleError(error, 'find user by id')
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.executeQuery(
        'SELECT * FROM users WHERE email = ?',
        [email]
      )
      
      if (!result || result.length === 0) return null
      
      return this.mapRowToUser(result[0])
    } catch (error) {
      this.handleError(error, 'find user by email')
    }
  }

  async findMany(where?: any): Promise<User[]> {
    try {
      const result = await this.executeQuery('SELECT * FROM users')
      return result.map((row: any) => this.mapRowToUser(row))
    } catch (error) {
      this.handleError(error, 'find users')
    }
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    try {
      const updates: string[] = []
      const params: any[] = []
      
      if (data.name !== undefined) {
        updates.push('name = ?')
        params.push(data.name)
      }
      if (data.email !== undefined) {
        updates.push('email = ?')
        params.push(data.email)
      }
      if (data.avatarUrl !== undefined) {
        updates.push('avatar_url = ?')
        params.push(data.avatarUrl)
      }
      if (data.preferences !== undefined) {
        updates.push('preferences = ?')
        params.push(JSON.stringify(data.preferences))
      }
      if (data.role !== undefined) {
        updates.push('role = ?')
        params.push(data.role)
      }
      if (data.isActive !== undefined) {
        updates.push('is_active = ?')
        params.push(data.isActive ? 1 : 0)
      }
      
      updates.push('updated_at = ?')
      params.push(new Date().toISOString())
      params.push(id)
      
      await this.executeCommand(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
      
      return this.findById(id) as Promise<User>
    } catch (error) {
      this.handleError(error, 'update user')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.executeCommand('DELETE FROM users WHERE id = ?', [id])
    } catch (error) {
      this.handleError(error, 'delete user')
    }
  }

  async updatePreferences(id: string, preferences: any): Promise<User> {
    return this.update(id, { preferences })
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      preferences: JSON.parse(row.preferences || '{}'),
      role: row.role,
      isActive: Boolean(row.is_active),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}