import { NextRequest, NextResponse } from 'next/server'
import { bytezClient } from '@/lib/ai/bytez-client'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Bytez connection...')
    
    if (!bytezClient.isAvailable()) {
      return NextResponse.json({
        success: false,
        error: 'Bytez client not available. Check your API key.',
        config: {
          hasApiKey: !!process.env.BYTEZ_API_KEY,
          provider: 'bytez',
          model: process.env.AI_MODEL,
          baseUrl: process.env.AI_API_BASE_URL || 'https://bytez.com/api'
        }
      }, { status: 503 })
    }

    // Test with a simple message
    const testMessages = [
      { role: 'user' as const, content: 'Hello! Please respond with "AI connection successful"' }
    ]

    console.log('Sending test request to Bytez...')
    const response = await bytezClient.createChatCompletion(testMessages, {
      maxTokens: 50,
      temperature: 0.1
    })

    console.log('Bytez response:', response)

    return NextResponse.json({
      success: true,
      message: 'Bytez connection successful',
      response: response.choices[0]?.message?.content || 'No response content',
      config: {
        provider: 'bytez',
        model: process.env.AI_MODEL,
        baseUrl: process.env.AI_API_BASE_URL || 'https://bytez.com/api'
      }
    })

  } catch (error: any) {
    console.error('Bytez test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: error.toString(),
      config: {
        hasApiKey: !!process.env.BYTEZ_API_KEY,
        provider: 'bytez',
        model: process.env.AI_MODEL,
        baseUrl: process.env.AI_API_BASE_URL || 'https://bytez.com/api'
      }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const testMessages = [
      { role: 'user' as const, content: message }
    ]

    const response = await bytezClient.createChatCompletion(testMessages, {
      maxTokens: 200,
      temperature: 0.7
    })

    return NextResponse.json({
      success: true,
      response: response.choices[0]?.message?.content || 'No response content'
    })

  } catch (error: any) {
    console.error('Bytez test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}