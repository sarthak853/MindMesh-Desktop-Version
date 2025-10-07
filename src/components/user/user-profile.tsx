'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPreferences } from '@/types'

interface UserProfileProps {
  preferences: UserPreferences
  onUpdatePreferences: (preferences: UserPreferences) => Promise<void>
  onBack?: () => void
}

export function UserProfile({ preferences, onUpdatePreferences, onBack }: UserProfileProps) {
  const { user } = useAuth()
  const [localPreferences, setLocalPreferences] = useState<UserPreferences>(preferences)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onUpdatePreferences(localPreferences)
    } catch (error) {
      console.error('Failed to update preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreference = (path: string, value: any) => {
    setLocalPreferences(prev => {
      const keys = path.split('.')
      const updated = { ...prev }
      let current: any = updated
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return updated
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with back navigation */}
      {onBack && (
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">User Profile</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>
        </div>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Your basic profile information from your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            {user?.imageUrl && (
              <img
                src={user.imageUrl}
                alt="Profile"
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{user?.fullName}</p>
              <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>General Preferences</CardTitle>
          <CardDescription>
            Customize your MindMesh experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={localPreferences.theme}
              onValueChange={(value) => updatePreference('theme', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aiMode">Default AI Mode</Label>
            <Select
              value={localPreferences.aiMode}
              onValueChange={(value) => updatePreference('aiMode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scholar">Scholar Mode</SelectItem>
                <SelectItem value="explorer">Explorer Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Choose what notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Memory Review Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when it's time to review your memory cards
              </p>
            </div>
            <Switch
              checked={localPreferences.notifications.memoryReviews}
              onCheckedChange={(checked) => 
                updatePreference('notifications.memoryReviews', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Collaboration Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about updates to your collaborative projects
              </p>
            </div>
            <Switch
              checked={localPreferences.notifications.collaborationUpdates}
              onCheckedChange={(checked) => 
                updatePreference('notifications.collaborationUpdates', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Inspiration Stream</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about new content in your inspiration stream
              </p>
            </div>
            <Switch
              checked={localPreferences.notifications.inspirationStream}
              onCheckedChange={(checked) => 
                updatePreference('notifications.inspirationStream', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Wellness Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Wellness & Productivity</CardTitle>
          <CardDescription>
            Configure your wellness and productivity settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pomodoroLength">Pomodoro Timer Length (minutes)</Label>
            <Input
              id="pomodoroLength"
              type="number"
              min="15"
              max="60"
              value={localPreferences.wellness.pomodoroLength}
              onChange={(e) => 
                updatePreference('wellness.pomodoroLength', parseInt(e.target.value))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Break Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get reminded to take breaks during long study sessions
              </p>
            </div>
            <Switch
              checked={localPreferences.wellness.breakReminders}
              onCheckedChange={(checked) => 
                updatePreference('wellness.breakReminders', checked)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dailyGoals">Daily Learning Goals</Label>
            <Input
              id="dailyGoals"
              type="number"
              min="1"
              max="20"
              value={localPreferences.wellness.dailyGoals}
              onChange={(e) => 
                updatePreference('wellness.dailyGoals', parseInt(e.target.value))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}