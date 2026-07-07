"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { announcementsAPI, usersAPI, notificationsAPI } from "@/lib/api"
import type { FirebaseAnnouncement as BaseFirebaseAnnouncement, FirebaseUser, FirebaseNotification } from "@/lib/firebase-types"
import { useEffect, useState } from "react"
import { Loader2, Plus, Search, AlertTriangle, Calendar, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

// Extend the base FirebaseAnnouncement type to include read property
interface FirebaseAnnouncement extends BaseFirebaseAnnouncement {
  read?: string[]; // Array of user IDs who have read the announcement
}

// Extended type that includes necessary fields from the API
interface AnnouncementWithCreatorInfo extends FirebaseAnnouncement {
  id: string;
  creatorName?: string;
}

// Extended notification type with id and read fields
interface NotificationWithId {
  id: string;
  type: string;
  read: boolean;
  announcementId?: string;
  [key: string]: any;
}

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<AnnouncementWithCreatorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [markingAsRead, setMarkingAsRead] = useState(false)
  
  // Edit state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementWithCreatorInfo | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    important: false
  })

  // Create state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: "",
    content: "",
    important: false
  })

  // Function to check if an announcement is unread
  const isUnread = (announcement: AnnouncementWithCreatorInfo): boolean => {
    if (!user || !announcement.read) return true;
    return !announcement.read.includes(user.id);
  };

  // Mark all announcements as read
  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      setMarkingAsRead(true);
      const unreadAnnouncements = announcements.filter(a => isUnread(a));
      
      if (unreadAnnouncements.length === 0) {
        return;
      }
      
      // Create promises to update all unread announcements
      const updatePromises = unreadAnnouncements.map(announcement => 
        announcementsAPI.markAsRead(announcement.id, user.id)
      );
      
      await Promise.all(updatePromises);
      
      // Update local state
      setAnnouncements(prevAnnouncements => 
        prevAnnouncements.map(announcement => {
          if (isUnread(announcement)) {
            const readArray = announcement.read || [];
            return {
              ...announcement,
              read: [...readArray, user.id]
            };
          }
          return announcement;
        })
      );
      
      // Show success notification
      toast({
        title: "Announcements updated",
        description: "All announcements have been marked as read",
      });
      
    } catch (error) {
      console.error("Error marking announcements as read:", error);
    } finally {
      setMarkingAsRead(false);
    }
  };

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (user) {
        try {
          // Explicitly type the response from the API
          const data = await announcementsAPI.getAll() as (FirebaseAnnouncement & { id: string })[];
          
          // Process announcements to add creator info
          const processedAnnouncements = await Promise.all(
            data.map(async (announcement) => {
              try {
                // Try to get creator's name if available
                if (announcement.createdBy) {
                  const creatorInfo = await usersAPI.getUser(announcement.createdBy)
                    .then((user: Partial<FirebaseUser> & { id: string }) => user)
                    .catch(() => null);
                    
                  return {
                    ...announcement,
                    creatorName: creatorInfo?.name || "Unknown"
                  };
                }
                return announcement;
              } catch (error) {
                // If getting user info fails, return the announcement as is
                return announcement;
              }
            })
          );
          
          setAnnouncements(processedAnnouncements);
          setError(null);
          
          // Mark announcements as read when viewing the page
          if (processedAnnouncements.length > 0) {
            markAllAsRead();
          }
          
          // Also mark any announcement notifications as read
          if (user.id) {
            markAnnouncementNotificationsAsRead();
          }
        } catch (error) {
          console.error("Error fetching announcements:", error)
          setError("Failed to load announcements. Please try again later.")
          toast({
            title: "Error loading announcements",
            description: "There was a problem loading the announcements. Please try again later.",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }
    }

    fetchAnnouncements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])
  
  // Mark all announcement-type notifications as read
  const markAnnouncementNotificationsAsRead = async () => {
    if (!user) return;
    
    try {
      // Get user's notifications
      const notifications = await notificationsAPI.getUserNotifications(user.id) as NotificationWithId[];
      
      // Filter to unread announcement notifications
      const unreadAnnouncementNotifications = notifications.filter(
        notification => notification.type === "announcement" && !notification.read
      );
      
      // Mark each as read
      const updatePromises = unreadAnnouncementNotifications.map(notification => 
        notificationsAPI.markAsRead(notification.id)
      );
      
      await Promise.all(updatePromises);
      
    } catch (error) {
      console.error("Error marking announcement notifications as read:", error);
      // Don't show error to user for this background task
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!user) return;
    
    try {
      setIsCreating(true);
      
      // Create new announcement in Firestore
      const announcement = await announcementsAPI.create({
        title: createForm.title,
        content: createForm.content,
        priority: createForm.important ? 'high' : 'medium',
        author_id: user.id,
        author_name: user.name
      });
      
      // Add to local state
      const newAnnouncement: AnnouncementWithCreatorInfo = {
        title: createForm.title,
        content: createForm.content,
        important: createForm.important,
        createdBy: user.id,
        createdAt: new Date(),
        id: announcement.id,
        creatorName: user.name || "Unknown",
      };
      
      setAnnouncements(prevAnnouncements => [newAnnouncement, ...prevAnnouncements]);
      
      // Show success toast
      toast({
        title: "Success",
        description: "Announcement has been created successfully",
      });
      
      // Close dialog and reset form
      setIsCreateDialogOpen(false);
      setCreateForm({
        title: "",
        content: "",
        important: false
      });
      
    } catch (error: any) {
      console.error("Error creating announcement:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create the announcement",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditAnnouncement = async () => {
    if (!editingAnnouncement) return;
    
    try {
      setIsEditing(true);
      
      // Update the announcement
      await announcementsAPI.update(editingAnnouncement.id, {
        title: editForm.title,
        content: editForm.content,
        priority: editForm.important ? 'high' : 'medium'
      });
      
      // Update local state
      setAnnouncements(prevAnnouncements => 
        prevAnnouncements.map(announcement => 
          announcement.id === editingAnnouncement.id 
            ? { 
                ...announcement, 
                title: editForm.title,
                content: editForm.content,
                important: editForm.important 
              } 
            : announcement
        )
      );
      
      // Show success toast
      toast({
        title: "Success",
        description: "Announcement has been updated successfully",
      });
      
      // Close dialog and reset state
      setIsEditDialogOpen(false);
      setEditingAnnouncement(null);
      
    } catch (error: any) {
      console.error("Error updating announcement:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update the announcement",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // Delete the announcement
      await announcementsAPI.delete(announcementToDelete);
      
      // Update local state to remove the deleted announcement
      setAnnouncements(prevAnnouncements => 
        prevAnnouncements.filter(announcement => announcement.id !== announcementToDelete)
      );
      
      // Show success toast
      toast({
        title: "Success",
        description: "Announcement has been deleted successfully",
      });
      
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete the announcement",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setAnnouncementToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Safe formatting function for timestamps
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "Unknown date";
    
    try {
      // If it's a Firebase timestamp with toDate method
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      } 
      // If it's a Date object or timestamp that can be converted to Date
      else if (timestamp instanceof Date || typeof timestamp === 'number' || typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString();
      }
      return "Unknown date";
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  const filteredAnnouncements = announcements.filter((announcement) => {
    return (
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Announcements</h2>
          <p className="text-muted-foreground">Create and manage company announcements</p>
        </div>
        
        <div className="flex h-60 flex-col items-center justify-center rounded-md border border-dashed border-red-300 bg-red-50 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
          <h3 className="font-medium text-red-700">Error Loading Announcements</h3>
          <p className="text-sm text-red-600 mt-2">
            {error}
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">Announcements</h2>
          <p className="text-muted-foreground">Create and manage company announcements</p>
        </div>
        <div className="flex items-center gap-2">
          {announcements.some(a => isUnread(a)) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
              disabled={markingAsRead}
            >
              {markingAsRead ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Marking as read...
                </>
              ) : "Mark all as read"}
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search announcements..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredAnnouncements.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
          <h3 className="font-medium">No announcements found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "Try adjusting your search" : "Create a new announcement to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <Card key={announcement.id} className={isUnread(announcement) ? "border-primary/50 shadow-md" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{announcement.title}</CardTitle>
                    {isUnread(announcement) && (
                      <Badge variant="secondary" className="text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  {announcement.important && (
                    <Badge variant="destructive" className="flex items-center">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Important
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(announcement.createdAt)}</span>
                  </div>
                  <div className="flex items-center">
                    <User className="mr-1 h-4 w-4 text-muted-foreground" />
                    <span>{announcement.creatorName || "Admin"}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p>{announcement.content}</p>
                </div>
              </CardContent>
              {(user?.role === "CEO" || user?.role === "C_LEVEL") && (
                <CardFooter className="flex justify-end space-x-2 border-t pt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingAnnouncement(announcement);
                      setEditForm({
                        title: announcement.title,
                        content: announcement.content,
                        important: announcement.important || false
                      });
                      setIsEditDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      setAnnouncementToDelete(announcement.id);
                      setDeleteDialogOpen(true);
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting && announcementToDelete === announcement.id ? "Deleting..." : "Delete"}
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Announcement</DialogTitle>
            <DialogDescription>
              Create a new announcement for the company. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-title">Title</Label>
              <Input
                id="create-title"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-content">Content</Label>
              <Textarea
                id="create-content"
                value={createForm.content}
                onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                placeholder="Announcement content"
                rows={5}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="create-important"
                checked={createForm.important}
                onCheckedChange={(checked) => setCreateForm({ ...createForm, important: checked })}
              />
              <Label htmlFor="create-important" className="cursor-pointer">Mark as important</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAnnouncement}
              disabled={isCreating || !createForm.title || !createForm.content}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : "Create Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>
              Update the announcement details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                placeholder="Announcement content"
                rows={5}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="important"
                checked={editForm.important}
                onCheckedChange={(checked) => setEditForm({ ...editForm, important: checked })}
              />
              <Label htmlFor="important" className="cursor-pointer">Mark as important</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isEditing}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditAnnouncement} 
              disabled={isEditing || !editForm.title || !editForm.content}
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAnnouncement}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
