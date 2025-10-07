'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  FileText, 
  Brain, 
  CreditCard,
  Settings,
  Share2,
  MoreVertical,
  Calendar,
  Tag
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { ProjectCreationModal } from './project-creation-modal'
import { ProjectInviteModal } from './project-invite-modal'
import { ProjectSettingsModal } from './project-settings-modal'

interface Project {
  id: string
  name: string
  description?: string
  isPublic: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    email: string
    image?: string
  }
  memberCount: number
  documentCount: number
  cognitiveMapCount: number
  memoryCardCount: number
  userRole: 'admin' | 'editor' | 'viewer'
  userPermissions: string[]
}

interface ProjectManagerProps {
  onProjectSelect?: (project: Project) => void
  selectedProjectId?: string
}

export function ProjectManager({ onProjectSelect, selectedProjectId }: ProjectManagerProps) {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'owned' | 'member' | 'public'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt' | 'memberCount'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  useEffect(() => {
    if (session) {
      fetchProjects()
    }
  }, [session, filterBy, sortBy, sortOrder, searchTerm])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        filter: filterBy,
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/projects?${params}`)
      const data = await response.json()

      if (data.success) {
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectClick = (project: Project) => {
    if (onProjectSelect) {
      onProjectSelect(project)
    }
  }

  const handleInviteMembers = (project: Project) => {
    setSelectedProject(project)
    setShowInviteModal(true)
  }

  const handleProjectSettings = (project: Project) => {
    setSelectedProject(project)
    setShowSettingsModal(true)
  }

  const handleProjectCreated = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev])
    setShowCreateModal(false)
  }

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    ))
    setShowSettingsModal(false)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'editor': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600\"></div>
      </div>
    )
  }

  return (
    <div className=\"space-y-6\">
      {/* Header */}
      <div className=\"flex items-center justify-between\">
        <div>
          <h2 className=\"text-2xl font-bold\">Projects</h2>
          <p className=\"text-muted-foreground\">
            Manage your collaborative knowledge projects
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className=\"h-4 w-4 mr-2\" />
          New Project
        </Button>
      </div>

      {/* Filters and Search */}
      <div className=\"flex items-center gap-4\">
        <div className=\"flex-1 relative\">
          <Search className=\"absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground\" />
          <Input
            placeholder=\"Search projects...\"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className=\"pl-10\"
          />
        </div>
        
        <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
          <SelectTrigger className=\"w-40\">
            <Filter className=\"h-4 w-4 mr-2\" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=\"all\">All Projects</SelectItem>
            <SelectItem value=\"owned\">Owned by Me</SelectItem>
            <SelectItem value=\"member\">I'm a Member</SelectItem>
            <SelectItem value=\"public\">Public Projects</SelectItem>
          </SelectContent>
        </Select>

        <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
          const [field, order] = value.split('-')
          setSortBy(field as any)
          setSortOrder(order as any)
        }}>
          <SelectTrigger className=\"w-48\">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=\"updatedAt-desc\">Recently Updated</SelectItem>
            <SelectItem value=\"createdAt-desc\">Recently Created</SelectItem>
            <SelectItem value=\"name-asc\">Name (A-Z)</SelectItem>
            <SelectItem value=\"name-desc\">Name (Z-A)</SelectItem>
            <SelectItem value=\"memberCount-desc\">Most Members</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">
        {projects.map((project) => (
          <Card 
            key={project.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedProjectId === project.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleProjectClick(project)}
          >
            <CardHeader className=\"pb-3\">
              <div className=\"flex items-start justify-between\">
                <div className=\"flex-1\">
                  <CardTitle className=\"text-lg mb-1\">{project.name}</CardTitle>
                  {project.description && (
                    <p className=\"text-sm text-muted-foreground line-clamp-2\">
                      {project.description}
                    </p>
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant=\"ghost\" size=\"sm\">
                      <MoreVertical className=\"h-4 w-4\" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align=\"end\">
                    {project.userPermissions.includes('manage_members') && (
                      <DropdownMenuItem onClick={() => handleInviteMembers(project)}>
                        <Share2 className=\"h-4 w-4 mr-2\" />
                        Invite Members
                      </DropdownMenuItem>
                    )}
                    {project.userPermissions.includes('manage_settings') && (
                      <DropdownMenuItem onClick={() => handleProjectSettings(project)}>
                        <Settings className=\"h-4 w-4 mr-2\" />
                        Settings
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className=\"space-y-4\">
              {/* Role and Visibility */}
              <div className=\"flex items-center justify-between\">
                <Badge className={getRoleColor(project.userRole)}>
                  {project.userRole}
                </Badge>
                <div className=\"flex items-center gap-2\">
                  {project.isPublic && (
                    <Badge variant=\"outline\" className=\"text-xs\">
                      Public
                    </Badge>
                  )}
                  <div className=\"flex items-center text-xs text-muted-foreground\">
                    <Users className=\"h-3 w-3 mr-1\" />
                    {project.memberCount}
                  </div>
                </div>
              </div>

              {/* Content Stats */}
              <div className=\"grid grid-cols-3 gap-2 text-xs\">
                <div className=\"flex items-center gap-1 text-muted-foreground\">
                  <FileText className=\"h-3 w-3\" />
                  <span>{project.documentCount}</span>
                </div>
                <div className=\"flex items-center gap-1 text-muted-foreground\">
                  <Brain className=\"h-3 w-3\" />
                  <span>{project.cognitiveMapCount}</span>
                </div>
                <div className=\"flex items-center gap-1 text-muted-foreground\">
                  <CreditCard className=\"h-3 w-3\" />
                  <span>{project.memoryCardCount}</span>
                </div>
              </div>

              {/* Tags */}
              {project.tags.length > 0 && (
                <div className=\"flex flex-wrap gap-1\">
                  {project.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant=\"outline\" className=\"text-xs px-1 py-0\">
                      <Tag className=\"h-2 w-2 mr-1\" />
                      {tag}
                    </Badge>
                  ))}
                  {project.tags.length > 3 && (
                    <Badge variant=\"outline\" className=\"text-xs px-1 py-0\">
                      +{project.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className=\"flex items-center justify-between text-xs text-muted-foreground pt-2 border-t\">
                <div className=\"flex items-center gap-1\">
                  <Calendar className=\"h-3 w-3\" />
                  <span>Updated {formatDate(project.updatedAt)}</span>
                </div>
                <span>by {project.owner.name}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && !loading && (
        <div className=\"text-center py-12\">
          <div className=\"mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4\">
            <Users className=\"h-12 w-12 text-gray-400\" />
          </div>
          <h3 className=\"text-lg font-medium mb-2\">No projects found</h3>
          <p className=\"text-muted-foreground mb-4\">
            {searchTerm ? 'Try adjusting your search terms' : 'Create your first project to get started'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className=\"h-4 w-4 mr-2\" />
              Create Project
            </Button>
          )}
        </div>
      )}

      {/* Modals */}
      <ProjectCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
      />

      {selectedProject && (
        <>
          <ProjectInviteModal
            open={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            project={selectedProject}
          />

          <ProjectSettingsModal
            open={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            project={selectedProject}
            onProjectUpdated={handleProjectUpdated}
          />
        </>
      )}
    </div>
  )
}