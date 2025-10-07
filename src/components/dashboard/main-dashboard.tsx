'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  FileText, 
  Users, 
  Settings, 
  Plus, 
  Search,
  BookOpen,
  Lightbulb,
  Target,
  BarChart3,
  Map,
  MessageSquare
} from 'lucide-react'

interface DashboardProps {
  onNavigate: (section: string) => void
}

export function MainDashboard({ onNavigate }: DashboardProps) {
  const [activeSection, setActiveSection] = useState('overview')

  const handleNavigation = (section: string) => {
    setActiveSection(section)
    onNavigate(section)
  }

  const quickActions = [
    {
      title: 'Create Knowledge Map',
      description: 'Start a new cognitive map',
      icon: Map,
      action: () => handleNavigation('cognitive-map'),
      color: 'bg-blue-500'
    },
    {
      title: 'Upload Document',
      description: 'Process and extract knowledge',
      icon: FileText,
      action: () => handleNavigation('documents'),
      color: 'bg-green-500'
    },
    {
      title: 'Memory Cards',
      description: 'Review and create flashcards',
      icon: BookOpen,
      action: () => handleNavigation('memory-cards'),
      color: 'bg-purple-500'
    },
    {
      title: 'AI Assistant',
      description: 'Ask questions and get insights',
      icon: MessageSquare,
      action: () => handleNavigation('ai-chat'),
      color: 'bg-orange-500'
    }
  ]

  const recentActivity = [
    { type: 'map', title: 'Machine Learning Concepts', time: '2 hours ago' },
    { type: 'document', title: 'Research Paper Analysis', time: '1 day ago' },
    { type: 'cards', title: 'Python Fundamentals Review', time: '2 days ago' },
    { type: 'ai', title: 'AI Chat Session', time: '3 days ago' }
  ]

  const stats = [
    { label: 'Knowledge Nodes', value: '127', icon: Brain, color: 'text-blue-600' },
    { label: 'Documents Processed', value: '23', icon: FileText, color: 'text-green-600' },
    { label: 'Memory Cards', value: '89', icon: BookOpen, color: 'text-purple-600' },
    { label: 'Study Streak', value: '12 days', icon: Target, color: 'text-orange-600' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Brain className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MindMesh</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigation('profile')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Continue your learning journey with AI-powered knowledge management
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index} 
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={action.action}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${action.color} text-white`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {action.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {activity.type === 'map' && <Map className="h-5 w-5 text-blue-600" />}
                    {activity.type === 'document' && <FileText className="h-5 w-5 text-green-600" />}
                    {activity.type === 'cards' && <BookOpen className="h-5 w-5 text-purple-600" />}
                    {activity.type === 'ai' && <MessageSquare className="h-5 w-5 text-orange-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Learning Progress
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Weekly Goal
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    8/10 sessions
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Memory Retention
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    92%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Knowledge Growth
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    +15 nodes this week
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}