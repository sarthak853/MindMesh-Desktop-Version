// No API clients needed - using local fallback systems only
import { createContextualPrompt, DOCUMENT_ANALYSIS_PROMPT, NODE_GENERATION_PROMPT, MEMORY_CARD_GENERATION_PROMPT, CONNECTION_SUGGESTION_PROMPT } from './prompt-templates'
import { AIContext, AIResponse, Citation, Document } from '@/types'

export class AIService {
  private conversationContexts: Map<string, AIContext> = new Map()

  private getClient() {
    console.log('Using local fallback mode - no API calls')
    // Always throw error to trigger fallback systems
    throw new Error('AI_SERVICE_UNAVAILABLE')
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
    console.log('Generating memory cards using local fallback system, content length:', content.length)
    // Always use fallback - no API calls
    return this.generateFallbackMemoryCards(content)
  }

  async suggestConnections(node1Content: string, node2Content: string): Promise<{
    relationshipType: string
    strength: number
    label: string
    explanation: string
  } | null> {
    console.log('Suggesting connections using local analysis')
    // Use simple text analysis to suggest connections
    return this.generateLocalConnectionSuggestion(node1Content, node2Content)
  }

  async generateResponse(context: AIContext, query: string): Promise<AIResponse> {
    console.log('Generating response using local fallback system for query:', query.substring(0, 100) + '...')
    
    // Always use fallback - no API calls
    return this.generateFallbackResponse(context, query, 'Local mode - no API calls')
  }

  private generateFallbackResponse(context: AIContext, query: string, errorMessage: string): AIResponse {
    console.log('Generating fallback response for:', context.mode, 'mode')
    
    // Analyze query for keywords to provide relevant fallback
    const queryLower = query.toLowerCase()
    let fallbackContent = ''
    let suggestedActions: string[] = []
    let relatedConcepts: string[] = []

    if (context.mode === 'scholar') {
      // Scholar mode fallback - research-focused
      if (queryLower.includes('what is') || queryLower.includes('define')) {
        const topic = query.replace(/what is|define/gi, '').trim()
        fallbackContent = `I'd be happy to help you understand ${topic}. While I'm currently experiencing connectivity issues with my AI service, I can suggest some approaches:

📚 **Research Strategies:**
• Search through your uploaded documents for relevant information about "${topic}"
• Look for academic sources or research papers on this topic
• Break down the concept into smaller, more specific questions
• Consider the context and field where this term is commonly used

💡 **Next Steps:**
• Try uploading relevant documents to your knowledge base
• Rephrase your question to be more specific
• Ask about related concepts you already understand`

        suggestedActions = [
          'Upload relevant documents',
          'Search your document library',
          'Break down into smaller questions',
          'Look for academic sources'
        ]
        relatedConcepts = [topic, 'research methods', 'academic sources', 'knowledge base']
      } else if (queryLower.includes('how') || queryLower.includes('explain')) {
        fallbackContent = `I understand you're looking for an explanation. While my AI service is temporarily unavailable, here's how you can find the information you need:

🔍 **Research Approach:**
• Check your uploaded documents for relevant explanations
• Look for step-by-step guides or tutorials
• Search for peer-reviewed sources on this topic
• Consider multiple perspectives and sources

📖 **Documentation Strategy:**
• Create notes as you research
• Organize findings in a cognitive map
• Generate memory cards for key concepts
• Build connections between related ideas`

        suggestedActions = [
          'Search uploaded documents',
          'Create research notes',
          'Build a cognitive map',
          'Generate memory cards'
        ]
      } else {
        fallbackContent = `I'm currently experiencing technical difficulties with my AI service, but I can still help guide your research process:

🎯 **For your query about "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}":**

📚 **Research Methods:**
• Search through your document collection
• Look for authoritative sources and citations
• Cross-reference multiple sources for accuracy
• Take systematic notes on your findings

🔗 **Knowledge Organization:**
• Create a cognitive map to visualize connections
• Generate memory cards for key facts
• Tag and categorize your research
• Build a comprehensive knowledge base

The information you're seeking may already be in your uploaded documents, or you can add relevant sources to enhance your research.`

        suggestedActions = [
          'Search document collection',
          'Upload relevant sources',
          'Create cognitive map',
          'Generate memory cards'
        ]
      }
    } else {
      // Explorer mode fallback - creative-focused
      if (queryLower.includes('creative') || queryLower.includes('idea')) {
        fallbackContent = `Great question about creativity! While my AI service is temporarily offline, let's explore this creatively:

🎨 **Creative Exploration Techniques:**
• Brainstorm freely without judgment
• Make unexpected connections between concepts
• Use analogies and metaphors
• Think from different perspectives

💡 **Idea Generation Methods:**
• Mind mapping your thoughts
• Free writing for 10 minutes
• Asking "What if?" questions
• Combining unrelated concepts

🔄 **Creative Process:**
• Start with what you know
• Build on existing ideas
• Challenge assumptions
• Embrace experimentation

Your creativity doesn't depend on AI - it comes from your unique perspective and experiences!`

        suggestedActions = [
          'Create a mind map',
          'Try free writing',
          'Brainstorm alternatives',
          'Make unexpected connections'
        ]
        relatedConcepts = ['creativity', 'brainstorming', 'innovation', 'idea generation']
      } else {
        fallbackContent = `I love your curiosity! While I'm having technical difficulties, let's approach this creatively:

🌟 **For your question: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"**

🚀 **Creative Exploration:**
• What unique angle can you take on this?
• How might this connect to other interests?
• What would happen if you flipped the problem?
• Can you find patterns or analogies?

🎯 **Action Steps:**
• Sketch out your thoughts visually
• Create a cognitive map of related ideas
• Generate memory cards for key insights
• Document your creative process

Remember, the best insights often come from your own thinking and connections!`

        suggestedActions = [
          'Sketch your thoughts',
          'Make creative connections',
          'Try a different perspective',
          'Document your process'
        ]
      }
    }

    // Add context from uploaded documents if available
    if (context.uploadedDocuments.length > 0) {
      fallbackContent += `\n\n📄 **Your Document Library:**\nYou have ${context.uploadedDocuments.length} document(s) that might contain relevant information. Try searching through them for insights related to your question.`
      suggestedActions.push('Search your documents')
    }

    return {
      content: fallbackContent,
      citations: [],
      confidence: 0.7, // Moderate confidence for fallback responses
      suggestedActions,
      relatedConcepts,
    }
  }

  async generateStreamingResponse(context: AIContext, query: string): Promise<ReadableStream> {
    console.log('Generating streaming response using local fallback')
    
    // Generate response using fallback
    const response = await this.generateFallbackResponse(context, query, 'Local streaming mode')
    
    // Create a readable stream that simulates streaming
    return new ReadableStream({
      start(controller) {
        const content = response.content
        const words = content.split(' ')
        let index = 0
        
        const interval = setInterval(() => {
          if (index < words.length) {
            const data = JSON.stringify({
              type: 'content',
              content: words[index] + ' ',
              fullContent: words.slice(0, index + 1).join(' ')
            })
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
            index++
          } else {
            // Send final metadata
            const finalData = JSON.stringify({
              type: 'complete',
              citations: response.citations,
              confidence: response.confidence,
              suggestedActions: response.suggestedActions,
              relatedConcepts: response.relatedConcepts,
            })
            controller.enqueue(new TextEncoder().encode(`data: ${finalData}\n\n`))
            controller.close()
            clearInterval(interval)
          }
        }, 50) // Emit a word every 50ms
      }
    })
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
    console.log('Analyzing document using local fallback system for:', document.title)
    // Always use fallback - no API calls
    return this.generateFallbackAnalysis(document)
  }

  async generateEmbedding(text: string): Promise<number[]> {
    console.log('Generating local text-based embedding')
    // Generate simple hash-based embedding for local similarity
    return this.generateLocalEmbedding(text)
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    console.log('Generating local text-based embeddings for', texts.length, 'texts')
    return texts.map(text => this.generateLocalEmbedding(text))
  }

  private generateLocalEmbedding(text: string): number[] {
    // Simple local embedding based on text characteristics
    const words = text.toLowerCase().split(/\s+/)
    const embedding = new Array(384).fill(0) // Smaller embedding size
    
    // Use text characteristics to generate embedding
    words.forEach((word, index) => {
      const hash = this.simpleHash(word)
      const pos = hash % embedding.length
      embedding[pos] += 1 / (index + 1) // Weight by position
    })
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
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
    console.log('Extracting citations using local text analysis')
    
    // Simple local citation extraction
    const citations: Citation[] = []
    
    // Look for document references in the content
    documents.forEach(doc => {
      const titleWords = doc.title.toLowerCase().split(/\s+/)
      const contentLower = content.toLowerCase()
      
      // Check if document title or key phrases appear in content
      const relevantPhrases = titleWords.filter(word => 
        word.length > 3 && contentLower.includes(word)
      )
      
      if (relevantPhrases.length > 0) {
        // Find a relevant excerpt from the document
        const excerpt = doc.content.substring(0, 100) + '...'
        
        citations.push({
          documentId: doc.id,
          title: doc.title,
          excerpt,
          confidence: Math.min(0.9, relevantPhrases.length * 0.3),
        })
      }
    })

    return citations.slice(0, 3) // Limit to top 3 citations
  }

  private async generateRelatedConcepts(query: string, response: string): Promise<string[]> {
    console.log('Generating related concepts using local text analysis')
    
    // Extract key terms from query and response
    const text = (query + ' ' + response).toLowerCase()
    const words = text.split(/\s+/).filter(word => word.length > 4)
    
    // Count word frequency
    const wordCount: { [key: string]: number } = {}
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })
    
    // Get most frequent meaningful words as related concepts
    const concepts = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1))
    
    return concepts
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
    console.log('Generating nodes using local text analysis')
    
    // Generate nodes based on key topics and concepts
    const keyTopics = this.extractKeyTopics(analysis)
    const concepts = this.extractConcepts(analysis)
    
    const nodes: Array<{ type: string; title: string; content: string }> = []
    
    // Create nodes from key topics
    keyTopics.forEach((topic, index) => {
      nodes.push({
        type: index === 0 ? 'main_topic' : 'concept',
        title: topic,
        content: `Key concept related to ${topic} from ${document.title}`
      })
    })
    
    // Add concept nodes
    concepts.slice(0, 3).forEach(concept => {
      nodes.push({
        type: concept.type,
        title: concept.title,
        content: concept.description
      })
    })
    
    return nodes.slice(0, 6) // Limit to 6 nodes
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

  private generateFallbackMemoryCards(content: string): Array<{
    front: string
    back: string
    difficulty: number
    tags: string[]
  }> {
    console.log('Generating fallback memory cards from content')
    const cards: Array<{front: string, back: string, difficulty: number, tags: string[]}> = []
    
    // Extract key sentences and concepts
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
    const words = content.toLowerCase().split(/\s+/)
    
    // Generate cards from sentences
    sentences.slice(0, 5).forEach((sentence, index) => {
      const trimmed = sentence.trim()
      if (trimmed.length > 30) {
        const parts = trimmed.split(/[:,;]/)
        if (parts.length >= 2) {
          cards.push({
            front: parts[0].trim() + '?',
            back: parts.slice(1).join(' ').trim(),
            difficulty: Math.min(3, Math.max(1, Math.floor(trimmed.length / 50))),
            tags: ['auto-generated', 'fallback']
          })
        } else {
          // Create question from statement
          const question = trimmed.startsWith('The ') ? 
            'What is ' + trimmed.substring(4) + '?' :
            'What about ' + trimmed.split(' ').slice(0, 3).join(' ') + '?'
          
          cards.push({
            front: question,
            back: trimmed,
            difficulty: 2,
            tags: ['auto-generated', 'fallback']
          })
        }
      }
    })

    // If no cards generated, create basic ones
    if (cards.length === 0) {
      cards.push({
        front: 'What is the main topic of this content?',
        back: content.substring(0, 100) + '...',
        difficulty: 1,
        tags: ['basic', 'fallback']
      })
    }

    console.log(`Generated ${cards.length} fallback memory cards`)
    return cards
  }

  private generateLocalConnectionSuggestion(node1Content: string, node2Content: string): {
    relationshipType: string
    strength: number
    label: string
    explanation: string
  } | null {
    try {
      const words1 = node1Content.toLowerCase().split(/\s+/)
      const words2 = node2Content.toLowerCase().split(/\s+/)
      
      // Find common words
      const commonWords = words1.filter(word => 
        words2.includes(word) && word.length > 3
      )
      
      if (commonWords.length === 0) {
        return {
          relationshipType: 'relates_to',
          strength: 3,
          label: 'related',
          explanation: 'These concepts may be related in the same domain'
        }
      }
      
      const strength = Math.min(10, Math.max(1, commonWords.length * 2))
      
      return {
        relationshipType: 'relates_to',
        strength,
        label: `connected via: ${commonWords.slice(0, 2).join(', ')}`,
        explanation: `These concepts share common elements: ${commonWords.slice(0, 3).join(', ')}`
      }
    } catch (error) {
      console.error('Error in local connection suggestion:', error)
      return null
    }
  }

  private generateFallbackAnalysis(document: Document): {
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
  } {
    console.log('Generating fallback analysis for document:', document.title)
    
    const content = document.content
    const words = content.toLowerCase().split(/\s+/)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
    
    // Extract key topics (most frequent meaningful words)
    const wordFreq: {[key: string]: number} = {}
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'])
    
    words.forEach(word => {
      const clean = word.replace(/[^\w]/g, '')
      if (clean.length > 3 && !stopWords.has(clean)) {
        wordFreq[clean] = (wordFreq[clean] || 0) + 1
      }
    })
    
    const keyTopics = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word)
    
    // Generate summary (first few sentences)
    const summary = sentences.slice(0, 3).join('. ') + '.'
    
    // Generate concepts
    const concepts = keyTopics.map((topic, index) => ({
      type: 'concept',
      title: topic.charAt(0).toUpperCase() + topic.slice(1),
      description: `Key concept related to ${topic}`,
      relevance: Math.max(0.3, 1 - (index * 0.15))
    }))
    
    // Generate suggested nodes
    const suggestedNodes = sentences.slice(0, 4).map((sentence, index) => ({
      type: index === 0 ? 'main_topic' : 'supporting_point',
      title: `Point ${index + 1}`,
      content: sentence.trim()
    }))
    
    console.log('Fallback analysis completed:', {
      keyTopics: keyTopics.length,
      concepts: concepts.length,
      suggestedNodes: suggestedNodes.length
    })
    
    return {
      keyTopics,
      summary,
      concepts,
      suggestedNodes
    }
  }
}

export const aiService = new AIService()