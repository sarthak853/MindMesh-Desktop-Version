import { NextResponse } from 'next/server'
import { cognitiveMapRepository } from '@/lib/repositories'

export async function GET() {
  try {
    const stats = cognitiveMapRepository.getRepositoryStats()
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      repository: stats
    })
  } catch (error: any) {
    console.error('Debug repository error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}