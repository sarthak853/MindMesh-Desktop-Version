import OpenAI from 'openai'

class OpenAIClient {
  private client: OpenAI | null = null
  private rateLimitTracker: Map<string, { count: number; resetTime: number }> = new Map()
  private defaultModel: string = 'gpt-4o-mini'

  constructor() {
    const aiModelEnv = process.env.AI_MODEL

    // Prefer OpenRouter if available, else fallback to OpenAI
    if (process.env.OPENROUTER_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: process.env.AI_API_BASE_URL || 'https://api.openrouter.ai/v1',
      })
      this.defaultModel = aiModelEnv || 'meta-llama/llama-3.1-8b-instruct'
    } else if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      this.defaultModel = aiModelEnv || 'gpt-4o-mini'
    }
  }

  async createChatCompletion(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[], options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    stream?: boolean
    userId?: string
  }) {
    if (!this.client) {
      throw new Error('AI provider client not initialized. Please check your API key.')
    }

    // Check rate limits if userId provided
    if (options?.userId) {
      this.checkRateLimit(options.userId)
    }

    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000,
        stream: options?.stream || false,
      })

      // Track successful request
      if (options?.userId) {
        this.trackRequest(options.userId)
      }

      return response
    } catch (error: any) {
      // Handle specific OpenAI errors
      if (error?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      } else if (error?.status === 401) {
        throw new Error('Invalid API key. Please check your AI provider configuration.')
      } else if (error?.status === 403) {
        throw new Error('Access denied. Please check your AI provider subscription or permissions.')
      } else if (error?.status >= 500) {
        throw new Error('AI provider service temporarily unavailable. Please try again.')
      }
      
      throw error
    }
  }

  async createEmbedding(text: string, model: string = 'text-embedding-3-small') {
    if (!this.client) {
      throw new Error('AI provider client not initialized. Please check your API key.')
    }

    const response = await this.client.embeddings.create({
      model,
      input: text,
    })

    return response.data[0].embedding
  }

  async createEmbeddings(texts: string[], model: string = 'text-embedding-3-small') {
    if (!this.client) {
      throw new Error('AI provider client not initialized. Please check your API key.')
    }

    try {
      const response = await this.client.embeddings.create({
        model,
        input: texts,
      })

      return response.data.map(item => item.embedding)
    } catch (error: any) {
      if (error?.status === 429) {
        throw new Error('Rate limit exceeded for embeddings. Please try again later.')
      }
      throw error
    }
  }

  async createStreamingChatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      userId?: string
    }
  ) {
    if (!this.client) {
      throw new Error('AI provider client not initialized. Please check your API key.')
    }

    // Check rate limits if userId provided
    if (options?.userId) {
      this.checkRateLimit(options.userId)
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000,
        stream: true,
      })

      // Track successful request
      if (options?.userId) {
        this.trackRequest(options.userId)
      }

      return stream
    } catch (error: any) {
      // Handle specific OpenAI errors
      if (error?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      } else if (error?.status === 401) {
        throw new Error('Invalid API key. Please check your AI provider configuration.')
      } else if (error?.status === 403) {
        throw new Error('Access denied. Please check your AI provider subscription or permissions.')
      } else if (error?.status >= 500) {
        throw new Error('AI provider service temporarily unavailable. Please try again.')
      }
      
      throw error
    }
  }

  private checkRateLimit(userId: string): void {
    const now = Date.now()
    const userLimit = this.rateLimitTracker.get(userId)
    
    if (!userLimit) {
      return // First request for this user
    }
    
    // Reset counter if time window has passed (1 minute)
    if (now > userLimit.resetTime) {
      this.rateLimitTracker.set(userId, { count: 0, resetTime: now + 60000 })
      return
    }
    
    // Check if user has exceeded rate limit (20 requests per minute)
    if (userLimit.count >= 20) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.')
    }
  }

  private trackRequest(userId: string): void {
    const now = Date.now()
    const userLimit = this.rateLimitTracker.get(userId)
    
    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimitTracker.set(userId, { count: 1, resetTime: now + 60000 })
    } else {
      userLimit.count++
    }
  }

  isAvailable(): boolean {
    return this.client !== null
  }
}

export const openaiClient = new OpenAIClient()