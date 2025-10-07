import { NextRequest, NextResponse } from 'next/server'
import { 
  getCurrentUser, 
  deactivateUser,
  reactivateUser,
  updateUserRole,
  UserRole,
  logSecurityEvent,
  hasRole
} from '@/lib/auth'
import { ActivityRepository } from '@/lib/repositories/activity'

const activityRepository = new ActivityRepository()

// Get security events for a user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type')

    // Get security-related activities
    const activities = await activityRepository.findByUserId(user.id, limit)
    const securityEvents = activities.filter(activity => 
      activity.activityType.startsWith('security_') ||
      ['user_login', 'profile_updated', 'role_changed', 'account_deactivated', 'account_reactivated'].includes(activity.activityType)
    )

    const filteredEvents = type 
      ? securityEvents.filter(event => event.activityType === type)
      : securityEvents

    return NextResponse.json({ events: filteredEvents })
  } catch (error) {
    console.error('Error fetching security events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security events' },
      { status: 500 }
    )
  }
}

// Security actions (deactivate, reactivate, role changes)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, targetUserId, reason, newRole } = body

    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Check if user has admin privileges for certain actions
    const requiresAdmin = ['deactivate_user', 'reactivate_user', 'change_role']
    if (requiresAdmin.includes(action) && !hasRole([user.role], UserRole.ADMIN)) {
      await logSecurityEvent(
        user.id,
        'unauthorized_security_action_attempt',
        {
          action,
          targetUserId,
          userRole: user.role,
        },
        clientIP,
        userAgent
      )

      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    switch (action) {
      case 'deactivate_account':
        // Users can deactivate their own account
        if (targetUserId && targetUserId !== user.id && !hasRole([user.role], UserRole.ADMIN)) {
          return NextResponse.json(
            { error: 'Can only deactivate your own account' },
            { status: 403 }
          )
        }

        await deactivateUser(targetUserId || user.id, reason)
        
        await logSecurityEvent(
          user.id,
          'account_deactivation_requested',
          {
            targetUserId: targetUserId || user.id,
            reason,
            selfDeactivation: !targetUserId || targetUserId === user.id,
          },
          clientIP,
          userAgent
        )

        return NextResponse.json({ message: 'Account deactivated successfully' })

      case 'reactivate_user':
        if (!targetUserId) {
          return NextResponse.json(
            { error: 'Target user ID required' },
            { status: 400 }
          )
        }

        await reactivateUser(targetUserId)
        
        await logSecurityEvent(
          user.id,
          'account_reactivation_performed',
          {
            targetUserId,
            performedBy: user.id,
          },
          clientIP,
          userAgent
        )

        return NextResponse.json({ message: 'Account reactivated successfully' })

      case 'change_role':
        if (!targetUserId || !newRole) {
          return NextResponse.json(
            { error: 'Target user ID and new role required' },
            { status: 400 }
          )
        }

        if (!Object.values(UserRole).includes(newRole)) {
          return NextResponse.json(
            { error: 'Invalid role' },
            { status: 400 }
          )
        }

        await updateUserRole(targetUserId, newRole)
        
        await logSecurityEvent(
          user.id,
          'role_change_performed',
          {
            targetUserId,
            newRole,
            performedBy: user.id,
          },
          clientIP,
          userAgent
        )

        return NextResponse.json({ message: 'Role updated successfully' })

      case 'log_security_event':
        // Allow users to report security concerns
        const { eventType, details } = body
        
        await logSecurityEvent(
          user.id,
          `user_reported_${eventType}`,
          {
            reportedBy: user.id,
            details,
            timestamp: new Date().toISOString(),
          },
          clientIP,
          userAgent
        )

        return NextResponse.json({ message: 'Security event logged' })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error performing security action:', error)
    return NextResponse.json(
      { error: 'Failed to perform security action' },
      { status: 500 }
    )
  }
}