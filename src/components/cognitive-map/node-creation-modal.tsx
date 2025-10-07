'use client'

import React, { useState } from 'react'
import { CognitiveNode } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FileText, 
  CreditCard, 
  Image, 
  Lightbulb, 
  FolderOpen,
  X
} from 'lucide-react'

interface NodeCreationModalProps {
  position: { x: number; y: number }
  onCreate: (nodeData: Partial<CognitiveNode>) => void
  onCancel: () => void
}

const nodeTypes = [
  { value: 'concept', label: 'Concept', icon: Lightbulb, description: 'Ideas, theories, or abstract concepts' },
  { value: 'article', label: 'Article', icon: FileText, description: 'Research papers, articles, or documents' },
  { value: 'flashcard', label: 'Flashcard', icon: CreditCard, description: 'Memory cards for spaced repetition' },
  { value: 'multimedia', label: 'Multimedia', icon: Image, description: 'Images, videos, or audio content' },
  { value: 'project', label: 'Project', icon: FolderOpen, description: 'Projects or practical applications' },
] as const

export function NodeCreationModal({ position, onCreate, onCancel }: NodeCreationModalProps) {
  const [nodeType, setNodeType] = useState<CognitiveNode['type']>('concept')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleCreate = () => {
    if (!title.trim()) return

    onCreate({
      type: nodeType,
      title: title.trim(),
      content: content.trim(),
      metadata: {},
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleCreate()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Create New Node</CardTitle>
              <CardDescription>
                Add a new node to your cognitive map
              </CardDescription>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Node Type Selection */}
          <div className="space-y-2">
            <Label>Node Type</Label>
            <Select value={nodeType} onValueChange={(value) => setNodeType(value as CognitiveNode['type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nodeTypes.map((type) => {
                  const IconComponent = type.icon
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter node title"
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {/* Content Input */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter node content (optional)"
              onKeyDown={handleKeyDown}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!title.trim()}
            >
              Create Node
            </Button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-muted-foreground text-center pt-2">
            Press Ctrl+Enter to create, Escape to cancel
          </div>
        </CardContent>
      </Card>
    </div>
  )
}