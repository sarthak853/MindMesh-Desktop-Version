import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['viewer', 'editor', 'admin']).default('viewer'),
  permissions: z.array(z.enum(['read', 'write', 'delete', 'manage_members', 'manage_settings'])).optional(),
  message: z.string().optional()
})

const updateMemberSchema = z.object({
  role: z.enum(['viewer', 'editor', 'admin']).optional(),
  permissions: z.array(z.enum(['read', 'write', 'delete', 'manage_members', 'manage_settings'])).optional()
})

interface RouteParams {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this project
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        members: {
          where: { userId: session.user.id }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const isOwner = project.ownerId === session.user.id
    const userMember = project.members[0]
    const hasAccess = isOwner || userMember || project.isPublic

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all members
    const members = await prisma.projectMember.findMany({
      where: { projectId: params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      },
      orderBy: { joinedAt: 'asc' }
    })

    // Get pending invitations
    const invitations = await prisma.projectInvitation.findMany({
      where: { 
        projectId: params.id,
        status: 'pending'
      },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      members,
      invitations
    })

  } catch (error) {
    console.error('Error fetching project members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project members' },
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
    const validatedData = inviteMemberSchema.parse(body)

    // Check if user has permission to invite members
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        members: {
          where: { userId: session.user.id }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const isOwner = project.ownerId === session.user.id
    const userMember = project.members[0]
    const canInvite = isOwner || 
      (userMember && userMember.permissions.includes('manage_members')) ||
      (project.settings.allowMemberInvites && userMember)

    if (!canInvite) {
      return NextResponse.json({ error: 'Insufficient permissions to invite members' }, { status: 403 })
    }

    // Check if user is already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: params.id,
          userId: session.user.id
        }
      }
    })

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this project' }, { status: 400 })
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.projectInvitation.findFirst({
      where: {
        projectId: params.id,
        email: validatedData.email,
        status: 'pending'
      }
    })

    if (existingInvitation) {
      return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 })
    }

    // Find the user by email
    const invitedUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    // Set default permissions based on role
    const defaultPermissions = getDefaultPermissions(validatedData.role)
    const permissions = validatedData.permissions || defaultPermissions

    // Create invitation
    const invitation = await prisma.projectInvitation.create({
      data: {
        projectId: params.id,
        email: validatedData.email,
        invitedUserId: invitedUser?.id,
        invitedById: session.user.id,
        role: validatedData.role,
        permissions,
        message: validatedData.message,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      },
      include: {
        project: {
          select: { name: true }
        },
        invitedBy: {
          select: { name: true, email: true }
        }
      }
    })

    // TODO: Send invitation email
    // await sendInvitationEmail(invitation)

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        permissions: invitation.permissions,
        message: invitation.message,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        project: invitation.project,
        invitedBy: invitation.invitedBy
      }
    })

  } catch (error) {
    console.error('Error inviting member:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    )
  }
}

function getDefaultPermissions(role: string): string[] {
  switch (role) {
    case 'admin':
      return ['read', 'write', 'delete', 'manage_members', 'manage_settings']
    case 'editor':
      return ['read', 'write']
    case 'viewer':
    default:
      return ['read']
  }
}