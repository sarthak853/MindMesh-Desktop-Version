import { NextResponse } from 'next/server'
import { bytezClient } from '@/lib/ai/bytez-client'

export async function GET() {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      bytezClient: {
        available: bytezClient.isAvailable(),
        model: bytezClient.getModel(),
        hasApiKey: !!process.env.BYTEZ_API_KEY,
        baseUrl: process.env.AI_API_BASE_URL || 'https://api.bytez.com/v1'
      },
      fallbackMode: !bytezClient.isAvailable(),
      endpoints: {
        chat: '/api/ai/chat',
        generateNodes: '/api/ai/generate-nodes',
        generateMemoryCards: '/api/ai/generate-memory-cards',
        test: '/api/ai/test'
      }
    }

    return NextResponse.json({
      status: 'healthy',
      ...status
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}