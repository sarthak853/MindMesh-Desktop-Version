import OpenAI from 'openai'

export class BytezClient {
  private client: OpenAI
  private defaultModel: string

  constructor() {
    const apiKey = process.env.BYTEZ_API_KEY
    const baseURL = process.env.AI_API_BASE_URL || 'https://api.bytez.com/v1'
    const model = process.env.AI_MODEL || 'amgadhasan/Meta-Llama-3.1-8B-Instruct'

    if (!apiKey) {
      console.warn('Bytez API key not configured - using fallback mode')
    }

    // Only initialize OpenAI client if we have a valid API key
    if (apiKey && apiKey !== 'dummy-key') {
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
      })
    } else {
      // Create a dummy client that will always fail gracefully
      this.client = null as any
    }

    this.defaultModel = model
    console.log('Bytez Client initialized:', {
      hasApiKey: !!apiKey && apiKey !== 'dummy-key',
      model: this.defaultModel,
      baseUrl: baseURL,
      clientAvailable: !!this.client
    })
  }

  async chat(messages: Array<{ role: string; content: string }>, options?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }) {
    // If no valid client, throw error immediately to trigger fallback
    if (!this.client) {
      console.log('Bytez client not available, triggering fallback')
      throw new Error('AI_SERVICE_UNAVAILABLE')
    }

    try {
      console.log('Making Bytez API call to:', this.client.baseURL)
      console.log('Using model:', options?.model || this.defaultModel)
      
      const response = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
      })

      console.log('Bytez API response received successfully')
      return response
    } catch (error: any) {
      console.error('Bytez API error:', error)
      
      // Provide more specific error information but use fallback-friendly error codes
      if (error.status === 404) {
        throw new Error('AI_ENDPOINT_NOT_FOUND')
      } else if (error.status === 401) {
        throw new Error('AI_AUTHENTICATION_FAILED')
      } else if (error.status === 429) {
        throw new Error('AI_RATE_LIMIT_EXCEEDED')
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('AI_SERVICE_UNAVAILABLE')
      } else {
        throw new Error('AI_SERVICE_ERROR')
      }
    }
  }

  // Alias for compatibility with AI service
  async createChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      userId?: string
    }
  ) {
    return this.chat(messages, options)
  }

  // Streaming support
  async createStreamingChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      userId?: string
    }
  ) {
    try {
      const stream = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
        stream: true,
      })

      return stream
    } catch (error) {
      console.error('Bytez streaming error:', error)
      throw error
    }
  }

  isAvailable(): boolean {
    return !!this.client && !!process.env.BYTEZ_API_KEY && process.env.BYTEZ_API_KEY !== 'dummy-key'
  }

  getModel(): string {
    return this.defaultModel
  }
}

export const bytezClient = new BytezClient()
