"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { projectsAPI, usersAPI } from "@/lib/api"
import type { FirebaseProject } from "@/lib/firebase-types"
import { useEffect, useState } from "react"
import { Loader2, Plus, Search, Filter, Calendar, Users, BarChart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<(FirebaseProject & { id: string })[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "planning",
    progress: 0,
    leadId: "",
  })

    const fetchData = async () => {
      if (user) {
        try {
          const [projectsData, usersData] = await Promise.all([projectsAPI.getAll(), usersAPI.getAll()])
          setProjects(projectsData)
          setUsers(usersData)
        } catch (error) {
          console.error("Error fetching data:", error)
        } finally {
          setLoading(false)
        }
      }
    }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleCreateProject = async () => {
    if (!user) return;
    
    try {
      setIsAddingProject(true);
      
      const lead = users.find(u => u.uid === (newProject.leadId || user.id));
      await projectsAPI.createProject({
        name: newProject.name,
        description: newProject.description,
        status: newProject.status as any,
        progress: newProject.progress,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lead_id: newProject.leadId || user.id,
        lead_name: lead?.name || user.name,
        team_members: teamMembers.length > 0 ? teamMembers : [user.id],
        created_by: user.id
      });
      
      // Reset form
      setNewProject({
        name: "",
        description: "",
        status: "planning",
        progress: 0,
        leadId: "",
      });
      setTeamMembers([]);
      
      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
      });
      
      // Refresh projects list
      await fetchData();
      setIsProjectDialogOpen(false);
      
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingProject(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-blue-500"
      case "in_progress":
        return "bg-yellow-500"
      case "completed":
        return "bg-green-500"
      case "on_hold":
        return "bg-orange-500"
      case "cancelled":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getProjectLead = (leadId: string) => {
    const lead = users.find((u) => u.uid === leadId)
    return lead ? lead.name : "Unassigned"
  }

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
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
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground">Manage your projects and track progress</p>
        </div>
        <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
          <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project and assign team members
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name</Label>
                <Input 
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  placeholder="Enter project name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={newProject.status}
                  onValueChange={(value) => setNewProject({...newProject, status: value})}
                >
                  <SelectTrigger>
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
              <div className="grid gap-2">
                <Label htmlFor="lead">Project Lead</Label>
                <Select 
                  value={newProject.leadId}
                  onValueChange={(value) => setNewProject({...newProject, leadId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={user!.id}>Me ({user?.name})</SelectItem>
                    {users.filter(u => u.uid !== user?.id).map(u => (
                      <SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teamMembers">Team Members</Label>
                <Select 
                  onValueChange={(value) => {
                    if (!teamMembers.includes(value)) {
                      setTeamMembers([...teamMembers, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add team members" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teamMembers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {teamMembers.map(memberId => {
                      const member = users.find(u => u.uid === memberId);
                      return (
                        <Badge
                          key={memberId}
                          variant="secondary"
                          className="flex items-center gap-1 pl-1"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member?.avatar || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs">{member ? getInitials(member.name) : "?"}</AvatarFallback>
                          </Avatar>
                          <span>{member?.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 ml-1"
                            onClick={() => setTeamMembers(teamMembers.filter(id => id !== memberId))}
                          >
                            ×
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreateProject}
                disabled={!newProject.name || !newProject.description || isAddingProject}
              >
                {isAddingProject ? (
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
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
          <h3 className="font-medium">No projects found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filter"
              : "Create a new project to get started"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge className={`${getStatusColor(project.status)} text-white`}>
                    {project.status.replace("_", " ")}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2">{project.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="font-medium">Start: </span>
                      {new Date(project.startDate).toLocaleDateString()}
                      {project.endDate && (
                        <>
                          <span className="mx-1">•</span>
                          <span className="font-medium">End: </span>
                          {new Date(project.endDate).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="font-medium">Lead: </span>
                      {getProjectLead(project.leadId)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-1 items-center">
                      <Progress value={project.progress} className="h-2 flex-1" />
                      <span className="ml-2 text-xs text-muted-foreground">{project.progress}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="flex -space-x-2">
                  {project.teamMembers.slice(0, 3).map((memberId, index) => {
                    const member = users.find((u) => u.uid === memberId)
                    return (
                      <Avatar key={index} className="border-2 border-background">
                        <AvatarImage src={member?.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{member ? getInitials(member.name) : "U"}</AvatarFallback>
                      </Avatar>
                    )
                  })}
                  {project.teamMembers.length > 3 && (
                    <Avatar className="border-2 border-background">
                      <AvatarFallback>+{project.teamMembers.length - 3}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
