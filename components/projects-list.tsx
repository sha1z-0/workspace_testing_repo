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
import { projectsAPI } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface Project {
  id: string
  name: string
  description: string
  status: "not_started" | "in_progress" | "completed"
  startDate: any
  endDate: any
  teamId?: string
  teamName?: string
}

interface ProjectsListProps {
  projects: Project[]
  onUpdate?: () => void
}

// Helper function to safely convert dates
const formatDate = (date: any) => {
  if (!date) return "N/A"
  if (date.toDate) return date.toDate().toLocaleDateString()
  if (date instanceof Date) return date.toLocaleDateString()
  return new Date(date).toLocaleDateString()
}

export function ProjectsList({ projects, onUpdate }: ProjectsListProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEdit = (project: Project) => {
    setSelectedProject(project)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) {
      return
    }

    try {
      setIsDeleting(true)
      await projectsAPI.delete(id)
      toast({
        title: "Success",
        description: "Project has been deleted successfully",
      })
      onUpdate?.()
    } catch (error) {
      console.error("Error deleting project:", error)
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject) return

    try {
      await projectsAPI.update(selectedProject.id, {
        name: selectedProject.name,
        description: selectedProject.description,
        status: selectedProject.status,
        startDate: selectedProject.startDate,
        endDate: selectedProject.endDate,
        teamId: selectedProject.teamId,
      })
      toast({
        title: "Success",
        description: "Project has been updated successfully",
      })
      setIsEditDialogOpen(false)
      onUpdate?.()
    } catch (error) {
      console.error("Error updating project:", error)
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      })
    }
  }

  if (projects.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <h3 className="font-medium">No projects yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first project to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card key={project.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base">{project.name}</CardTitle>
              <CardDescription>
                {project.teamName ? `Team: ${project.teamName} • ` : ""}
                {formatDate(project.startDate)} - {formatDate(project.endDate)}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(project)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(project.id)}
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
              <p className="text-sm text-muted-foreground">{project.description}</p>
              <Badge
                variant={
                  project.status === "completed"
                    ? "default"
                    : project.status === "in_progress"
                    ? "secondary"
                    : "outline"
                }
              >
                {project.status.replace("_", " ").charAt(0).toUpperCase() +
                  project.status.replace("_", " ").slice(1)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project details below.
            </DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <form onSubmit={handleUpdate}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={selectedProject.name}
                    onChange={(e) =>
                      setSelectedProject({ ...selectedProject, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={selectedProject.description}
                    onChange={(e) =>
                      setSelectedProject({ ...selectedProject, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={selectedProject.status}
                    onValueChange={(value: "not_started" | "in_progress" | "completed") =>
                      setSelectedProject({ ...selectedProject, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
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