'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  Clock, 
  MessageSquare, 
  Trophy, 
  X, 
  Snooze,
  Play,
  CheckCircle,
  AlertCircle,
  Info,
  Trash2
} from 'lucide-react'

interface NotificationData {
  id: string
  userId: string
  type: 'review_reminder' | 'reflection_prompt' | 'achievement' | 'streak_reminder'
  title: string
  message: string
  data?: Record<string, any>
  scheduledFor: Date
  delivered: boolean
  deliveredAt?: Date
  dismissed: boolean
  dismissedAt?: Date
  priority: 'low' | 'medium' | 'high'
  expiresAt?: Date
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<{
    pending: NotificationData[]
    delivered: NotificationData[]
    dismissed: NotificationData[]
  }>({
    pending: [],
    delivered: [],
    dismissed: []
  })
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('current')

  useEffect(() => {
    loadNotifications()
    
    // Set up polling for new notifications
    const interval = setInterval(loadNotifications, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications({
          pending: data.pending || [],
          delivered: data.delivered || [],
          dismissed: data.dismissed || []
        })
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const dismissNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'dismiss',
          notificationId
        }),
      })

      if (response.ok) {
        await loadNotifications()
      }
    } catch (error) {
      console.error('Error dismissing notification:', error)
    }
  }

  const snoozeNotification = async (notificationId: string, minutes: number = 60) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'snooze',
          notificationId,
          snoozeMinutes: minutes
        }),
      })

      if (response.ok) {
        await loadNotifications()
      }
    } catch (error) {
      console.error('Error snoozing notification:', error)
    }
  }

  const clearAllNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clear_all'
        }),
      })

      if (response.ok) {
        await loadNotifications()
      }
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  const handleNotificationAction = (notification: NotificationData) => {
    switch (notification.type) {
      case 'review_reminder':
        // Navigate to review session
        window.location.href = '/review'
        break
      case 'reflection_prompt':
        // Navigate to reflection interface
        window.location.href = '/reflection'
        break
      case 'achievement':
        // Show achievement details
        window.location.href = '/progress'
        break
      default:
        // Navigate to dashboard
        window.location.href = '/dashboard'
    }
    
    // Dismiss the notification after action
    dismissNotification(notification.id)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review_reminder':
        return <Clock className="h-4 w-4" />
      case 'reflection_prompt':
        return <MessageSquare className="h-4 w-4" />
      case 'achievement':
        return <Trophy className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date))
  }

  const renderNotification = (notification: NotificationData, showActions: boolean = true) => (
    <Card key={notification.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm">{notification.title}</h4>
                <Badge className={getPriorityColor(notification.priority)}>
                  {notification.priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {notification.message}
              </p>
              <div className="text-xs text-muted-foreground">
                {notification.delivered 
                  ? `Delivered ${formatTime(notification.deliveredAt!)}`
                  : `Scheduled for ${formatTime(notification.scheduledFor)}`
                }
              </div>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-1 ml-2">
              {notification.type === 'review_reminder' && (
                <Button
                  size="sm"
                  onClick={() => handleNotificationAction(notification)}
                  className="h-8"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </Button>
              )}
              
              {notification.type === 'reflection_prompt' && (
                <Button
                  size="sm"
                  onClick={() => handleNotificationAction(notification)}
                  className="h-8"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Reflect
                </Button>
              )}
              
              {notification.delivered && !notification.dismissed && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => snoozeNotification(notification.id, 60)}
                    className="h-8"
                  >
                    <Snooze className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissNotification(notification.id)}
                    className="h-8"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Loading notifications...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentNotifications = [...notifications.delivered, ...notifications.pending]
    .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Center
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage your review reminders, reflection prompts, and achievements.
              </CardDescription>
            </div>
            
            {currentNotifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllNotifications}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Notifications */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">
            Current ({currentNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Scheduled ({notifications.pending.length})
          </TabsTrigger>
          <TabsTrigger value="dismissed">
            Dismissed ({notifications.dismissed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {currentNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-muted-foreground">No current notifications</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You're all caught up! New notifications will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {currentNotifications.map(notification => 
                renderNotification(notification, true)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {notifications.pending.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <p className="text-muted-foreground">No scheduled notifications</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upcoming notifications will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {notifications.pending.map(notification => 
                renderNotification(notification, false)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dismissed" className="space-y-4">
          {notifications.dismissed.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Info className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-muted-foreground">No dismissed notifications</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Dismissed notifications will appear here for reference.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {notifications.dismissed.map(notification => 
                renderNotification(notification, false)
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}