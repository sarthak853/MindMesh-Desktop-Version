import { userRepository } from '@/lib/repositories'
import { cache } from '@/lib/cache'
import { ActivityRepository } from '@/lib/repositories/activity'

const activityRepository = new ActivityRepository()

export async function getCurrentUser() {
  // For demo purposes, return a mock user
  // In a real app, this would get the user from Electron's auth context
  return {
    id: 'demo-user-1',
    email: 'demo@example.com',
    name: 'Demo User',
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}

export function createAuthMiddleware() {
  return async (req: Request) => {
    // In Electron environment, auth is handled by the main process
    const userId = null // No Clerk auth in Electron
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    return null // Continue to the next middleware/handler
  }
}

// Role-based access control
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export function hasRole(userRoles: string[], requiredRole: UserRole): boolean {
  return userRoles.includes(requiredRole)
}

export function requireRole(userRoles: string[], requiredRole: UserRole) {
  if (!hasRole(userRoles, requiredRole)) {
    throw new Error(`Access denied. Required role: ${requiredRole}`)
  }
}

// Permission system
export enum Permission {
  READ_DOCUMENTS = 'read:documents',
  WRITE_DOCUMENTS = 'write:documents',
  DELETE_DOCUMENTS = 'delete:documents',
  MANAGE_PROJECTS = 'manage:projects',
  ADMIN_ACCESS = 'admin:access',
}

export function hasPermission(userPermissions: string[], permission: Permission): boolean {
  return userPermissions.includes(permission)
}

export function requirePermission(userPermissions: string[], permission: Permission) {
  if (!hasPermission(userPermissions, permission)) {
    throw new Error(`Access denied. Required permission: ${permission}`)
  }
}

// JWT Token Management
export interface JWTPayload {
  userId: string
  email: string
  role: string
  permissions: string[]
  iat: number
  exp: number
}

export function generateJWT(user: any): string {
  // JWT functionality disabled for Electron app
  // Return a simple token for compatibility
  return `electron-token-${user.id || 'anonymous'}`
}

export function verifyJWT(token: string): JWTPayload | null {
  // JWT verification disabled for Electron app
  // Return null for compatibility
  return null
}

export function getUserPermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    user: [
      Permission.READ_DOCUMENTS,
      Permission.WRITE_DOCUMENTS,
    ],
    moderator: [
      Permission.READ_DOCUMENTS,
      Permission.WRITE_DOCUMENTS,
      Permission.DELETE_DOCUMENTS,
      Permission.MANAGE_PROJECTS,
    ],
    admin: [
      Permission.READ_DOCUMENTS,
      Permission.WRITE_DOCUMENTS,
      Permission.DELETE_DOCUMENTS,
      Permission.MANAGE_PROJECTS,
      Permission.ADMIN_ACCESS,
    ],
  }

  return rolePermissions[role] || rolePermissions.user
}

// Rate limiting
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): Promise<boolean> {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

// Security logging
export async function logSecurityEvent(
  userId: string | null,
  event: string,
  details: Record<string, any>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId,
    event,
    details,
    severity,
    userAgent: details.userAgent || 'unknown',
    ip: details.ip || 'unknown',
  }

  console.log('Security Event:', logEntry)

  // In a production environment, you would send this to a security monitoring service
  // await securityMonitoringService.log(logEntry)
}

// Session management
export async function updateSessionActivity(userId: string) {
  try {
    await userRepository.update(userId, {
      lastActiveAt: new Date(),
    })

    // Update activity log
    await activityRepository.logActivity(
      userId,
      'session_activity',
      'user',
      userId,
      {
        timestamp: new Date().toISOString(),
      }
    )
  } catch (error) {
    console.error('Failed to update session activity:', error)
  }
}