import { aiService } from '@/lib/ai/ai-service'
import { TextExtractor } from './text-extractor'

export interface DocumentAnalysis {
  summary: string
  keywords: string[]
  keyPhrases: string[]
  topics: string[]
  sentiment: 'positive' | 'negative' | 'neutral'
  readabilityScore: number
  wordCount: number
  estimatedReadingTime: number // in minutes
  language: string
  entities: Array<{
    text: string
    type: 'person' | 'organization' | 'location' | 'date' | 'other'
    confidence: number
  }>
}

export class DocumentAnalyzer {
  static async analyzeDocument(content: string): Promise<DocumentAnalysis> {
    try {
      const [
        summary,
        keywords,
        keyPhrases,
        topics,
        sentiment,
        readabilityScore,
        entities
      ] = await Promise.all([
        this.generateSummary(content),
        this.extractKeywords(content),
        this.extractKeyPhrases(content),
        this.extractTopics(content),
        this.analyzeSentiment(content),
        this.calculateReadabilityScore(content),
        this.extractEntities(content)
      ])

      const wordCount = this.countWords(content)
      const estimatedReadingTime = Math.ceil(wordCount / 200) // Average reading speed

      return {
        summary,
        keywords,
        keyPhrases,
        topics,
        sentiment,
        readabilityScore,
        wordCount,
        estimatedReadingTime,
        language: this.detectLanguage(content),
        entities,
      }
    } catch (error) {
      console.error('Error analyzing document:', error)
      
      // Return basic analysis if AI analysis fails
      return {
        summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        keywords: TextExtractor.extractKeywords(content, 10),
        keyPhrases: [],
        topics: [],
        sentiment: 'neutral',
        readabilityScore: 0.5,
        wordCount: this.countWords(content),
        estimatedReadingTime: Math.ceil(this.countWords(content) / 200),
        language: 'en',
        entities: [],
      }
    }
  }

  private static async generateSummary(content: string): Promise<string> {
    try {
      return await aiService.summarizeContent(content, 300)
    } catch (error) {
      console.error('Error generating summary:', error)
      return content.substring(0, 300) + (content.length > 300 ? '...' : '')
    }
  }

  private static extractKeywords(content: string): string[] {
    return TextExtractor.extractKeywords(content, 15)
  }

  private static async extractKeyPhrases(content: string): Promise<string[]> {
    // Simple n-gram extraction for key phrases
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
    const phrases: string[] = []

    for (const sentence of sentences.slice(0, 10)) { // Analyze first 10 sentences
      const words = sentence.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      
      // Extract 2-3 word phrases
      for (let i = 0; i < words.length - 1; i++) {
        if (i < words.length - 2) {
          const phrase = words.slice(i, i + 3).join(' ')
          if (this.isValidPhrase(phrase)) {
            phrases.push(phrase)
          }
        }
        
        const phrase = words.slice(i, i + 2).join(' ')
        if (this.isValidPhrase(phrase)) {
          phrases.push(phrase)
        }
      }
    }

    // Count phrase frequency and return top phrases
    const phraseCount: { [key: string]: number } = {}
    phrases.forEach(phrase => {
      phraseCount[phrase] = (phraseCount[phrase] || 0) + 1
    })

    return Object.entries(phraseCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([phrase]) => phrase)
  }

  private static async extractTopics(content: string): Promise<string[]> {
    // Simple topic extraction based on keyword clustering
    const keywords = this.extractKeywords(content)
    
    // Group related keywords into topics (simplified approach)
    const topics: string[] = []
    const usedKeywords = new Set<string>()

    for (const keyword of keywords) {
      if (usedKeywords.has(keyword)) continue
      
      const relatedKeywords = keywords.filter(k => 
        !usedKeywords.has(k) && this.areRelated(keyword, k, content)
      )

      if (relatedKeywords.length > 0) {
        topics.push(keyword)
        relatedKeywords.forEach(k => usedKeywords.add(k))
      }
    }

    return topics.slice(0, 5)
  }

  private static async analyzeSentiment(content: string): Promise<'positive' | 'negative' | 'neutral'> {
    // Simple sentiment analysis based on word lists
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive', 'success', 'achievement', 'benefit']
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'negative', 'problem', 'issue', 'failure', 'error', 'difficult']

    const words = content.toLowerCase().split(/\s+/)
    let positiveCount = 0
    let negativeCount = 0

    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++
    })

    if (positiveCount > negativeCount * 1.2) return 'positive'
    if (negativeCount > positiveCount * 1.2) return 'negative'
    return 'neutral'
  }

  private static calculateReadabilityScore(content: string): number {
    // Simplified Flesch Reading Ease calculation
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const words = content.split(/\s+/).filter(w => w.length > 0)
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0)

    if (sentences.length === 0 || words.length === 0) return 0.5

    const avgSentenceLength = words.length / sentences.length
    const avgSyllablesPerWord = syllables / words.length

    // Simplified Flesch formula (normalized to 0-1 scale)
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord)
    return Math.max(0, Math.min(1, score / 100))
  }

  private static async extractEntities(content: string): Promise<Array<{
    text: string
    type: 'person' | 'organization' | 'location' | 'date' | 'other'
    confidence: number
  }>> {
    // Simple named entity recognition using patterns
    const entities: Array<{ text: string; type: any; confidence: number }> = []

    // Extract potential person names (capitalized words)
    const personPattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g
    const personMatches = content.match(personPattern) || []
    personMatches.forEach(match => {
      entities.push({
        text: match,
        type: 'person',
        confidence: 0.6
      })
    })

    // Extract dates
    const datePattern = /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b|\b[A-Z][a-z]+ \d{1,2}, \d{4}\b/g
    const dateMatches = content.match(datePattern) || []
    dateMatches.forEach(match => {
      entities.push({
        text: match,
        type: 'date',
        confidence: 0.8
      })
    })

    // Extract organizations (words ending with Inc, Corp, LLC, etc.)
    const orgPattern = /\b[A-Z][a-zA-Z\s]+(Inc|Corp|LLC|Ltd|Company|Organization|University|Institute)\b/g
    const orgMatches = content.match(orgPattern) || []
    orgMatches.forEach(match => {
      entities.push({
        text: match,
        type: 'organization',
        confidence: 0.7
      })
    })

    // Remove duplicates and return top entities
    const uniqueEntities = entities.filter((entity, index, self) => 
      index === self.findIndex(e => e.text === entity.text)
    )

    return uniqueEntities.slice(0, 10)
  }

  private static countWords(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length
  }

  private static countSyllables(word: string): number {
    // Simple syllable counting
    word = word.toLowerCase()
    if (word.length <= 3) return 1
    
    const vowels = 'aeiouy'
    let count = 0
    let previousWasVowel = false

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i])
      if (isVowel && !previousWasVowel) {
        count++
      }
      previousWasVowel = isVowel
    }

    // Handle silent e
    if (word.endsWith('e')) {
      count--
    }

    return Math.max(1, count)
  }

  private static detectLanguage(content: string): string {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with']
    const words = content.toLowerCase().split(/\s+/).slice(0, 100) // Check first 100 words

    const englishCount = words.filter(word => englishWords.includes(word)).length
    
    return englishCount > 5 ? 'en' : 'unknown'
  }

  private static isValidPhrase(phrase: string): boolean {
    // Filter out phrases that are too common or not meaningful
    const commonPhrases = ['of the', 'in the', 'to the', 'for the', 'on the', 'at the', 'by the']
    return !commonPhrases.includes(phrase) && phrase.length > 5
  }

  private static areRelated(word1: string, word2: string, content: string): boolean {
    // Simple relatedness check based on co-occurrence
    const sentences = content.toLowerCase().split(/[.!?]+/)
    let coOccurrences = 0

    sentences.forEach(sentence => {
      if (sentence.includes(word1) && sentence.includes(word2)) {
        coOccurrences++
      }
    })

    return coOccurrences > 0
  }
}