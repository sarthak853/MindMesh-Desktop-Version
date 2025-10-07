import OpenAI from 'openai'

export class BytezClient {
  private client: OpenAI
  private defaultModel: string

  constructor() {
    const apiKey = process.env.BYTEZ_API_KEY
    const baseURL = process.env.AI_API_BASE_URL || 'https://bytez.com/api'
    const model = process.env.AI_MODEL || 'amgadhasan/Meta-Llama-3.1-8B-Instruct'

    if (!apiKey) {
      console.warn('Bytez API key not configured')
    }

    this.client = new OpenAI({
      apiKey: apiKey || 'dummy-key',
      baseURL: baseURL,
    })

    this.defaultModel = model
    console.log('Bytez Client initialized:', {
      hasApiKey: !!apiKey,
      model: this.defaultModel,
      baseUrl: baseURL
    })
  }

  async chat(messages: Array<{ role: string; content: string }>, options?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }) {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
      })

      return response
    } catch (error) {
      console.error('Bytez API error:', error)
      throw error
    }
  }

  isAvailable(): boolean {
    return !!process.env.BYTEZ_API_KEY
  }

  getModel(): string {
    return this.defaultModel
  }
}

export const bytezClient = new BytezClient()
