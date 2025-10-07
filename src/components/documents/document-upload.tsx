'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, Link, X, CheckCircle, AlertCircle } from 'lucide-react'

interface DocumentUploadProps {
  onDocumentUploaded?: (document: any) => void
  onClose?: () => void
  onBack?: () => void
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

export function DocumentUpload({ onDocumentUploaded, onClose, onBack }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [webUrl, setWebUrl] = useState('')
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }, [])

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      return validTypes.includes(file.type) || file.name.endsWith('.md') || file.name.endsWith('.txt')
    })

    if (validFiles.length === 0) {
      alert('Please upload valid document files (PDF, TXT, MD, DOC, DOCX)')
      return
    }

    for (const file of validFiles) {
      await uploadFile(file)
    }
  }

  const uploadFile = async (file: File) => {
    const uploadId = Date.now() + Math.random()
    
    setUploads(prev => [...prev, {
      file,
      progress: 0,
      status: 'uploading'
    }])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/documents/upload/', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      setUploads(prev => prev.map(upload => 
        upload.file === file 
          ? { ...upload, progress: 100, status: 'processing' }
          : upload
      ))

      const result = await response.json()
      if (!result || !result.document) {
        throw new Error(result?.error || 'Upload failed')
      }

      setUploads(prev => prev.map(upload => 
        upload.file === file 
          ? { ...upload, status: 'completed' }
          : upload
      ))

      onDocumentUploaded(result.document)

    } catch (error) {
      setUploads(prev => prev.map(upload => 
        upload.file === file 
          ? { ...upload, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
          : upload
      ))
    }
  }

  const handleWebUrlSubmit = async () => {
    if (!webUrl.trim()) return

    setIsProcessingUrl(true)
    try {
      const response = await fetch('/api/documents/web/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: webUrl.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to process web URL')
      }

      const result = await response.json()
      if (!result || !result.document) {
        throw new Error(result?.error || 'Failed to process web URL')
      }
      onDocumentUploaded(result.document)
      setWebUrl('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process web URL')
    } finally {
      setIsProcessingUrl(false)
    }
  }

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(upload => upload.file !== file))
  }

  return (
    <div className={onBack ? "min-h-screen bg-gray-50 p-6" : "fixed inset-0 bg-black/50 flex items-center justify-center z-50"}>
      {onBack && (
        <div className="max-w-4xl mx-auto mb-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Document Upload</h1>
          <p className="text-gray-600 mt-2">
            Upload documents to extract knowledge and add to your cognitive map
          </p>
        </div>
      )}
      <Card className={onBack ? "max-w-4xl mx-auto" : "w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Add documents to your knowledge base and create nodes automatically
              </CardDescription>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose || onBack}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-300 dark:border-gray-600'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports PDF, TXT, MD, DOC, DOCX files
            </p>
            <Input
              type="file"
              multiple
              accept=".pdf,.txt,.md,.doc,.docx"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <Label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            </Label>
          </div>

          {/* Web URL Input */}
          <div className="space-y-2">
            <Label>Or add from web URL</Label>
            <div className="flex gap-2">
              <Input
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1"
              />
              <Button 
                onClick={handleWebUrlSubmit}
                disabled={!webUrl.trim() || isProcessingUrl}
              >
                <Link className="h-4 w-4 mr-2" />
                {isProcessingUrl ? 'Processing...' : 'Add'}
              </Button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <div className="space-y-2">
              <Label>Upload Progress</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uploads.map((upload, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">
                          {upload.file.name}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => removeUpload(upload.file)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        {upload.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {upload.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {upload.status === 'uploading' && 'Uploading...'}
                          {upload.status === 'processing' && 'Processing...'}
                          {upload.status === 'completed' && 'Completed'}
                          {upload.status === 'error' && (upload.error || 'Error')}
                        </span>
                      </div>
                      {upload.status === 'uploading' && (
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Uploaded documents will be processed and analyzed by AI</p>
            <p>• Nodes will be automatically created based on document content</p>
            <p>• You can edit the generated nodes after creation</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}