"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
import { projectsAPI, usersAPI } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"
import { Loader2, Plus, X, FolderKanban } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (project: any) => void
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "planning",
    progress: 0,
    leadId: "",
    startDate: "",
    endDate: "",
  })
  const { user } = useAuth()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersData = await usersAPI.getAll()
        setUsers(usersData)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }

    if (open) {
      fetchUsers()
    }
  }, [open])

  const potentialLeads = users.filter(
    (u) => u.role === "CEO" || u.role === "C_LEVEL" || u.role === "LEAD"
  )

  const availableMembers = users.filter(
    (u) => !teamMembers.includes(u.uid)
  )

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      const lead = users.find(u => u.uid === (formData.leadId || user.id))
      
      const project = await projectsAPI.createProject({
        name: formData.name,
        description: formData.description,
        status: formData.status as any,
        progress: formData.progress,
        start_date: formData.startDate || new Date().toISOString().split('T')[0],
        end_date: formData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lead_id: formData.leadId || user.id,
        lead_name: lead?.name || user.name,
        team_members: teamMembers.length > 0 ? teamMembers : [user.id],
        created_by: user.id
      })
      
      toast({
        title: "Success",
        description: "Project has been created successfully",
      })
      
      onOpenChange(false)
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        status: "planning",
        progress: 0,
        leadId: "",
        startDate: "",
        endDate: "",
      })
      setTeamMembers([])
      
      onSuccess?.(project)
    } catch (error: any) {
      console.error("Error creating project:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to create project",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="space-y-2 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/20 flex items-center justify-center ring-2 ring-purple-500/30">
              <FolderKanban className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Create New Project</DialogTitle>
              <DialogDescription className="text-xs">
                Set up a new project and assign team members.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3.5 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-purple-500">•</span> Project Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Website Redesign, Product Launch"
                className="h-9 border-2 focus:ring-2 focus:ring-purple-500/20 transition-all"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-purple-500">•</span> Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project details and objectives"
                className="min-h-20 border-2 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="status" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-purple-500">•</span> Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status" className="h-9 border-2 focus:ring-2 focus:ring-purple-500/20">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="progress" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-purple-500">•</span> Progress (%)
              </Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                className="h-9 border-2 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="startDate" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-purple-500">•</span> Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="h-9 border-2 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="endDate" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-purple-500">•</span> End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="h-9 border-2 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-purple-500">•</span> Project Lead
              </Label>
              <Select
                value={formData.leadId}
                onValueChange={(value) => setFormData({ ...formData, leadId: value })}
              >
                <SelectTrigger id="lead" className="h-9 border-2 focus:ring-2 focus:ring-purple-500/20">
                  <SelectValue placeholder="Select project lead" />
                </SelectTrigger>
                <SelectContent>
                  {potentialLeads.map(lead => (
                    <SelectItem key={lead.uid} value={lead.uid}>
                      {lead.name} ({lead.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-purple-500">•</span> Team Members
              </Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !teamMembers.includes(value)) {
                    setTeamMembers([...teamMembers, value])
                  }
                }}
              >
                <SelectTrigger className="h-9 border-2 focus:ring-2 focus:ring-purple-500/20">
                  <SelectValue placeholder="Add team members" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map(member => (
                    <SelectItem key={member.uid} value={member.uid}>
                      {member.name} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teamMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 p-3 rounded-lg bg-muted/30 border border-muted">
                  {teamMembers.map((memberId) => {
                    const member = users.find(u => u.uid === memberId)
                    return (
                      <Badge
                        key={memberId}
                        variant="secondary"
                        className="flex items-center gap-1 pl-1 border"
                      >
                        <Avatar className="h-6 w-6">
                          {member?.avatar && member.avatar !== "/placeholder.svg" && (
                            <AvatarImage src={member.avatar} />
                          )}
                          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary to-blue-600 text-white">
                            {member ? getInitials(member.name) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member?.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 ml-1"
                          onClick={() => setTeamMembers(teamMembers.filter(id => id !== memberId))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-3 border-t border-border/50">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9 border-2 hover:bg-muted"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="h-9 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 