'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Plus, 
  X, 
  Template, 
  FileText, 
  Brain, 
  CreditCard,
  Users,
  Globe,
  Lock
} from 'lucide-react'

interface ProjectTemplate {
  id: string
  name: string
  description?: string
  category: string
  tags: string[]
  documentCount: number
  cognitiveMapCount: number
  memoryCardCount: number
  usageCount: number
  createdBy: {
    name: string
    email: string
  }
}

interface ProjectCreationModalProps {
  open: boolean
  onClose: () => void
  onProjectCreated: (project: any) => void
}

export function ProjectCreationModal({ 
  open, 
  onClose, 
  onProjectCreated 
}: ProjectCreationModalProps) {
  const { data: session } = useSession()
  const [step, setStep] = useState<'basic' | 'template' | 'settings'>('basic')
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: [] as string[],
    templateId: '',
    isPublic: false,
    settings: {
      allowPublicViewing: false,
      allowMemberInvites: true,
      defaultPermission: 'viewer' as 'viewer' | 'editor' | 'admin',
      requireApproval: false
    }
  })

  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (open && step === 'template') {
      fetchTemplates()
    }
  }, [open, step])

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await fetch('/api/projects/templates?includePrivate=true')
      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleNext = () => {
    if (step === 'basic') {
      setStep('template')
    } else if (step === 'template') {
      setStep('settings')
    }
  }

  const handleBack = () => {
    if (step === 'template') {
      setStep('basic')
    } else if (step === 'settings') {
      setStep('template')
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) return

    try {
      setLoading(true)
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        onProjectCreated(data.project)
        handleClose()
      } else {
        console.error('Error creating project:', data.error)
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('basic')
    setFormData({
      name: '',
      description: '',
      tags: [],
      templateId: '',
      isPublic: false,
      settings: {
        allowPublicViewing: false,
        allowMemberInvites: true,
        defaultPermission: 'viewer',
        requireApproval: false
      }
    })
    setTagInput('')
    onClose()
  }

  const selectedTemplate = templates.find(t => t.id === formData.templateId)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className=\"max-w-2xl max-h-[90vh] overflow-y-auto\">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className=\"flex items-center justify-center space-x-4 mb-6\">
          <div className={`flex items-center ${step === 'basic' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'basic' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className=\"ml-2 text-sm font-medium\">Basic Info</span>
          </div>
          <div className=\"w-8 h-px bg-gray-300\"></div>
          <div className={`flex items-center ${step === 'template' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'template' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className=\"ml-2 text-sm font-medium\">Template</span>
          </div>
          <div className=\"w-8 h-px bg-gray-300\"></div>
          <div className={`flex items-center ${step === 'settings' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'settings' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              3
            </div>
            <span className=\"ml-2 text-sm font-medium\">Settings</span>
          </div>
        </div>

        {/* Step Content */}
        <div className=\"space-y-6\">
          {step === 'basic' && (
            <div className=\"space-y-4\">
              <div>
                <Label htmlFor=\"name\">Project Name *</Label>
                <Input
                  id=\"name\"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder=\"Enter project name\"
                  className=\"mt-1\"
                />
              </div>

              <div>
                <Label htmlFor=\"description\">Description</Label>
                <Textarea
                  id=\"description\"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder=\"Describe your project\"
                  className=\"mt-1\"
                  rows={3}
                />
              </div>

              <div>
                <Label>Tags</Label>
                <div className=\"mt-1 space-y-2\">
                  <div className=\"flex gap-2\">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder=\"Add a tag\"
                      className=\"flex-1\"
                    />
                    <Button type=\"button\" onClick={handleAddTag} size=\"sm\">
                      <Plus className=\"h-4 w-4\" />
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className=\"flex flex-wrap gap-2\">
                      {formData.tags.map((tag, index) => (
                        <Badge key={index} variant=\"secondary\" className=\"px-2 py-1\">
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className=\"ml-2 hover:text-red-600\"
                          >
                            <X className=\"h-3 w-3\" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className=\"flex items-center space-x-2\">
                <Switch
                  id=\"isPublic\"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isPublic: checked }))
                  }
                />
                <Label htmlFor=\"isPublic\" className=\"flex items-center gap-2\">
                  {formData.isPublic ? (
                    <Globe className=\"h-4 w-4 text-green-600\" />
                  ) : (
                    <Lock className=\"h-4 w-4 text-gray-600\" />
                  )}
                  Make project public
                </Label>
              </div>
            </div>
          )}

          {step === 'template' && (
            <div className=\"space-y-4\">
              <div>
                <h3 className=\"text-lg font-medium mb-2\">Choose a Template (Optional)</h3>
                <p className=\"text-sm text-muted-foreground mb-4\">
                  Start with a pre-built template or create a blank project
                </p>
              </div>

              {loadingTemplates ? (
                <div className=\"flex items-center justify-center py-8\">
                  <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600\"></div>
                </div>
              ) : (
                <div className=\"space-y-3\">
                  {/* Blank Project Option */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      !formData.templateId ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, templateId: '' }))}
                  >
                    <CardContent className=\"p-4\">
                      <div className=\"flex items-center gap-3\">
                        <div className=\"w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center\">
                          <Plus className=\"h-6 w-6 text-gray-600\" />
                        </div>
                        <div className=\"flex-1\">
                          <h4 className=\"font-medium\">Blank Project</h4>
                          <p className=\"text-sm text-muted-foreground\">
                            Start with an empty project
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Template Options */}
                  {templates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        formData.templateId === template.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, templateId: template.id }))}
                    >
                      <CardContent className=\"p-4\">
                        <div className=\"flex items-start gap-3\">
                          <div className=\"w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center\">
                            <Template className=\"h-6 w-6 text-purple-600\" />
                          </div>
                          <div className=\"flex-1\">
                            <div className=\"flex items-center gap-2 mb-1\">
                              <h4 className=\"font-medium\">{template.name}</h4>
                              <Badge variant=\"outline\" className=\"text-xs\">
                                {template.category}
                              </Badge>
                            </div>
                            {template.description && (
                              <p className=\"text-sm text-muted-foreground mb-2\">
                                {template.description}
                              </p>
                            )}
                            <div className=\"flex items-center gap-4 text-xs text-muted-foreground\">
                              <div className=\"flex items-center gap-1\">
                                <FileText className=\"h-3 w-3\" />
                                <span>{template.documentCount} docs</span>
                              </div>
                              <div className=\"flex items-center gap-1\">
                                <Brain className=\"h-3 w-3\" />
                                <span>{template.cognitiveMapCount} maps</span>
                              </div>
                              <div className=\"flex items-center gap-1\">
                                <CreditCard className=\"h-3 w-3\" />
                                <span>{template.memoryCardCount} cards</span>
                              </div>
                              <div className=\"flex items-center gap-1\">
                                <Users className=\"h-3 w-3\" />
                                <span>{template.usageCount} uses</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'settings' && (
            <div className=\"space-y-6\">
              <div>
                <h3 className=\"text-lg font-medium mb-2\">Project Settings</h3>
                <p className=\"text-sm text-muted-foreground mb-4\">
                  Configure collaboration and access settings
                </p>
              </div>

              <div className=\"space-y-4\">
                <div className=\"flex items-center justify-between\">
                  <div>
                    <Label>Allow Public Viewing</Label>
                    <p className=\"text-sm text-muted-foreground\">
                      Allow non-members to view project content
                    </p>
                  </div>
                  <Switch
                    checked={formData.settings.allowPublicViewing}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, allowPublicViewing: checked }
                      }))
                    }
                  />
                </div>

                <div className=\"flex items-center justify-between\">
                  <div>
                    <Label>Allow Member Invites</Label>
                    <p className=\"text-sm text-muted-foreground\">
                      Let members invite others to the project
                    </p>
                  </div>
                  <Switch
                    checked={formData.settings.allowMemberInvites}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, allowMemberInvites: checked }
                      }))
                    }
                  />
                </div>

                <div className=\"flex items-center justify-between\">
                  <div>
                    <Label>Require Approval</Label>
                    <p className=\"text-sm text-muted-foreground\">
                      Require admin approval for new members
                    </p>
                  </div>
                  <Switch
                    checked={formData.settings.requireApproval}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, requireApproval: checked }
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Default Permission Level</Label>
                  <Select
                    value={formData.settings.defaultPermission}
                    onValueChange={(value: any) => 
                      setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, defaultPermission: value }
                      }))
                    }
                  >
                    <SelectTrigger className=\"mt-1\">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=\"viewer\">Viewer - Can view content</SelectItem>
                      <SelectItem value=\"editor\">Editor - Can edit content</SelectItem>
                      <SelectItem value=\"admin\">Admin - Full access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Template Summary */}
              {selectedTemplate && (
                <div className=\"border rounded-lg p-4 bg-gray-50\">
                  <h4 className=\"font-medium mb-2\">Selected Template</h4>
                  <div className=\"flex items-center gap-3\">
                    <Template className=\"h-8 w-8 text-purple-600\" />
                    <div>
                      <p className=\"font-medium\">{selectedTemplate.name}</p>
                      <p className=\"text-sm text-muted-foreground\">
                        {selectedTemplate.documentCount} documents, {selectedTemplate.cognitiveMapCount} maps, {selectedTemplate.memoryCardCount} cards
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className=\"flex justify-between w-full\">
            <div>
              {step !== 'basic' && (
                <Button variant=\"outline\" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>
            <div className=\"flex gap-2\">
              <Button variant=\"outline\" onClick={handleClose}>
                Cancel
              </Button>
              {step !== 'settings' ? (
                <Button 
                  onClick={handleNext}
                  disabled={step === 'basic' && !formData.name.trim()}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || !formData.name.trim()}
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}