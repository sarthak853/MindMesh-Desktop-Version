'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  Clock, 
  MessageSquare, 
  Trophy, 
  Mail, 
  Smartphone, 
  Monitor,
  Moon,
  Settings,
  TestTube,
  RotateCcw
} from 'lucide-react'

interface NotificationPreferences {
  reviewReminders: {
    enabled: boolean
    frequency: 'immediate' | 'daily' | 'twice_daily' | 'custom'
    customTimes?: string[]
    advanceNotice: number
    maxDailyNotifications: number
  }
  reflectionPrompts: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly'
    preferredTime: string
    weekdays: number[]
    promptTypes: ('progress' | 'insights' | 'goals' | 'challenges')[]
  }
  achievements: {
    enabled: boolean
    streakMilestones: boolean
    masteryNotifications: boolean
    progressMilestones: boolean
  }
  delivery: {
    methods: ('browser' | 'email' | 'push')[]
    quietHours: {
      enabled: boolean
      start: string
      end: string
    }
  }
}

interface NotificationPreferencesProps {
  className?: string
}

export function NotificationPreferences({ className = '' }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      })

      if (response.ok) {
        setHasChanges(false)
        // Show success message
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = async () => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset_to_defaults' }),
      })

      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Error resetting preferences:', error)
    }
  }

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'test_notification' }),
      })

      if (response.ok) {
        // Show success message
        console.log('Test notification sent')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
    }
  }

  const updatePreferences = (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return
    
    setPreferences({ ...preferences, ...updates })
    setHasChanges(true)
  }

  const updateNestedPreferences = <T extends keyof NotificationPreferences>(
    section: T,
    updates: Partial<NotificationPreferences[T]>
  ) => {
    if (!preferences) return
    
    setPreferences({
      ...preferences,
      [section]: { ...preferences[section], ...updates }
    })
    setHasChanges(true)
  }

  const toggleWeekday = (day: number) => {
    if (!preferences) return
    
    const weekdays = preferences.reflectionPrompts.weekdays.includes(day)
      ? preferences.reflectionPrompts.weekdays.filter(d => d !== day)
      : [...preferences.reflectionPrompts.weekdays, day]
    
    updateNestedPreferences('reflectionPrompts', { weekdays })
  }

  const togglePromptType = (type: 'progress' | 'insights' | 'goals' | 'challenges') => {
    if (!preferences) return
    
    const promptTypes = preferences.reflectionPrompts.promptTypes.includes(type)
      ? preferences.reflectionPrompts.promptTypes.filter(t => t !== type)
      : [...preferences.reflectionPrompts.promptTypes, type]
    
    updateNestedPreferences('reflectionPrompts', { promptTypes })
  }

  const toggleDeliveryMethod = (method: 'browser' | 'email' | 'push') => {
    if (!preferences) return
    
    const methods = preferences.delivery.methods.includes(method)
      ? preferences.delivery.methods.filter(m => m !== method)
      : [...preferences.delivery.methods, method]
    
    updateNestedPreferences('delivery', { methods })
  }

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const promptTypeLabels = {
    progress: 'Progress Reviews',
    insights: 'Learning Insights',
    goals: 'Goal Check-ins',
    challenges: 'Challenge Support'
  }

  if (isLoading || !preferences) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Loading notification preferences...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Customize when and how you receive review reminders, reflection prompts, and achievement notifications.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Review Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Review Reminders
          </CardTitle>
          <CardDescription>
            Get notified when your memory cards are due for review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Review Reminders</div>
              <div className="text-sm text-muted-foreground">
                Receive notifications when cards are due for review
              </div>
            </div>
            <Switch
              checked={preferences.reviewReminders.enabled}
              onCheckedChange={(enabled) => 
                updateNestedPreferences('reviewReminders', { enabled })
              }
            />
          </div>

          {preferences.reviewReminders.enabled && (
            <>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Reminder Frequency
                  </label>
                  <Select
                    value={preferences.reviewReminders.frequency}
                    onValueChange={(frequency: any) => 
                      updateNestedPreferences('reviewReminders', { frequency })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate (per card)</SelectItem>
                      <SelectItem value="daily">Daily Summary</SelectItem>
                      <SelectItem value="twice_daily">Twice Daily</SelectItem>
                      <SelectItem value="custom">Custom Times</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Advance Notice (minutes)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="1440"
                    value={preferences.reviewReminders.advanceNotice}
                    onChange={(e) => 
                      updateNestedPreferences('reviewReminders', { 
                        advanceNotice: parseInt(e.target.value) || 0 
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Max Daily Notifications
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={preferences.reviewReminders.maxDailyNotifications}
                  onChange={(e) => 
                    updateNestedPreferences('reviewReminders', { 
                      maxDailyNotifications: parseInt(e.target.value) || 1 
                    })
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Reflection Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reflection Prompts
          </CardTitle>
          <CardDescription>
            Receive periodic prompts to reflect on your learning progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Reflection Prompts</div>
              <div className="text-sm text-muted-foreground">
                Get thoughtful questions to help you reflect on your learning
              </div>
            </div>
            <Switch
              checked={preferences.reflectionPrompts.enabled}
              onCheckedChange={(enabled) => 
                updateNestedPreferences('reflectionPrompts', { enabled })
              }
            />
          </div>

          {preferences.reflectionPrompts.enabled && (
            <>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Frequency
                  </label>
                  <Select
                    value={preferences.reflectionPrompts.frequency}
                    onValueChange={(frequency: any) => 
                      updateNestedPreferences('reflectionPrompts', { frequency })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Preferred Time
                  </label>
                  <Input
                    type="time"
                    value={preferences.reflectionPrompts.preferredTime}
                    onChange={(e) => 
                      updateNestedPreferences('reflectionPrompts', { 
                        preferredTime: e.target.value 
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Days of Week
                </label>
                <div className="flex gap-2">
                  {weekdayNames.map((day, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={preferences.reflectionPrompts.weekdays.includes(index) ? "default" : "outline"}
                      onClick={() => toggleWeekday(index)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Prompt Types
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(promptTypeLabels).map(([type, label]) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Switch
                        checked={preferences.reflectionPrompts.promptTypes.includes(type as any)}
                        onCheckedChange={() => togglePromptType(type as any)}
                      />
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Achievement Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievement Notifications
          </CardTitle>
          <CardDescription>
            Get notified about your learning milestones and achievements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Achievement Notifications</div>
              <div className="text-sm text-muted-foreground">
                Celebrate your learning progress and milestones
              </div>
            </div>
            <Switch
              checked={preferences.achievements.enabled}
              onCheckedChange={(enabled) => 
                updateNestedPreferences('achievements', { enabled })
              }
            />
          </div>

          {preferences.achievements.enabled && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Streak Milestones</span>
                  <Switch
                    checked={preferences.achievements.streakMilestones}
                    onCheckedChange={(streakMilestones) => 
                      updateNestedPreferences('achievements', { streakMilestones })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mastery Notifications</span>
                  <Switch
                    checked={preferences.achievements.masteryNotifications}
                    onCheckedChange={(masteryNotifications) => 
                      updateNestedPreferences('achievements', { masteryNotifications })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Progress Milestones</span>
                  <Switch
                    checked={preferences.achievements.progressMilestones}
                    onCheckedChange={(progressMilestones) => 
                      updateNestedPreferences('achievements', { progressMilestones })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delivery Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Delivery Settings
          </CardTitle>
          <CardDescription>
            Choose how and when you want to receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Delivery Methods
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span className="text-sm">Browser Notifications</span>
                </div>
                <Switch
                  checked={preferences.delivery.methods.includes('browser')}
                  onCheckedChange={() => toggleDeliveryMethod('browser')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email Notifications</span>
                </div>
                <Switch
                  checked={preferences.delivery.methods.includes('email')}
                  onCheckedChange={() => toggleDeliveryMethod('email')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="text-sm">Push Notifications</span>
                </div>
                <Switch
                  checked={preferences.delivery.methods.includes('push')}
                  onCheckedChange={() => toggleDeliveryMethod('push')}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                <span className="text-sm font-medium">Quiet Hours</span>
              </div>
              <Switch
                checked={preferences.delivery.quietHours.enabled}
                onCheckedChange={(enabled) => 
                  updateNestedPreferences('delivery', { 
                    quietHours: { ...preferences.delivery.quietHours, enabled }
                  })
                }
              />
            </div>
            
            {preferences.delivery.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={preferences.delivery.quietHours.start}
                    onChange={(e) => 
                      updateNestedPreferences('delivery', { 
                        quietHours: { 
                          ...preferences.delivery.quietHours, 
                          start: e.target.value 
                        }
                      })
                    }
                  />
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={preferences.delivery.quietHours.end}
                    onChange={(e) => 
                      updateNestedPreferences('delivery', { 
                        quietHours: { 
                          ...preferences.delivery.quietHours, 
                          end: e.target.value 
                        }
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={savePreferences}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              
              <Button
                variant="outline"
                onClick={sendTestNotification}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Notification
              </Button>
            </div>
            
            <Button
              variant="outline"
              onClick={resetToDefaults}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
          
          {hasChanges && (
            <div className="mt-3 text-sm text-muted-foreground">
              You have unsaved changes. Click "Save Changes" to apply them.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}