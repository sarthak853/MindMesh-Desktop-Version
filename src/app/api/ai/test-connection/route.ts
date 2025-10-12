import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { bytezClient } from '@/lib/ai/bytez-client'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test the AI service connection
    const testResults = {
      timestamp: new Date().toISOString(),
      bytezClient: {
        available: bytezClient.isAvailable(),
        model: bytezClient.getModel(),
        apiKey: process.env.BYTEZ_API_KEY ? 
          `${process.env.BYTEZ_API_KEY.substring(0, 8)}...` : 'Not set',
        baseUrl: process.env.AI_API_BASE_URL || 'Not set'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        aiProvider: process.env.AI_PROVIDER || 'Not set'
      }
    }

    // Try a simple API call
    try {
      console.log('Testing Bytez API connection...')
      const testResponse = await bytezClient.chat([
        { role: 'user', content: 'Hello, respond with just "OK" if you can read this.' }
      ], { maxTokens: 10 })
      
      testResults.apiTest = {
        success: true,
        response: testResponse?.choices?.[0]?.message?.content || 'No content',
        model: testResponse?.model || 'Unknown'
      }
    } catch (apiError: any) {
      console.error('API test failed:', apiError.message)
      testResults.apiTest = {
        success: false,
        error: apiError.message,
        errorType: apiError.message.includes('AI_AUTHENTICATION_FAILED') ? 'authentication' :
                   apiError.message.includes('AI_SERVICE_UNAVAILABLE') ? 'service_unavailable' :
                   apiError.message.includes('AI_RATE_LIMIT_EXCEEDED') ? 'rate_limit' : 'unknown'
      }
    }

    return NextResponse.json({
      status: testResults.apiTest?.success ? 'connected' : 'disconnected',
      fallbackMode: !testResults.apiTest?.success,
      details: testResults,
      recommendations: testResults.apiTest?.success ? [] : [
        testResults.apiTest?.errorType === 'authentication' ? 
          'Check if your Bytez API key is valid and not expired' :
        testResults.apiTest?.errorType === 'service_unavailable' ?
          'Bytez service might be temporarily unavailable' :
        testResults.apiTest?.errorType === 'rate_limit' ?
          'You have exceeded the API rate limit' :
          'Unknown API error - check logs for details',
        'The system will use intelligent fallback methods for AI features',
        'Consider updating your API key or trying again later'
      ]
    })

  } catch (error) {
    console.error('AI connection test error:', error)
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to test AI connection',
        fallbackMode: true
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Test with a custom message
    try {
      const response = await bytezClient.chat([
        { role: 'user', content: message }
      ], { maxTokens: 100 })
      
      return NextResponse.json({
        success: true,
        response: response?.choices?.[0]?.message?.content || 'No response',
        model: response?.model,
        usage: response?.usage
      })
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message,
        fallbackResponse: `I'm currently unable to process AI requests due to: ${error.message}. However, the system can still create cognitive maps and memory cards using intelligent fallback methods.`
      })
    }

  } catch (error) {
    console.error('AI test message error:', error)
    return NextResponse.json(
      { error: 'Failed to test AI message' },
      { status: 500 }
    )
  }
}