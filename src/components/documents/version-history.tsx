'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  History, 
  GitBranch, 
  RotateCcw, 
  Eye, 
  Download,
  Clock,
  User,
  FileText,
  Plus,
  Minus,
  Edit3,
  Tag,
  AlertTriangle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { DiffViewer } from './diff-viewer'

interface DocumentVersion {
  id: string
  version: number
  content: string
  changeDescription: string
  isAutoSave: boolean
  tags: string[]
  createdAt: string
  createdBy: {
    id: string
    name: string
    email: string
    image?: string
  }
  diffStats?: {
    additions: number
    deletions: number
    modifications: number
    totalChanges: number
    sizeDelta: number
  }
  isCurrent?: boolean
  restoredFromVersionId?: string
}

interface VersionHistoryProps {
  documentId: string
  currentVersion?: DocumentVersion
  onVersionRestore?: (versionId: string) => void
  className?: string
}

export function VersionHistory({
  documentId,
  currentVersion,
  onVersionRestore,
  className = ''
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersions, setSelectedVersions] = useState<{
    old: DocumentVersion | null
    new: DocumentVersion | null
  }>({ old: null, new: null })
  const [showDiffModal, setShowDiffModal] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [versionToRestore, setVersionToRestore] = useState<DocumentVersion | null>(null)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    fetchVersions()
  }, [documentId])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/documents/${documentId}/versions`)
      const data = await response.json()

      if (data.success) {
        setVersions(data.versions)
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVersionSelect = (version: DocumentVersion, position: 'old' | 'new') => {
    setSelectedVersions(prev => ({
      ...prev,
      [position]: version
    }))
  }

  const handleCompareVersions = () => {
    if (selectedVersions.old && selectedVersions.new) {
      setShowDiffModal(true)
    }
  }

  const handleRestoreVersion = async () => {
    if (!versionToRestore) return

    try {
      setRestoring(true)
      const response = await fetch(`/api/documents/${documentId}/versions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          versionId: versionToRestore.id,
          createBackup: true
        }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchVersions()
        if (onVersionRestore) {
          onVersionRestore(versionToRestore.id)
        }
        setShowRestoreModal(false)
        setVersionToRestore(null)
      }
    } catch (error) {
      console.error('Error restoring version:', error)
    } finally {
      setRestoring(false)
    }
  }

  const downloadVersion = (version: DocumentVersion) => {
    const blob = new Blob([version.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-v${version.version}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getChangeIcon = (diffStats?: DocumentVersion['diffStats']) => {
    if (!diffStats || diffStats.totalChanges === 0) {
      return <FileText className="h-4 w-4 text-gray-500" />
    }

    if (diffStats.additions > diffStats.deletions) {
      return <Plus className="h-4 w-4 text-green-600" />
    } else if (diffStats.deletions > diffStats.additions) {
      return <Minus className="h-4 w-4 text-red-600" />
    } else {
      return <Edit3 className="h-4 w-4 text-yellow-600" />
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCompareVersions}
                disabled={!selectedVersions.old || !selectedVersions.new}
              >
                <GitBranch className="h-4 w-4 mr-1" />
                Compare
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Version Selection Helper */}
      {(selectedVersions.old || selectedVersions.new) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Selected for comparison:</span>
                {selectedVersions.old && (
                  <Badge variant="outline">
                    Old: v{selectedVersions.old.version}
                  </Badge>
                )}
                {selectedVersions.new && (
                  <Badge variant="outline">
                    New: v{selectedVersions.new.version}
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedVersions({ old: null, new: null })}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version List */}
      <div className="space-y-3">
        {versions.map((version, index) => (
          <Card 
            key={version.id}
            className={`transition-all duration-200 hover:shadow-md ${
              version.isCurrent ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            } ${
              selectedVersions.old?.id === version.id || selectedVersions.new?.id === version.id
                ? 'ring-2 ring-green-500 bg-green-50'
                : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* Avatar */}
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={version.createdBy.image} />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(version.createdBy.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Version Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={version.isCurrent ? "default" : "outline"}>
                        v{version.version}
                        {version.isCurrent && " (Current)"}
                      </Badge>
                      
                      {version.isAutoSave && (
                        <Badge variant="secondary" className="text-xs">
                          Auto-save
                        </Badge>
                      )}

                      {version.restoredFromVersionId && (
                        <Badge variant="outline" className="text-xs">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restored
                        </Badge>
                      )}

                      {version.tags.map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="outline" className="text-xs">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium">{version.changeDescription}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{version.createdBy.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(version.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Diff Stats */}
                    {version.diffStats && version.diffStats.totalChanges > 0 && (
                      <div className="flex items-center gap-4 text-xs">
                        {version.diffStats.additions > 0 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <Plus className="h-3 w-3" />
                            <span>{version.diffStats.additions}</span>
                          </div>
                        )}
                        {version.diffStats.deletions > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <Minus className="h-3 w-3" />
                            <span>{version.diffStats.deletions}</span>
                          </div>
                        )}
                        {version.diffStats.modifications > 0 && (
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Edit3 className="h-3 w-3" />
                            <span>{version.diffStats.modifications}</span>
                          </div>
                        )}
                        <div className="text-muted-foreground">
                          {version.diffStats.sizeDelta > 0 ? '+' : ''}{version.diffStats.sizeDelta} chars
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Version Selection */}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={selectedVersions.old?.id === version.id ? "default" : "outline"}
                      onClick={() => handleVersionSelect(version, 'old')}
                      className="text-xs px-2"
                    >
                      Old
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedVersions.new?.id === version.id ? "default" : "outline"}
                      onClick={() => handleVersionSelect(version, 'new')}
                      className="text-xs px-2"
                    >
                      New
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadVersion(version)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {!version.isCurrent && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setVersionToRestore(version)
                        setShowRestoreModal(true)
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {versions.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Version History</h3>
            <p className="text-muted-foreground">
              Version history will appear here as you make changes to the document.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Diff Modal */}
      <Dialog open={showDiffModal} onOpenChange={setShowDiffModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare Versions</DialogTitle>
          </DialogHeader>
          
          {selectedVersions.old && selectedVersions.new && (
            <DiffViewer
              oldVersion={selectedVersions.old}
              newVersion={selectedVersions.new}
              availableVersions={versions}
              onVersionChange={(oldId, newId) => {
                const oldVersion = versions.find(v => v.id === oldId)
                const newVersion = versions.find(v => v.id === newId)
                if (oldVersion && newVersion) {
                  setSelectedVersions({ old: oldVersion, new: newVersion })
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Modal */}
      <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Restore Version
            </DialogTitle>
          </DialogHeader>
          
          {versionToRestore && (
            <div className="space-y-4">
              <p>
                Are you sure you want to restore to version {versionToRestore.version}?
              </p>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium">{versionToRestore.changeDescription}</p>
                <p className="text-xs text-muted-foreground">
                  Created by {versionToRestore.createdBy.name} on {formatDate(versionToRestore.createdAt)}
                </p>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This will create a backup of the current version before restoring.
                  You can always restore back to the current state later.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRestoreModal(false)}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestoreVersion}
              disabled={restoring}
            >
              {restoring ? 'Restoring...' : 'Restore Version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}