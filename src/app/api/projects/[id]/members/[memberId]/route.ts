import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateMemberSchema = z.object({
  role: z.enum(['viewer', 'editor', 'admin']).optional(),
  permissions: z.array(z.enum(['read', 'write', 'delete', 'manage_members', 'manage_settings'])).optional()
})

interface RouteParams {
  params: Promise<{ id: string; memberId: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateMemberSchema.parse(body)

    // Check if user has permission to manage members
    const { id, memberId } = await params
    const project = await prisma.project.findUnique({
      where: { id },
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
    const canManageMembers = isOwner || 
      (userMember && userMember.permissions.includes('manage_members'))

    if (!canManageMembers) {
      return NextResponse.json({ error: 'Insufficient permissions to manage members' }, { status: 403 })
    }

    // Get the member to update
    const memberToUpdate = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!memberToUpdate || memberToUpdate.projectId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent non-owners from modifying owner permissions
    if (memberToUpdate.userId === project.ownerId && !isOwner) {
      return NextResponse.json({ error: 'Cannot modify project owner permissions' }, { status: 403 })
    }

    // Prevent users from modifying their own permissions (except owner)
    if (memberToUpdate.userId === session.user.id && !isOwner) {
      return NextResponse.json({ error: 'Cannot modify your own permissions' }, { status: 403 })
    }

    // Update member
    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: {
        ...(validatedData.role && { role: validatedData.role }),
        ...(validatedData.permissions && { permissions: validatedData.permissions }),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      member: updatedMember
    })

  } catch (error) {
    console.error('Error updating member:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update member' },
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

    // Check if user has permission to remove members
    const { id, memberId } = await params
    const project = await prisma.project.findUnique({
      where: { id },
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

    // Get the member to remove
    const memberToRemove = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!memberToRemove || memberToRemove.projectId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check permissions
    const canRemoveMembers = isOwner || 
      (userMember && userMember.permissions.includes('manage_members'))
    const isRemovingSelf = memberToRemove.userId === session.user.id

    if (!canRemoveMembers && !isRemovingSelf) {
      return NextResponse.json({ error: 'Insufficient permissions to remove members' }, { status: 403 })
    }

    // Prevent removing the project owner
    if (memberToRemove.userId === project.ownerId) {
      return NextResponse.json({ error: 'Cannot remove project owner' }, { status: 403 })
    }

    // Remove member
    await prisma.projectMember.delete({
      where: { id: memberId }
    })

    return NextResponse.json({
      success: true,
      message: `${memberToRemove.user.name || memberToRemove.user.email} has been removed from the project`
    })

  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}