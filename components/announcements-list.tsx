"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { announcementsAPI } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface Announcement {
  id: string
  title: string
  content: string
  priority: "low" | "medium" | "high"
  authorName: string
  createdAt: any
}

interface AnnouncementsListProps {
  announcements: Announcement[]
  onUpdate?: () => void
}

// Helper function to safely format dates
const formatDate = (date: any) => {
  if (!date) return "N/A"
  if (date.toDate) return date.toDate().toLocaleDateString()
  if (date instanceof Date) return date.toLocaleDateString()
  return new Date(date).toLocaleDateString()
}

export function AnnouncementsList({ announcements, onUpdate }: AnnouncementsListProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) {
      return
    }

    try {
      setIsDeleting(true)
      await announcementsAPI.delete(id)
      toast({
        title: "Success",
        description: "Announcement has been deleted successfully",
      })
      onUpdate?.()
    } catch (error) {
      console.error("Error deleting announcement:", error)
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAnnouncement) return

    try {
      await announcementsAPI.update(selectedAnnouncement.id, {
        title: selectedAnnouncement.title,
        content: selectedAnnouncement.content,
        priority: selectedAnnouncement.priority,
      })
      toast({
        title: "Success",
        description: "Announcement has been updated successfully",
      })
      setIsEditDialogOpen(false)
      onUpdate?.()
    } catch (error) {
      console.error("Error updating announcement:", error)
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive",
      })
    }
  }

  if (announcements.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <h3 className="font-medium">No announcements yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first announcement to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Card key={announcement.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base">{announcement.title}</CardTitle>
              <CardDescription>
                By {announcement.authorName} •{" "}
                {formatDate(announcement.createdAt)}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(announcement)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(announcement.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{announcement.content}</p>
              <Badge
                variant={
                  announcement.priority === "high"
                    ? "destructive"
                    : announcement.priority === "medium"
                    ? "default"
                    : "secondary"
                }
              >
                {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)} Priority
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>
              Update the announcement details below.
            </DialogDescription>
          </DialogHeader>
          {selectedAnnouncement && (
            <form onSubmit={handleUpdate}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={selectedAnnouncement.title}
                    onChange={(e) =>
                      setSelectedAnnouncement({ ...selectedAnnouncement, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={selectedAnnouncement.content}
                    onChange={(e) =>
                      setSelectedAnnouncement({ ...selectedAnnouncement, content: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={selectedAnnouncement.priority}
                    onValueChange={(value: "low" | "medium" | "high") =>
                      setSelectedAnnouncement({ ...selectedAnnouncement, priority: value })
                    }
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 