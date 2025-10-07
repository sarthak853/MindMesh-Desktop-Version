import { NextRequest, NextResponse } from 'next/server'
import { 
  getCurrentUser, 
  generateJWT, 
  verifyJWT, 
  refreshJWT,
  logSecurityEvent
} from '@/lib/auth'

// Generate JWT token for API access
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { purpose = 'api_access' } = body

    const token = generateJWT(user)

    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log JWT generation
    await logSecurityEvent(
      user.id,
      'jwt_generated',
      {
        purpose,
        tokenId: token.substring(0, 10) + '...', // Log partial token for identification
      },
      clientIP,
      userAgent
    )

    return NextResponse.json({ 
      token,
      expiresIn: '24h',
      tokenType: 'Bearer'
    })
  } catch (error) {
    console.error('Error generating JWT:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}

// Verify JWT token
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const payload = verifyJWT(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json({ 
      valid: true,
      payload: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      }
    })
  } catch (error) {
    console.error('Error verifying JWT:', error)
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    )
  }
}

// Refresh JWT token
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const newToken = refreshJWT(token)

    if (!newToken) {
      return NextResponse.json(
        { error: 'Unable to refresh token' },
        { status: 401 }
      )
    }

    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Get user ID from the old token for logging
    const oldPayload = verifyJWT(token)
    if (oldPayload) {
      await logSecurityEvent(
        oldPayload.userId,
        'jwt_refreshed',
        {
          oldTokenId: token.substring(0, 10) + '...',
          newTokenId: newToken.substring(0, 10) + '...',
        },
        clientIP,
        userAgent
      )
    }

    return NextResponse.json({ 
      token: newToken,
      expiresIn: '24h',
      tokenType: 'Bearer'
    })
  } catch (error) {
    console.error('Error refreshing JWT:', error)
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    )
  }
}