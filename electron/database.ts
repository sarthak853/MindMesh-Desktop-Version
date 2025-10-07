import { Database } from 'sqlite3'
import { getDatabasePath } from './utils'
import { promisify } from 'util'
import { ipcMain } from 'electron'

let db: Database | null = null

export const setupDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const dbPath = getDatabasePath()
    
    db = new Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err)
        reject(err)
        return
      }
      
      console.log('Connected to SQLite database at:', dbPath)
      
      // Initialize database schema
      initializeSchema()
        .then(() => {
          setupDatabaseIPC()
          resolve()
        })
        .catch(reject)
    })
  })
}

const initializeSchema = async (): Promise<void> => {
  if (!db) throw new Error('Database not initialized')
  
  const run = promisify(db.run.bind(db))
  
  // Create tables
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      preferences TEXT DEFAULT '{}',
      role TEXT DEFAULT 'user',
      is_active BOOLEAN DEFAULT 1,
      last_login_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  await run(`
    CREATE TABLE IF NOT EXISTS cognitive_maps (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_public BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `)
  
  await run(`
    CREATE TABLE IF NOT EXISTS cognitive_nodes (
      id TEXT PRIMARY KEY,
      map_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (map_id) REFERENCES cognitive_maps (id) ON DELETE CASCADE
    )
  `)
  
  await run(`
    CREATE TABLE IF NOT EXISTS node_connections (
      id TEXT PRIMARY KEY,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      relationship_type TEXT,
      label TEXT,
      strength REAL DEFAULT 1.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_node_id) REFERENCES cognitive_nodes (id) ON DELETE CASCADE,
      FOREIGN KEY (target_node_id) REFERENCES cognitive_nodes (id) ON DELETE CASCADE
    )
  `)
  
  await run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      file_url TEXT,
      embeddings TEXT,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `)
  
  await run(`
    CREATE TABLE IF NOT EXISTS memory_cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      difficulty INTEGER DEFAULT 1,
      next_review DATETIME NOT NULL,
      review_count INTEGER DEFAULT 0,
      success_rate REAL DEFAULT 0.0,
      tags TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `)
  
  await run(`
    CREATE TABLE IF NOT EXISTS user_activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      metadata TEXT DEFAULT '{}',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `)
  
  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `)
  
  await run(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      mode TEXT DEFAULT 'scholar',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `)
  
  await run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      citations TEXT DEFAULT '[]',
      confidence REAL,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
    )
  `)
  
  // Create indexes for better performance
  await run('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)')
  await run('CREATE INDEX IF NOT EXISTS idx_cognitive_maps_user_id ON cognitive_maps (user_id)')
  await run('CREATE INDEX IF NOT EXISTS idx_cognitive_nodes_map_id ON cognitive_nodes (map_id)')
  await run('CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id)')
  await run('CREATE INDEX IF NOT EXISTS idx_memory_cards_user_id ON memory_cards (user_id)')
  await run('CREATE INDEX IF NOT EXISTS idx_memory_cards_next_review ON memory_cards (next_review)')
  await run('CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities (user_id)')
  await run('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)')
  await run('CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions (user_id)')
  await run('CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages (session_id)')
  
  console.log('Database schema initialized successfully')
}

const setupDatabaseIPC = (): void => {
  // Database query handler
  ipcMain.handle('db-query', async (event, sql: string, params: any[] = []) => {
    if (!db) throw new Error('Database not initialized')
    
    return new Promise((resolve, reject) => {
      db!.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database query error:', err)
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  })
  
  // Database execute handler (for INSERT, UPDATE, DELETE)
  ipcMain.handle('db-execute', async (event, sql: string, params: any[] = []) => {
    if (!db) throw new Error('Database not initialized')
    
    return new Promise((resolve, reject) => {
      db!.run(sql, params, function(err) {
        if (err) {
          console.error('Database execute error:', err)
          reject(err)
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          })
        }
      })
    })
  })
  
  // Database transaction handler
  ipcMain.handle('db-transaction', async (event, queries: Array<{ sql: string; params?: any[] }>) => {
    if (!db) throw new Error('Database not initialized')
    
    return new Promise((resolve, reject) => {
      db!.serialize(() => {
        db!.run('BEGIN TRANSACTION')
        
        const results: any[] = []
        let completed = 0
        let hasError = false
        
        queries.forEach((query, index) => {
          db!.run(query.sql, query.params || [], function(err) {
            if (err && !hasError) {
              hasError = true
              db!.run('ROLLBACK')
              reject(err)
              return
            }
            
            results[index] = {
              lastID: this.lastID,
              changes: this.changes
            }
            
            completed++
            
            if (completed === queries.length && !hasError) {
              db!.run('COMMIT', (err) => {
                if (err) {
                  reject(err)
                } else {
                  resolve(results)
                }
              })
            }
          })
        })
      })
    })
  })
}

export const getDatabase = (): Database | null => {
  return db
}

export const closeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err)
        } else {
          db = null
          resolve()
        }
      })
    } else {
      resolve()
    }
  })
}