import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { NextApiRequest } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CollaborativeDocument } from './collaborative-document'

export interface SocketWithAuth extends Socket {
  userId?: string
  userName?: string
  userEmail?: string
  userImage?: string
}

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

interface DocumentRoom {
  documentId: string
  document: CollaborativeDocument
  users: Map<string, UserPresence>
  lastActivity: Date
}

class CollaborationServer {
  private io: SocketIOServer
  private documentRooms: Map<string, DocumentRoom> = new Map()
  private userSockets: Map<string, string> = new Map() // userId -> socketId
  private cleanupInterval: NodeJS.Timeout

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    })

    this.setupMiddleware()
    this.setupEventHandlers()
    this.startCleanupTimer()
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token
        if (!token) {
          return next(new Error('Authentication token required'))
        }

        // Verify session token (you may need to adapt this based on your auth setup)
        const session = await this.verifySessionToken(token)
        if (!session?.user) {
          return next(new Error('Invalid authentication token'))
        }

        socket.userId = session.user.id
        socket.userName = session.user.name
        socket.userEmail = session.user.email
        socket.userImage = session.user.image

        next()
      } catch (error) {
        next(new Error('Authentication failed'))
      }
    })
  }

  private async verifySessionToken(token: string) {
    // This is a simplified version - you'll need to implement proper token verification
    // based on your authentication setup
    try {
      // For now, we'll assume the token is valid and contains user info
      // In production, you'd verify the JWT or session token properly
      return JSON.parse(Buffer.from(token, 'base64').toString())
    } catch {
      return null
    }
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: SocketWithAuth) => {
      console.log(`User ${socket.userName} connected (${socket.id})`)
      
      // Track user socket
      if (socket.userId) {
        this.userSockets.set(socket.userId, socket.id)
      }

      // Join document room
      socket.on('join-document', async (data: { documentId: string }) => {
        await this.handleJoinDocument(socket, data.documentId)
      })

      // Leave document room
      socket.on('leave-document', (data: { documentId: string }) => {
        this.handleLeaveDocument(socket, data.documentId)
      })

      // Handle document operations
      socket.on('document-operation', (data: {
        documentId: string
        operation: any
        clientId: string
      }) => {
        this.handleDocumentOperation(socket, data)
      })

      // Handle cursor updates
      socket.on('cursor-update', (data: {
        documentId: string
        cursor: { line: number; column: number }
      }) => {
        this.handleCursorUpdate(socket, data)
      })

      // Handle selection updates
      socket.on('selection-update', (data: {
        documentId: string
        selection: {
          start: { line: number; column: number }
          end: { line: number; column: number }
        }
      }) => {
        this.handleSelectionUpdate(socket, data)
      })

      // Handle typing indicators
      socket.on('typing-start', (data: { documentId: string }) => {
        this.handleTypingStart(socket, data.documentId)
      })

      socket.on('typing-stop', (data: { documentId: string }) => {
        this.handleTypingStop(socket, data.documentId)
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket)
      })
    })
  }

  private async handleJoinDocument(socket: SocketWithAuth, documentId: string) {
    try {
      // Check if user has access to this document
      const hasAccess = await this.checkDocumentAccess(socket.userId!, documentId)
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to document' })
        return
      }

      // Get or create document room
      let room = this.documentRooms.get(documentId)
      if (!room) {
        const document = await this.loadDocument(documentId)
        if (!document) {
          socket.emit('error', { message: 'Document not found' })
          return
        }

        room = {
          documentId,
          document: new CollaborativeDocument(documentId, document.content),
          users: new Map(),
          lastActivity: new Date()
        }
        this.documentRooms.set(documentId, room)
      }

      // Join socket room
      socket.join(documentId)

      // Add user to room
      const userPresence: UserPresence = {
        userId: socket.userId!,
        userName: socket.userName!,
        userEmail: socket.userEmail!,
        userImage: socket.userImage,
        lastSeen: new Date()
      }
      room.users.set(socket.userId!, userPresence)
      room.lastActivity = new Date()

      // Send current document state to user
      socket.emit('document-state', {
        content: room.document.getContent(),
        version: room.document.getVersion(),
        users: Array.from(room.users.values())
      })

      // Notify other users
      socket.to(documentId).emit('user-joined', userPresence)

      console.log(`User ${socket.userName} joined document ${documentId}`)
    } catch (error) {
      console.error('Error joining document:', error)
      socket.emit('error', { message: 'Failed to join document' })
    }
  }

  private handleLeaveDocument(socket: SocketWithAuth, documentId: string) {
    const room = this.documentRooms.get(documentId)
    if (!room || !socket.userId) return

    // Remove user from room
    room.users.delete(socket.userId)
    socket.leave(documentId)

    // Notify other users
    socket.to(documentId).emit('user-left', { userId: socket.userId })

    // Clean up empty rooms
    if (room.users.size === 0) {
      this.documentRooms.delete(documentId)
    }

    console.log(`User ${socket.userName} left document ${documentId}`)
  }

  private handleDocumentOperation(socket: SocketWithAuth, data: {
    documentId: string
    operation: any
    clientId: string
  }) {
    const room = this.documentRooms.get(data.documentId)
    if (!room || !socket.userId) return

    try {
      // Apply operation to document
      const transformedOperation = room.document.applyOperation(
        data.operation,
        data.clientId
      )

      // Update room activity
      room.lastActivity = new Date()
      const user = room.users.get(socket.userId)
      if (user) {
        user.lastSeen = new Date()
      }

      // Broadcast operation to other users
      socket.to(data.documentId).emit('document-operation', {
        operation: transformedOperation,
        userId: socket.userId,
        userName: socket.userName,
        version: room.document.getVersion()
      })

      // Periodically save document to database
      this.scheduleDocumentSave(data.documentId)

    } catch (error) {
      console.error('Error applying document operation:', error)
      socket.emit('operation-error', { 
        message: 'Failed to apply operation',
        operation: data.operation 
      })
    }
  }

  private handleCursorUpdate(socket: SocketWithAuth, data: {
    documentId: string
    cursor: { line: number; column: number }
  }) {
    const room = this.documentRooms.get(data.documentId)
    if (!room || !socket.userId) return

    const user = room.users.get(socket.userId)
    if (user) {
      user.cursor = data.cursor
      user.lastSeen = new Date()
    }

    // Broadcast cursor position to other users
    socket.to(data.documentId).emit('cursor-update', {
      userId: socket.userId,
      userName: socket.userName,
      cursor: data.cursor
    })
  }

  private handleSelectionUpdate(socket: SocketWithAuth, data: {
    documentId: string
    selection: {
      start: { line: number; column: number }
      end: { line: number; column: number }
    }
  }) {
    const room = this.documentRooms.get(data.documentId)
    if (!room || !socket.userId) return

    const user = room.users.get(socket.userId)
    if (user) {
      user.selection = data.selection
      user.lastSeen = new Date()
    }

    // Broadcast selection to other users
    socket.to(data.documentId).emit('selection-update', {
      userId: socket.userId,
      userName: socket.userName,
      selection: data.selection
    })
  }

  private handleTypingStart(socket: SocketWithAuth, documentId: string) {
    socket.to(documentId).emit('typing-start', {
      userId: socket.userId,
      userName: socket.userName
    })
  }

  private handleTypingStop(socket: SocketWithAuth, documentId: string) {
    socket.to(documentId).emit('typing-stop', {
      userId: socket.userId
    })
  }

  private handleDisconnect(socket: SocketWithAuth) {
    console.log(`User ${socket.userName} disconnected (${socket.id})`)

    if (socket.userId) {
      this.userSockets.delete(socket.userId)

      // Remove user from all document rooms
      for (const [documentId, room] of this.documentRooms) {
        if (room.users.has(socket.userId)) {
          room.users.delete(socket.userId)
          socket.to(documentId).emit('user-left', { userId: socket.userId })

          // Clean up empty rooms
          if (room.users.size === 0) {
            this.documentRooms.delete(documentId)
          }
        }
      }
    }
  }

  private async checkDocumentAccess(userId: string, documentId: string): Promise<boolean> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          project: {
            include: {
              members: {
                where: { userId }
              }
            }
          }
        }
      })

      if (!document) return false

      // Check if user is project member or document is public
      const isProjectMember = document.project?.members.length > 0
      const isOwner = document.project?.ownerId === userId
      const isPublic = document.project?.isPublic

      return isOwner || isProjectMember || isPublic || false
    } catch (error) {
      console.error('Error checking document access:', error)
      return false
    }
  }

  private async loadDocument(documentId: string) {
    try {
      return await prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, content: true, title: true }
      })
    } catch (error) {
      console.error('Error loading document:', error)
      return null
    }
  }

  private scheduleDocumentSave(documentId: string) {
    // Debounced save - only save after 5 seconds of inactivity
    const room = this.documentRooms.get(documentId)
    if (!room) return

    if (room.document.saveTimeout) {
      clearTimeout(room.document.saveTimeout)
    }

    room.document.saveTimeout = setTimeout(async () => {
      await this.saveDocument(documentId)
    }, 5000)
  }

  private async saveDocument(documentId: string) {
    const room = this.documentRooms.get(documentId)
    if (!room) return

    try {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          content: room.document.getContent(),
          updatedAt: new Date()
        }
      })

      console.log(`Document ${documentId} saved to database`)
    } catch (error) {
      console.error('Error saving document:', error)
    }
  }

  private startCleanupTimer() {
    // Clean up inactive rooms every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = new Date()
      const inactiveThreshold = 30 * 60 * 1000 // 30 minutes

      for (const [documentId, room] of this.documentRooms) {
        if (now.getTime() - room.lastActivity.getTime() > inactiveThreshold) {
          console.log(`Cleaning up inactive room: ${documentId}`)
          this.documentRooms.delete(documentId)
        }
      }
    }, 5 * 60 * 1000)
  }

  public getStats() {
    return {
      activeRooms: this.documentRooms.size,
      totalUsers: this.userSockets.size,
      roomDetails: Array.from(this.documentRooms.entries()).map(([id, room]) => ({
        documentId: id,
        userCount: room.users.size,
        lastActivity: room.lastActivity
      }))
    }
  }

  public shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.io.close()
  }
}

export default CollaborationServer