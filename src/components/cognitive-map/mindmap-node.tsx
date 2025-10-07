'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

export function MindMapNode({ data, selected }: NodeProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [label, setLabel] = React.useState<string>(data?.label || 'Concept')
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setLabel(data?.label || 'Concept')
  }, [data?.label])

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const onClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }, [])

  const onDoubleClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }, [])

  const onBlur = React.useCallback(() => {
    setIsEditing(false)
    if (data?.onChange) {
      data.onChange({ label })
    }
  }, [label, data])

  const onKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    // Stop propagation to prevent ReactFlow from handling these keys
    e.stopPropagation()
    
    if (e.key === 'Enter') {
      e.preventDefault()
      setIsEditing(false)
      if (data?.onChange) {
        data.onChange({ label })
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setLabel(data?.label || 'Concept')
      setIsEditing(false)
    }
  }, [label, data])

  const onInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setLabel(e.target.value)
  }, [])

  return (
    <div
      className={`rounded-md border-2 bg-white shadow-sm px-3 py-2 min-w-[140px] max-w-[240px] ${
        selected ? 'border-blue-600' : 'border-gray-800'
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-sm nodrag">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={onInputChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            className="w-full border border-gray-300 rounded px-1 py-0.5 text-sm nodrag focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
            spellCheck="false"
          />
        ) : (
          <div 
            className="font-medium text-gray-900 cursor-text"
            onClick={onClick}
            onDoubleClick={onDoubleClick}
          >
            {label}
          </div>
        )}
        {data?.subtitle && (
          <div className="text-xs text-gray-500 mt-0.5">{data.subtitle}</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}