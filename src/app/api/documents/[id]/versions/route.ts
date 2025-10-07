import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createVersionSchema = z.object({
  changeDescription: z.string().optional(),
  isAutoSave: z.boolean().default(false),
  tags: z.array(z.string()).optional()
})

const restoreVersionSchema = z.object({
  versionId: z.string(),
  createBackup: z.boolean().default(true)
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const includeContent = searchParams.get('includeContent') === 'true'

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

    // Get versions with pagination
    const [versions, totalCount] = await Promise.all([
      prisma.documentVersion.findMany({
        where: { documentId: params.id },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, image: true }
          },
          ...(includeContent ? {} : { content: false })
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.documentVersion.count({
        where: { documentId: params.id }
      })
    ])

    // Calculate diff statistics for each version
    const versionsWithStats = await Promise.all(
      versions.map(async (version, index) => {
        let diffStats = null
        
        if (index < versions.length - 1) {
          const previousVersion = versions[index + 1]
          diffStats = calculateDiffStats(previousVersion.content, version.content)
        } else if (versions.length === 1) {
          // First version - compare with current document
          diffStats = calculateDiffStats('', version.content)
        }

        return {
          ...version,
          diffStats,
          isCurrent: index === 0 && version.version === await getCurrentDocumentVersion(params.id)
        }
      })
    )

    return NextResponse.json({
      success: true,
      versions: versionsWithStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching document versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document versions' },
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
    const validatedData = createVersionSchema.parse(body)

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
    const canWrite = isOwner || (userMember && userMember.permissions.includes('write'))

    if (!canWrite) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get next version number
    const nextVersion = await getNextVersionNumber(params.id)

    // Create version
    const version = await prisma.documentVersion.create({
      data: {
        documentId: params.id,
        content: document.content,
        version: nextVersion,
        changeDescription: validatedData.changeDescription || `Version ${nextVersion}`,
        isAutoSave: validatedData.isAutoSave,
        tags: validatedData.tags || [],
        createdById: session.user.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    // Calculate diff stats
    const previousVersion = await prisma.documentVersion.findFirst({
      where: { 
        documentId: params.id,
        version: { lt: nextVersion }
      },
      orderBy: { version: 'desc' }
    })

    const diffStats = previousVersion 
      ? calculateDiffStats(previousVersion.content, version.content)
      : calculateDiffStats('', version.content)

    return NextResponse.json({
      success: true,
      version: {
        ...version,
        diffStats
      }
    })

  } catch (error) {
    console.error('Error creating document version:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create document version' },
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
    const { versionId, createBackup } = restoreVersionSchema.parse(body)

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
    const canWrite = isOwner || (userMember && userMember.permissions.includes('write'))

    if (!canWrite) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get version to restore
    const versionToRestore = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    if (!versionToRestore || versionToRestore.documentId !== params.id) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Create backup of current state if requested
    if (createBackup) {
      const nextVersion = await getNextVersionNumber(params.id)
      await prisma.documentVersion.create({
        data: {
          documentId: params.id,
          content: document.content,
          version: nextVersion,
          changeDescription: `Backup before restoring to version ${versionToRestore.version}`,
          isAutoSave: true,
          createdById: session.user.id
        }
      })
    }

    // Restore document to version content
    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: {
        content: versionToRestore.content,
        updatedAt: new Date()
      }
    })

    // Create restoration record
    const restorationVersion = await prisma.documentVersion.create({
      data: {
        documentId: params.id,
        content: versionToRestore.content,
        version: await getNextVersionNumber(params.id),
        changeDescription: `Restored to version ${versionToRestore.version}`,
        isAutoSave: false,
        tags: ['restoration'],
        createdById: session.user.id,
        restoredFromVersionId: versionId
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Document restored to version ${versionToRestore.version}`,
      document: updatedDocument,
      restorationVersion
    })

  } catch (error) {
    console.error('Error restoring document version:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to restore document version' },
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

async function getCurrentDocumentVersion(documentId: string): Promise<number> {
  const lastVersion = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { version: 'desc' },
    select: { version: true }
  })

  return lastVersion?.version || 0
}

function calculateDiffStats(oldContent: string, newContent: string) {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  
  let additions = 0
  let deletions = 0
  let modifications = 0

  // Simple line-based diff calculation
  const maxLines = Math.max(oldLines.length, newLines.length)
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || ''
    const newLine = newLines[i] || ''
    
    if (oldLine === '' && newLine !== '') {
      additions++
    } else if (oldLine !== '' && newLine === '') {
      deletions++
    } else if (oldLine !== newLine) {
      modifications++
    }
  }

  return {
    additions,
    deletions,
    modifications,
    totalChanges: additions + deletions + modifications,
    linesAdded: additions,
    linesDeleted: deletions,
    linesModified: modifications,
    oldLength: oldContent.length,
    newLength: newContent.length,
    sizeDelta: newContent.length - oldContent.length
  }
}