// Minimal Hugging Face Inference API client that mimics OpenAI chat interface
// Supports non-streaming chat completions and a simulated streaming mode.

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

class HuggingFaceClient {
  private apiKey: string | null = null
  private defaultModel: string = 'Qwen/Qwen2.5-7B-Instruct'
  private baseUrl: string = 'https://api-inference.huggingface.co'

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || null
    const aiModelEnv = process.env.AI_MODEL
    if (aiModelEnv) {
      this.defaultModel = aiModelEnv
    }
    // Allow overriding the base URL to support Hugging Face Inference Endpoints
    if (process.env.AI_API_BASE_URL) {
      this.baseUrl = process.env.AI_API_BASE_URL
    }
    
    console.log('HuggingFace Client initialized:', {
      hasApiKey: !!this.apiKey,
      model: this.defaultModel,
      baseUrl: this.baseUrl
    })
  }

  isAvailable(): boolean {
    return !!this.apiKey
  }

  private buildPrompt(messages: ChatMessage[]): string {
    return messages
      .map(m => `${m.role.toUpperCase()}: ${typeof m.content === 'string' ? m.content : ''}`)
      .join('\n')
  }

  async createChatCompletion(
    messages: ChatMessage[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      userId?: string
    }
  ) {
    if (!this.apiKey) {
      throw new Error('AI provider client not initialized. Please check your API key.')
    }

    const model = options?.model || this.defaultModel
    const prompt = this.buildPrompt(messages)

    // If using the public HF Inference API base, we need /models/{model};
    // If using a dedicated Inference Endpoint (custom domain), call it directly.
    const isPublicHF = (this.baseUrl.includes('api-inference.huggingface.co'))
    const requestUrl = isPublicHF ? `${this.baseUrl}/models/${model}` : this.baseUrl

    const res = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: options?.maxTokens ?? 800,
          temperature: options?.temperature ?? 0.7,
          return_full_text: false,
        },
      }),
    })
    const contentType = res.headers.get('content-type') || ''

    if (!res.ok) {
      let errorPayload: any = null
      try {
        errorPayload = contentType.includes('application/json') ? await res.json() : await res.text()
      } catch {
        try {
          errorPayload = await res.text()
        } catch {
          errorPayload = ''
        }
      }

      const messageText = typeof errorPayload === 'string'
        ? errorPayload
        : (errorPayload?.error || errorPayload?.message || JSON.stringify(errorPayload))

      if (res.status === 401) {
        throw new Error('Invalid API key. Please check your AI provider configuration.')
      }
      if (res.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      if (res.status === 404) {
        throw new Error('Model or endpoint not found. Verify AI_MODEL and AI_API_BASE_URL.')
      }
      if (res.status >= 500) {
        throw new Error('AI provider service temporarily unavailable. Please try again.')
      }

      throw new Error(`AI provider error (${res.status}): ${messageText || 'Unknown error'}`)
    }

    let data: any
    try {
      data = await res.json()
    } catch (parseError) {
      throw new Error('Invalid response format from AI provider.')
    }
    // HF responses can be either array [{ generated_text }] or object { generated_text }
    const generatedText = Array.isArray(data)
      ? (data[0]?.generated_text ?? '')
      : (data?.generated_text ?? data?.[0]?.generated_text ?? '')

    return {
      choices: [
        { message: { content: generatedText || '' } }
      ]
    }
  }

  async createStreamingChatCompletion(
    messages: ChatMessage[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      userId?: string
    }
  ) {
    // Simulate streaming by splitting the non-streaming response into small chunks
    const nonStreaming = await this.createChatCompletion(messages, options)
    const full = nonStreaming.choices[0]?.message?.content || ''

    async function* chunkGenerator(text: string) {
      const size = 60
      for (let i = 0; i < text.length; i += size) {
        const chunk = text.slice(i, i + size)
        yield { choices: [{ delta: { content: chunk } }] }
      }
    }

    return chunkGenerator(full)
  }
}

export const huggingFaceClient = new HuggingFaceClient()