'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Palette, 
  Layout, 
  Download, 
  Eye, 
  Wand2, 
  Settings,
  Image as ImageIcon,
  BarChart3,
  Type,
  Sparkles,
  Copy,
  Share2,
  Loader2
} from 'lucide-react'

interface InfographicTemplate {
  id: string
  name: string
  description?: string
  category: string
  layout: string
  preview: string
  usageCount: number
  tags: string[]
}

interface InfographicGeneratorProps {
  initialContent?: string
  onGenerated?: (infographic: any) => void
  className?: string
}

export function InfographicGenerator({
  initialContent = '',
  onGenerated,
  className = ''
}: InfographicGeneratorProps) {
  const [step, setStep] = useState<'content' | 'template' | 'customize' | 'generate'>('content')
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<InfographicTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [generatedInfographic, setGeneratedInfographic] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    content: initialContent,
    title: '',
    templateId: '',
    style: {
      colorScheme: 'blue' as const,
      customColors: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        accent: '#10B981',
        background: '#FFFFFF',
        text: '#1F2937'
      },
      layout: 'vertical' as const,
      theme: 'modern' as const,
      fontSize: 'medium' as const,
      spacing: 'normal' as const
    },
    dimensions: {
      width: 800,
      height: 1200,
      format: 'portrait' as const
    },
    branding: {
      companyName: '',
      website: '',
      logo: ''
    },
    includeCharts: true,
    includeIcons: true,
    language: 'en'
  })

  useEffect(() => {
    if (step === 'template') {
      fetchTemplates()
    }
  }, [step])

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await fetch('/api/ai/infographic-templates')
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

  const handleNext = () => {
    switch (step) {
      case 'content':
        setStep('template')
        break
      case 'template':
        setStep('customize')
        break
      case 'customize':
        setStep('generate')
        break
    }
  }

  const handleBack = () => {
    switch (step) {
      case 'template':
        setStep('content')
        break
      case 'customize':
        setStep('template')
        break
      case 'generate':
        setStep('customize')
        break
    }
  }

  const handleGenerate = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai/generate-infographic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedInfographic(data.infographic)
        if (onGenerated) {
          onGenerated(data.infographic)
        }
      } else {
        console.error('Error generating infographic:', data.error)
      }
    } catch (error) {
      console.error('Error generating infographic:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadInfographic = () => {
    if (!generatedInfographic) return

    const blob = new Blob([generatedInfographic.svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${generatedInfographic.title.replace(/\s+/g, '-').toLowerCase()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async () => {
    if (!generatedInfographic) return

    try {
      await navigator.clipboard.writeText(generatedInfographic.svgContent)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const getColorSchemePreview = (scheme: string) => {
    const schemes = {
      blue: ['#3B82F6', '#1E40AF', '#60A5FA'],
      green: ['#10B981', '#047857', '#34D399'],
      purple: ['#8B5CF6', '#7C3AED', '#A78BFA'],
      orange: ['#F59E0B', '#D97706', '#FCD34D'],
      red: ['#EF4444', '#DC2626', '#F87171'],
      teal: ['#14B8A6', '#0F766E', '#5EEAD4']
    }
    
    return schemes[scheme as keyof typeof schemes] || schemes.blue
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Infographic Generator
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        {['content', 'template', 'customize', 'generate'].map((stepName, index) => (
          <div key={stepName} className="flex items-center">
            <div className={`flex items-center ${
              step === stepName ? 'text-blue-600' : 
              ['content', 'template', 'customize', 'generate'].indexOf(step) > index ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === stepName ? 'bg-blue-600 text-white' : 
                ['content', 'template', 'customize', 'generate'].indexOf(step) > index ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}>
                {index + 1}
              </div>
              <span className="ml-2 text-sm font-medium capitalize">{stepName}</span>
            </div>
            {index < 3 && <div className="w-8 h-px bg-gray-300 mx-4"></div>}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {step === 'content' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Infographic Title (Optional)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter a title for your infographic"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Paste your content here. This can be text, data, bullet points, or any information you want to visualize..."
                  className="mt-1 min-h-[200px]"
                  rows={8}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.content.length}/5000 characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Include Charts</Label>
                  <Select
                    value={formData.includeCharts.toString()}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, includeCharts: value === 'true' }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes, include charts</SelectItem>
                      <SelectItem value="false">Text only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Include Icons</Label>
                  <Select
                    value={formData.includeIcons.toString()}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, includeIcons: value === 'true' }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes, include icons</SelectItem>
                      <SelectItem value="false">No icons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 'template' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Choose a Template</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a template that best fits your content type and style preferences
                </p>
              </div>

              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Custom/Auto Template */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      !formData.templateId ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, templateId: '' }))}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium">AI Auto-Design</h4>
                          <p className="text-sm text-muted-foreground">
                            Let AI create a custom layout
                          </p>
                        </div>
                        <Badge variant="secondary">Recommended</Badge>
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
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Template Preview */}
                          <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {template.preview ? (
                              <img 
                                src={template.preview} 
                                alt={template.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Layout className="h-8 w-8 text-gray-400" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {template.category}
                              </Badge>
                            </div>
                            {template.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {template.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{template.usageCount} uses</span>
                              <div className="flex gap-1">
                                {template.tags.slice(0, 2).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs px-1">
                                    {tag}
                                  </Badge>
                                ))}
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

          {step === 'customize' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Customize Your Infographic</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Adjust the styling and layout to match your preferences
                </p>
              </div>

              {/* Color Scheme */}
              <div>
                <Label className="text-base font-medium">Color Scheme</Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-2">
                  {['blue', 'green', 'purple', 'orange', 'red', 'teal'].map((scheme) => (
                    <div
                      key={scheme}
                      className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                        formData.style.colorScheme === scheme 
                          ? 'border-gray-900 bg-gray-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        style: { ...prev.style, colorScheme: scheme as any }
                      }))}
                    >
                      <div className="flex gap-1 mb-2">
                        {getColorSchemePreview(scheme).map((color, index) => (
                          <div
                            key={index}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-medium capitalize">{scheme}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layout and Theme */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Layout</Label>
                  <Select
                    value={formData.style.layout}
                    onValueChange={(value: any) => 
                      setFormData(prev => ({
                        ...prev,
                        style: { ...prev.style, layout: value }
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="horizontal">Horizontal</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="timeline">Timeline</SelectItem>
                      <SelectItem value="comparison">Comparison</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Theme</Label>
                  <Select
                    value={formData.style.theme}
                    onValueChange={(value: any) => 
                      setFormData(prev => ({
                        ...prev,
                        style: { ...prev.style, theme: value }
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Font Size</Label>
                  <Select
                    value={formData.style.fontSize}
                    onValueChange={(value: any) => 
                      setFormData(prev => ({
                        ...prev,
                        style: { ...prev.style, fontSize: value }
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <Label className="text-base font-medium">Dimensions</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {[
                    { format: 'portrait', width: 800, height: 1200, label: 'Portrait' },
                    { format: 'landscape', width: 1200, height: 800, label: 'Landscape' },
                    { format: 'square', width: 1000, height: 1000, label: 'Square' },
                    { format: 'custom', width: 800, height: 1200, label: 'Custom' }
                  ].map((preset) => (
                    <div
                      key={preset.format}
                      className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${
                        formData.dimensions.format === preset.format 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        dimensions: { ...preset, format: preset.format as any }
                      }))}
                    >
                      <div className="text-sm font-medium">{preset.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {preset.width} × {preset.height}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Branding */}
              <div>
                <Label className="text-base font-medium">Branding (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={formData.branding.companyName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, companyName: e.target.value }
                      }))}
                      placeholder="Your company name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.branding.website}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, website: e.target.value }
                      }))}
                      placeholder="www.example.com"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'generate' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Ready to Generate</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Review your settings and generate your AI-powered infographic
                </p>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Content Length:</span>
                    <span className="ml-2">{formData.content.length} characters</span>
                  </div>
                  <div>
                    <span className="font-medium">Template:</span>
                    <span className="ml-2">
                      {formData.templateId ? 
                        templates.find(t => t.id === formData.templateId)?.name || 'Selected Template' :
                        'AI Auto-Design'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Color Scheme:</span>
                    <span className="ml-2 capitalize">{formData.style.colorScheme}</span>
                  </div>
                  <div>
                    <span className="font-medium">Dimensions:</span>
                    <span className="ml-2">{formData.dimensions.width} × {formData.dimensions.height}</span>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="text-center">
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !formData.content.trim()}
                  size="lg"
                  className="px-8"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Infographic
                    </>
                  )}
                </Button>
              </div>

              {/* Generated Result */}
              {generatedInfographic && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium">Generated Infographic</h4>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button size="sm" variant="outline" onClick={copyToClipboard}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy SVG
                      </Button>
                      <Button size="sm" onClick={downloadInfographic}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center text-sm text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>Infographic generated successfully!</p>
                      <p>Use the buttons above to preview or download your infographic.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 'content'}
        >
          Back
        </Button>
        
        <div className="flex gap-2">
          {step !== 'generate' && (
            <Button
              onClick={handleNext}
              disabled={
                (step === 'content' && !formData.content.trim()) ||
                loading
              }
            >
              Next
            </Button>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Infographic Preview</DialogTitle>
          </DialogHeader>
          
          {generatedInfographic && (
            <div className="space-y-4">
              <div className="bg-white border rounded-lg p-4 overflow-auto">
                <div 
                  dangerouslySetInnerHTML={{ __html: generatedInfographic.svgContent }}
                  className="w-full flex justify-center"
                />
              </div>
              
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy SVG
                </Button>
                <Button onClick={downloadInfographic}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}