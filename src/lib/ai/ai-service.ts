import { openaiClient } from './openai-client'
import { huggingFaceClient } from './huggingface-client'
import { bytezClient } from './bytez-client'
import { createContextualPrompt, DOCUMENT_ANALYSIS_PROMPT, NODE_GENERATION_PROMPT, MEMORY_CARD_GENERATION_PROMPT, CONNECTION_SUGGESTION_PROMPT } from './prompt-templates'
import { AIContext, AIResponse, Citation, Document } from '@/types'

export class AIService {
  private conversationContexts: Map<string, AIContext> = new Map()

  private getClient() {
    const provider = process.env.AI_PROVIDER || 'huggingface'
    console.log('AI Provider:', provider)
    
    if (provider === 'bytez' && bytezClient.isAvailable()) {
      console.log('Using Bytez client')
      return bytezClient
    }
    
    if (provider === 'huggingface' && huggingFaceClient.isAvailable()) {
      console.log('Using Hugging Face client')
      return huggingFaceClient
    }
    
    console.log('Falling back to OpenAI client')
    return openaiClient
  }

  // Context management for AI conversations
  setContext(userId: string, context: AIContext): void {
    this.conversationContexts.set(userId, context)
  }

  getContext(userId: string): AIContext | undefined {
    return this.conversationContexts.get(userId)
  }

  clearContext(userId: string): void {
    this.conversationContexts.delete(userId)
  }

  async generateMemoryCards(content: string, userId?: string): Promise<Array<{
    front: string
    back: string
    difficulty: number
    tags: string[]
  }>> {
    try {
      const prompt = MEMORY_CARD_GENERATION_PROMPT.replace('{content}', content)
      
      const completion = await this.getClient().createChatCompletion([
        { role: 'system', content: prompt }
      ], {
        temperature: 0.3,
        maxTokens: 1000,
        userId,
      })

      const response = completion.choices[0]?.message?.content || ''
      
      try {
        const cards = JSON.parse(response)
        return Array.isArray(cards) ? cards : []
      } catch {
        // Fallback parsing if JSON fails
        return this.parseMemoryCardsFromText(response)
      }
    } catch (error) {
      console.error('Error generating memory cards:', error)
      throw new Error('Failed to generate memory cards')
    }
  }

  async suggestConnections(node1Content: string, node2Content: string): Promise<{
    relationshipType: string
    strength: number
    label: string
    explanation: string
  } | null> {
    try {
      const prompt = CONNECTION_SUGGESTION_PROMPT
        .replace('{title1}', node1Content.split(':')[0] || 'Node 1')
        .replace('{content1}', node1Content)
        .replace('{title2}', node2Content.split(':')[0] || 'Node 2')
        .replace('{content2}', node2Content)

      const completion = await this.getClient().createChatCompletion([
        { role: 'system', content: prompt }
      ], {
        temperature: 0.4,
        maxTokens: 300,
      })

      const response = completion.choices[0]?.message?.content || ''
      
      try {
        return JSON.parse(response)
      } catch {
        // Fallback parsing
        return this.parseConnectionFromText(response)
      }
    } catch (error) {
      console.error('Error suggesting connections:', error)
      return null
    }
  }

  async generateResponse(context: AIContext, query: string): Promise<AIResponse> {
    try {
      const prompt = createContextualPrompt(
        context.mode,
        query,
        context.uploadedDocuments,
        context.conversationHistory
      )

      const completion = await this.getClient().createChatCompletion([
        { role: 'system', content: prompt },
        { role: 'user', content: query }
      ], {
        temperature: context.mode === 'explorer' ? 0.8 : 0.3,
        maxTokens: 1500,
        userId: context.userId,
      })

      const content = completion.choices[0]?.message?.content || ''
      
      // Extract citations if in scholar mode
      const citations = context.mode === 'scholar' 
        ? await this.extractCitations(content, context.uploadedDocuments, query)
        : []

      // Generate related concepts
      const relatedConcepts = await this.generateRelatedConcepts(query, content)

      return {
        content,
        citations,
        confidence: this.calculateConfidence(content, context),
        suggestedActions: this.generateSuggestedActions(context.mode, query),
        relatedConcepts,
      }
    } catch (error: any) {
      console.error('Error generating AI response:', error)
      // Preserve meaningful provider error messages to help diagnostics
      if (error && typeof error.message === 'string' && error.message.length > 0) {
        throw new Error(error.message)
      }
      throw new Error('Failed to generate AI response')
    }
  }

  async generateStreamingResponse(context: AIContext, query: string): Promise<ReadableStream> {
    try {
      const prompt = createContextualPrompt(
        context.mode,
        query,
        context.uploadedDocuments,
        context.conversationHistory
      )

      const stream = await this.getClient().createStreamingChatCompletion([
        { role: 'system', content: prompt },
        { role: 'user', content: query }
      ], {
        temperature: context.mode === 'explorer' ? 0.8 : 0.3,
        maxTokens: 1500,
        userId: context.userId,
      })

      // Create a readable stream that processes the OpenAI stream
      return new ReadableStream({
        async start(controller) {
          let fullContent = ''
          
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || ''
              if (content) {
                fullContent += content
                
                // Send chunk to client
                const data = JSON.stringify({
                  type: 'content',
                  content,
                  fullContent,
                })
                controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
              }
            }

            // Generate final metadata after stream completes
            const citations = context.mode === 'scholar' 
              ? await this.extractCitations(fullContent, context.uploadedDocuments, query)
              : []

            const relatedConcepts = await this.generateRelatedConcepts(query, fullContent)

            // Send final metadata
            const finalData = JSON.stringify({
              type: 'complete',
              citations,
              confidence: this.calculateConfidence(fullContent, context),
              suggestedActions: this.generateSuggestedActions(context.mode, query),
              relatedConcepts,
            })
            controller.enqueue(new TextEncoder().encode(`data: ${finalData}\n\n`))
            
            controller.close()
          } catch (error) {
            console.error('Error in streaming response:', error)
            const errorData = JSON.stringify({
              type: 'error',
              error: 'Failed to generate streaming response'
            })
            controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
            controller.close()
          }
        }
      })
    } catch (error) {
      console.error('Error creating streaming response:', error)
      throw new Error('Failed to create streaming response')
    }
  }

  async analyzeDocument(document: Document): Promise<{
    keyTopics: string[]
    summary: string
    concepts: Array<{
      type: string
      title: string
      description: string
      relevance: number
    }>
    suggestedNodes: Array<{
      type: string
      title: string
      content: string
    }>
  }> {
    try {
      const prompt = DOCUMENT_ANALYSIS_PROMPT.replace('{content}', document.content)
      
      const completion = await openaiClient.createChatCompletion([
        { role: 'system', content: prompt }
      ], {
        temperature: 0.3,
        maxTokens: 1000,
      })

      const analysis = completion.choices[0]?.message?.content || ''
      
      // Parse the analysis
      const keyTopics = this.extractKeyTopics(analysis)
      const summary = this.extractSummary(analysis)
      const concepts = this.extractConcepts(analysis)
      const suggestedNodes = await this.generateNodesFromAnalysis(document, analysis)

      return {
        keyTopics,
        summary,
        concepts,
        suggestedNodes,
      }
    } catch (error) {
      console.error('Error analyzing document:', error)
      throw new Error('Failed to analyze document')
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await openaiClient.createEmbedding(text)
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw new Error('Failed to generate embedding')
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      return await openaiClient.createEmbeddings(texts)
    } catch (error) {
      console.error('Error generating embeddings:', error)
      throw new Error('Failed to generate embeddings')
    }
  }

  async findSimilarDocuments(
    queryEmbedding: number[],
    documentEmbeddings: Array<{ id: string; embedding: number[]; title: string }>,
    limit: number = 5
  ): Promise<Array<{ id: string; title: string; similarity: number }>> {
    const similarities = documentEmbeddings.map(doc => ({
      id: doc.id,
      title: doc.title,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }))

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  private async extractCitations(content: string, documents: Document[], query?: string): Promise<Citation[]> {
    try {
      // Use the enhanced CitationService for better citation extraction
      const { CitationService } = await import('./citation-service')
      
      const citations = await CitationService.generateCitations(content, query || '', documents)
      
      // Enhance confidence scoring for each citation
      const enhancedCitations = await Promise.all(
        citations.map(async (citation) => {
          const document = documents.find(doc => doc.id === citation.documentId)
          if (document && query) {
            const enhancedConfidence = await CitationService.enhancedConfidenceScoring(
              citation,
              document,
              query,
              content
            )
            return { ...citation, confidence: enhancedConfidence }
          }
          return citation
        })
      )

      return enhancedCitations
    } catch (error) {
      console.error('Error extracting citations:', error)
      
      // Fallback to simple citation extraction
      const citations: Citation[] = []
      const citationRegex = /\[Source: "([^"]+)" - "([^"]+)"\]/g
      let match

      while ((match = citationRegex.exec(content)) !== null) {
        const [, title, excerpt] = match
        const document = documents.find(doc => doc.title.includes(title))
        
        if (document) {
          citations.push({
            documentId: document.id,
            title: document.title,
            excerpt,
            confidence: 0.8,
          })
        }
      }

      return citations
    }
  }

  private async generateRelatedConcepts(query: string, response: string): Promise<string[]> {
    try {
      const prompt = `Based on this query and response, suggest 3-5 related concepts that the user might want to explore:

Query: ${query}
Response: ${response.substring(0, 500)}...

Return only a comma-separated list of concepts.`

      const completion = await this.getClient().createChatCompletion([
        { role: 'system', content: prompt }
      ], {
        temperature: 0.5,
        maxTokens: 100,
      })

      const concepts = completion.choices[0]?.message?.content || ''
      return concepts.split(',').map(c => c.trim()).filter(c => c.length > 0)
    } catch (error) {
      console.error('Error generating related concepts:', error)
      return []
    }
  }

  private calculateConfidence(content: string, context: AIContext): number {
    // Simple confidence calculation based on various factors
    let confidence = 0.5

    // Higher confidence for scholar mode with sources
    if (context.mode === 'scholar' && context.uploadedDocuments.length > 0) {
      confidence += 0.3
    }

    // Lower confidence for very short responses
    if (content.length < 100) {
      confidence -= 0.2
    }

    // Higher confidence for responses with citations
    if (content.includes('[Source:')) {
      confidence += 0.2
    }

    return Math.max(0.1, Math.min(1.0, confidence))
  }

  private generateSuggestedActions(mode: 'scholar' | 'explorer', query: string): string[] {
    const baseActions = [
      'Create a memory card from this information',
      'Add this to a cognitive map',
      'Search for related documents'
    ]

    if (mode === 'scholar') {
      return [
        ...baseActions,
        'Find additional sources',
        'Verify citations',
        'Export as research note'
      ]
    } else {
      return [
        ...baseActions,
        'Brainstorm related ideas',
        'Create a project from this concept',
        'Explore creative applications'
      ]
    }
  }

  private extractKeyTopics(analysis: string): string[] {
    // Simple extraction - in practice, you'd use more sophisticated NLP
    const lines = analysis.split('\n')
    const topicLines = lines.filter(line => 
      line.toLowerCase().includes('topic') || 
      line.toLowerCase().includes('concept') ||
      line.toLowerCase().includes('theme')
    )
    
    return topicLines.map(line => line.replace(/^\d+\.\s*/, '').trim()).slice(0, 5)
  }

  private extractSummary(analysis: string): string {
    const lines = analysis.split('\n')
    const summaryStart = lines.findIndex(line => 
      line.toLowerCase().includes('summary') || 
      line.toLowerCase().includes('main')
    )
    
    if (summaryStart !== -1 && summaryStart + 1 < lines.length) {
      return lines[summaryStart + 1].trim()
    }
    
    return analysis.substring(0, 200) + '...'
  }

  private extractConcepts(analysis: string): Array<{
    type: string
    title: string
    description: string
    relevance: number
  }> {
    const concepts: Array<{
      type: string
      title: string
      description: string
      relevance: number
    }> = []

    const lines = analysis.split('\n').filter(line => line.trim())
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Look for numbered concepts or bullet points
      if (/^\d+\./.test(trimmed) || /^[-*]/.test(trimmed)) {
        const conceptText = trimmed.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '')
        
        if (conceptText.length > 10) {
          // Determine concept type based on keywords
          let type = 'concept'
          const lowerText = conceptText.toLowerCase()
          
          if (lowerText.includes('person') || lowerText.includes('author') || lowerText.includes('researcher')) {
            type = 'person'
          } else if (lowerText.includes('method') || lowerText.includes('approach') || lowerText.includes('technique')) {
            type = 'method'
          } else if (lowerText.includes('theory') || lowerText.includes('model') || lowerText.includes('framework')) {
            type = 'theory'
          }

          concepts.push({
            type,
            title: conceptText.split(':')[0].trim() || conceptText.substring(0, 50),
            description: conceptText,
            relevance: Math.random() * 0.4 + 0.6 // Random relevance between 0.6-1.0
          })
        }
      }
    }

    // If no structured concepts found, create some from key topics
    if (concepts.length === 0) {
      const keyTopics = this.extractKeyTopics(analysis)
      keyTopics.forEach(topic => {
        concepts.push({
          type: 'concept',
          title: topic,
          description: `Key concept: ${topic}`,
          relevance: 0.8
        })
      })
    }

    return concepts.slice(0, 5) // Limit to 5 concepts
  }

  private async generateNodesFromAnalysis(document: Document, analysis: string): Promise<Array<{
    type: string
    title: string
    content: string
  }>> {
    try {
      const prompt = NODE_GENERATION_PROMPT
        .replace('{title}', document.title)
        .replace('{content}', analysis)

      const completion = await this.getClient().createChatCompletion([
        { role: 'system', content: prompt }
      ], {
        temperature: 0.4,
        maxTokens: 800,
      })

      const response = completion.choices[0]?.message?.content || ''
      
      // Try to parse as JSON, fallback to simple parsing
      try {
        return JSON.parse(response)
      } catch {
        // Fallback to simple node generation
        return [
          {
            type: 'concept',
            title: document.title,
            content: analysis.substring(0, 200) + '...'
          }
        ]
      }
    } catch (error) {
      console.error('Error generating nodes from analysis:', error)
      return []
    }
  }

  private parseMemoryCardsFromText(text: string): Array<{
    front: string
    back: string
    difficulty: number
    tags: string[]
  }> {
    const cards: Array<{
      front: string
      back: string
      difficulty: number
      tags: string[]
    }> = []

    // Simple text parsing for memory cards
    const lines = text.split('\n').filter(line => line.trim())
    let currentCard: any = {}

    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.toLowerCase().startsWith('front:') || trimmed.toLowerCase().startsWith('question:')) {
        if (currentCard.front && currentCard.back) {
          cards.push({
            front: currentCard.front,
            back: currentCard.back,
            difficulty: currentCard.difficulty || 1,
            tags: currentCard.tags || []
          })
        }
        currentCard = { front: trimmed.substring(trimmed.indexOf(':') + 1).trim() }
      } else if (trimmed.toLowerCase().startsWith('back:') || trimmed.toLowerCase().startsWith('answer:')) {
        currentCard.back = trimmed.substring(trimmed.indexOf(':') + 1).trim()
      } else if (trimmed.toLowerCase().startsWith('difficulty:')) {
        const diffStr = trimmed.substring(trimmed.indexOf(':') + 1).trim()
        currentCard.difficulty = parseInt(diffStr) || 1
      } else if (trimmed.toLowerCase().startsWith('tags:')) {
        const tagsStr = trimmed.substring(trimmed.indexOf(':') + 1).trim()
        currentCard.tags = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag)
      }
    }

    // Add the last card if it exists
    if (currentCard.front && currentCard.back) {
      cards.push({
        front: currentCard.front,
        back: currentCard.back,
        difficulty: currentCard.difficulty || 1,
        tags: currentCard.tags || []
      })
    }

    return cards
  }

  private parseConnectionFromText(text: string): {
    relationshipType: string
    strength: number
    label: string
    explanation: string
  } | null {
    try {
      const lines = text.split('\n').filter(line => line.trim())
      const connection: any = {}

      for (const line of lines) {
        const trimmed = line.trim().toLowerCase()
        
        if (trimmed.includes('relationship') || trimmed.includes('type')) {
          const match = line.match(/:\s*(.+)/)
          if (match) connection.relationshipType = match[1].trim()
        } else if (trimmed.includes('strength')) {
          const match = line.match(/(\d+(?:\.\d+)?)/);
          if (match) connection.strength = parseFloat(match[1])
        } else if (trimmed.includes('label')) {
          const match = line.match(/:\s*(.+)/)
          if (match) connection.label = match[1].trim()
        } else if (trimmed.includes('explanation')) {
          const match = line.match(/:\s*(.+)/)
          if (match) connection.explanation = match[1].trim()
        }
      }

      // Set defaults if missing
      connection.relationshipType = connection.relationshipType || 'relates_to'
      connection.strength = connection.strength || 5
      connection.label = connection.label || 'related'
      connection.explanation = connection.explanation || 'These concepts are related'

      return connection
    } catch (error) {
      console.error('Error parsing connection from text:', error)
      return null
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    if (normA === 0 || normB === 0) return 0

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}

export const aiService = new AIService()