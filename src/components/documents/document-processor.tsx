'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Brain, CreditCard, CheckCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DocumentProcessorProps {
  documentId: string
  documentTitle: string
  documentContent: string
  onComplete?: () => void
}

export function DocumentProcessor({ 
  documentId, 
  documentTitle, 
  documentContent,
  onComplete 
}: DocumentProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [mindmapCreated, setMindmapCreated] = useState(false)
  const [memoryCardsCreated, setMemoryCardsCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const processDocument = async () => {
    setIsProcessing(true)
    setError(null)
    setProgress(10)

    try {
      // Step 1: Extract key concepts for mindmap
      setProgress(30)
      const concepts = extractConcepts(documentContent)
      
      // Step 2: Create mindmap nodes
      setProgress(50)
      await createMindmap(documentTitle, concepts)
      setMindmapCreated(true)
      
      // Step 3: Generate memory cards
      setProgress(70)
      await createMemoryCards(documentTitle, documentContent)
      setMemoryCardsCreated(true)
      
      setProgress(100)
      
      if (onComplete) {
        onComplete()
      }
    } catch (err) {
      console.error('Error processing document:', err)
      setError('Failed to process document. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const extractConcepts = (content: string): string[] => {
    // Simple concept extraction - split by sentences and take key phrases
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
    const concepts: string[] = []
    
    // Take first 10 sentences as concepts
    for (let i = 0; i < Math.min(10, sentences.length); i++) {
      const sentence = sentences[i].trim()
      if (sentence.length > 0 && sentence.length < 100) {
        concepts.push(sentence)
      }
    }
    
    return concepts.length > 0 ? concepts : ['Main Concept', 'Key Point 1', 'Key Point 2']
  }

  const createMindmap = async (title: string, concepts: string[]) => {
    // Create mindmap locally without API
    const mindmapData = {
      title: `Mindmap: ${title}`,
      nodes: [
        {
          id: 'central',
          label: title,
          position: { x: 400, y: 300 }
        },
        ...concepts.map((concept, index) => ({
          id: `concept-${index}`,
          label: concept.substring(0, 50) + (concept.length > 50 ? '...' : ''),
          position: {
            x: 400 + Math.cos((index / concepts.length) * 2 * Math.PI) * 200,
            y: 300 + Math.sin((index / concepts.length) * 2 * Math.PI) * 200
          }
        }))
      ]
    }
    
    // Store in localStorage for now
    const existingMindmaps = JSON.parse(localStorage.getItem('mindmaps') || '[]')
    existingMindmaps.push({
      id: `mindmap-${Date.now()}`,
      ...mindmapData,
      createdAt: new Date().toISOString()
    })
    localStorage.setItem('mindmaps', JSON.stringify(existingMindmaps))
    
    return mindmapData
  }

  const createMemoryCards = async (title: string, content: string) => {
    // Generate memory cards from content
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
    const cards = []
    
    // Create cards from sentences (Q&A format)
    for (let i = 0; i < Math.min(5, sentences.length - 1); i += 2) {
      if (sentences[i] && sentences[i + 1]) {
        cards.push({
          front: sentences[i].trim() + '?',
          back: sentences[i + 1].trim(),
          difficulty: 2,
          tags: [title.toLowerCase().replace(/\s+/g, '-')]
        })
      }
    }
    
    // Create cards via API
    for (const card of cards) {
      try {
        await fetch('/api/memory-cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(card),
        })
      } catch (err) {
        console.error('Error creating memory card:', err)
      }
    }
    
    return cards
  }

  return (
    <div className="space-y-4">
        {!isProcessing && !mindmapCreated && !memoryCardsCreated && (
          <Button onClick={processDocument} className="w-full">
            <Brain className="h-4 w-4 mr-2" />
            Generate Mindmap & Memory Cards
          </Button>
        )}

        {isProcessing && (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing document...</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {(mindmapCreated || memoryCardsCreated) && (
          <div className="space-y-3">
            {mindmapCreated && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Mindmap Created</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => router.push('/cognitive-maps')}
                >
                  View
                </Button>
              </div>
            )}

            {memoryCardsCreated && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Memory Cards Created</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => router.push('/memory-cards')}
                >
                  View
                </Button>
              </div>
            )}
          </div>
        )}

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
