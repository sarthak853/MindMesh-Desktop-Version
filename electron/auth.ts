import { ipcMain } from 'electron'
import { getDatabase } from './database'
import { validateEmail } from './utils'
import * as crypto from 'crypto'

interface User {
  id: string
  email: string
  name: string
  password_hash: string
  avatar_url?: string
  preferences: string
  role: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

let currentUser: User | null = null

export function setupAuth(): void {
  // Login handler
  ipcMain.handle('auth-login', async (event, { username, password }) => {
    try {
      if (!validateEmail(username)) {
        return { success: false, error: 'Invalid email format' }
      }

      const db = getDatabase()
      if (!db) {
        return { success: false, error: 'Database not available' }
      }

      return new Promise((resolve) => {
        const passwordHash = hashPassword(password)
        
        db.get(
          'SELECT * FROM users WHERE email = ? AND password_hash = ?',
          [username, passwordHash],
          (err, row: User) => {
            if (err) {
              console.error('Login error:', err)
              resolve({ success: false, error: 'Login failed' })
              return
            }

            if (!row) {
              resolve({ success: false, error: 'Invalid email or password' })
              return
            }

            if (!row.is_active) {
              resolve({ success: false, error: 'Account is deactivated' })
              return
            }

            // Update last login
            db.run(
              'UPDATE users SET last_login_at = ? WHERE id = ?',
              [new Date().toISOString(), row.id],
              (updateErr) => {
                if (updateErr) {
                  console.error('Failed to update last login:', updateErr)
                }
              }
            )

            currentUser = row
            const userResponse = {
              id: row.id,
              email: row.email,
              name: row.name,
              avatarUrl: row.avatar_url,
              preferences: JSON.parse(row.preferences || '{}'),
              role: row.role,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            }

            resolve({ success: true, user: userResponse })
          }
        )
      })
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Login failed' }
    }
  })

  // Register handler
  ipcMain.handle('auth-register', async (event, { username, password, email, name }) => {
    try {
      if (!validateEmail(email || username)) {
        return { success: false, error: 'Invalid email format' }
      }

      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' }
      }

      const db = getDatabase()
      if (!db) {
        return { success: false, error: 'Database not available' }
      }

      return new Promise((resolve) => {
        // Check if user already exists
        db.get(
          'SELECT id FROM users WHERE email = ?',
          [email || username],
          (err, existingUser) => {
            if (err) {
              console.error('Registration check error:', err)
              resolve({ success: false, error: 'Registration failed' })
              return
            }

            if (existingUser) {
              resolve({ success: false, error: 'User already exists' })
              return
            }

            // Create new user
            const userId = crypto.randomUUID()
            const passwordHash = hashPassword(password)
            const now = new Date().toISOString()

            db.run(
              `INSERT INTO users (id, email, name, password_hash, preferences, role, is_active, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                userId,
                email || username,
                name || 'User',
                passwordHash,
                JSON.stringify({}),
                'user',
                1,
                now,
                now
              ],
              function(insertErr) {
                if (insertErr) {
                  console.error('Registration insert error:', insertErr)
                  resolve({ success: false, error: 'Registration failed' })
                  return
                }

                // Get the created user
                db.get(
                  'SELECT * FROM users WHERE id = ?',
                  [userId],
                  (selectErr, row: User) => {
                    if (selectErr || !row) {
                      console.error('Registration select error:', selectErr)
                      resolve({ success: false, error: 'Registration failed' })
                      return
                    }

                    currentUser = row
                    const userResponse = {
                      id: row.id,
                      email: row.email,
                      name: row.name,
                      avatarUrl: row.avatar_url,
                      preferences: JSON.parse(row.preferences || '{}'),
                      role: row.role,
                      createdAt: row.created_at,
                      updatedAt: row.updated_at
                    }

                    resolve({ success: true, user: userResponse })
                  }
                )
              }
            )
          }
        )
      })
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Registration failed' }
    }
  })

  // Logout handler
  ipcMain.handle('auth-logout', async () => {
    currentUser = null
    return { success: true }
  })

  // Get current user handler
  ipcMain.handle('auth-get-current-user', async () => {
    if (currentUser) {
      const userResponse = {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        avatarUrl: currentUser.avatar_url,
        preferences: JSON.parse(currentUser.preferences || '{}'),
        role: currentUser.role,
        createdAt: currentUser.created_at,
        updatedAt: currentUser.updated_at
      }
      return { success: true, user: userResponse }
    }
    return { success: false, error: 'No user logged in' }
  })

  // Update profile handler
  ipcMain.handle('auth-update-profile', async (event, userData) => {
    try {
      if (!currentUser) {
        return { success: false, error: 'No user logged in' }
      }

      const db = getDatabase()
      if (!db) {
        return { success: false, error: 'Database not available' }
      }

      return new Promise((resolve) => {
        const updates: string[] = []
        const params: any[] = []

        if (userData.name !== undefined) {
          updates.push('name = ?')
          params.push(userData.name)
        }
        if (userData.avatarUrl !== undefined) {
          updates.push('avatar_url = ?')
          params.push(userData.avatarUrl)
        }
        if (userData.preferences !== undefined) {
          updates.push('preferences = ?')
          params.push(JSON.stringify(userData.preferences))
        }

        updates.push('updated_at = ?')
        params.push(new Date().toISOString())
        params.push(currentUser!.id)

        db.run(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          params,
          function(err) {
            if (err) {
              console.error('Profile update error:', err)
              resolve({ success: false, error: 'Update failed' })
              return
            }

            // Get updated user
            db.get(
              'SELECT * FROM users WHERE id = ?',
              [currentUser!.id],
              (selectErr, row: User) => {
                if (selectErr || !row) {
                  console.error('Profile select error:', selectErr)
                  resolve({ success: false, error: 'Update failed' })
                  return
                }

                currentUser = row
                const userResponse = {
                  id: row.id,
                  email: row.email,
                  name: row.name,
                  avatarUrl: row.avatar_url,
                  preferences: JSON.parse(row.preferences || '{}'),
                  role: row.role,
                  createdAt: row.created_at,
                  updatedAt: row.updated_at
                }

                resolve({ success: true, user: userResponse })
              }
            )
          }
        )
      })
    } catch (error) {
      console.error('Profile update error:', error)
      return { success: false, error: 'Update failed' }
    }
  })

  // Change password handler
  ipcMain.handle('auth-change-password', async (event, { currentPassword, newPassword }) => {
    try {
      if (!currentUser) {
        return { success: false, error: 'No user logged in' }
      }

      if (newPassword.length < 6) {
        return { success: false, error: 'New password must be at least 6 characters' }
      }

      const db = getDatabase()
      if (!db) {
        return { success: false, error: 'Database not available' }
      }

      return new Promise((resolve) => {
        const currentPasswordHash = hashPassword(currentPassword)
        
        // Verify current password
        db.get(
          'SELECT id FROM users WHERE id = ? AND password_hash = ?',
          [currentUser!.id, currentPasswordHash],
          (err, row) => {
            if (err) {
              console.error('Password verification error:', err)
              resolve({ success: false, error: 'Password change failed' })
              return
            }

            if (!row) {
              resolve({ success: false, error: 'Current password is incorrect' })
              return
            }

            // Update password
            const newPasswordHash = hashPassword(newPassword)
            db.run(
              'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
              [newPasswordHash, new Date().toISOString(), currentUser!.id],
              function(updateErr) {
                if (updateErr) {
                  console.error('Password update error:', updateErr)
                  resolve({ success: false, error: 'Password change failed' })
                  return
                }

                resolve({ success: true })
              }
            )
          }
        )
      })
    } catch (error) {
      console.error('Password change error:', error)
      return { success: false, error: 'Password change failed' }
    }
  })
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function getCurrentUser(): User | null {
  return currentUser
}