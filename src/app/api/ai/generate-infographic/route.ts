import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { openai } from '@/lib/ai/openai-client'
import { z } from 'zod'

const generateInfographicSchema = z.object({
  content: z.string().min(10).max(5000),
  title: z.string().min(1).max(200).optional(),
  templateId: z.string().optional(),
  style: z.object({
    colorScheme: z.enum(['blue', 'green', 'purple', 'orange', 'red', 'teal', 'custom']).default('blue'),
    customColors: z.object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
      background: z.string().optional(),
      text: z.string().optional()
    }).optional(),
    layout: z.enum(['vertical', 'horizontal', 'grid', 'timeline', 'comparison']).default('vertical'),
    theme: z.enum(['modern', 'minimal', 'corporate', 'creative', 'academic']).default('modern'),
    fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
    spacing: z.enum(['compact', 'normal', 'spacious']).default('normal')
  }).optional(),
  dimensions: z.object({
    width: z.number().min(400).max(2000).default(800),
    height: z.number().min(400).max(2000).default(1200),
    format: z.enum(['square', 'portrait', 'landscape', 'custom']).default('portrait')
  }).optional(),
  branding: z.object({
    logo: z.string().optional(),
    companyName: z.string().optional(),
    website: z.string().optional(),
    colors: z.array(z.string()).optional()
  }).optional(),
  includeCharts: z.boolean().default(true),
  includeIcons: z.boolean().default(true),
  language: z.string().default('en')
})

interface InfographicElement {
  type: 'title' | 'subtitle' | 'text' | 'chart' | 'icon' | 'image' | 'divider' | 'callout'
  content: string
  position: { x: number; y: number; width: number; height: number }
  style: Record<string, any>
  data?: any
}

interface InfographicDesign {
  id: string
  title: string
  elements: InfographicElement[]
  style: Record<string, any>
  dimensions: { width: number; height: number }
  metadata: {
    template: string
    theme: string
    colorScheme: string
    generatedAt: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = generateInfographicSchema.parse(body)

    // Generate infographic structure using AI
    const infographicStructure = await generateInfographicStructure(
      validatedData.content,
      validatedData.title,
      validatedData.style,
      validatedData.includeCharts,
      validatedData.includeIcons
    )

    // Apply template if specified
    let template = null
    if (validatedData.templateId) {
      template = await getInfographicTemplate(validatedData.templateId)
    }

    // Generate the infographic design
    const design = await createInfographicDesign(
      infographicStructure,
      validatedData.style || {},
      validatedData.dimensions || { width: 800, height: 1200, format: 'portrait' },
      validatedData.branding,
      template
    )

    // Generate SVG representation
    const svgContent = await generateSVG(design)

    // Save to database for future reference
    const savedInfographic = await saveInfographic({
      userId: session.user.id,
      title: validatedData.title || 'Generated Infographic',
      content: validatedData.content,
      design,
      svgContent,
      style: validatedData.style,
      dimensions: validatedData.dimensions
    })

    return NextResponse.json({
      success: true,
      infographic: {
        id: savedInfographic.id,
        title: savedInfographic.title,
        design,
        svgContent,
        downloadUrl: `/api/ai/generate-infographic/${savedInfographic.id}/download`,
        editUrl: `/api/ai/generate-infographic/${savedInfographic.id}/edit`
      }
    })

  } catch (error) {
    console.error('Error generating infographic:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate infographic' },
      { status: 500 }
    )
  }
}

async function generateInfographicStructure(
  content: string,
  title?: string,
  style?: any,
  includeCharts: boolean = true,
  includeIcons: boolean = true
) {
  const prompt = `
You are an expert infographic designer. Analyze the following content and create a structured infographic design.

Content: "${content}"
Title: "${title || 'Auto-generated'}"
Include Charts: ${includeCharts}
Include Icons: ${includeIcons}

Create a JSON structure with the following format:
{
  "title": "Main title",
  "sections": [
    {
      "type": "header|content|stats|comparison|timeline|conclusion",
      "title": "Section title",
      "content": "Section content",
      "visualType": "text|chart|icon|image|callout",
      "data": {}, // For charts or structured data
      "importance": 1-5, // Visual weight
      "suggestedIcon": "icon-name" // If applicable
    }
  ],
  "keyPoints": ["point1", "point2", "point3"], // Max 5 key points
  "suggestedCharts": [
    {
      "type": "bar|pie|line|donut|progress",
      "title": "Chart title",
      "data": [], // Chart data if extractable
      "description": "What this chart shows"
    }
  ],
  "colorSuggestions": {
    "primary": "#color",
    "secondary": "#color",
    "accent": "#color"
  }
}

Focus on:
1. Clear hierarchy and flow
2. Data visualization opportunities
3. Key statistics or numbers
4. Logical grouping of information
5. Visual balance and readability

Respond with valid JSON only.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    })

    const structureText = response.choices[0]?.message?.content
    if (!structureText) {
      throw new Error('No structure generated')
    }

    return JSON.parse(structureText)
  } catch (error) {
    console.error('Error generating infographic structure:', error)
    
    // Fallback structure
    return {
      title: title || 'Infographic',
      sections: [
        {
          type: 'header',
          title: title || 'Main Title',
          content: content.substring(0, 200),
          visualType: 'text',
          importance: 5
        },
        {
          type: 'content',
          title: 'Key Information',
          content: content,
          visualType: 'text',
          importance: 3
        }
      ],
      keyPoints: extractKeyPoints(content),
      suggestedCharts: [],
      colorSuggestions: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        accent: '#10B981'
      }
    }
  }
}

async function createInfographicDesign(
  structure: any,
  style: any,
  dimensions: any,
  branding?: any,
  template?: any
): Promise<InfographicDesign> {
  const { width, height } = dimensions
  const elements: InfographicElement[] = []
  
  // Color scheme
  const colorScheme = getColorScheme(style.colorScheme || 'blue', style.customColors)
  
  let currentY = 40 // Start position
  const padding = 40
  const contentWidth = width - (padding * 2)

  // Title
  if (structure.title) {
    elements.push({
      type: 'title',
      content: structure.title,
      position: { x: padding, y: currentY, width: contentWidth, height: 60 },
      style: {
        fontSize: style.fontSize === 'large' ? 32 : style.fontSize === 'small' ? 24 : 28,
        fontWeight: 'bold',
        color: colorScheme.primary,
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif'
      }
    })
    currentY += 80
  }

  // Process sections
  for (const section of structure.sections) {
    const sectionHeight = calculateSectionHeight(section, contentWidth)
    
    // Section title
    if (section.title && section.type !== 'header') {
      elements.push({
        type: 'subtitle',
        content: section.title,
        position: { x: padding, y: currentY, width: contentWidth, height: 30 },
        style: {
          fontSize: 20,
          fontWeight: '600',
          color: colorScheme.secondary,
          marginBottom: 10,
          fontFamily: 'Inter, sans-serif'
        }
      })
      currentY += 40
    }

    // Section content
    if (section.visualType === 'chart' && section.data) {
      elements.push({
        type: 'chart',
        content: section.title,
        position: { x: padding, y: currentY, width: contentWidth, height: 200 },
        style: {
          backgroundColor: colorScheme.background,
          borderRadius: 8,
          padding: 20
        },
        data: section.data
      })
      currentY += 220
    } else if (section.visualType === 'callout') {
      elements.push({
        type: 'callout',
        content: section.content,
        position: { x: padding, y: currentY, width: contentWidth, height: 80 },
        style: {
          backgroundColor: colorScheme.accent + '20',
          borderLeft: `4px solid ${colorScheme.accent}`,
          padding: 20,
          borderRadius: 4,
          fontSize: 16,
          fontStyle: 'italic'
        }
      })
      currentY += 100
    } else {
      // Regular text content
      const textHeight = calculateTextHeight(section.content, contentWidth, 16)
      elements.push({
        type: 'text',
        content: section.content,
        position: { x: padding, y: currentY, width: contentWidth, height: textHeight },
        style: {
          fontSize: 16,
          lineHeight: 1.6,
          color: colorScheme.text,
          fontFamily: 'Inter, sans-serif'
        }
      })
      currentY += textHeight + 20
    }

    // Add spacing between sections
    currentY += style.spacing === 'compact' ? 10 : style.spacing === 'spacious' ? 30 : 20
  }

  // Add key points if available
  if (structure.keyPoints && structure.keyPoints.length > 0) {
    elements.push({
      type: 'subtitle',
      content: 'Key Takeaways',
      position: { x: padding, y: currentY, width: contentWidth, height: 30 },
      style: {
        fontSize: 20,
        fontWeight: '600',
        color: colorScheme.secondary,
        marginBottom: 10,
        fontFamily: 'Inter, sans-serif'
      }
    })
    currentY += 40

    structure.keyPoints.forEach((point: string, index: number) => {
      elements.push({
        type: 'text',
        content: `• ${point}`,
        position: { x: padding, y: currentY, width: contentWidth, height: 25 },
        style: {
          fontSize: 16,
          color: colorScheme.text,
          fontFamily: 'Inter, sans-serif'
        }
      })
      currentY += 30
    })
  }

  // Add branding if provided
  if (branding?.companyName) {
    currentY += 20
    elements.push({
      type: 'text',
      content: branding.companyName,
      position: { x: padding, y: currentY, width: contentWidth, height: 20 },
      style: {
        fontSize: 12,
        color: colorScheme.text + '80',
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif'
      }
    })
  }

  return {
    id: `infographic-${Date.now()}`,
    title: structure.title,
    elements,
    style: {
      colorScheme,
      theme: style.theme || 'modern',
      layout: style.layout || 'vertical'
    },
    dimensions: { width, height: Math.max(height, currentY + 40) },
    metadata: {
      template: template?.id || 'custom',
      theme: style.theme || 'modern',
      colorScheme: style.colorScheme || 'blue',
      generatedAt: new Date().toISOString()
    }
  }
}

async function generateSVG(design: InfographicDesign): Promise<string> {
  const { width, height } = design.dimensions
  const { colorScheme } = design.style

  let svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .title { font-family: 'Inter', sans-serif; font-weight: bold; }
          .subtitle { font-family: 'Inter', sans-serif; font-weight: 600; }
          .text { font-family: 'Inter', sans-serif; }
          .callout { font-family: 'Inter', sans-serif; font-style: italic; }
        </style>
      </defs>
      <rect width="100%" height="100%" fill="${colorScheme.background || '#ffffff'}"/>
  `

  for (const element of design.elements) {
    const { x, y, width: w, height: h } = element.position

    switch (element.type) {
      case 'title':
        svgContent += `
          <text x="${x + w/2}" y="${y + h/2}" 
                text-anchor="middle" dominant-baseline="middle"
                class="title" 
                font-size="${element.style.fontSize}" 
                fill="${element.style.color}">
            ${escapeXml(element.content)}
          </text>
        `
        break

      case 'subtitle':
        svgContent += `
          <text x="${x}" y="${y + 20}" 
                class="subtitle" 
                font-size="${element.style.fontSize}" 
                fill="${element.style.color}">
            ${escapeXml(element.content)}
          </text>
        `
        break

      case 'text':
        const lines = wrapText(element.content, w, element.style.fontSize)
        lines.forEach((line, index) => {
          svgContent += `
            <text x="${x}" y="${y + 20 + (index * 24)}" 
                  class="text" 
                  font-size="${element.style.fontSize}" 
                  fill="${element.style.color}">
              ${escapeXml(line)}
            </text>
          `
        })
        break

      case 'callout':
        svgContent += `
          <rect x="${x}" y="${y}" width="${w}" height="${h}" 
                fill="${element.style.backgroundColor}" 
                rx="${element.style.borderRadius}"/>
          <rect x="${x}" y="${y}" width="4" height="${h}" 
                fill="${element.style.borderLeft?.split(' ')[3]}"/>
          <text x="${x + 20}" y="${y + h/2}" 
                dominant-baseline="middle"
                class="callout" 
                font-size="${element.style.fontSize}" 
                fill="${colorScheme.text}">
            ${escapeXml(element.content)}
          </text>
        `
        break

      case 'chart':
        // Simple bar chart implementation
        if (element.data && element.data.type === 'bar') {
          svgContent += generateBarChart(element, x, y, w, h, colorScheme)
        }
        break
    }
  }

  svgContent += '</svg>'
  return svgContent
}

// Helper functions
function getColorScheme(scheme: string, customColors?: any) {
  const schemes = {
    blue: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#60A5FA',
      background: '#F8FAFC',
      text: '#1F2937'
    },
    green: {
      primary: '#10B981',
      secondary: '#047857',
      accent: '#34D399',
      background: '#F0FDF4',
      text: '#1F2937'
    },
    purple: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      accent: '#A78BFA',
      background: '#FAF5FF',
      text: '#1F2937'
    },
    orange: {
      primary: '#F59E0B',
      secondary: '#D97706',
      accent: '#FCD34D',
      background: '#FFFBEB',
      text: '#1F2937'
    }
  }

  const baseScheme = schemes[scheme as keyof typeof schemes] || schemes.blue
  
  return customColors ? { ...baseScheme, ...customColors } : baseScheme
}

function calculateSectionHeight(section: any, width: number): number {
  if (section.visualType === 'chart') return 200
  if (section.visualType === 'callout') return 80
  return calculateTextHeight(section.content, width, 16)
}

function calculateTextHeight(text: string, width: number, fontSize: number): number {
  const charsPerLine = Math.floor(width / (fontSize * 0.6))
  const lines = Math.ceil(text.length / charsPerLine)
  return lines * (fontSize * 1.6)
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.6))
  const words = text.split(' ')
  const lines = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + word).length <= charsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  
  if (currentLine) lines.push(currentLine)
  return lines
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function generateBarChart(element: any, x: number, y: number, w: number, h: number, colorScheme: any): string {
  // Simplified bar chart - in production you'd want a more sophisticated implementation
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" 
          fill="${colorScheme.background}" stroke="${colorScheme.primary}" rx="4"/>
    <text x="${x + w/2}" y="${y + h/2}" 
          text-anchor="middle" dominant-baseline="middle"
          fill="${colorScheme.text}">
      [Chart: ${element.content}]
    </text>
  `
}

function extractKeyPoints(content: string): string[] {
  // Simple key point extraction - in production you'd use more sophisticated NLP
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
  return sentences.slice(0, 5).map(s => s.trim())
}

async function getInfographicTemplate(templateId: string) {
  // Template loading logic - would fetch from database
  return null
}

async function saveInfographic(data: any) {
  // Save to database - simplified for now
  return {
    id: `infographic-${Date.now()}`,
    ...data
  }
}