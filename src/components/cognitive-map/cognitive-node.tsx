'use client'

import React, { useState, useRef, useCallback } from 'react'
import { CognitiveNode } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText, 
  CreditCard, 
  Image, 
  Lightbulb, 
  FolderOpen,
  Edit,
  Trash2,
  Link,
  MoreHorizontal
} from 'lucide-react'

interface CognitiveNodeProps {
  node: CognitiveNode
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<CognitiveNode>) => void
  onDelete: () => void
  onDrag: (position: { x: number; y: number }) => void
  onConnectionStart: () => void
  onConnectionEnd: () => void
  readonly?: boolean
  isConnecting?: boolean
  isConnectionSource?: boolean
}

const nodeTypeIcons = {
  article: FileText,
  flashcard: CreditCard,
  multimedia: Image,
  concept: Lightbulb,
  project: FolderOpen,
}

const nodeTypeColors = {
  article: 'bg-blue-500',
  flashcard: 'bg-green-500',
  multimedia: 'bg-purple-500',
  concept: 'bg-yellow-500',
  project: 'bg-red-500',
}

export function CognitiveNodeComponent({
  node,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDrag,
  onConnectionStart,
  onConnectionEnd,
  readonly = false,
  isConnecting = false,
  isConnectionSource = false,
}: CognitiveNodeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [editTitle, setEditTitle] = useState(node.title)
  const [editContent, setEditContent] = useState(node.content)
  const nodeRef = useRef<HTMLDivElement>(null)

  const IconComponent = nodeTypeIcons[node.type]

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readonly || isEditing) return
    
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y,
    })
    onSelect()
  }, [readonly, isEditing, node.position, onSelect])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || readonly) return
    
    const newPosition = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }
    onDrag(newPosition)
  }, [isDragging, readonly, dragStart, onDrag])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleEdit = useCallback(() => {
    if (readonly) return
    setIsEditing(true)
  }, [readonly])

  const handleSave = useCallback(() => {
    onUpdate({
      title: editTitle,
      content: editContent,
    })
    setIsEditing(false)
  }, [editTitle, editContent, onUpdate])

  const handleCancel = useCallback(() => {
    setEditTitle(node.title)
    setEditContent(node.content)
    setIsEditing(false)
  }, [node.title, node.content])

  const handleConnectionClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isConnecting) {
      onConnectionEnd()
    } else {
      onConnectionStart()
    }
  }, [isConnecting, onConnectionStart, onConnectionEnd])

  // Add event listeners for mouse events
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newPosition = {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        }
        onDrag(newPosition)
      }
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, dragStart, onDrag])

  return (
    <div
      ref={nodeRef}
      className={`
        absolute min-w-[200px] max-w-[300px] bg-white dark:bg-gray-800 
        border-2 rounded-lg shadow-lg cursor-pointer transition-all duration-200
        ${isSelected ? 'border-blue-500 shadow-blue-200' : 'border-gray-200 dark:border-gray-600'}
        ${isDragging ? 'shadow-xl scale-105' : ''}
        ${isConnecting && !isConnectionSource ? 'ring-2 ring-green-400' : ''}
        ${isConnectionSource ? 'ring-2 ring-blue-400' : ''}
      `}
      style={{
        left: node.position.x,
        top: node.position.y,
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Node Header */}
      <div className={`flex items-center gap-2 p-3 rounded-t-lg ${nodeTypeColors[node.type]} text-white`}>
        <IconComponent className="h-4 w-4" />
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 text-white bg-white/20 border-white/30"
            placeholder="Node title"
          />
        ) : (
          <span className="flex-1 font-medium truncate">{node.title}</span>
        )}
        
        {!readonly && (
          <div className="flex items-center gap-1">
            {!isEditing && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-white hover:bg-white/20"
                  onClick={handleConnectionClick}
                  title={isConnecting ? "End connection" : "Start connection"}
                >
                  <Link className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-white hover:bg-white/20"
                  onClick={handleEdit}
                  title="Edit node"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-white hover:bg-white/20"
                  onClick={onDelete}
                  title="Delete node"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Node Content */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Node content"
              className="min-h-[60px] resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {node.content ? (
              <p className="line-clamp-3">{node.content}</p>
            ) : (
              <p className="italic text-gray-400">No content</p>
            )}
          </div>
        )}
      </div>

      {/* Connection Points */}
      {!readonly && (
        <>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white cursor-pointer hover:scale-110 transition-transform" />
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white cursor-pointer hover:scale-110 transition-transform" />
          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white cursor-pointer hover:scale-110 transition-transform" />
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white cursor-pointer hover:scale-110 transition-transform" />
        </>
      )}
    </div>
  )
}