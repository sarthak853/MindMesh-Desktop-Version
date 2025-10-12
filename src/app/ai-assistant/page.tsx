'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  BookOpen,
  Lightbulb,
  Zap,
  History,
  Settings,
  ArrowLeft
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  mode?: 'scholar' | 'explorer'
  citations?: Array<{
    source: string
    confidence: number
  }>
}

interface ChatSession {
  id: string
  title: string
  mode: 'scholar' | 'explorer'
  lastMessage: string
  updatedAt: string
}

export default function AIAssistantPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentMode, setCurrentMode] = useState<'scholar' | 'explorer'>('scholar')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadChatSessions()
    startNewSession()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadChatSessions = () => {
    // Mock data - in real app, this would fetch from the database
    const mockSessions: ChatSession[] = [
      {
        id: '1',
        title: 'Machine Learning Questions',
        mode: 'scholar',
        lastMessage: 'Can you explain neural networks?',
        updatedAt: '2 hours ago'
      },
      {
        id: '2',
        title: 'Creative Writing Ideas',
        mode: 'explorer',
        lastMessage: 'Help me brainstorm story concepts',
        updatedAt: '1 day ago'
      }
    ]
    setSessions(mockSessions)
  }

  const startNewSession = () => {
    const newSessionId = Date.now().toString()
    setCurrentSession(newSessionId)
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: `Hello! I'm your AI assistant in ${currentMode} mode. ${
          currentMode === 'scholar' 
            ? 'I can help you with research, analysis, and provide well-sourced information.'
            : 'I can help you explore ideas, brainstorm, and think creatively about problems.'
        } How can I assist you today?`,
        timestamp: new Date(),
        mode: currentMode
      }
    ])
  }

  const switchMode = (mode: 'scholar' | 'explorer') => {
    setCurrentMode(mode)
    startNewSession()
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          mode: currentMode,
          conversationHistory: history,
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const message = err?.error || 'Failed to generate AI response'
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: message,
          timestamp: new Date(),
          mode: currentMode,
        }
        setMessages(prev => [...prev, aiResponse])
        setIsLoading(false)
        return
      }

      const data = await res.json()
      const apiResp = data?.response
      const content = apiResp?.content || 'No content returned.'
      const citations = Array.isArray(apiResp?.citations)
        ? apiResp.citations.map((c: any) => ({
            source: c.title || c.excerpt || c.documentId || 'Source',
            confidence: typeof c.confidence === 'number' ? c.confidence : 0.5,
          }))
        : undefined

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
        mode: currentMode,
        citations: currentMode === 'scholar' ? citations : undefined,
      }

      setMessages(prev => [...prev, aiResponse])
    } catch (e) {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Something went wrong while contacting the AI service.',
        timestamp: new Date(),
        mode: currentMode,
      }
      setMessages(prev => [...prev, aiResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockResponse = (input: string, mode: 'scholar' | 'explorer'): string => {
    if (mode === 'scholar') {
      return `Based on current research and academic literature, I can provide you with a comprehensive analysis of "${input}". 

The key points to consider are:

1. **Theoretical Foundation**: The concept is well-established in academic literature with strong empirical support.

2. **Current Research**: Recent studies have shown significant developments in this area, particularly in the last 5 years.

3. **Practical Applications**: This knowledge has been successfully applied in various real-world scenarios.

4. **Future Directions**: Ongoing research suggests several promising avenues for further exploration.

Would you like me to elaborate on any of these points or provide more specific information about a particular aspect?`
    } else {
      return `What an interesting question about "${input}"! Let me explore this creatively with you.

Here are some fascinating angles to consider:

🌟 **Fresh Perspective**: What if we approached this from a completely different angle? Sometimes the most innovative solutions come from unexpected directions.

🎨 **Creative Connections**: This reminds me of patterns we see in nature, art, and human behavior. There might be interesting parallels we can draw.

🚀 **Wild Possibilities**: Let's think outside the box - what would happen if we removed all conventional constraints?

💡 **Synthesis**: We could combine elements from different fields to create something entirely new.

What aspect excites you most? I'd love to dive deeper into whichever direction sparks your curiosity!`
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">AI Assistant</h2>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Mode Selector */}
          <div className="flex space-x-2">
            <Button
              variant={currentMode === 'scholar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchMode('scholar')}
              className="flex-1"
            >
              <BookOpen className="h-4 w-4 mr-1" />
              Scholar
            </Button>
            <Button
              variant={currentMode === 'explorer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchMode('explorer')}
              className="flex-1"
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              Explorer
            </Button>
          </div>
        </div>

        {/* Mode Description */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="text-sm">
            <div className="font-medium mb-1">
              {currentMode === 'scholar' ? 'Scholar Mode' : 'Explorer Mode'}
            </div>
            <div className="text-gray-600">
              {currentMode === 'scholar' 
                ? 'Research-focused with citations and evidence-based responses'
                : 'Creative and exploratory thinking for brainstorming and ideation'
              }
            </div>
          </div>
        </div>

        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Recent Sessions</h3>
              <Button variant="ghost" size="sm" onClick={startNewSession}>
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {sessions.map((session) => (
                <Card 
                  key={session.id} 
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                    currentSession === session.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setCurrentSession(session.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={session.mode === 'scholar' ? 'default' : 'secondary'}>
                        {session.mode}
                      </Badge>
                      <span className="text-xs text-gray-500">{session.updatedAt}</span>
                    </div>
                    <div className="font-medium text-sm mb-1">{session.title}</div>
                    <div className="text-xs text-gray-600 truncate">{session.lastMessage}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" onClick={() => router.push('/')} className="mr-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">AI Assistant</h1>
                <p className="text-sm text-gray-600">
                  {currentMode === 'scholar' ? 'Scholar Mode - Research & Analysis' : 'Explorer Mode - Creative Thinking'}
                </p>
              </div>
            </div>
            <Badge variant={currentMode === 'scholar' ? 'default' : 'secondary'}>
              {currentMode === 'scholar' ? (
                <BookOpen className="h-3 w-3 mr-1" />
              ) : (
                <Lightbulb className="h-3 w-3 mr-1" />
              )}
              {currentMode}
            </Badge>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex space-x-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-gray-600' 
                    : message.mode === 'scholar' 
                      ? 'bg-blue-600' 
                      : 'bg-purple-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-5 w-5 text-white" />
                  ) : (
                    <Bot className="h-5 w-5 text-white" />
                  )}
                </div>
                
                <div className={`rounded-lg p-4 ${
                  message.role === 'user' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-white border border-gray-200'
                }`}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm text-gray-600 mb-2">Sources:</div>
                      <div className="space-y-1">
                        {message.citations.map((citation, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span>{citation.source}</span>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(citation.confidence * 100)}% confidence
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex space-x-3 max-w-3xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentMode === 'scholar' ? 'bg-blue-600' : 'bg-purple-600'
                }`}>
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder={`Ask me anything in ${currentMode} mode...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
            </div>
            <Button 
              onClick={sendMessage} 
              disabled={!inputMessage.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>{currentMode === 'scholar' ? 'Responses include citations' : 'Creative exploration mode'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}