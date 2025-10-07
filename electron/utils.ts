import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

export const isDev = process.env.NODE_ENV === 'development'

export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'database')
  
  // Ensure database directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  
  return join(dbDir, 'mindmesh.db')
}

export function getLogsPath(): string {
  const userDataPath = app.getPath('userData')
  const logsDir = join(userDataPath, 'logs')
  
  // Ensure logs directory exists
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true })
  }
  
  return logsDir
}

export function getConfigPath(): string {
  const userDataPath = app.getPath('userData')
  const configDir = join(userDataPath, 'config')
  
  // Ensure config directory exists
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
  
  return configDir
}

export function getDocumentsPath(): string {
  const userDataPath = app.getPath('userData')
  const documentsDir = join(userDataPath, 'documents')
  
  // Ensure documents directory exists
  if (!existsSync(documentsDir)) {
    mkdirSync(documentsDir, { recursive: true })
  }
  
  return documentsDir
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase()
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}