'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  Wifi, 
  WifiOff, 
  Save, 
  History,
  MessageSquare,
  Eye,
  Edit3,
  AlertCircle
} from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { CollaborativeDocument } from '@/lib/collaboration/collaborative-document'

interface UserPresence {
  userId: string
  userName: string
  userEmail: string
  userImage?: string
  cursor?: {
    line: number
    column: number
  }
  selection?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
  lastSeen: Date
}

interface CollaborativeEditorProps {
  documentId: string
  initialContent?: string
  onContentChange?: (content: string) => void
  readOnly?: boolean
  className?: string
}

export function CollaborativeEditor({
  documentId,
  initialContent = '',
  onContentChange,
  readOnly = false,
  className = ''
}: CollaborativeEditorProps) {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [content, setContent] = useState(initialContent)
  const [users, setUsers] = useState<UserPresence[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [version, setVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const clientIdRef = useRef(`client-${Date.now()}-${Math.random()}`)
  const cursorPositionRef = useRef({ line: 0, column: 0 })
  const selectionRef = useRef<{ start: { line: number; column: number }, end: { line: number; column: number } } | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastOperationRef = useRef<string>('')

  // Initialize socket connection
  useEffect(() => {
    if (!session?.user || !documentId) return

    const initSocket = async () => {
      try {
        // Create authentication token (simplified - you'd use proper JWT in production)
        const authToken = Buffer.from(JSON.stringify({
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image
          }
        })).toString('base64')

        const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
          auth: { token: authToken },
          transports: ['websocket', 'polling']
        })

        newSocket.on('connect', () => {
          console.log('Connected to collaboration server')
          setConnected(true)
          setError(null)
          
          // Join document room
          newSocket.emit('join-document', { documentId })
        })

        newSocket.on('disconnect', () => {
          console.log('Disconnected from collaboration server')
          setConnected(false)
        })

        newSocket.on('connect_error', (error) => {
          console.error('Connection error:', error)
          setError('Failed to connect to collaboration server')
          setConnected(false)
        })

        // Document state received (initial sync)
        newSocket.on('document-state', (data: {
          content: string
          version: number
          users: UserPresence[]
        }) => {
          setContent(data.content)
          setVersion(data.version)
          setUsers(data.users.filter(u => u.userId !== session.user.id))
          if (onContentChange) {
            onContentChange(data.content)
          }
        })

        // User joined/left events
        newSocket.on('user-joined', (user: UserPresence) => {
          if (user.userId !== session.user.id) {
            setUsers(prev => [...prev.filter(u => u.userId !== user.userId), user])
          }
        })

        newSocket.on('user-left', (data: { userId: string }) => {
          setUsers(prev => prev.filter(u => u.userId !== data.userId))
          setTypingUsers(prev => {
            const newSet = new Set(prev)
            newSet.delete(data.userId)
            return newSet
          })
        })

        // Document operations
        newSocket.on('document-operation', (data: {
          operation: any
          userId: string
          userName: string
          version: number
        }) => {
          if (data.userId !== session.user.id) {
            applyRemoteOperation(data.operation)
            setVersion(data.version)
          }
        })

        // Cursor and selection updates
        newSocket.on('cursor-update', (data: {
          userId: string
          userName: string
          cursor: { line: number; column: number }
        }) => {
          if (data.userId !== session.user.id) {
            setUsers(prev => prev.map(u => 
              u.userId === data.userId 
                ? { ...u, cursor: data.cursor }
                : u
            ))
          }
        })

        newSocket.on('selection-update', (data: {
          userId: string
          userName: string
          selection: {
            start: { line: number; column: number }
            end: { line: number; column: number }
          }
        }) => {
          if (data.userId !== session.user.id) {
            setUsers(prev => prev.map(u => 
              u.userId === data.userId 
                ? { ...u, selection: data.selection }
                : u
            ))
          }
        })

        // Typing indicators
        newSocket.on('typing-start', (data: { userId: string; userName: string }) => {
          if (data.userId !== session.user.id) {
            setTypingUsers(prev => new Set([...prev, data.userId]))
          }
        })

        newSocket.on('typing-stop', (data: { userId: string }) => {
          setTypingUsers(prev => {
            const newSet = new Set(prev)
            newSet.delete(data.userId)
            return newSet
          })
        })

        // Error handling
        newSocket.on('error', (data: { message: string }) => {
          setError(data.message)
        })

        newSocket.on('operation-error', (data: { message: string; operation: any }) => {
          console.error('Operation error:', data)
          setError(`Operation failed: ${data.message}`)
        })

        setSocket(newSocket)
      } catch (error) {
        console.error('Failed to initialize socket:', error)
        setError('Failed to initialize collaboration')
      }
    }

    initSocket()

    return () => {
      if (socket) {
        socket.emit('leave-document', { documentId })
        socket.disconnect()
      }
    }
  }, [session, documentId])

  // Apply remote operation to local content
  const applyRemoteOperation = useCallback((operation: any) => {
    setContent(prevContent => {
      let newContent = prevContent
      
      // Sort operations by position (descending) to avoid position shifts
      const sortedOps = [...operation.operations].sort((a: any, b: any) => {
        const posA = a.position || 0
        const posB = b.position || 0
        return posB - posA
      })

      for (const op of sortedOps) {
        switch (op.type) {
          case 'insert':
            newContent = newContent.slice(0, op.position) + 
                        op.text + 
                        newContent.slice(op.position)
            break
          case 'delete':
            newContent = newContent.slice(0, op.position) + 
                        newContent.slice(op.position + op.length)
            break
        }
      }

      if (onContentChange) {
        onContentChange(newContent)
      }
      
      return newContent
    })
  }, [onContentChange])

  // Handle text changes
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly || !socket || !connected) return

    const newContent = e.target.value
    const oldContent = content

    // Calculate the difference and create operation
    const operation = calculateOperation(oldContent, newContent, clientIdRef.current)
    
    if (operation && operation.operations.length > 0) {
      // Apply locally first
      setContent(newContent)
      if (onContentChange) {
        onContentChange(newContent)
      }

      // Send to server
      socket.emit('document-operation', {
        documentId,
        operation,
        clientId: clientIdRef.current
      })

      // Handle typing indicators
      handleTypingStart()
    }
  }, [content, readOnly, socket, connected, documentId, onContentChange])

  // Calculate operation from content difference
  const calculateOperation = (oldContent: string, newContent: string, clientId: string) => {
    // Simple diff algorithm - in production you'd want a more sophisticated one
    let position = 0
    let operations = []

    // Find first difference
    while (position < Math.min(oldContent.length, newContent.length) && 
           oldContent[position] === newContent[position]) {
      position++
    }

    if (position === oldContent.length && position === newContent.length) {
      return null // No changes
    }

    if (position === oldContent.length) {
      // Insertion at end
      operations.push({
        type: 'insert',
        position,
        text: newContent.slice(position)
      })
    } else if (position === newContent.length) {
      // Deletion at end
      operations.push({
        type: 'delete',
        position,
        length: oldContent.length - position
      })
    } else {
      // Find end of difference
      let oldEnd = oldContent.length - 1
      let newEnd = newContent.length - 1
      
      while (oldEnd >= position && newEnd >= position && 
             oldContent[oldEnd] === newContent[newEnd]) {
        oldEnd--
        newEnd--
      }

      // Delete old content
      if (oldEnd >= position) {
        operations.push({
          type: 'delete',
          position,
          length: oldEnd - position + 1
        })
      }

      // Insert new content
      if (newEnd >= position) {
        operations.push({
          type: 'insert',
          position,
          text: newContent.slice(position, newEnd + 1)
        })
      }
    }

    return {
      id: `${clientId}-${Date.now()}-${Math.random()}`,
      clientId,
      operations,
      version
    }
  }

  // Handle cursor position changes
  const handleCursorChange = useCallback(() => {
    if (!socket || !connected || !editorRef.current) return

    const textarea = editorRef.current
    const cursorPos = textarea.selectionStart
    const lines = content.slice(0, cursorPos).split('\n')
    const line = lines.length - 1
    const column = lines[lines.length - 1].length

    const newCursor = { line, column }
    
    // Only send if cursor actually moved
    if (newCursor.line !== cursorPositionRef.current.line || 
        newCursor.column !== cursorPositionRef.current.column) {
      cursorPositionRef.current = newCursor
      
      socket.emit('cursor-update', {
        documentId,
        cursor: newCursor
      })
    }

    // Handle selection
    if (textarea.selectionStart !== textarea.selectionEnd) {
      const selectionStart = textarea.selectionStart
      const selectionEnd = textarea.selectionEnd
      
      const startLines = content.slice(0, selectionStart).split('\n')
      const endLines = content.slice(0, selectionEnd).split('\n')
      
      const selection = {
        start: {
          line: startLines.length - 1,
          column: startLines[startLines.length - 1].length
        },
        end: {
          line: endLines.length - 1,
          column: endLines[endLines.length - 1].length
        }
      }

      selectionRef.current = selection
      
      socket.emit('selection-update', {
        documentId,
        selection
      })
    } else if (selectionRef.current) {
      selectionRef.current = null
    }
  }, [socket, connected, content, documentId])

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!socket || !connected) return

    socket.emit('typing-start', { documentId })

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', { documentId })
    }, 2000)
  }, [socket, connected, documentId])

  // Manual save
  const handleSave = useCallback(async () => {
    if (!socket || !connected) return

    setSaving(true)
    try {
      // Force save by emitting a retain operation
      const operation = CollaborativeDocument.createRetainOperation(
        clientIdRef.current,
        content.length
      )
      
      socket.emit('document-operation', {
        documentId,
        operation,
        clientId: clientIdRef.current
      })

      setLastSaved(new Date())
    } catch (error) {
      console.error('Save failed:', error)
      setError('Failed to save document')
    } finally {
      setSaving(false)
    }
  }, [socket, connected, content, documentId])

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Get user color based on userId
  const getUserColor = (userId: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Collaborative Editor
            </CardTitle>
            
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {connected ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <Wifi className="h-4 w-4" />
                    <span className="text-sm">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <WifiOff className="h-4 w-4" />
                    <span className="text-sm">Disconnected</span>
                  </div>
                )}
              </div>

              {/* Save Status */}
              {lastSaved && (
                <div className="text-sm text-muted-foreground">
                  Saved {lastSaved.toLocaleTimeString()}
                </div>
              )}

              {/* Manual Save Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={!connected || saving || readOnly}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collaborative Users */}
      {users.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{users.length} collaborator{users.length !== 1 ? 's' : ''}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {users.slice(0, 5).map((user) => (
                  <div key={user.userId} className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.userImage} />
                      <AvatarFallback className={`text-white text-xs ${getUserColor(user.userId)}`}>
                        {getUserInitials(user.userName)}
                      </AvatarFallback>
                    </Avatar>
                    {typingUsers.has(user.userId) && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                ))}
                
                {users.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{users.length - 5}
                  </Badge>
                )}
              </div>

              {/* Typing Indicators */}
              {typingUsers.size > 0 && (
                <div className="text-sm text-muted-foreground">
                  {Array.from(typingUsers).slice(0, 2).map(userId => {
                    const user = users.find(u => u.userId === userId)
                    return user?.userName
                  }).filter(Boolean).join(', ')} 
                  {typingUsers.size > 2 && ` and ${typingUsers.size - 2} others`} typing...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor */}
      <Card>
        <CardContent className="p-0">
          <textarea
            ref={editorRef}
            value={content}
            onChange={handleContentChange}
            onSelect={handleCursorChange}
            onKeyUp={handleCursorChange}
            onClick={handleCursorChange}
            readOnly={readOnly}
            placeholder={readOnly ? "This document is read-only" : "Start typing to collaborate..."}
            className="w-full h-96 p-4 border-none resize-none focus:outline-none font-mono text-sm leading-relaxed"
            style={{
              minHeight: '400px',
              background: readOnly ? '#f8f9fa' : 'white'
            }}
          />
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Version: {version}</span>
          <span>Characters: {content.length}</span>
          <span>Lines: {content.split('\n').length}</span>
        </div>
        
        {connected && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live collaboration active</span>
          </div>
        )}
      </div>
    </div>
  )
}