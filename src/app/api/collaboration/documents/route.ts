import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createCollaborativeDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional().default(''),
  projectId: z.string(),
  type: z.enum(['text', 'markdown', 'code']).default('text'),
  tags: z.array(z.string()).optional().default([])
})

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createCollaborativeDocumentSchema.parse(body)

    // Check if user has access to the project
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
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
    const canWrite = isOwner || (userMember && userMember.permissions.includes('write'))

    if (!canWrite) {
      return NextResponse.json({ error: 'Insufficient permissions to create documents' }, { status: 403 })
    }

    // Create the document
    const document = await prisma.document.create({
      data: {
        title: validatedData.title,
        content: validatedData.content,
        type: validatedData.type,
        tags: validatedData.tags,
        projectId: validatedData.projectId,
        createdById: session.user.id,
        isCollaborative: true,
        collaborationSettings: {
          allowRealTimeEditing: true,
          allowComments: true,
          allowSuggestions: true,
          trackChanges: true
        }
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      document
    })

  } catch (error) {
    console.error('Error creating collaborative document:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const documentId = searchParams.get('documentId')

    if (documentId) {
      // Get specific document
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, image: true }
          },
          project: {
            include: {
              members: {
                where: { userId: session.user.id }
              }
            }
          },
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              createdBy: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          },
          comments: {
            where: { isResolved: false },
            orderBy: { createdAt: 'desc' },
            include: {
              author: {
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
          }
        }
      })

      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      // Check access permissions
      const isOwner = document.project.ownerId === session.user.id
      const userMember = document.project.members[0]
      const hasAccess = isOwner || userMember || document.project.isPublic

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      // Determine user permissions
      const userPermissions = isOwner ? 
        ['read', 'write', 'delete', 'manage_comments'] :
        (userMember?.permissions || ['read'])

      return NextResponse.json({
        success: true,
        document: {
          ...document,
          userPermissions,
          canEdit: userPermissions.includes('write'),
          canComment: userPermissions.includes('write') || userPermissions.includes('manage_comments')
        }
      })
    }

    if (projectId) {
      // Get documents for project
      const project = await prisma.project.findUnique({
        where: { id: projectId },
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

      const documents = await prisma.document.findMany({
        where: { 
          projectId,
          isCollaborative: true
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, image: true }
          },
          _count: {
            select: {
              versions: true,
              comments: { where: { isResolved: false } }
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      return NextResponse.json({
        success: true,
        documents: documents.map(doc => ({
          ...doc,
          versionCount: doc._count.versions,
          activeComments: doc._count.comments
        }))
      })
    }

    return NextResponse.json({ error: 'Missing projectId or documentId parameter' }, { status: 400 })

  } catch (error) {
    console.error('Error fetching collaborative documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateDocumentSchema.parse(body)

    // Check document access and permissions
    const document = await prisma.document.findUnique({
      where: { id: documentId },
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

    const isOwner = document.project.ownerId === session.user.id
    const userMember = document.project.members[0]
    const canWrite = isOwner || (userMember && userMember.permissions.includes('write'))

    if (!canWrite) {
      return NextResponse.json({ error: 'Insufficient permissions to edit document' }, { status: 403 })
    }

    // Create version if content changed
    if (validatedData.content && validatedData.content !== document.content) {
      await prisma.documentVersion.create({
        data: {
          documentId,
          content: document.content, // Save current content as version
          version: await getNextVersionNumber(documentId),
          changeDescription: 'Manual save',
          createdById: session.user.id
        }
      })
    }

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.content !== undefined && { content: validatedData.content }),
        ...(validatedData.tags && { tags: validatedData.tags }),
        updatedAt: new Date()
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      document: updatedDocument
    })

  } catch (error) {
    console.error('Error updating collaborative document:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

async function getNextVersionNumber(documentId: string): Promise<number> {
  const lastVersion = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { version: 'desc' },
    select: { version: true }
  })

  return (lastVersion?.version || 0) + 1
}