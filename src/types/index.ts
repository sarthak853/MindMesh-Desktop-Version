// Core Types for MindMesh

export interface CognitiveNode {
  id: string
  type: 'article' | 'flashcard' | 'multimedia' | 'concept' | 'project'
  title: string
  content: string
  position: { x: number; y: number }
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface NodeConnection {
  id: string
  sourceNodeId: string
  targetNodeId: string
  relationshipType: string
  label?: string
  strength: number
}

export interface CognitiveMap {
  id: string
  userId: string
  title: string
  nodes: CognitiveNode[]
  connections: NodeConnection[]
  isPublic: boolean
  collaborators: string[]
}

export interface AIContext {
  userId: string
  mode: 'scholar' | 'explorer'
  uploadedDocuments: Document[]
  conversationHistory: Message[]
  currentProject?: string
}

export interface AIResponse {
  content: string
  citations?: Citation[]
  confidence: number
  suggestedActions?: string[]
  relatedConcepts?: string[]
}

export interface Document {
  id: string
  title: string
  content: string
  type: 'pdf' | 'text' | 'web' | 'note'
  embeddings: number[]
  metadata: DocumentMetadata
}

export interface DocumentMetadata {
  author?: string
  source?: string
  tags?: string[]
  uploadedAt: Date
  fileSize?: number
  mimeType?: string
}

export interface Citation {
  documentId: string
  title: string
  excerpt: string
  page?: number
  confidence: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface MemoryCard {
  id: string
  userId: string
  front: string
  back: string
  difficulty: number
  nextReview: Date
  reviewCount: number
  successRate: number
  tags: string[]
  metadata?: {
    easinessFactor?: number
    interval?: number
    repetitions?: number
    lastReviewQuality?: number
    lastReviewTime?: number
    lastReviewDate?: Date
  }
}

export interface SpacedRepetitionScheduler {
  calculateNextReview(card: MemoryCard, performance: number): Date
  getDueCards(userId: string): Promise<MemoryCard[]>
  updateCardPerformance(cardId: string, performance: number): Promise<void>
}

export interface CollaborativeProject {
  id: string
  title: string
  description: string
  ownerId: string
  collaborators: Collaborator[]
  documents: SharedDocument[]
  discussions: Discussion[]
  version: number
}

export interface Collaborator {
  userId: string
  role: 'owner' | 'editor' | 'viewer'
  permissions: string[]
  joinedAt: Date
}

export interface SharedDocument {
  id: string
  projectId: string
  content: string
  version: number
  lastModified: Date
  lockStatus: DocumentLock
}

export interface DocumentLock {
  isLocked: boolean
  lockedBy?: string
  lockedAt?: Date
}

export interface Discussion {
  id: string
  projectId: string
  title: string
  messages: Message[]
  participants: string[]
  createdAt: Date
}

export interface RealTimeUpdate {
  type: 'text_change' | 'cursor_move' | 'user_join' | 'user_leave'
  userId: string
  data: any
  timestamp: Date
}

export interface MediaSynthesisRequest {
  sourceContent: string
  outputFormat: 'infographic' | 'podcast' | 'video' | 'audio'
  style?: string
  language?: string
  customizations?: Record<string, any>
}

export interface GeneratedMedia {
  id: string
  type: string
  url: string
  metadata: MediaMetadata
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface MediaMetadata {
  duration?: number
  dimensions?: { width: number; height: number }
  fileSize: number
  format: string
  createdAt: Date
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  aiMode: 'scholar' | 'explorer'
  notifications: {
    memoryReviews: boolean
    collaborationUpdates: boolean
    inspirationStream: boolean
  }
  wellness: {
    pomodoroLength: number
    breakReminders: boolean
    dailyGoals: number
  }
}