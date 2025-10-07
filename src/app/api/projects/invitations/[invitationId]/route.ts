import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const respondToInvitationSchema = z.object({
  action: z.enum(['accept', 'decline'])
})

interface RouteParams {
  params: { invitationId: string }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: params.invitationId },
      include: {
        project: {
          select: { 
            id: true, 
            name: true, 
            description: true,
            isPublic: true,
            tags: true
          }
        },
        invitedBy: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if user has access to this invitation
    const hasAccess = invitation.email === session.user.email || 
                     invitation.invitedUserId === session.user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Invitation is no longer valid',
        status: invitation.status 
      }, { status: 400 })
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      // Mark invitation as expired
      await prisma.projectInvitation.update({
        where: { id: params.invitationId },
        data: { status: 'expired' }
      })
      
      return NextResponse.json({ 
        error: 'Invitation has expired' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      invitation
    })

  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = respondToInvitationSchema.parse(body)

    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: params.invitationId },
      include: {
        project: {
          select: { 
            id: true, 
            name: true,
            settings: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if user has access to this invitation
    const hasAccess = invitation.email === session.user.email || 
                     invitation.invitedUserId === session.user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Invitation is no longer valid',
        status: invitation.status 
      }, { status: 400 })
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      await prisma.projectInvitation.update({
        where: { id: params.invitationId },
        data: { status: 'expired' }
      })
      
      return NextResponse.json({ 
        error: 'Invitation has expired' 
      }, { status: 400 })
    }

    if (action === 'decline') {
      // Mark invitation as declined
      await prisma.projectInvitation.update({
        where: { id: params.invitationId },
        data: { 
          status: 'declined',
          respondedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Invitation declined'
      })
    }

    if (action === 'accept') {
      // Check if user is already a member
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: invitation.projectId,
            userId: session.user.id
          }
        }
      })

      if (existingMember) {
        // Mark invitation as accepted but user is already a member
        await prisma.projectInvitation.update({
          where: { id: params.invitationId },
          data: { 
            status: 'accepted',
            respondedAt: new Date()
          }
        })

        return NextResponse.json({
          success: true,
          message: 'You are already a member of this project'
        })
      }

      // Add user as project member
      const newMember = await prisma.projectMember.create({
        data: {
          projectId: invitation.projectId,
          userId: session.user.id,
          role: invitation.role,
          permissions: invitation.permissions,
          joinedAt: new Date()
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }
          },
          project: {
            select: { id: true, name: true }
          }
        }
      })

      // Mark invitation as accepted
      await prisma.projectInvitation.update({
        where: { id: params.invitationId },
        data: { 
          status: 'accepted',
          respondedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: `Welcome to ${invitation.project.name}!`,
        member: newMember
      })
    }

  } catch (error) {
    console.error('Error responding to invitation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to respond to invitation' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: params.invitationId },
      include: {
        project: {
          include: {
            members: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if user has permission to cancel this invitation
    const isOwner = invitation.project.ownerId === session.user.id
    const userMember = invitation.project.members[0]
    const canManageMembers = isOwner || 
      (userMember && userMember.permissions.includes('manage_members'))
    const isInviter = invitation.invitedById === session.user.id

    if (!canManageMembers && !isInviter) {
      return NextResponse.json({ error: 'Insufficient permissions to cancel invitation' }, { status: 403 })
    }

    // Cancel invitation
    await prisma.projectInvitation.update({
      where: { id: params.invitationId },
      data: { 
        status: 'cancelled',
        respondedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled'
    })

  } catch (error) {
    console.error('Error cancelling invitation:', error)
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    )
  }
}