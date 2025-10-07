'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  BookOpen, 
  Plus, 
  Search, 
  FileText, 
  Upload, 
  Eye,
  Download,
  Trash2,
  Filter,
  ArrowLeft,
  Brain,
  CreditCard
} from 'lucide-react'
import { DocumentProcessor } from '@/components/documents/document-processor'
import { toast } from 'sonner'

interface Document {
  id: string
  title: string
  type: 'pdf' | 'text' | 'web' | 'note'
  size: string
  uploadedAt: string
  tags: string[]
  processed: boolean
  summary?: string
  content?: string
  fileUrl?: string
}

export default function DocumentsPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [isUploading, setIsUploading] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [processingDoc, setProcessingDoc] = useState<Document | null>(null)
  const [showProcessor, setShowProcessor] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    // Mock data - in real app, this would fetch from the database
    const mockDocuments: Document[] = [
      {
        id: '1',
        title: 'Introduction to Machine Learning',
        type: 'pdf',
        size: '2.3 MB',
        uploadedAt: '2 days ago',
        tags: ['machine-learning', 'ai', 'introduction'],
        processed: true,
        summary: 'Comprehensive overview of machine learning fundamentals, algorithms, and applications.'
      },
      {
        id: '2',
        title: 'Deep Learning Research Paper',
        type: 'pdf',
        size: '1.8 MB',
        uploadedAt: '1 week ago',
        tags: ['deep-learning', 'research', 'neural-networks'],
        processed: true,
        summary: 'Latest research on deep neural network architectures and their performance improvements.'
      },
      {
        id: '3',
        title: 'React Best Practices',
        type: 'web',
        size: '450 KB',
        uploadedAt: '3 days ago',
        tags: ['react', 'frontend', 'best-practices'],
        processed: true,
        summary: 'Collection of React development best practices and common patterns.'
      },
      {
        id: '4',
        title: 'Meeting Notes - Project Planning',
        type: 'note',
        size: '12 KB',
        uploadedAt: '1 day ago',
        tags: ['meeting', 'planning', 'project'],
        processed: true,
        summary: 'Notes from the project planning meeting discussing timeline and deliverables.'
      }
    ]
    
    setDocuments(mockDocuments)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const uploadedDocs: Document[] = []
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/documents/upload/', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const result = await response.json()
        if (!result || !result.document) {
          throw new Error(result?.error || 'Upload failed')
        }
        const created = result.document
        const newDoc = {
          id: created.id,
          title: created.title,
          type: created.type,
          size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          uploadedAt: 'Just now',
          tags: [],
          processed: true,
          summary: 'Document uploaded successfully.',
          content: created.content,
          fileUrl: created.fileUrl
        }
        uploadedDocs.push(newDoc)
      }
      setDocuments(prev => [...uploadedDocs, ...prev])
      
      // Automatically process the first uploaded document
      if (uploadedDocs.length > 0) {
        const firstDoc = uploadedDocs[0]
        setProcessingDoc(firstDoc)
        setShowProcessor(true)
        toast.success(`${uploadedDocs.length} document(s) uploaded successfully!`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to upload document(s). Please try again.')
    } finally {
      setIsUploading(false)
      // Reset the input value so selecting the same file twice still triggers change
      event.target.value = ''
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄'
      case 'text': return '📝'
      case 'web': return '🌐'
      case 'note': return '📋'
      default: return '📄'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'bg-red-100 text-red-800'
      case 'text': return 'bg-green-100 text-green-800'
      case 'web': return 'bg-blue-100 text-blue-800'
      case 'note': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = selectedType === 'all' || doc.type === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => window.location.href = '/'} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <BookOpen className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Documents</h1>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.txt,.md,.docx"
                onChange={handleFileUpload}
                multiple
              />
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload Documents'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pdf', 'text', 'web', 'note'].map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
              >
                {type === 'all' ? 'All' : type.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processed</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {documents.filter(d => d.processed).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {documents.filter(d => !d.processed).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.5 MB</div>
            </CardContent>
          </Card>
        </div>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {documents.length === 0 ? 'No documents yet' : 'No documents match your search'}
            </h3>
            <p className="text-gray-500 mb-6">
              {documents.length === 0 
                ? 'Upload your first document to start building your knowledge base.'
                : 'Try adjusting your search terms or filters.'
              }
            </p>
            {documents.length === 0 && (
              <Button onClick={() => document.getElementById('file-upload')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Document
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="text-3xl">{getTypeIcon(doc.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-lg">{doc.title}</h3>
                          <Badge className={getTypeColor(doc.type)}>
                            {doc.type.toUpperCase()}
                          </Badge>
                          {!doc.processed && (
                            <Badge variant="outline" className="animate-pulse">
                              Processing...
                            </Badge>
                          )}
                        </div>
                        
                        {doc.summary && (
                          <p className="text-gray-600 text-sm mb-3">{doc.summary}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{doc.size}</span>
                          <span>•</span>
                          <span>Uploaded {doc.uploadedAt}</span>
                        </div>
                        
                        {doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {doc.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProcessingDoc(doc)
                          setShowProcessor(true)
                        }}
                        title="Generate Mindmap & Memory Cards"
                      >
                        <Brain className="h-4 w-4 mr-1" />
                        Process
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewDoc(doc)
                          setIsPreviewOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent>
            {previewDoc && (
              <div className="space-y-3">
                <DialogHeader>
                  <DialogTitle>{previewDoc.title}</DialogTitle>
                  <DialogDescription>
                    {previewDoc.type.toUpperCase()} • {previewDoc.size} • Uploaded {previewDoc.uploadedAt}
                  </DialogDescription>
                </DialogHeader>
                {previewDoc.type === 'pdf' && previewDoc.fileUrl ? (
                  <iframe
                    src={previewDoc.fileUrl}
                    className="w-full h-72 rounded border"
                    title={previewDoc.title}
                  />
                ) : (
                  <div className="max-h-64 overflow-auto rounded border p-3 text-sm whitespace-pre-wrap">
                    {previewDoc.content || 'No preview available.'}
                  </div>
                )}
                <DialogFooter>
                  <div className="flex w-full justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                    <Button
                      variant="default"
                      onClick={() => {
                        if (previewDoc?.fileUrl) window.open(previewDoc.fileUrl, '_blank')
                      }}
                      disabled={!previewDoc?.fileUrl}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Document Processor Dialog */}
        <Dialog open={showProcessor} onOpenChange={setShowProcessor}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Process Document</DialogTitle>
              <DialogDescription>
                Generating mindmap and memory cards from your document
              </DialogDescription>
            </DialogHeader>
            {processingDoc && (
              <DocumentProcessor
                documentId={processingDoc.id}
                documentTitle={processingDoc.title}
                documentContent={processingDoc.content || ''}
                onComplete={() => {
                  toast.success('Document processed successfully!')
                  setTimeout(() => setShowProcessor(false), 2000)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}