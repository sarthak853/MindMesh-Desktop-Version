import { Document, Citation } from '@/types'

export interface SourceReference {
  documentId: string
  title: string
  excerpt: string
  startIndex?: number
  endIndex?: number
  confidence: number
  relevanceScore: number
}

export interface SourceUsageTracking {
  documentId: string
  query: string
  responseExcerpt: string
  timestamp: Date
  confidence: number
  citationType: 'explicit' | 'implicit' | 'inferred'
}

export interface CitationAnalysis {
  totalSources: number
  citedSources: number
  averageConfidence: number
  hasInsufficientSources: boolean
  fallbackSuggestions: string[]
}

export class CitationService {
  static async generateCitations(
    response: string,
    query: string,
    documents: Document[]
  ): Promise<Citation[]> {
    try {
      const citations: Citation[] = []
      
      // Extract explicit citations from response (format: [Doc: Title])
      const explicitCitations = this.extractExplicitCitations(response, documents)
      citations.push(...explicitCitations)

      // Find implicit citations by matching content
      const implicitCitations = await this.findImplicitCitations(response, query, documents)
      citations.push(...implicitCitations)

      // Remove duplicates and sort by confidence
      const uniqueCitations = this.deduplicateCitations(citations)
      
      return uniqueCitations
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5) // Limit to top 5 citations
    } catch (error) {
      console.error('Error generating citations:', error)
      return []
    }
  }

  static async findRelevantSources(
    query: string,
    documents: Document[],
    limit: number = 3
  ): Promise<SourceReference[]> {
    try {
      const sources: SourceReference[] = []

      // Use semantic search to find relevant documents
      for (const document of documents) {
        const relevanceScore = await this.calculateRelevanceScore(query, document)
        
        if (relevanceScore > 0.3) { // Minimum relevance threshold
          const excerpt = this.extractRelevantExcerpt(query, document.content)
          
          sources.push({
            documentId: document.id,
            title: document.title,
            excerpt,
            confidence: relevanceScore,
            relevanceScore,
          })
        }
      }

      return sources
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit)
    } catch (error) {
      console.error('Error finding relevant sources:', error)
      return []
    }
  }

  static validateCitations(citations: Citation[], documents: Document[]): Citation[] {
    return citations.filter(citation => {
      const document = documents.find(doc => doc.id === citation.documentId)
      if (!document) return false

      // Check if the excerpt actually exists in the document
      if (citation.excerpt && citation.excerpt.length > 10) {
        const normalizedExcerpt = citation.excerpt.replace(/[^\w\s]/g, '').toLowerCase()
        const normalizedContent = document.content.replace(/[^\w\s]/g, '').toLowerCase()
        
        return normalizedContent.includes(normalizedExcerpt.substring(0, 50))
      }

      return true
    })
  }

  static formatCitation(citation: Citation, style: 'apa' | 'mla' | 'chicago' = 'apa'): string {
    switch (style) {
      case 'apa':
        return this.formatAPACitation(citation)
      case 'mla':
        return this.formatMLACitation(citation)
      case 'chicago':
        return this.formatChicagoCitation(citation)
      default:
        return this.formatAPACitation(citation)
    }
  }

  private static extractExplicitCitations(response: string, documents: Document[]): Citation[] {
    const citations: Citation[] = []
    const citationRegex = /\[Doc:\s*([^\]]+)\]/g
    let match

    while ((match = citationRegex.exec(response)) !== null) {
      const citedTitle = match[1].trim()
      const document = documents.find(doc => 
        doc.title.toLowerCase().includes(citedTitle.toLowerCase()) ||
        citedTitle.toLowerCase().includes(doc.title.toLowerCase())
      )

      if (document) {
        citations.push({
          documentId: document.id,
          title: document.title,
          excerpt: match[0],
          confidence: 0.9,
        })
      }
    }

    return citations
  }

  private static async findImplicitCitations(
    response: string,
    query: string,
    documents: Document[]
  ): Promise<Citation[]> {
    const citations: Citation[] = []
    
    // Split response into sentences for analysis
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 20)
    
    for (const sentence of sentences.slice(0, 5)) { // Analyze first 5 sentences
      const trimmedSentence = sentence.trim()
      
      for (const document of documents) {
        const similarity = this.calculateTextSimilarity(trimmedSentence, document.content)
        
        if (similarity > 0.7) { // High similarity threshold for implicit citations
          const excerpt = this.findBestMatchingExcerpt(trimmedSentence, document.content)
          
          citations.push({
            documentId: document.id,
            title: document.title,
            excerpt,
            confidence: similarity * 0.8, // Lower confidence for implicit citations
          })
        }
      }
    }

    return citations
  }

  private static async calculateRelevanceScore(query: string, document: Document): Promise<number> {
    try {
      // Simple keyword-based relevance scoring
      const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2)
      const documentContent = document.content.toLowerCase()
      const documentTitle = document.title.toLowerCase()
      
      let score = 0
      let matchedWords = 0

      queryWords.forEach(word => {
        // Title matches have higher weight
        if (documentTitle.includes(word)) {
          score += 0.3
          matchedWords++
        }
        
        // Content matches
        const contentMatches = (documentContent.match(new RegExp(word, 'g')) || []).length
        if (contentMatches > 0) {
          score += Math.min(contentMatches * 0.1, 0.5) // Cap content score
          matchedWords++
        }
      })

      // Normalize by query length
      return Math.min(score, 1.0)
    } catch (error) {
      console.error('Error calculating relevance score:', error)
      return 0
    }
  }

  private static extractRelevantExcerpt(query: string, content: string, maxLength: number = 200): string {
    const queryWords = query.toLowerCase().split(/\s+/)
    const sentences = content.split(/[.!?]+/)
    
    let bestSentence = ''
    let bestScore = 0

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase()
      let score = 0
      
      queryWords.forEach(word => {
        if (sentenceLower.includes(word)) {
          score++
        }
      })

      if (score > bestScore && sentence.trim().length > 20) {
        bestScore = score
        bestSentence = sentence.trim()
      }
    }

    if (bestSentence.length > maxLength) {
      return bestSentence.substring(0, maxLength) + '...'
    }

    return bestSentence || content.substring(0, maxLength) + '...'
  }

  private static calculateTextSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...words1].filter(word => words2.has(word)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }

  private static findBestMatchingExcerpt(sentence: string, content: string): string {
    const sentenceWords = sentence.toLowerCase().split(/\s+/)
    const contentSentences = content.split(/[.!?]+/)
    
    let bestMatch = ''
    let bestScore = 0

    for (const contentSentence of contentSentences) {
      const contentWords = contentSentence.toLowerCase().split(/\s+/)
      let matchCount = 0

      sentenceWords.forEach(word => {
        if (contentWords.includes(word)) {
          matchCount++
        }
      })

      const score = matchCount / sentenceWords.length
      if (score > bestScore && contentSentence.trim().length > 20) {
        bestScore = score
        bestMatch = contentSentence.trim()
      }
    }

    return bestMatch || content.substring(0, 200) + '...'
  }

  private static deduplicateCitations(citations: Citation[]): Citation[] {
    const seen = new Set<string>()
    return citations.filter(citation => {
      const key = `${citation.documentId}-${citation.excerpt?.substring(0, 50)}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private static formatAPACitation(citation: Citation): string {
    // Simplified APA format
    return `${citation.title}. Retrieved from document.`
  }

  private static formatMLACitation(citation: Citation): string {
    // Simplified MLA format
    return `"${citation.title}." Document.`
  }

  private static formatChicagoCitation(citation: Citation): string {
    // Simplified Chicago format
    return `${citation.title}, document.`
  }

  static async analyzeCitationQuality(
    citations: Citation[],
    documents: Document[],
    query: string
  ): Promise<CitationAnalysis> {
    try {
      const totalSources = documents.length
      const citedSources = citations.length
      const averageConfidence = citations.length > 0 
        ? citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length 
        : 0

      // Determine if sources are insufficient
      const hasInsufficientSources = citedSources < 2 || averageConfidence < 0.6

      // Generate fallback suggestions when sources are insufficient
      const fallbackSuggestions = hasInsufficientSources 
        ? await this.generateFallbackSuggestions(query, documents)
        : []

      return {
        totalSources,
        citedSources,
        averageConfidence,
        hasInsufficientSources,
        fallbackSuggestions,
      }
    } catch (error) {
      console.error('Error analyzing citation quality:', error)
      return {
        totalSources: documents.length,
        citedSources: 0,
        averageConfidence: 0,
        hasInsufficientSources: true,
        fallbackSuggestions: ['Upload more relevant documents', 'Try rephrasing your question'],
      }
    }
  }

  static async enhancedConfidenceScoring(
    citation: Citation,
    document: Document,
    query: string,
    response: string
  ): Promise<number> {
    try {
      let confidence = 0.5 // Base confidence

      // Factor 1: Excerpt match quality
      if (citation.excerpt && document.content.includes(citation.excerpt)) {
        confidence += 0.3
      }

      // Factor 2: Query relevance
      const queryWords = query.toLowerCase().split(/\s+/)
      const excerptWords = citation.excerpt?.toLowerCase().split(/\s+/) || []
      const matchingWords = queryWords.filter(word => 
        excerptWords.some(excerptWord => excerptWord.includes(word))
      )
      confidence += (matchingWords.length / queryWords.length) * 0.2

      // Factor 3: Document authority (based on metadata)
      if (document.metadata.author) confidence += 0.1
      if (document.metadata.source) confidence += 0.1

      // Factor 4: Response integration quality
      const responseWords = response.toLowerCase().split(/\s+/)
      const excerptInResponse = excerptWords.some(word => 
        responseWords.includes(word)
      )
      if (excerptInResponse) confidence += 0.1

      return Math.min(1.0, Math.max(0.1, confidence))
    } catch (error) {
      console.error('Error calculating enhanced confidence:', error)
      return 0.5
    }
  }

  static async trackSourceUsage(
    documentId: string,
    query: string,
    responseExcerpt: string,
    confidence: number = 0.5,
    citationType: 'explicit' | 'implicit' | 'inferred' = 'inferred'
  ): Promise<void> {
    try {
      const usage: SourceUsageTracking = {
        documentId,
        query: query.substring(0, 100),
        responseExcerpt: responseExcerpt.substring(0, 100),
        timestamp: new Date(),
        confidence,
        citationType,
      }

      // In a real implementation, you would store this in a database
      // For now, just log the usage with enhanced tracking
      console.log('Enhanced source usage tracked:', usage)

      // TODO: Store in database for analytics
      // await sourceUsageRepository.create(usage)
    } catch (error) {
      console.error('Error tracking source usage:', error)
    }
  }

  static async generateFallbackResponse(
    query: string,
    documents: Document[],
    insufficientSources: boolean = true
  ): Promise<{
    message: string
    suggestions: string[]
    alternativeApproaches: string[]
  }> {
    try {
      if (insufficientSources) {
        return {
          message: "I don't have sufficient information in the provided sources to answer this question accurately. Here are some suggestions:",
          suggestions: [
            "Upload more relevant documents related to your query",
            "Try rephrasing your question with different keywords",
            "Break down your question into smaller, more specific parts",
            "Check if your documents contain information about the topic you're asking about"
          ],
          alternativeApproaches: [
            "Switch to Explorer Mode for creative brainstorming",
            "Search for related concepts in your existing documents",
            "Create a cognitive map to explore related topics"
          ]
        }
      }

      // Generate suggestions based on available documents
      const suggestions = await this.generateFallbackSuggestions(query, documents)
      
      return {
        message: "Based on your available sources, I can provide limited information. Consider these approaches:",
        suggestions,
        alternativeApproaches: [
          "Explore related topics in your documents",
          "Use Explorer Mode for broader connections",
          "Add more specific sources for this topic"
        ]
      }
    } catch (error) {
      console.error('Error generating fallback response:', error)
      return {
        message: "I'm unable to provide a comprehensive answer at this time.",
        suggestions: ["Please try rephrasing your question or adding more relevant sources."],
        alternativeApproaches: ["Switch to Explorer Mode for creative insights"]
      }
    }
  }

  private static async generateFallbackSuggestions(
    query: string,
    documents: Document[]
  ): Promise<string[]> {
    try {
      const suggestions: string[] = []
      
      // Analyze query for missing topics
      const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3)
      
      // Check which query terms have no matches in documents
      const unmatchedTerms: string[] = []
      queryWords.forEach(word => {
        const hasMatch = documents.some(doc => 
          doc.content.toLowerCase().includes(word) || 
          doc.title.toLowerCase().includes(word)
        )
        if (!hasMatch) {
          unmatchedTerms.push(word)
        }
      })

      if (unmatchedTerms.length > 0) {
        suggestions.push(`Upload documents containing information about: ${unmatchedTerms.join(', ')}`)
      }

      // Suggest related topics from existing documents
      const relatedTopics = this.extractRelatedTopics(documents, queryWords)
      if (relatedTopics.length > 0) {
        suggestions.push(`Consider exploring related topics: ${relatedTopics.slice(0, 3).join(', ')}`)
      }

      // Generic suggestions if no specific ones found
      if (suggestions.length === 0) {
        suggestions.push(
          "Upload more documents related to your research topic",
          "Try using more specific keywords in your question",
          "Break down complex questions into simpler parts"
        )
      }

      return suggestions.slice(0, 4) // Limit to 4 suggestions
    } catch (error) {
      console.error('Error generating fallback suggestions:', error)
      return ["Upload more relevant documents", "Try rephrasing your question"]
    }
  }

  private static extractRelatedTopics(documents: Document[], queryWords: string[]): string[] {
    try {
      const topicCounts = new Map<string, number>()
      
      documents.forEach(doc => {
        const words = doc.content.toLowerCase().split(/\s+/)
        words.forEach(word => {
          if (word.length > 4 && !queryWords.includes(word)) {
            topicCounts.set(word, (topicCounts.get(word) || 0) + 1)
          }
        })
      })

      // Return most frequent topics
      return Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic)
    } catch (error) {
      console.error('Error extracting related topics:', error)
      return []
    }
  }
}