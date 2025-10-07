import { NextRequest, NextResponse } from 'next/server'
import { huggingFaceClient } from '@/lib/ai/huggingface-client'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Hugging Face connection...')
    
    if (!huggingFaceClient.isAvailable()) {
      return NextResponse.json({
        success: false,
        error: 'Hugging Face client not available. Check your API key.',
        config: {
          hasApiKey: !!process.env.HUGGINGFACE_API_KEY || !!process.env.HF_TOKEN,
          provider: process.env.AI_PROVIDER,
          model: process.env.AI_MODEL,
          baseUrl: process.env.AI_API_BASE_URL || 'https://api-inference.huggingface.co'
        }
      }, { status: 503 })
    }

    // Test with a simple message
    const testMessages = [
      { role: 'user' as const, content: 'Hello! Please respond with "AI connection successful"' }
    ]

    console.log('Sending test request to Hugging Face...')
    const response = await huggingFaceClient.createChatCompletion(testMessages, {
      maxTokens: 50,
      temperature: 0.1
    })

    console.log('Hugging Face response:', response)

    return NextResponse.json({
      success: true,
      message: 'Hugging Face connection successful',
      response: response.choices[0]?.message?.content || 'No response content',
      config: {
        provider: process.env.AI_PROVIDER,
        model: process.env.AI_MODEL,
        baseUrl: process.env.AI_API_BASE_URL || 'https://api-inference.huggingface.co'
      }
    })

  } catch (error: any) {
    console.error('Hugging Face test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: error.toString(),
      config: {
        hasApiKey: !!process.env.HUGGINGFACE_API_KEY || !!process.env.HF_TOKEN,
        provider: process.env.AI_PROVIDER,
        model: process.env.AI_MODEL,
        baseUrl: process.env.AI_API_BASE_URL || 'https://api-inference.huggingface.co'
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

    const response = await huggingFaceClient.createChatCompletion(testMessages, {
      maxTokens: 200,
      temperature: 0.7
    })

    return NextResponse.json({
      success: true,
      response: response.choices[0]?.message?.content || 'No response content'
    })

  } catch (error: any) {
    console.error('Hugging Face test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}