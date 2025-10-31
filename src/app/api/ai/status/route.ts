import { NextResponse } from 'next/server'
// No external API clients - using local mode only

export async function GET() {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      localMode: {
        available: true,
        model: 'local-fallback',
        hasApiKey: false, // Not needed
        baseUrl: 'Local processing'
      },
      fallbackMode: false, // Local mode is primary
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