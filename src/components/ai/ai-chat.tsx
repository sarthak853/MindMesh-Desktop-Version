'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Send, 
  Bot, 
  User, 
  Brain, 
  Lightbulb, 
  ArrowLeft,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  mode?: 'scholar' | 'explorer'
  citations?: Array<{
    title: string
    excerpt: string
    confidence: number
  }>
  relatedConcepts?: string[]
}

interface AIChatProps {
  onBack: () => void
}

export function AIChat({ onBack }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'scholar' | 'explorer'>('scholar')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          mode,
          conversationHistory: messages.slice(-10), // Last 10 messages for context
          uploadedDocuments: [], // TODO: Integrate with document system
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        mode,
        citations: data.citations || [],
        relatedConcepts: data.relatedConcepts || []
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to get AI response. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const renderMessage = (message: Message) => (
    <div key={message.id} className={`flex gap-3 mb-6 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'assistant' && (
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            message.mode === 'scholar' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
          }`}>
            {message.mode === 'scholar' ? <Brain className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
          </div>
        </div>
      )}
      
      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
        <Card className={message.role === 'user' ? 'bg-primary text-primary-foreground' : ''}>
          <CardContent className="p-4">
            <div className="prose prose-sm max-w-none">
              {message.content}
            </div>
            
            {message.citations && message.citations.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Sources:</h4>
                <div className="space-y-2">
                  {message.citations.map((citation, index) => (
                    <div key={index} className="text-xs bg-muted p-2 rounded">
                      <div className="font-medium">{citation.title}</div>
                      <div className="text-muted-foreground mt-1">{citation.excerpt}</div>
                      <Badge variant="outline" className="mt-1">
                        {Math.round(citation.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {message.relatedConcepts && message.relatedConcepts.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Related Concepts:</h4>
                <div className="flex flex-wrap gap-1">
                  {message.relatedConcepts.map((concept, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {concept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-4 pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {message.timestamp.toLocaleTimeString()}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(message.content)}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {message.role === 'assistant' && (
                  <>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {message.role === 'user' && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">AI Assistant</h1>
        </div>
        
        <Tabs value={mode} onValueChange={(value) => setMode(value as 'scholar' | 'explorer')}>
          <TabsList>
            <TabsTrigger value="scholar" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Scholar
            </TabsTrigger>
            <TabsTrigger value="explorer" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Explorer
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Mode Description */}
      <div className="p-4 bg-muted/50 border-b">
        <div className="text-sm text-muted-foreground">
          {mode === 'scholar' ? (
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-600" />
              <span>Scholar Mode: Get factual, evidence-based responses with citations and confidence scores.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-purple-600" />
              <span>Explorer Mode: Engage in creative thinking, idea generation, and interdisciplinary connections.</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                mode === 'scholar' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
              }`}>
                {mode === 'scholar' ? <Brain className="h-8 w-8" /> : <Lightbulb className="h-8 w-8" />}
              </div>
              <h3 className="text-lg font-medium mb-2">
                {mode === 'scholar' ? 'Scholar Mode Active' : 'Explorer Mode Active'}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {mode === 'scholar' 
                  ? 'Ask me questions and I\'ll provide factual, well-researched answers with citations.'
                  : 'Let\'s explore ideas together! I\'ll help you think creatively and make novel connections.'
                }
              </p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          
          {isLoading && (
            <div className="flex gap-3 mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                mode === 'scholar' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
              }`}>
                {mode === 'scholar' ? <Brain className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
              </div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={mode === 'scholar' ? 'Ask a question...' : 'Share an idea or explore a concept...'}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}