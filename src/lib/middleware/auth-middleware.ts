import { NextRequest, NextResponse } from 'next/server'
import { 
  getCurrentUser, 
  checkRateLimit, 
  logSecurityEvent,
  updateSessionActivity,
  UserRole,
  Permission,
  hasRole,
  hasPermission,
  getUserPermissions
} from '@/lib/auth'

export interface AuthMiddlewareOptions {
  requireAuth?: boolean
  requiredRole?: UserRole
  requiredPermission?: Permission
  rateLimit?: {
    maxRequests: number
    windowMs: number
  }
}

export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  return async (request: NextRequest) => {
    // In Electron environment, auth is handled by the main process
    const userId = null // No Clerk auth in Electron
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Rate limiting
    if (options.rateLimit) {
      const rateLimitKey = `${clientIP}:${request.nextUrl.pathname}`
      const rateLimit = checkRateLimit(
        rateLimitKey,
        options.rateLimit.maxRequests,
        options.rateLimit.windowMs
      )

      if (!rateLimit.allowed) {
        await logSecurityEvent(
          userId,
          'rate_limit_exceeded',
          {
            path: request.nextUrl.pathname,
            method: request.method,
            maxRequests: options.rateLimit.maxRequests,
            windowMs: options.rateLimit.windowMs,
          },
          clientIP,
          userAgent
        )

        return new NextResponse('Rate limit exceeded', {
          status: 429,
          headers: {
            'X-RateLimit-Limit': options.rateLimit.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        })
      }
    }

    // Authentication check
    if (options.requireAuth && !userId) {
      await logSecurityEvent(
        null,
        'unauthorized_access_attempt',
        {
          path: request.nextUrl.pathname,
          method: request.method,
        },
        clientIP,
        userAgent
      )

      return new NextResponse('Unauthorized', { status: 401 })
    }

    if (userId) {
      try {
        const user = await getCurrentUser()
        
        if (!user) {
          return new NextResponse('User not found', { status: 404 })
        }

        if (!user.isActive) {
          await logSecurityEvent(
            userId,
            'inactive_user_access_attempt',
            {
              path: request.nextUrl.pathname,
              method: request.method,
            },
            clientIP,
            userAgent
          )

          return new NextResponse('Account deactivated', { status: 403 })
        }

        // Role-based access control
        if (options.requiredRole && !hasRole([user.role], options.requiredRole)) {
          await logSecurityEvent(
            userId,
            'insufficient_role_access_attempt',
            {
              path: request.nextUrl.pathname,
              method: request.method,
              userRole: user.role,
              requiredRole: options.requiredRole,
            },
            clientIP,
            userAgent
          )

          return new NextResponse('Insufficient permissions', { status: 403 })
        }

        // Permission-based access control
        if (options.requiredPermission) {
          const userPermissions = getUserPermissions(user.role)
          if (!hasPermission(userPermissions, options.requiredPermission)) {
            await logSecurityEvent(
              userId,
              'insufficient_permission_access_attempt',
              {
                path: request.nextUrl.pathname,
                method: request.method,
                userPermissions,
                requiredPermission: options.requiredPermission,
              },
              clientIP,
              userAgent
            )

            return new NextResponse('Insufficient permissions', { status: 403 })
          }
        }

        // Update session activity if session exists
        const sessionId = request.headers.get('x-session-id')
        if (sessionId) {
          await updateSessionActivity(sessionId)
        }

        // Add user info to request headers for downstream handlers
        const response = NextResponse.next()
        response.headers.set('x-user-id', userId)
        response.headers.set('x-user-role', user.role)
        response.headers.set('x-user-permissions', JSON.stringify(getUserPermissions(user.role)))

        return response

      } catch (error) {
        console.error('Auth middleware error:', error)
        
        await logSecurityEvent(
          userId,
          'auth_middleware_error',
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            path: request.nextUrl.pathname,
            method: request.method,
          },
          clientIP,
          userAgent
        )

        return new NextResponse('Internal server error', { status: 500 })
      }
    }

    return NextResponse.next()
  }
}

// Predefined middleware configurations
export const requireAuth = createAuthMiddleware({ requireAuth: true })

export const requireAdmin = createAuthMiddleware({
  requireAuth: true,
  requiredRole: UserRole.ADMIN,
})

export const requireModerator = createAuthMiddleware({
  requireAuth: true,
  requiredRole: UserRole.MODERATOR,
})

export const withRateLimit = (maxRequests: number = 100, windowMs: number = 60000) =>
  createAuthMiddleware({
    rateLimit: { maxRequests, windowMs },
  })

export const requirePermission = (permission: Permission) =>
  createAuthMiddleware({
    requireAuth: true,
    requiredPermission: permission,
  })

// API route wrapper for easy authentication
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authMiddleware = createAuthMiddleware(options)
    const authResult = await authMiddleware(request)

    // If auth middleware returns a response, it means authentication failed
    if (authResult.status !== 200) {
      return authResult
    }

    // Authentication passed, call the original handler
    return handler(request, ...args)
  }
}

// Helper function to extract user info from request headers
export function getUserFromRequest(request: NextRequest): {
  userId: string | null
  role: string | null
  permissions: string[]
} {
  return {
    userId: request.headers.get('x-user-id'),
    role: request.headers.get('x-user-role'),
    permissions: JSON.parse(request.headers.get('x-user-permissions') || '[]'),
  }
}

// CORS middleware for API routes
export function withCORS(
  handler: (request: NextRequest) => Promise<NextResponse>,
  allowedOrigins: string[] = ['http://localhost:3000']
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const origin = request.headers.get('origin')
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin! : allowedOrigins[0],
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-id',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    const response = await handler(request)

    // Add CORS headers to response
    if (allowedOrigins.includes(origin || '')) {
      response.headers.set('Access-Control-Allow-Origin', origin!)
    }
    response.headers.set('Access-Control-Allow-Credentials', 'true')

    return response
  }
}

// Input validation middleware
export function withValidation<T>(
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse>,
  validator: (data: any) => { isValid: boolean; errors: string[]; data?: T }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json()
      const validation = validator(body)

      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.errors },
          { status: 400 }
        )
      }

      return handler(request, validation.data!)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
  }
}

// Logging middleware
export function withLogging(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const start = Date.now()
    const { userId } = auth()

    console.log(`[${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname} - User: ${userId || 'anonymous'}`)

    const response = await handler(request)
    const duration = Date.now() - start

    console.log(`[${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname} - ${response.status} (${duration}ms)`)

    return response
  }
}

// Combine multiple middleware
export function combineMiddleware(
  ...middlewares: Array<(handler: any) => any>
) {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}