'use client'

import React, { useState } from 'react'
import { Citation } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, ExternalLink, BookOpen, CheckCircle, AlertTriangle, Info } from 'lucide-react'

interface CitationAnalysis {
  totalSources: number
  citedSources: number
  averageConfidence: number
  hasInsufficientSources: boolean
  fallbackSuggestions: string[]
}

interface FallbackResponse {
  message: string
  suggestions: string[]
  alternativeApproaches: string[]
}

interface CitationDisplayProps {
  citations: Citation[]
  citationAnalysis?: CitationAnalysis
  fallbackResponse?: FallbackResponse
  onCitationClick?: (citation: Citation) => void
  showFormatOptions?: boolean
  className?: string
}

export function CitationDisplay({ 
  citations, 
  citationAnalysis,
  fallbackResponse,
  onCitationClick, 
  showFormatOptions = true,
  className = '' 
}: CitationDisplayProps) {
  const [citationStyle, setCitationStyle] = useState<'apa' | 'mla' | 'chicago'>('apa')
  const [copiedCitation, setCopiedCitation] = useState<string | null>(null)

  const handleCopyCitation = async (citation: Citation, formatted: string) => {
    try {
      await navigator.clipboard.writeText(formatted)
      setCopiedCitation(citation.documentId)
      setTimeout(() => setCopiedCitation(null), 2000)
    } catch (error) {
      console.error('Failed to copy citation:', error)
    }
  }

  const formatCitation = (citation: Citation): string => {
    // Simple citation formatting - in a real app, you'd use a proper citation library
    switch (citationStyle) {
      case 'apa':
        return `${citation.title}. (Document). Retrieved from knowledge base.`
      case 'mla':
        return `"${citation.title}." Knowledge Base Document.`
      case 'chicago':
        return `${citation.title}. Knowledge Base Document.`
      default:
        return citation.title
    }
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  if (citations.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No citations available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Upload documents to enable source citations
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Sources & Citations</CardTitle>
            <CardDescription>
              {citations.length} source{citations.length !== 1 ? 's' : ''} referenced
            </CardDescription>
          </div>
          {showFormatOptions && (
            <Select value={citationStyle} onValueChange={(value: any) => setCitationStyle(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apa">APA</SelectItem>
                <SelectItem value="mla">MLA</SelectItem>
                <SelectItem value="chicago">Chicago</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Citation Quality Analysis */}
        {citationAnalysis && (
          <div className="mb-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Citation Quality Analysis</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Sources Used:</span>
                <span className="ml-2 font-medium">
                  {citationAnalysis.citedSources}/{citationAnalysis.totalSources}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg. Confidence:</span>
                <span className="ml-2 font-medium">
                  {Math.round(citationAnalysis.averageConfidence * 100)}%
                </span>
              </div>
              <div>
                <Badge 
                  variant={citationAnalysis.hasInsufficientSources ? "destructive" : "default"}
                  className="text-xs"
                >
                  {citationAnalysis.hasInsufficientSources ? "Insufficient Sources" : "Good Coverage"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Fallback Response for Insufficient Sources */}
        {fallbackResponse && citationAnalysis?.hasInsufficientSources && (
          <div className="mb-4 p-4 border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 rounded-lg">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                  {fallbackResponse.message}
                </p>
                
                {fallbackResponse.suggestions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                      Suggestions:
                    </p>
                    <ul className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                      {fallbackResponse.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-orange-400 mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {fallbackResponse.alternativeApproaches.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                      Alternative Approaches:
                    </p>
                    <ul className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                      {fallbackResponse.alternativeApproaches.map((approach, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-orange-400 mt-1">•</span>
                          <span>{approach}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {citations.map((citation, index) => {
          const formatted = formatCitation(citation)
          const isCopied = copiedCitation === citation.documentId

          return (
            <div
              key={`${citation.documentId}-${index}`}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">{citation.title}</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant="secondary" 
                      className={getConfidenceColor(citation.confidence)}
                    >
                      {Math.round(citation.confidence * 100)}% confidence
                    </Badge>
                    {citation.page && (
                      <Badge variant="outline">
                        Page {citation.page}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleCopyCitation(citation, formatted)}
                    title="Copy citation"
                  >
                    {isCopied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  {onCitationClick && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onCitationClick(citation)}
                      title="View source"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {citation.excerpt && (
                <blockquote className="border-l-4 border-muted pl-4 mb-3">
                  <p className="text-sm text-muted-foreground italic">
                    "{citation.excerpt}"
                  </p>
                </blockquote>
              )}

              <div className="bg-muted/30 rounded p-2">
                <p className="text-xs font-mono text-muted-foreground">
                  {formatted}
                </p>
              </div>
            </div>
          )
        })}

        {citations.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Citations are automatically generated based on your uploaded documents. 
              Verify accuracy before using in academic work.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}