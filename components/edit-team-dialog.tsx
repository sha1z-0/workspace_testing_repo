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
import { teamsAPI, departmentsAPI, usersAPI } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { X, Loader2 } from "lucide-react"

interface Department {
  id: string
  name: string
}

interface Team {
  id: string
  name: string
  description: string
  department: string
  leaderId?: string
  leaderName?: string
  members: any[]
}

interface EditTeamDialogProps {
  team: Team | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (team: Team) => void
}

export function EditTeamDialog({
  team,
  open,
  onOpenChange,
  onSuccess,
}: EditTeamDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    department: "",
    leaderId: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [depts, usersData] = await Promise.all([
          departmentsAPI.getAll(),
          usersAPI.getAll()
        ])
        setDepartments(depts)
        setUsers(usersData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to fetch data",
          variant: "destructive",
        })
      }
    }
    if (open) {
      fetchData()
    }
  }, [open])

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description,
        department: team.department,
        leaderId: team.leaderId || "",
      })
      // Set initial team members (array of user IDs)
      setTeamMembers(team.members?.map((m: any) => m.uid || m.id || m) || [])
    }
  }, [team])

  const potentialLeaders = users.filter(
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
    if (!team) return

    setIsSubmitting(true)
    try {
      const leader = users.find(u => u.uid === formData.leaderId)
      
      await teamsAPI.update(team.id, {
        name: formData.name,
        description: formData.description,
        department: formData.department,
        leader_id: formData.leaderId,
        leader_name: leader?.name || "",
        members: teamMembers,
      })
      
      toast({
        title: "Success",
        description: "Team has been updated successfully",
      })
      
      onSuccess?.({
        ...team,
        ...formData,
        leaderId: formData.leaderId,
        leaderName: leader?.name || "",
        members: teamMembers.map(id => users.find(u => u.uid === id)).filter(Boolean),
      })
      
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating team:", error)
      toast({
        title: "Error",
        description: "Failed to update team",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update team details and manage team members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) =>
                  setFormData({ ...formData, department: value })
                }
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leader">Team Leader</Label>
              <Select
                value={formData.leaderId}
                onValueChange={(value) =>
                  setFormData({ ...formData, leaderId: value })
                }
              >
                <SelectTrigger id="leader">
                  <SelectValue placeholder="Select team leader" />
                </SelectTrigger>
                <SelectContent>
                  {potentialLeaders.map((leader) => (
                    <SelectItem key={leader.uid} value={leader.uid}>
                      {leader.name} ({leader.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Team Members</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !teamMembers.includes(value)) {
                    setTeamMembers([...teamMembers, value])
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add team members" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.uid} value={member.uid}>
                      {member.name} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teamMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {teamMembers.map((memberId) => {
                    const member = users.find((u) => u.uid === memberId)
                    return (
                      <Badge
                        key={memberId}
                        variant="secondary"
                        className="flex items-center gap-1 pl-1"
                      >
                        <Avatar className="h-6 w-6">
                          {member?.avatar && member.avatar !== "/placeholder.svg" && (
                            <AvatarImage src={member.avatar} />
                          )}
                          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary to-blue-600 text-white">
                            {member ? getInitials(member.name) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member?.name || "Unknown"}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 ml-1"
                          onClick={() =>
                            setTeamMembers(teamMembers.filter((id) => id !== memberId))
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 