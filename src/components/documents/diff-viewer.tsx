'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  GitBranch, 
  Plus, 
  Minus, 
  Edit3,
  Eye,
  EyeOff,
  Download,
  Copy
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DiffLine {
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  oldLineNumber?: number
  newLineNumber?: number
  content: string
  changes?: {
    type: 'added' | 'removed'
    text: string
    position: number
  }[]
}

interface DiffStats {
  additions: number
  deletions: number
  modifications: number
  totalChanges: number
  linesAdded: number
  linesDeleted: number
  linesModified: number
  oldLength: number
  newLength: number
  sizeDelta: number
}

interface DocumentVersion {
  id: string
  version: number
  content: string
  changeDescription: string
  createdAt: string
  createdBy: {
    id: string
    name: string
    email: string
    image?: string
  }
  diffStats?: DiffStats
}

interface DiffViewerProps {
  oldVersion: DocumentVersion
  newVersion: DocumentVersion
  onVersionChange?: (oldId: string, newId: string) => void
  availableVersions?: DocumentVersion[]
  className?: string
}

export function DiffViewer({
  oldVersion,
  newVersion,
  onVersionChange,
  availableVersions = [],
  className = ''
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified' | 'split'>('side-by-side')
  const [showWhitespace, setShowWhitespace] = useState(false)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [contextLines, setContextLines] = useState(3)

  // Calculate diff
  const diff = useMemo(() => {
    return calculateDiff(oldVersion.content, newVersion.content, contextLines)
  }, [oldVersion.content, newVersion.content, contextLines])

  const diffStats = useMemo(() => {
    return calculateDiffStats(oldVersion.content, newVersion.content)
  }, [oldVersion.content, newVersion.content])

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get line class based on type
  const getLineClass = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 border-l-4 border-green-500'
      case 'removed':
        return 'bg-red-50 border-l-4 border-red-500'
      case 'modified':
        return 'bg-yellow-50 border-l-4 border-yellow-500'
      default:
        return 'bg-gray-50'
    }
  }

  // Get line icon
  const getLineIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="h-3 w-3 text-green-600" />
      case 'removed':
        return <Minus className="h-3 w-3 text-red-600" />
      case 'modified':
        return <Edit3 className="h-3 w-3 text-yellow-600" />
      default:
        return null
    }
  }

  // Render inline changes within a line
  const renderInlineChanges = (line: DiffLine) => {
    if (!line.changes || line.changes.length === 0) {
      return <span>{line.content}</span>
    }

    const parts = []
    let lastIndex = 0

    line.changes.forEach((change, index) => {
      // Add unchanged text before this change
      if (change.position > lastIndex) {
        parts.push(
          <span key={`unchanged-${index}`}>
            {line.content.slice(lastIndex, change.position)}
          </span>
        )
      }

      // Add the change
      parts.push(
        <span
          key={`change-${index}`}
          className={`px-1 rounded ${
            change.type === 'added' 
              ? 'bg-green-200 text-green-800' 
              : 'bg-red-200 text-red-800'
          }`}
        >
          {change.text}
        </span>
      )

      lastIndex = change.position + change.text.length
    })

    // Add remaining unchanged text
    if (lastIndex < line.content.length) {
      parts.push(
        <span key="remaining">
          {line.content.slice(lastIndex)}
        </span>
      )
    }

    return <>{parts}</>
  }

  // Copy diff to clipboard
  const copyDiff = async () => {
    const diffText = diff.map(line => {
      const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '
      return `${prefix} ${line.content}`
    }).join('\n')

    try {
      await navigator.clipboard.writeText(diffText)
    } catch (error) {
      console.error('Failed to copy diff:', error)
    }
  }

  // Export diff
  const exportDiff = () => {
    const diffText = `Diff between version ${oldVersion.version} and ${newVersion.version}\n` +
                    `Old: ${oldVersion.changeDescription} (${formatDate(oldVersion.createdAt)})\n` +
                    `New: ${newVersion.changeDescription} (${formatDate(newVersion.createdAt)})\n\n` +
                    diff.map(line => {
                      const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '
                      return `${prefix} ${line.content}`
                    }).join('\n')

    const blob = new Blob([diffText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diff-v${oldVersion.version}-v${newVersion.version}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Document Diff
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={copyDiff}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button size="sm" variant="outline" onClick={exportDiff}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Version Selector */}
      {availableVersions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Compare:</span>
                <Select
                  value={oldVersion.id}
                  onValueChange={(value) => onVersionChange?.(value, newVersion.id)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVersions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        v{version.version} - {version.changeDescription}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground" />

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">with:</span>
                <Select
                  value={newVersion.id}
                  onValueChange={(value) => onVersionChange?.(oldVersion.id, value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVersions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        v{version.version} - {version.changeDescription}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diff Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm">
                  <span className="font-medium">{diffStats.additions}</span> additions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-sm">
                  <span className="font-medium">{diffStats.deletions}</span> deletions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="text-sm">
                  <span className="font-medium">{diffStats.modifications}</span> modifications
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Size: {diffStats.sizeDelta > 0 ? '+' : ''}{diffStats.sizeDelta} chars
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="side-by-side">Side by Side</SelectItem>
                  <SelectItem value="unified">Unified</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLineNumbers(!showLineNumbers)}
              >
                {showLineNumbers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowWhitespace(!showWhitespace)}
              >
                {showWhitespace ? 'Hide WS' : 'Show WS'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version Info */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Version {oldVersion.version}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(oldVersion.createdAt)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <p className="text-sm font-medium">{oldVersion.changeDescription}</p>
              <p className="text-xs text-muted-foreground">
                by {oldVersion.createdBy.name}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Version {newVersion.version}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(newVersion.createdAt)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <p className="text-sm font-medium">{newVersion.changeDescription}</p>
              <p className="text-xs text-muted-foreground">
                by {newVersion.createdBy.name}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diff Content */}
      <Card>
        <CardContent className="p-0">
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-2 divide-x">
              {/* Old Version */}
              <div className="p-4">
                <h4 className="text-sm font-medium mb-3 text-red-700">
                  Version {oldVersion.version} (Old)
                </h4>
                <div className="space-y-1 font-mono text-sm">
                  {diff.filter(line => line.type !== 'added').map((line, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 px-2 py-1 rounded ${
                        line.type === 'removed' ? 'bg-red-50' : 'bg-gray-50'
                      }`}
                    >
                      {showLineNumbers && (
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {line.oldLineNumber}
                        </span>
                      )}
                      <div className="flex items-center gap-1 flex-1">
                        {getLineIcon(line.type)}
                        <span className={line.type === 'removed' ? 'line-through' : ''}>
                          {renderInlineChanges(line)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* New Version */}
              <div className="p-4">
                <h4 className="text-sm font-medium mb-3 text-green-700">
                  Version {newVersion.version} (New)
                </h4>
                <div className="space-y-1 font-mono text-sm">
                  {diff.filter(line => line.type !== 'removed').map((line, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 px-2 py-1 rounded ${
                        line.type === 'added' ? 'bg-green-50' : 'bg-gray-50'
                      }`}
                    >
                      {showLineNumbers && (
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {line.newLineNumber}
                        </span>
                      )}
                      <div className="flex items-center gap-1 flex-1">
                        {getLineIcon(line.type)}
                        <span>
                          {renderInlineChanges(line)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Unified View */
            <div className="p-4">
              <div className="space-y-1 font-mono text-sm">
                {diff.map((line, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 px-2 py-1 rounded ${getLineClass(line.type)}`}
                  >
                    {showLineNumbers && (
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span className="w-8 text-right">
                          {line.oldLineNumber || ''}
                        </span>
                        <span className="w-8 text-right">
                          {line.newLineNumber || ''}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 flex-1">
                      {getLineIcon(line.type)}
                      <span>
                        {renderInlineChanges(line)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Utility functions for diff calculation
function calculateDiff(oldContent: string, newContent: string, contextLines: number = 3): DiffLine[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const diff: DiffLine[] = []

  // Simple line-based diff algorithm
  let oldIndex = 0
  let newIndex = 0

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine = oldLines[oldIndex] || ''
    const newLine = newLines[newIndex] || ''

    if (oldIndex >= oldLines.length) {
      // Only new lines remaining
      diff.push({
        type: 'added',
        newLineNumber: newIndex + 1,
        content: newLine
      })
      newIndex++
    } else if (newIndex >= newLines.length) {
      // Only old lines remaining
      diff.push({
        type: 'removed',
        oldLineNumber: oldIndex + 1,
        content: oldLine
      })
      oldIndex++
    } else if (oldLine === newLine) {
      // Lines are identical
      diff.push({
        type: 'unchanged',
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
        content: oldLine
      })
      oldIndex++
      newIndex++
    } else {
      // Lines are different - check if it's a modification or add/delete
      const similarity = calculateSimilarity(oldLine, newLine)
      
      if (similarity > 0.5) {
        // Treat as modification
        diff.push({
          type: 'modified',
          oldLineNumber: oldIndex + 1,
          newLineNumber: newIndex + 1,
          content: newLine,
          changes: calculateInlineChanges(oldLine, newLine)
        })
        oldIndex++
        newIndex++
      } else {
        // Treat as separate delete and add
        diff.push({
          type: 'removed',
          oldLineNumber: oldIndex + 1,
          content: oldLine
        })
        diff.push({
          type: 'added',
          newLineNumber: newIndex + 1,
          content: newLine
        })
        oldIndex++
        newIndex++
      }
    }
  }

  return diff
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

function calculateInlineChanges(oldLine: string, newLine: string) {
  // Simple word-based diff for inline changes
  const oldWords = oldLine.split(/(\s+)/)
  const newWords = newLine.split(/(\s+)/)
  const changes = []

  // This is a simplified implementation
  // In production, you'd want a more sophisticated algorithm
  
  return changes
}

function calculateDiffStats(oldContent: string, newContent: string): DiffStats {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  
  let additions = 0
  let deletions = 0
  let modifications = 0

  const maxLines = Math.max(oldLines.length, newLines.length)
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || ''
    const newLine = newLines[i] || ''
    
    if (oldLine === '' && newLine !== '') {
      additions++
    } else if (oldLine !== '' && newLine === '') {
      deletions++
    } else if (oldLine !== newLine) {
      modifications++
    }
  }

  return {
    additions,
    deletions,
    modifications,
    totalChanges: additions + deletions + modifications,
    linesAdded: additions,
    linesDeleted: deletions,
    linesModified: modifications,
    oldLength: oldContent.length,
    newLength: newContent.length,
    sizeDelta: newContent.length - oldContent.length
  }
}