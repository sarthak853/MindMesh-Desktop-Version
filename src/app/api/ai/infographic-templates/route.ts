import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(['business', 'education', 'marketing', 'research', 'comparison', 'timeline', 'process']),
  layout: z.enum(['vertical', 'horizontal', 'grid', 'timeline', 'comparison']),
  elements: z.array(z.object({
    type: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }),
    style: z.record(z.any()),
    placeholder: z.string().optional()
  })),
  dimensions: z.object({
    width: z.number(),
    height: z.number()
  }),
  colorScheme: z.string(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional()
})

interface InfographicTemplate {
  id: string
  name: string
  description?: string
  category: string
  layout: string
  elements: any[]
  dimensions: { width: number; height: number }
  colorScheme: string
  preview: string
  isPublic: boolean
  tags: string[]
  usageCount: number
  createdBy: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

// Built-in templates
const BUILTIN_TEMPLATES: Omit<InfographicTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
  {
    name: 'Business Report',
    description: 'Professional template for business reports and presentations',
    category: 'business',
    layout: 'vertical',
    dimensions: { width: 800, height: 1200 },
    colorScheme: 'blue',
    preview: '/templates/business-report-preview.svg',
    isPublic: true,
    tags: ['business', 'professional', 'report'],
    elements: [
      {
        type: 'title',
        position: { x: 40, y: 40, width: 720, height: 60 },
        style: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
        placeholder: 'Report Title'
      },
      {
        type: 'subtitle',
        position: { x: 40, y: 120, width: 720, height: 30 },
        style: { fontSize: 18, textAlign: 'center' },
        placeholder: 'Subtitle or Date'
      },
      {
        type: 'chart',
        position: { x: 40, y: 180, width: 720, height: 300 },
        style: { backgroundColor: '#f8fafc', borderRadius: 8 },
        placeholder: 'Main Chart'
      },
      {
        type: 'text',
        position: { x: 40, y: 520, width: 340, height: 200 },
        style: { fontSize: 16, lineHeight: 1.6 },
        placeholder: 'Key insights and analysis'
      },
      {
        type: 'text',
        position: { x: 420, y: 520, width: 340, height: 200 },
        style: { fontSize: 16, lineHeight: 1.6 },
        placeholder: 'Additional information'
      },
      {
        type: 'callout',
        position: { x: 40, y: 760, width: 720, height: 80 },
        style: { backgroundColor: '#dbeafe', borderLeft: '4px solid #3b82f6' },
        placeholder: 'Key takeaway or conclusion'
      }
    ]
  },
  {
    name: 'Educational Infographic',
    description: 'Perfect for educational content and tutorials',
    category: 'education',
    layout: 'vertical',
    dimensions: { width: 800, height: 1400 },
    colorScheme: 'green',
    preview: '/templates/educational-preview.svg',
    isPublic: true,
    tags: ['education', 'tutorial', 'learning'],
    elements: [
      {
        type: 'title',
        position: { x: 40, y: 40, width: 720, height: 60 },
        style: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
        placeholder: 'Educational Topic'
      },
      {
        type: 'text',
        position: { x: 40, y: 120, width: 720, height: 60 },
        style: { fontSize: 18, textAlign: 'center' },
        placeholder: 'Brief introduction or overview'
      },
      {
        type: 'subtitle',
        position: { x: 40, y: 220, width: 720, height: 30 },
        style: { fontSize: 20, fontWeight: '600' },
        placeholder: 'Step 1'
      },
      {
        type: 'text',
        position: { x: 40, y: 270, width: 720, height: 100 },
        style: { fontSize: 16, lineHeight: 1.6 },
        placeholder: 'Explanation for step 1'
      },
      {
        type: 'subtitle',
        position: { x: 40, y: 390, width: 720, height: 30 },
        style: { fontSize: 20, fontWeight: '600' },
        placeholder: 'Step 2'
      },
      {
        type: 'text',
        position: { x: 40, y: 440, width: 720, height: 100 },
        style: { fontSize: 16, lineHeight: 1.6 },
        placeholder: 'Explanation for step 2'
      },
      {
        type: 'subtitle',
        position: { x: 40, y: 560, width: 720, height: 30 },
        style: { fontSize: 20, fontWeight: '600' },
        placeholder: 'Step 3'
      },
      {
        type: 'text',
        position: { x: 40, y: 610, width: 720, height: 100 },
        style: { fontSize: 16, lineHeight: 1.6 },
        placeholder: 'Explanation for step 3'
      }
    ]
  },
  {
    name: 'Comparison Chart',
    description: 'Side-by-side comparison template',
    category: 'comparison',
    layout: 'comparison',
    dimensions: { width: 1000, height: 800 },
    colorScheme: 'purple',
    preview: '/templates/comparison-preview.svg',
    isPublic: true,
    tags: ['comparison', 'vs', 'analysis'],
    elements: [
      {
        type: 'title',
        position: { x: 40, y: 40, width: 920, height: 60 },
        style: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
        placeholder: 'Comparison Title'
      },
      {
        type: 'subtitle',
        position: { x: 40, y: 140, width: 440, height: 40 },
        style: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
        placeholder: 'Option A'
      },
      {
        type: 'subtitle',
        position: { x: 520, y: 140, width: 440, height: 40 },
        style: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
        placeholder: 'Option B'
      },
      {
        type: 'text',
        position: { x: 40, y: 200, width: 440, height: 300 },
        style: { fontSize: 16, lineHeight: 1.6 },
        placeholder: 'Features and benefits of Option A'
      },
      {
        type: 'text',
        position: { x: 520, y: 200, width: 440, height: 300 },
        style: { fontSize: 16, lineHeight: 1.6 },
        placeholder: 'Features and benefits of Option B'
      },
      {
        type: 'callout',
        position: { x: 40, y: 540, width: 920, height: 80 },
        style: { backgroundColor: '#f3e8ff', borderLeft: '4px solid #8b5cf6' },
        placeholder: 'Conclusion or recommendation'
      }
    ]
  },
  {
    name: 'Timeline Process',
    description: 'Timeline template for processes and historical events',
    category: 'timeline',
    layout: 'timeline',
    dimensions: { width: 800, height: 1600 },
    colorScheme: 'orange',
    preview: '/templates/timeline-preview.svg',
    isPublic: true,
    tags: ['timeline', 'process', 'history'],
    elements: [
      {
        type: 'title',
        position: { x: 40, y: 40, width: 720, height: 60 },
        style: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
        placeholder: 'Timeline Title'
      },
      {
        type: 'text',
        position: { x: 40, y: 120, width: 720, height: 40 },
        style: { fontSize: 16, textAlign: 'center' },
        placeholder: 'Timeline description'
      },
      // Timeline events would be dynamically generated
      {
        type: 'timeline-event',
        position: { x: 40, y: 200, width: 720, height: 100 },
        style: { borderLeft: '4px solid #f59e0b' },
        placeholder: 'Event 1'
      },
      {
        type: 'timeline-event',
        position: { x: 40, y: 320, width: 720, height: 100 },
        style: { borderLeft: '4px solid #f59e0b' },
        placeholder: 'Event 2'
      },
      {
        type: 'timeline-event',
        position: { x: 40, y: 440, width: 720, height: 100 },
        style: { borderLeft: '4px solid #f59e0b' },
        placeholder: 'Event 3'
      }
    ]
  },
  {
    name: 'Marketing Infographic',
    description: 'Eye-catching template for marketing materials',
    category: 'marketing',
    layout: 'grid',
    dimensions: { width: 800, height: 1200 },
    colorScheme: 'red',
    preview: '/templates/marketing-preview.svg',
    isPublic: true,
    tags: ['marketing', 'promotion', 'stats'],
    elements: [
      {
        type: 'title',
        position: { x: 40, y: 40, width: 720, height: 80 },
        style: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
        placeholder: 'Marketing Headline'
      },
      {
        type: 'chart',
        position: { x: 40, y: 160, width: 340, height: 200 },
        style: { backgroundColor: '#fef2f2', borderRadius: 8 },
        placeholder: 'Key Metric 1'
      },
      {
        type: 'chart',
        position: { x: 420, y: 160, width: 340, height: 200 },
        style: { backgroundColor: '#fef2f2', borderRadius: 8 },
        placeholder: 'Key Metric 2'
      },
      {
        type: 'text',
        position: { x: 40, y: 400, width: 720, height: 150 },
        style: { fontSize: 16, lineHeight: 1.6, textAlign: 'center' },
        placeholder: 'Supporting information and context'
      },
      {
        type: 'callout',
        position: { x: 40, y: 590, width: 720, height: 100 },
        style: { backgroundColor: '#fee2e2', borderLeft: '4px solid #ef4444' },
        placeholder: 'Call to action or key message'
      }
    ]
  }
]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const includePrivate = searchParams.get('includePrivate') === 'true'

    // Get built-in templates
    let templates = BUILTIN_TEMPLATES.map((template, index) => ({
      ...template,
      id: `builtin-${index}`,
      createdBy: {
        id: 'system',
        name: 'System',
        email: 'system@mindmesh.com'
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      usageCount: Math.floor(Math.random() * 1000) + 100
    }))

    // Filter by category if specified
    if (category) {
      templates = templates.filter(t => t.category === category)
    }

    // TODO: Add user-created templates from database
    // if (includePrivate) {
    //   const userTemplates = await getUserTemplates(session.user.id)
    //   templates = [...templates, ...userTemplates]
    // }

    // Sort by usage count
    templates.sort((a, b) => b.usageCount - a.usageCount)

    return NextResponse.json({
      success: true,
      templates,
      categories: [
        { id: 'business', name: 'Business', count: templates.filter(t => t.category === 'business').length },
        { id: 'education', name: 'Education', count: templates.filter(t => t.category === 'education').length },
        { id: 'marketing', name: 'Marketing', count: templates.filter(t => t.category === 'marketing').length },
        { id: 'research', name: 'Research', count: templates.filter(t => t.category === 'research').length },
        { id: 'comparison', name: 'Comparison', count: templates.filter(t => t.category === 'comparison').length },
        { id: 'timeline', name: 'Timeline', count: templates.filter(t => t.category === 'timeline').length },
        { id: 'process', name: 'Process', count: templates.filter(t => t.category === 'process').length }
      ]
    })

  } catch (error) {
    console.error('Error fetching infographic templates:', error)
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

    // TODO: Save custom template to database
    const template = {
      id: `custom-${Date.now()}`,
      ...validatedData,
      createdBy: {
        id: session.user.id,
        name: session.user.name || 'User',
        email: session.user.email || ''
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      preview: generateTemplatePreview(validatedData)
    }

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    console.error('Error creating infographic template:', error)
    
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

function generateTemplatePreview(template: any): string {
  // Generate a simple SVG preview of the template
  const { width, height } = template.dimensions
  const previewWidth = 200
  const previewHeight = (height / width) * previewWidth
  const scale = previewWidth / width

  let svgContent = `
    <svg width="${previewWidth}" height="${previewHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8fafc" stroke="#e2e8f0"/>
  `

  template.elements.forEach((element: any) => {
    const x = element.position.x * scale
    const y = element.position.y * scale
    const w = element.position.width * scale
    const h = element.position.height * scale

    switch (element.type) {
      case 'title':
        svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3b82f6" opacity="0.3" rx="2"/>`
        break
      case 'subtitle':
        svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#6b7280" opacity="0.3" rx="2"/>`
        break
      case 'text':
        svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#9ca3af" opacity="0.2" rx="1"/>`
        break
      case 'chart':
        svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#10b981" opacity="0.3" rx="4"/>`
        break
      case 'callout':
        svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f59e0b" opacity="0.3" rx="2"/>`
        break
    }
  })

  svgContent += '</svg>'
  return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`
}