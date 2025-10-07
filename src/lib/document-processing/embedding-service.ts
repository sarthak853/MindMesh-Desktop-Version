import { aiService } from '@/lib/ai/ai-service'
import { documentRepository } from '@/lib/repositories'

export interface EmbeddingChunk {
  content: string
  embedding: number[]
  startIndex: number
  endIndex: number
}

export class EmbeddingService {
  private static readonly CHUNK_SIZE = 1000 // Characters per chunk
  private static readonly CHUNK_OVERLAP = 200 // Overlap between chunks

  static async generateDocumentEmbeddings(documentId: string): Promise<void> {
    try {
      const document = await documentRepository.findById(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      // Split document into chunks
      const chunks = this.splitIntoChunks(document.content)
      
      // Generate embeddings for each chunk
      const embeddingChunks: EmbeddingChunk[] = []
      
      for (const chunk of chunks) {
        try {
          const embedding = await aiService.generateEmbeddings(chunk.content)
          embeddingChunks.push({
            ...chunk,
            embedding,
          })
        } catch (error) {
          console.error(`Error generating embedding for chunk:`, error)
          // Continue with other chunks even if one fails
        }
      }

      // Store embeddings in document metadata
      const updatedDocument = await documentRepository.update(documentId, {
        embeddings: embeddingChunks.length > 0 ? embeddingChunks[0].embedding : [],
        metadata: {
          ...document.metadata,
          embeddingChunks: embeddingChunks.map(chunk => ({
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
            embedding: chunk.embedding,
          })),
          embeddingsGenerated: true,
          embeddingsGeneratedAt: new Date(),
        },
      })

      console.log(`Generated embeddings for document ${documentId}: ${embeddingChunks.length} chunks`)
    } catch (error) {
      console.error('Error generating document embeddings:', error)
      throw error
    }
  }

  static async findSimilarDocuments(
    queryEmbedding: number[],
    userId: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<Array<{ document: any; similarity: number }>> {
    try {
      const userDocuments = await documentRepository.findByUserId(userId)
      const similarities: Array<{ document: any; similarity: number }> = []

      for (const document of userDocuments) {
        if (document.embeddings && document.embeddings.length > 0) {
          const similarity = this.calculateCosineSimilarity(queryEmbedding, document.embeddings)
          
          if (similarity >= threshold) {
            similarities.push({ document, similarity })
          }
        }
      }

      // Sort by similarity (highest first) and limit results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
    } catch (error) {
      console.error('Error finding similar documents:', error)
      return []
    }
  }

  static async findSimilarContent(
    query: string,
    userId: string,
    limit: number = 5
  ): Promise<Array<{ document: any; similarity: number; relevantChunk?: string }>> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await aiService.generateEmbeddings(query)
      
      const userDocuments = await documentRepository.findByUserId(userId)
      const results: Array<{ document: any; similarity: number; relevantChunk?: string }> = []

      for (const document of userDocuments) {
        let bestSimilarity = 0
        let bestChunk = ''

        // Check main document embedding
        if (document.embeddings && document.embeddings.length > 0) {
          const similarity = this.calculateCosineSimilarity(queryEmbedding, document.embeddings)
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity
            bestChunk = document.content.substring(0, 200) + '...'
          }
        }

        // Check chunk embeddings if available
        const embeddingChunks = document.metadata?.embeddingChunks
        if (embeddingChunks && Array.isArray(embeddingChunks)) {
          for (const chunk of embeddingChunks) {
            if (chunk.embedding && chunk.embedding.length > 0) {
              const similarity = this.calculateCosineSimilarity(queryEmbedding, chunk.embedding)
              if (similarity > bestSimilarity) {
                bestSimilarity = similarity
                bestChunk = document.content.substring(chunk.startIndex, chunk.endIndex)
              }
            }
          }
        }

        if (bestSimilarity > 0.6) { // Minimum similarity threshold
          results.push({
            document,
            similarity: bestSimilarity,
            relevantChunk: bestChunk,
          })
        }
      }

      // Sort by similarity and limit results
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
    } catch (error) {
      console.error('Error finding similar content:', error)
      return []
    }
  }

  private static splitIntoChunks(content: string): Array<{ content: string; startIndex: number; endIndex: number }> {
    const chunks: Array<{ content: string; startIndex: number; endIndex: number }> = []
    
    if (content.length <= this.CHUNK_SIZE) {
      return [{
        content,
        startIndex: 0,
        endIndex: content.length,
      }]
    }

    let startIndex = 0
    
    while (startIndex < content.length) {
      let endIndex = Math.min(startIndex + this.CHUNK_SIZE, content.length)
      
      // Try to end at a sentence boundary
      if (endIndex < content.length) {
        const sentenceEnd = content.lastIndexOf('.', endIndex)
        const questionEnd = content.lastIndexOf('?', endIndex)
        const exclamationEnd = content.lastIndexOf('!', endIndex)
        
        const lastSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd)
        
        if (lastSentenceEnd > startIndex + this.CHUNK_SIZE * 0.5) {
          endIndex = lastSentenceEnd + 1
        }
      }

      const chunkContent = content.substring(startIndex, endIndex).trim()
      
      if (chunkContent.length > 0) {
        chunks.push({
          content: chunkContent,
          startIndex,
          endIndex,
        })
      }

      // Move start index with overlap
      startIndex = Math.max(startIndex + this.CHUNK_SIZE - this.CHUNK_OVERLAP, endIndex)
    }

    return chunks
  }

  private static calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      return 0
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i]
      normA += vectorA[i] * vectorA[i]
      normB += vectorB[i] * vectorB[i]
    }

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  static async batchGenerateEmbeddings(documentIds: string[]): Promise<void> {
    console.log(`Starting batch embedding generation for ${documentIds.length} documents`)
    
    for (const documentId of documentIds) {
      try {
        await this.generateDocumentEmbeddings(documentId)
        console.log(`✓ Generated embeddings for document ${documentId}`)
      } catch (error) {
        console.error(`✗ Failed to generate embeddings for document ${documentId}:`, error)
      }
    }
    
    console.log('Batch embedding generation completed')
  }
}