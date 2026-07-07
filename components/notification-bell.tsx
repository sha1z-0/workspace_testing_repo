"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { notificationsAPI } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function NotificationBell() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [hasShownPopup, setHasShownPopup] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  
  useEffect(() => {
    // Fetch notifications and unread count when component mounts or user changes
    const fetchNotifications = async () => {
      if (!user?.id) return
      
      setLoading(true)
      try {
        const [notificationsData, count] = await Promise.all([
          notificationsAPI.getUserNotifications(user.id),
          notificationsAPI.getUnreadCount(user.id)
        ])
        
        setNotifications(notificationsData.slice(0, 5)) // Show only 5 most recent
        setUnreadCount(count)
        
        // Auto-open notification dropdown if there are unread notifications
        // and we haven't shown the popup yet during this session
        if (count > 0 && !hasShownPopup) {
          // Use a small delay to make sure the UI is ready
          setTimeout(() => {
            setIsOpen(true);
            setHasShownPopup(true);
          }, 1000);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error)
        // Don't throw error or log out - just show empty notifications
        setNotifications([])
        setUnreadCount(0)
      } finally {
        setLoading(false)
      }
    }
    
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    // Save notification state to sessionStorage
    if (user?.id && !hasShownPopup) {
      const hasSeenNotifications = sessionStorage.getItem(`notification_popup_shown_${user.id}`);
      if (hasSeenNotifications) {
        setHasShownPopup(true);
      }
    }
    
    return () => clearInterval(interval)
  }, [user, hasShownPopup])
  
  // Save popup state to sessionStorage when it's shown
  useEffect(() => {
    if (user?.id && hasShownPopup) {
      sessionStorage.setItem(`notification_popup_shown_${user.id}`, 'true');
    }
  }, [user, hasShownPopup]);
  
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsAPI.markAsRead(notificationId)
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId ? { ...notification, read: true } : notification
      ))
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
      // Don't show error to user, just log it
    }
  }
  
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "Unknown"
    
    try {
      // If it's a Firebase timestamp, convert to JS Date
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      
      // Format as relative time
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 30) return `${diffDays}d ago`
      
      return date.toLocaleDateString()
    } catch (error) {
      return "Unknown date"
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="outline">{unreadCount} unread</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="flex justify-center py-4">
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex justify-center py-4">
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <>
            {notifications.map(notification => (
              <DropdownMenuItem 
                key={notification.id}
                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                className={`flex flex-col items-start space-y-1 px-4 py-3 ${!notification.read ? 'bg-muted/50' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <p className="font-medium text-sm">
                    {notification.title}
                  </p>
                  <Badge 
                    variant={
                      notification.type === "meeting" || notification.type === "task" 
                        ? "default" 
                        : "outline"
                    }
                    className="text-xs h-5 capitalize"
                  >
                    {notification.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate w-full">
                  {notification.body}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(notification.created_at)}
                </span>
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link 
                href="/announcements" 
                className="flex justify-center text-sm text-primary hover:text-primary"
              >
                View all notifications
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 