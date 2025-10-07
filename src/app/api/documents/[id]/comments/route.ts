import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['comment', 'suggestion', 'question', 'issue']).default('comment'),
  position: z.object({
    start: z.object({
      line: z.number().min(0),
      column: z.number().min(0)
    }),
    end: z.object({
      line: z.number().min(0),
      column: z.number().min(0)
    })
  }).optional(),
  selectedText: z.string().optional(),
  parentId: z.string().optional(), // For replies
  tags: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedToId: z.string().optional()
})

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  isResolved: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedToId: z.string().optional(),
  tags: z.array(z.string()).optional()
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

    const { searchParams } = new URL(request.url)
    const includeResolved = searchParams.get('includeResolved') === 'true'
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const assignedToMe = searchParams.get('assignedToMe') === 'true'

    // Check document access
    const document = await prisma.document.findUnique({
      where: { id: params.id },
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

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const isOwner = document.project?.ownerId === session.user.id
    const userMember = document.project?.members[0]
    const hasAccess = isOwner || userMember || document.project?.isPublic

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build where clause
    let whereClause: any = {
      documentId: params.id,
      parentId: null // Only get top-level comments
    }

    if (!includeResolved) {
      whereClause.isResolved = false
    }

    if (type) {
      whereClause.type = type
    }

    if (priority) {
      whereClause.priority = priority
    }

    if (assignedToMe) {
      whereClause.assignedToId = session.user.id
    }

    // Get comments with replies
    const comments = await prisma.documentComment.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true, image: true }
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true }
            },
            assignedTo: {
              select: { id: true, name: true, email: true, image: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { replies: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Get comment statistics
    const stats = await prisma.documentComment.groupBy({
      by: ['type', 'priority', 'isResolved'],
      where: { documentId: params.id },
      _count: true
    })

    const commentStats = {
      total: stats.reduce((sum, stat) => sum + stat._count, 0),
      byType: stats.reduce((acc, stat) => {
        acc[stat.type] = (acc[stat.type] || 0) + stat._count
        return acc
      }, {} as Record<string, number>),
      byPriority: stats.reduce((acc, stat) => {
        acc[stat.priority] = (acc[stat.priority] || 0) + stat._count
        return acc
      }, {} as Record<string, number>),
      resolved: stats.filter(s => s.isResolved).reduce((sum, stat) => sum + stat._count, 0),
      unresolved: stats.filter(s => !s.isResolved).reduce((sum, stat) => sum + stat._count, 0)
    }

    return NextResponse.json({
      success: true,
      comments,
      stats: commentStats
    })

  } catch (error) {
    console.error('Error fetching document comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document comments' },
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
    const validatedData = createCommentSchema.parse(body)

    // Check document access and permissions
    const document = await prisma.document.findUnique({
      where: { id: params.id },
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

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const isOwner = document.project?.ownerId === session.user.id
    const userMember = document.project?.members[0]
    const canComment = isOwner || userMember

    if (!canComment) {
      return NextResponse.json({ error: 'Insufficient permissions to comment' }, { status: 403 })
    }

    // Validate parent comment if this is a reply
    if (validatedData.parentId) {
      const parentComment = await prisma.documentComment.findUnique({
        where: { id: validatedData.parentId }
      })

      if (!parentComment || parentComment.documentId !== params.id) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }
    }

    // Validate assigned user if specified
    if (validatedData.assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: validatedData.assignedToId }
      })

      if (!assignedUser) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 })
      }

      // Check if assigned user has access to the document
      const hasAccess = document.project?.ownerId === validatedData.assignedToId ||
                       document.project?.members.some(m => m.userId === validatedData.assignedToId) ||
                       document.project?.isPublic

      if (!hasAccess) {
        return NextResponse.json({ error: 'Assigned user does not have access to this document' }, { status: 400 })
      }
    }

    // Create comment
    const comment = await prisma.documentComment.create({
      data: {
        documentId: params.id,
        authorId: session.user.id,
        content: validatedData.content,
        type: validatedData.type,
        position: validatedData.position,
        selectedText: validatedData.selectedText,
        parentId: validatedData.parentId,
        tags: validatedData.tags || [],
        priority: validatedData.priority,
        assignedToId: validatedData.assignedToId
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true, image: true }
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        }
      }
    })

    // Create notification for assigned user
    if (validatedData.assignedToId && validatedData.assignedToId !== session.user.id) {
      await createCommentNotification(comment.id, validatedData.assignedToId, 'assigned')
    }

    // Create notification for parent comment author (if reply)
    if (validatedData.parentId) {
      const parentComment = await prisma.documentComment.findUnique({
        where: { id: validatedData.parentId },
        select: { authorId: true }
      })

      if (parentComment && parentComment.authorId !== session.user.id) {
        await createCommentNotification(comment.id, parentComment.authorId, 'reply')
      }
    }

    return NextResponse.json({
      success: true,
      comment
    })

  } catch (error) {
    console.error('Error creating document comment:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create comment' },
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

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateCommentSchema.parse(body)

    // Check comment access and permissions
    const comment = await prisma.documentComment.findUnique({
      where: { id: commentId },
      include: {
        document: {
          include: {
            project: {
              include: {
                members: {
                  where: { userId: session.user.id }
                }
              }
            }
          }
        }
      }
    })

    if (!comment || comment.documentId !== params.id) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const isAuthor = comment.authorId === session.user.id
    const isOwner = comment.document.project?.ownerId === session.user.id
    const userMember = comment.document.project?.members[0]
    const canManage = isOwner || (userMember && userMember.permissions.includes('manage_comments'))

    // Authors can edit their own comments, managers can edit any comment
    const canEdit = isAuthor || canManage

    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions to edit comment' }, { status: 403 })
    }

    // Update comment
    const updatedComment = await prisma.documentComment.update({
      where: { id: commentId },
      data: {
        ...(validatedData.content && { content: validatedData.content }),
        ...(validatedData.isResolved !== undefined && { 
          isResolved: validatedData.isResolved,
          resolvedAt: validatedData.isResolved ? new Date() : null,
          resolvedById: validatedData.isResolved ? session.user.id : null
        }),
        ...(validatedData.priority && { priority: validatedData.priority }),
        ...(validatedData.assignedToId !== undefined && { assignedToId: validatedData.assignedToId }),
        ...(validatedData.tags && { tags: validatedData.tags }),
        updatedAt: new Date()
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true, image: true }
        },
        resolvedBy: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    // Create notification for assignment change
    if (validatedData.assignedToId && validatedData.assignedToId !== comment.assignedToId) {
      await createCommentNotification(commentId, validatedData.assignedToId, 'assigned')
    }

    return NextResponse.json({
      success: true,
      comment: updatedComment
    })

  } catch (error) {
    console.error('Error updating document comment:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update comment' },
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

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })
    }

    // Check comment access and permissions
    const comment = await prisma.documentComment.findUnique({
      where: { id: commentId },
      include: {
        document: {
          include: {
            project: {
              include: {
                members: {
                  where: { userId: session.user.id }
                }
              }
            }
          }
        },
        replies: true
      }
    })

    if (!comment || comment.documentId !== params.id) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const isAuthor = comment.authorId === session.user.id
    const isOwner = comment.document.project?.ownerId === session.user.id
    const userMember = comment.document.project?.members[0]
    const canManage = isOwner || (userMember && userMember.permissions.includes('manage_comments'))

    const canDelete = isAuthor || canManage

    if (!canDelete) {
      return NextResponse.json({ error: 'Insufficient permissions to delete comment' }, { status: 403 })
    }

    // Delete comment and all replies (cascade)
    await prisma.documentComment.delete({
      where: { id: commentId }
    })

    return NextResponse.json({
      success: true,
      message: `Comment and ${comment.replies.length} replies deleted`
    })

  } catch (error) {
    console.error('Error deleting document comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}

async function createCommentNotification(commentId: string, userId: string, type: 'assigned' | 'reply' | 'resolved') {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: 'comment',
        title: getNotificationTitle(type),
        message: getNotificationMessage(type),
        data: {
          commentId,
          type
        }
      }
    })
  } catch (error) {
    console.error('Error creating comment notification:', error)
  }
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case 'assigned': return 'Comment Assigned'
    case 'reply': return 'New Reply'
    case 'resolved': return 'Comment Resolved'
    default: return 'Comment Update'
  }
}

function getNotificationMessage(type: string): string {
  switch (type) {
    case 'assigned': return 'A comment has been assigned to you'
    case 'reply': return 'Someone replied to your comment'
    case 'resolved': return 'Your comment has been resolved'
    default: return 'A comment has been updated'
  }
}