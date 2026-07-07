"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { announcementsAPI } from "@/lib/api"
import { useEffect, useState } from "react"
import { Loader2, Megaphone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AdminAnnouncementsPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isCEO = user?.role === "CEO"

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (user) {
        try {
          const data = await announcementsAPI.getAll()
          setAnnouncements(data)
        } catch (error) {
          console.error("Error fetching announcements:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchAnnouncements()
  }, [user])

  // Mark announcement as read
  const handleMarkAsRead = async (announcementId: string) => {
    if (!user) return
    
    try {
      await announcementsAPI.markAsRead(announcementId)
      
      // Update local state
      setAnnouncements(
        announcements.map(announcement => {
          if (announcement.id === announcementId) {
            const readArray = announcement.read || []
            if (!readArray.includes(user.id)) {
              return {
                ...announcement,
                read: [...readArray, user.id]
              }
            }
          }
          return announcement
        })
      )
    } catch (error) {
      console.error("Error marking announcement as read:", error)
    }
  }

  // Check if an announcement is unread
  const isUnread = (announcement: any) => {
    if (!user) return false
    const readArray = announcement.read || []
    return !readArray.includes(user.id)
  }

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown"
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return "Unknown date"
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Company Announcements</h1>
          <p className="text-muted-foreground">Important updates from management</p>
        </div>
        
        {isCEO && (
          <Button asChild>
            <Link href="/admin/ceo">
              <Megaphone className="mr-2 h-4 w-4" />
              Create Announcement
            </Link>
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Announcements</h3>
            <p className="text-muted-foreground text-center">
              There are no company announcements at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {announcements.map((announcement) => {
            const unread = isUnread(announcement)
            
            // Get read count
            const readCount = announcement.read?.length || 0
            
            return (
              <Card 
                key={announcement.id} 
                className={`overflow-hidden transition-all ${unread ? 'border-primary/50 shadow-md' : ''}`}
              >
                <div className={`h-1 ${
                  announcement.priority === "high" 
                    ? "bg-red-500" 
                    : announcement.priority === "medium" 
                      ? "bg-blue-500" 
                      : "bg-green-500"
                }`} />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {announcement.title}
                        {unread && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        Posted by {announcement.createdByName} • {formatDate(announcement.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        announcement.priority === "high" 
                          ? "destructive" 
                          : announcement.priority === "medium" 
                            ? "default" 
                            : "outline"
                      }
                    >
                      {announcement.priority} priority
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="whitespace-pre-line text-sm">{announcement.content}</div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div>
                      Read by {readCount} {readCount === 1 ? 'person' : 'people'}
                    </div>
                    
                    {unread && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleMarkAsRead(announcement.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
} 