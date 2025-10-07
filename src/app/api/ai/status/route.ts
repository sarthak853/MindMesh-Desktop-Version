import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { openaiClient } from '@/lib/ai/openai-client'
import { huggingFaceClient } from '@/lib/ai/huggingface-client'
import { bytezClient } from '@/lib/ai/bytez-client'

export async function GET() {
  try {
    const user = await getCurrentUser()
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    const hasHF = !!(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN)
    const hasBytez = !!process.env.BYTEZ_API_KEY
    const envProvider = process.env.AI_PROVIDER || null
    const provider = envProvider || (hasBytez ? 'bytez' : (hasOpenRouter ? 'openrouter' : (hasOpenAI ? 'openai' : (hasHF ? 'huggingface' : null))))

    const providerAvailable = provider === 'bytez' ? bytezClient.isAvailable() : 
                              (provider === 'huggingface' ? huggingFaceClient.isAvailable() : openaiClient.isAvailable())

    return NextResponse.json({
      isAuthenticated: !!user,
      providerAvailable,
      provider,
      hasOpenRouter,
      hasOpenAI,
      hasHF,
      hasBytez,
      baseURL: process.env.AI_API_BASE_URL || (hasBytez ? 'https://bytez.com/api' : (hasOpenRouter ? 'https://api.openrouter.ai/v1' : undefined)),
      model: process.env.AI_MODEL || undefined,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}