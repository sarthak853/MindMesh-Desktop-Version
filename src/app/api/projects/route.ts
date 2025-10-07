import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  templateId: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  settings: z.object({
    allowPublicViewing: z.boolean().default(false),
    allowMemberInvites: z.boolean().default(true),
    defaultPermission: z.enum(['viewer', 'editor', 'admin']).default('viewer'),
    requireApproval: z.boolean().default(false)
  }).optional()
})

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  search: z.string().optional(),
  tags: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'memberCount']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  filter: z.enum(['all', 'owned', 'member', 'public']).optional().default('all')
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createProjectSchema.parse(body)

    // Create project with default settings
    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        isPublic: validatedData.isPublic,
        tags: validatedData.tags || [],
        settings: {
          allowPublicViewing: validatedData.settings?.allowPublicViewing ?? false,
          allowMemberInvites: validatedData.settings?.allowMemberInvites ?? true,
          defaultPermission: validatedData.settings?.defaultPermission ?? 'viewer',
          requireApproval: validatedData.settings?.requireApproval ?? false
        },
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'admin',
            permissions: ['read', 'write', 'delete', 'manage_members', 'manage_settings']
          }
        }
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

    // Initialize project with template if provided
    if (validatedData.templateId) {
      await initializeProjectFromTemplate(project.id, validatedData.templateId)
    }

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        memberCount: project.members.length,
        documentCount: project._count.documents,
        cognitiveMapCount: project._count.cognitiveMaps,
        memoryCardCount: project._count.memoryCards
      }
    })

  } catch (error) {
    console.error('Error creating project:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create project' },
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
    const query = querySchema.parse(Object.fromEntries(searchParams))

    // Build where clause based on filter
    let whereClause: any = {}
    
    switch (query.filter) {
      case 'owned':
        whereClause.ownerId = session.user.id
        break
      case 'member':
        whereClause.members = {
          some: { userId: session.user.id }
        }
        break
      case 'public':
        whereClause.isPublic = true
        break
      case 'all':
      default:
        whereClause = {
          OR: [
            { ownerId: session.user.id },
            { members: { some: { userId: session.user.id } } },
            { isPublic: true }
          ]
        }
        break
    }

    // Add search filter
    if (query.search) {
      whereClause.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    // Add tags filter
    if (query.tags) {
      const tagList = query.tags.split(',').map(tag => tag.trim())
      whereClause.tags = {
        hasSome: tagList
      }
    }

    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
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
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.project.count({ where: whereClause })
    ])

    const formattedProjects = projects.map(project => ({
      ...project,
      memberCount: project.members.length,
      documentCount: project._count.documents,
      cognitiveMapCount: project._count.cognitiveMaps,
      memoryCardCount: project._count.memoryCards,
      userRole: project.members.find(m => m.userId === session.user.id)?.role || 
               (project.ownerId === session.user.id ? 'admin' : 'viewer')
    }))

    return NextResponse.json({
      success: true,
      projects: formattedProjects,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / query.limit)
      }
    })

  } catch (error) {
    console.error('Error fetching projects:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

async function initializeProjectFromTemplate(projectId: string, templateId: string) {
  try {
    // Get template data
    const template = await prisma.projectTemplate.findUnique({
      where: { id: templateId },
      include: {
        documents: true,
        cognitiveMapTemplates: true,
        memoryCardTemplates: true
      }
    })

    if (!template) {
      throw new Error('Template not found')
    }

    // Create documents from template
    if (template.documents.length > 0) {
      await prisma.document.createMany({
        data: template.documents.map(doc => ({
          title: doc.title,
          content: doc.content,
          type: doc.type,
          projectId: projectId,
          tags: doc.tags
        }))
      })
    }

    // Create cognitive maps from template
    if (template.cognitiveMapTemplates.length > 0) {
      for (const mapTemplate of template.cognitiveMapTemplates) {
        await prisma.cognitiveMap.create({
          data: {
            title: mapTemplate.title,
            description: mapTemplate.description,
            projectId: projectId,
            nodes: mapTemplate.nodes,
            edges: mapTemplate.edges,
            settings: mapTemplate.settings
          }
        })
      }
    }

    // Create memory cards from template
    if (template.memoryCardTemplates.length > 0) {
      await prisma.memoryCard.createMany({
        data: template.memoryCardTemplates.map(card => ({
          front: card.front,
          back: card.back,
          tags: card.tags,
          projectId: projectId,
          difficulty: card.difficulty || 1
        }))
      })
    }

  } catch (error) {
    console.error('Error initializing project from template:', error)
    // Don't throw error - project creation should succeed even if template initialization fails
  }
}