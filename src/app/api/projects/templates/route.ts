import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(['research', 'education', 'business', 'personal', 'collaboration']),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  projectId: z.string().optional() // Create template from existing project
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const includePrivate = searchParams.get('includePrivate') === 'true'

    let whereClause: any = {
      OR: [
        { isPublic: true },
        ...(includePrivate ? [{ createdById: session.user.id }] : [])
      ]
    }

    if (category) {
      whereClause.category = category
    }

    if (search) {
      whereClause.AND = [
        whereClause,
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }
      ]
    }

    const templates = await prisma.projectTemplate.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true }
        },
        _count: {
          select: {
            documents: true,
            cognitiveMapTemplates: true,
            memoryCardTemplates: true,
            usedByProjects: true
          }
        }
      },
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    const formattedTemplates = templates.map(template => ({
      ...template,
      documentCount: template._count.documents,
      cognitiveMapCount: template._count.cognitiveMapTemplates,
      memoryCardCount: template._count.memoryCardTemplates,
      usageCount: template._count.usedByProjects
    }))

    return NextResponse.json({
      success: true,
      templates: formattedTemplates
    })

  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body)

    let templateData: any = {
      name: validatedData.name,
      description: validatedData.description,
      category: validatedData.category,
      tags: validatedData.tags || [],
      isPublic: validatedData.isPublic,
      createdById: session.user.id
    }

    // If creating from existing project
    if (validatedData.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: validatedData.projectId },
        include: {
          documents: true,
          cognitiveMaps: true,
          memoryCards: true,
          members: {
            where: { userId: session.user.id }
          }
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      // Check if user has access to this project
      const isOwner = project.ownerId === session.user.id
      const userMember = project.members[0]
      const hasAccess = isOwner || userMember

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to project' }, { status: 403 })
      }

      // Create template with project data
      const template = await prisma.projectTemplate.create({
        data: {
          ...templateData,
          documents: {
            create: project.documents.map(doc => ({
              title: doc.title,
              content: doc.content,
              type: doc.type,
              tags: doc.tags
            }))
          },
          cognitiveMapTemplates: {
            create: project.cognitiveMaps.map(map => ({
              title: map.title,
              description: map.description,
              nodes: map.nodes,
              edges: map.edges,
              settings: map.settings
            }))
          },
          memoryCardTemplates: {
            create: project.memoryCards.map(card => ({
              front: card.front,
              back: card.back,
              tags: card.tags,
              difficulty: card.difficulty
            }))
          }
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, image: true }
          },
          _count: {
            select: {
              documents: true,
              cognitiveMapTemplates: true,
              memoryCardTemplates: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        template: {
          ...template,
          documentCount: template._count.documents,
          cognitiveMapCount: template._count.cognitiveMapTemplates,
          memoryCardCount: template._count.memoryCardTemplates
        }
      })
    }

    // Create empty template
    const template = await prisma.projectTemplate.create({
      data: templateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true }
        },
        _count: {
          select: {
            documents: true,
            cognitiveMapTemplates: true,
            memoryCardTemplates: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        documentCount: template._count.documents,
        cognitiveMapCount: template._count.cognitiveMapTemplates,
        memoryCardCount: template._count.memoryCardTemplates
      }
    })

  } catch (error) {
    console.error('Error creating template:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}