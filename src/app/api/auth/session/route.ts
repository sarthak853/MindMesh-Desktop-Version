import { NextRequest, NextResponse } from 'next/server'
import { 
  getCurrentUser, 
  createSession, 
  getUserActiveSessions,
  invalidateSession,
  invalidateAllUserSessions,
  logSecurityEvent
} from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await getUserActiveSessions(user.id)

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching user sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { deviceInfo } = body

    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const session = await createSession(
      user.id,
      deviceInfo,
      clientIP,
      userAgent
    )

    // Log session creation
    await logSecurityEvent(
      user.id,
      'session_created',
      {
        sessionId: session.sessionId,
        deviceInfo,
      },
      clientIP,
      userAgent
    )

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const all = searchParams.get('all') === 'true'

    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    if (all) {
      await invalidateAllUserSessions(user.id)
      
      await logSecurityEvent(
        user.id,
        'all_sessions_invalidated',
        { reason: 'user_request' },
        clientIP,
        userAgent
      )

      return NextResponse.json({ message: 'All sessions invalidated' })
    } else if (sessionId) {
      await invalidateSession(sessionId)
      
      await logSecurityEvent(
        user.id,
        'session_invalidated',
        { sessionId, reason: 'user_request' },
        clientIP,
        userAgent
      )

      return NextResponse.json({ message: 'Session invalidated' })
    } else {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error invalidating session:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate session' },
      { status: 500 }
    )
  }
}