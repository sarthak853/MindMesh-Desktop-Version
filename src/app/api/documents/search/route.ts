import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cache } from '@/lib/cache'
import { DocumentRepository } from '@/lib/repositories/document'

const documentRepository = new DocumentRepository()

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, limit = 5, threshold = 0.6 } = body

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Perform semantic search
    const results = await EmbeddingService.findSimilarContent(
      query.trim(),
      user.id,
      limit
    )

    // Also perform traditional keyword search as fallback
    const keywordResults = await performKeywordSearch(query.trim(), user.id, limit)

    // Combine and deduplicate results
    const combinedResults = combineSearchResults(results, keywordResults)

    return NextResponse.json({
      query: query.trim(),
      results: combinedResults,
      semanticResults: results.length,
      keywordResults: keywordResults.length,
      totalResults: combinedResults.length,
    })

  } catch (error) {
    console.error('Error performing document search:', error)
    return NextResponse.json(
      { error: 'Failed to search documents' },
      { status: 500 }
    )
  }
}

async function performKeywordSearch(
  query: string,
  userId: string,
  limit: number
): Promise<Array<{ document: any; similarity: number; relevantChunk?: string }>> {
  try {
    const documents = await documentRepository.findByUserId(userId)
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2)
    const results: Array<{ document: any; similarity: number; relevantChunk?: string }> = []

    for (const document of documents) {
      const content = document.content.toLowerCase()
      const title = document.title.toLowerCase()
      
      let score = 0
      let matchedWords = 0
      let relevantChunk = ''

      // Score based on title matches (higher weight)
      queryWords.forEach(word => {
        if (title.includes(word)) {
          score += 3
          matchedWords++
        }
      })

      // Score based on content matches
      queryWords.forEach(word => {
        const matches = (content.match(new RegExp(word, 'g')) || []).length
        if (matches > 0) {
          score += matches
          matchedWords++
          
          // Find a relevant chunk containing the word
          if (!relevantChunk) {
            const index = content.indexOf(word)
            if (index !== -1) {
              const start = Math.max(0, index - 100)
              const end = Math.min(content.length, index + 200)
              relevantChunk = document.content.substring(start, end)
              if (start > 0) relevantChunk = '...' + relevantChunk
              if (end < content.length) relevantChunk = relevantChunk + '...'
            }
          }
        }
      })

      // Calculate similarity as percentage of query words found
      const similarity = matchedWords / queryWords.length

      if (similarity > 0) {
        results.push({
          document,
          similarity: Math.min(similarity, 1.0), // Cap at 1.0
          relevantChunk: relevantChunk || document.content.substring(0, 200) + '...',
        })
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  } catch (error) {
    console.error('Error performing keyword search:', error)
    return []
  }
}

function combineSearchResults(
  semanticResults: Array<{ document: any; similarity: number; relevantChunk?: string }>,
  keywordResults: Array<{ document: any; similarity: number; relevantChunk?: string }>
): Array<{ document: any; similarity: number; relevantChunk?: string; searchType: string }> {
  const combined = new Map<string, any>()

  // Add semantic results
  semanticResults.forEach(result => {
    combined.set(result.document.id, {
      ...result,
      searchType: 'semantic',
      semanticSimilarity: result.similarity,
    })
  })

  // Add or merge keyword results
  keywordResults.forEach(result => {
    const existing = combined.get(result.document.id)
    if (existing) {
      // Combine scores if document appears in both results
      combined.set(result.document.id, {
        ...existing,
        similarity: Math.max(existing.similarity, result.similarity * 0.8), // Weight keyword results slightly lower
        searchType: 'combined',
        keywordSimilarity: result.similarity,
      })
    } else {
      combined.set(result.document.id, {
        ...result,
        searchType: 'keyword',
        keywordSimilarity: result.similarity,
      })
    }
  })

  return Array.from(combined.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10) // Limit final results
}