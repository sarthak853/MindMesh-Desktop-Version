import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  settings: z.object({
    allowPublicViewing: z.boolean().optional(),
    allowMemberInvites: z.boolean().optional(),
    defaultPermission: z.enum(['viewer', 'editor', 'admin']).optional(),
    requireApproval: z.boolean().optional()
  }).optional()
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        documents: {
          select: {
            id: true,
            title: true,
            type: true,
            createdAt: true,
            updatedAt: true,
            tags: true
          },
          orderBy: { updatedAt: 'desc' }
        },
        cognitiveMaps: {
          select: {
            id: true,
            title: true,
            description: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { updatedAt: 'desc' }
        },
        memoryCards: {
          select: {
            id: true,
            front: true,
            tags: true,
            difficulty: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            documents: true,
            cognitiveMaps: true,
            memoryCards: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user has access to this project
    const userMember = project.members.find(m => m.userId === session.user.id)
    const isOwner = project.ownerId === session.user.id
    const hasAccess = isOwner || userMember || project.isPublic

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Determine user's role and permissions
    const userRole = isOwner ? 'admin' : (userMember?.role || 'viewer')
    const userPermissions = isOwner ? 
      ['read', 'write', 'delete', 'manage_members', 'manage_settings'] :
      (userMember?.permissions || ['read'])

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        memberCount: project.members.length,
        documentCount: project._count.documents,
        cognitiveMapCount: project._count.cognitiveMaps,
        memoryCardCount: project._count.memoryCards,
        userRole,
        userPermissions
      }
    })

  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateProjectSchema.parse(body)

    // Check if user has permission to update this project
    const { id } = await params
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
    const hasManagePermission = isOwner || 
      (userMember && userMember.permissions.includes('manage_settings'))

    if (!hasManagePermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.isPublic !== undefined && { isPublic: validatedData.isPublic }),
        ...(validatedData.tags && { tags: validatedData.tags }),
        ...(validatedData.settings && {
          settings: {
            ...project.settings,
            ...validatedData.settings
          }
        }),
        updatedAt: new Date()
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        _count: {
          select: {
            documents: true,
            cognitiveMaps: true,
            memoryCards: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      project: {
        ...updatedProject,
        memberCount: updatedProject.members.length,
        documentCount: updatedProject._count.documents,
        cognitiveMapCount: updatedProject._count.cognitiveMaps,
        memoryCardCount: updatedProject._count.memoryCards
      }
    })

  } catch (error) {
    console.error('Error updating project:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update project' },
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

    // Check if user is the owner of this project
    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      select: { ownerId: true, name: true }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Only project owner can delete project' }, { status: 403 })
    }

    // Delete project and all related data (cascade delete)
    await prisma.project.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: `Project "${project.name}" has been deleted`
    })

  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}