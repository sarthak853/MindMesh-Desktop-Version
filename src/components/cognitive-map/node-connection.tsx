'use client'

import React, { useState } from 'react'
import { NodeConnection, CognitiveNode } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Edit, Check, X } from 'lucide-react'

interface NodeConnectionProps {
  connection: NodeConnection
  sourceNode?: CognitiveNode
  targetNode?: CognitiveNode
  onUpdate: (updates: Partial<NodeConnection>) => void
  onDelete: () => void
  readonly?: boolean
}

export function NodeConnectionComponent({
  connection,
  sourceNode,
  targetNode,
  onUpdate,
  onDelete,
  readonly = false,
}: NodeConnectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(connection.label || '')

  if (!sourceNode || !targetNode) {
    return null
  }

  // Calculate connection path
  const sourceCenter = {
    x: sourceNode.position.x + 100, // Assuming node width of 200px
    y: sourceNode.position.y + 50,  // Assuming node height of 100px
  }

  const targetCenter = {
    x: targetNode.position.x + 100,
    y: targetNode.position.y + 50,
  }

  // Calculate control points for curved line
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  const controlPoint1 = {
    x: sourceCenter.x + dx * 0.3,
    y: sourceCenter.y + dy * 0.3 - distance * 0.1,
  }

  const controlPoint2 = {
    x: targetCenter.x - dx * 0.3,
    y: targetCenter.y - dy * 0.3 - distance * 0.1,
  }

  // Create SVG path
  const pathData = `M ${sourceCenter.x} ${sourceCenter.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${targetCenter.x} ${targetCenter.y}`

  // Calculate label position (midpoint of the curve)
  const labelPosition = {
    x: (sourceCenter.x + targetCenter.x) / 2,
    y: (sourceCenter.y + targetCenter.y) / 2 - 20,
  }

  // Calculate arrow position and rotation
  const arrowAngle = Math.atan2(dy, dx) * (180 / Math.PI)

  const handleSave = () => {
    onUpdate({ label: editLabel })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditLabel(connection.label || '')
    setIsEditing(false)
  }

  return (
    <g className="connection-group">
      {/* Connection line */}
      <path
        d={pathData}
        stroke="#6B7280"
        strokeWidth="2"
        fill="none"
        strokeDasharray={connection.relationshipType === 'weak' ? '5,5' : 'none'}
        opacity={connection.strength}
        className="hover:stroke-blue-500 transition-colors cursor-pointer"
        markerEnd="url(#arrowhead)"
      />

      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#6B7280"
            className="hover:fill-blue-500 transition-colors"
          />
        </marker>
      </defs>

      {/* Label */}
      {(connection.label || isEditing) && (
        <foreignObject
          x={labelPosition.x - 60}
          y={labelPosition.y - 15}
          width="120"
          height="30"
          className="pointer-events-auto"
        >
          <div className="flex items-center justify-center">
            {isEditing ? (
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border rounded px-2 py-1 shadow-lg">
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-6 text-xs w-20"
                  placeholder="Label"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') handleCancel()
                  }}
                />
                <Button size="icon" className="h-6 w-6" onClick={handleSave}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="outline" className="h-6 w-6" onClick={handleCancel}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border rounded px-2 py-1 shadow-sm text-xs font-medium">
                {connection.label}
              </div>
            )}
          </div>
        </foreignObject>
      )}

      {/* Connection controls */}
      {!readonly && (
        <foreignObject
          x={labelPosition.x - 30}
          y={labelPosition.y + 20}
          width="60"
          height="30"
          className="pointer-events-auto opacity-0 hover:opacity-100 transition-opacity"
        >
          <div className="flex items-center justify-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6 bg-white dark:bg-gray-800"
              onClick={() => setIsEditing(true)}
              title="Edit connection"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6 bg-white dark:bg-gray-800 hover:bg-red-50 hover:border-red-200"
              onClick={onDelete}
              title="Delete connection"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </foreignObject>
      )}
    </g>
  )
}