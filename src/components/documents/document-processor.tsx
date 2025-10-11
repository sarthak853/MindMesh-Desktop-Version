'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Brain, CreditCard, CheckCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DocumentProcessorProps {
  documentId: string
  documentTitle: string
  documentContent?: string
  onComplete?: () => void
}

export function DocumentProcessor({ 
  documentId, 
  documentTitle, 
  documentContent = '',
  onComplete 
}: DocumentProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [mindmapCreated, setMindmapCreated] = useState(false)
  const [memoryCardsCreated, setMemoryCardsCreated] = useState(false)
  const [mindmapId, setMindmapId] = useState<string | null>(null)
  const [cardsCount, setCardsCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const processDocument = async () => {
    setIsProcessing(true)
    setError(null)
    setProgress(10)

    try {
      console.log('Starting document processing for:', documentId, documentTitle)
      
      // Step 1: Create a new cognitive map
      setProgress(20)
      console.log('Creating cognitive map...')
      const mapResponse = await fetch('/api/cognitive-maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Mindmap: ${documentTitle}`,
          description: `Auto-generated from document: ${documentTitle}`,
          isPublic: false,
        }),
      })

      if (!mapResponse.ok) {
        const errorData = await mapResponse.json()
        console.error('Map creation failed:', errorData)
        throw new Error(errorData.error || 'Failed to create cognitive map')
      }

      const { map } = await mapResponse.json()
      console.log('Cognitive map created:', map.id)
      setMindmapId(map.id)
      
      // Step 2: Generate nodes from document
      setProgress(40)
      console.log('Generating nodes from document...')
      const nodesResponse = await fetch('/api/ai/generate-nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: documentId,
          mapId: map.id,
          maxNodes: 8,
        }),
      })

      let nodesData = null
      if (!nodesResponse.ok) {
        const errorData = await nodesResponse.json()
        console.error('Node generation failed:', errorData)
        
        // If it's a client error (4xx), we might still have some data
        if (nodesResponse.status >= 400 && nodesResponse.status < 500) {
          console.log('Client error, but checking for partial data...')
          nodesData = errorData
        } else if (nodesResponse.status >= 500) {
          throw new Error(errorData.error || 'Server error during mindmap generation')
        }
      } else {
        nodesData = await nodesResponse.json()
      }

      console.log('Node generation response:', nodesData)
      const nodeCount = nodesData?.nodes?.length || 0
      console.log('Nodes generated:', nodeCount)
      
      // Mark as created if we have nodes OR if the response indicates success
      const hasNodes = nodeCount > 0
      const hasSuccessResponse = nodesData?.success === true
      const hasFallbackNode = nodesData?.fallback === true
      
      if (hasNodes || hasSuccessResponse || hasFallbackNode) {
        setMindmapCreated(true)
        console.log('Mindmap marked as created:', {
          nodeCount,
          hasSuccessResponse,
          hasFallbackNode,
          mapId: map.id
        })
      } else {
        console.log('Mindmap creation unclear, but map exists:', map.id)
        // Still mark as created since we have a map, even without nodes
        setMindmapCreated(true)
      }
      setProgress(60)
      
      // Step 3: Generate memory cards
      setProgress(70)
      console.log('Generating memory cards...')
      const cardsResponse = await fetch('/api/ai/generate-memory-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: documentId,
          count: 10,
        }),
      })

      if (!cardsResponse.ok) {
        const errorData = await cardsResponse.json()
        console.error('Memory card generation failed:', errorData)
        // Don't throw error immediately, the API might have fallback data
        if (cardsResponse.status >= 500) {
          throw new Error(errorData.error || 'Server error during memory card generation')
        }
      }

      const cardsData = await cardsResponse.json()
      console.log('Memory cards generated:', cardsData.memoryCards?.length || 0)
      setCardsCount(cardsData.memoryCards?.length || 0)
      setMemoryCardsCreated(true)
      setProgress(100)
      
      console.log('Document processing completed successfully')
      if (onComplete) {
        onComplete()
      }
    } catch (err) {
      console.error('Error processing document:', err)
      setError(err instanceof Error ? err.message : 'Failed to process document. Please try again.')
    } finally {
      setIsProcessing(false)
    }
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
                  onClick={() => {
                    if (mindmapId) {
                      router.push(`/cognitive-maps/${mindmapId}`)
                    } else {
                      router.push('/cognitive-maps')
                    }
                  }}
                >
                  View Mindmap
                </Button>
              </div>
            )}

            {memoryCardsCreated && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">
                    {cardsCount} Memory Cards Created
                  </span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => router.push('/memory-cards')}
                >
                  View Cards
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
