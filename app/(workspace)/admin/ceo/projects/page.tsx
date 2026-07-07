"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { projectsAPI, usersAPI } from "@/lib/api"
import { useEffect, useState } from "react"
import { Loader2, Plus, Search, Filter, Calendar, Users, BarChart, Pencil, Trash2, FolderPlus, TrendingUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProjectManagementPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [createError, setCreateError] = useState("")
  
  // Team members state
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  
  // New project form state
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "planning",
    progress: 0,
    leadId: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          // Get all projects and users
          const [projectsData, usersData] = await Promise.all([
            projectsAPI.getAll(),
            usersAPI.getAll()
          ])
          
          setProjects(projectsData)
          setUsers(usersData)
        } catch (error) {
          console.error("Error fetching data:", error)
          toast({
            title: "Error",
            description: "Failed to load projects data",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }
    }

    fetchData()
  }, [user?.id])

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    return matchesSearch && matchesStatus
  })
  
  // Get potential project leads (LEAD or C_LEVEL users)
  const potentialLeads = users.filter(u => 
    u.role === "LEAD" || u.role === "C_LEVEL" || u.role === "CEO"
  )
  
  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400"
      case "in_progress":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:text-yellow-400"
      case "completed":
        return "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400"
      case "on_hold":
        return "bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400"
      case "cancelled":
        return "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400"
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400"
    }
  }

  const getProjectLead = (leadId: string) => {
    const lead = users.find((u) => u.uid === leadId)
    return lead ? lead.name : "Unassigned"
  }
  
  const handleCreateProject = async () => {
    if (!user) return
    
    try {
      setIsCreatingProject(true)
      setCreateError("")
      
      // Validate input
      if (!newProject.name.trim()) {
        setCreateError("Project name is required")
        setIsCreatingProject(false)
        return
      }
      
      const lead = users.find(u => u.uid === (newProject.leadId || user.id));
      // Add project
      await projectsAPI.createProject({
        name: newProject.name,
        description: newProject.description,
        status: newProject.status as any,
        progress: parseInt(newProject.progress.toString()) || 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lead_id: newProject.leadId || user.id,
        lead_name: lead?.name || user.name,
        team_members: teamMembers.length > 0 ? teamMembers : [user.id],
        created_by: user.id
      })
      
      // Show success message
      toast({
        title: "Project Created",
        description: `Project "${newProject.name}" has been created successfully.`,
      })
      
      // Reset form and close dialog
      setNewProject({
        name: "",
        description: "",
        status: "planning",
        progress: 0,
        leadId: "",
      })
      setTeamMembers([])
      setIsCreateDialogOpen(false)
      
      // Refresh projects
      const projectsData = await projectsAPI.getAll()
      setProjects(projectsData)
      
    } catch (error: any) {
      console.error("Error creating project:", error)
      setCreateError(error.message || "Failed to create project")
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      })
    } finally {
      setIsCreatingProject(false)
    }
  }
  
  const handleEditProject = async () => {
    if (!user || !selectedProject) return
    
    try {
      await projectsAPI.updateProject(selectedProject.id, {
        name: selectedProject.name,
        description: selectedProject.description,
        status: selectedProject.status as any,
        progress: parseInt(selectedProject.progress.toString()) || 0,
        lead_id: selectedProject.leadId,
        team_members: selectedProject.teamMembers
      })
      
      // Close dialog
      setIsEditDialogOpen(false)
      setSelectedProject(null)
      
      toast({
        title: "Project Updated",
        description: `Project "${selectedProject.name}" has been updated.`,
      })
      
      // Refresh projects
      const projectsData = await projectsAPI.getAll()
      setProjects(projectsData)
      
    } catch (error: any) {
      console.error("Error updating project:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      })
    }
  }
  
  const handleDeleteProject = async (projectId: string) => {
    if (!user) return
    
    try {
      await projectsAPI.deleteProject(projectId)
      
      toast({
        title: "Project Deleted",
        description: "Project has been deleted successfully.",
      })
      
      // Update local state
      setProjects(projects.filter(project => project.id !== projectId))
      
    } catch (error: any) {
      console.error("Error deleting project:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  const containerVariants: import("framer-motion").Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants: import("framer-motion").Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50 } }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 p-1"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-blue-600 p-8 text-white shadow-xl ring-1 ring-white/10 dark:from-blue-900 dark:to-slate-900">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-white/20 backdrop-blur-sm border border-white/10">
              <FolderPlus className="h-4 w-4" />
              <span className="text-sm font-semibold">Project Portfolio</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">
              Project Management
            </h1>
            <p className="text-blue-100/90 text-lg max-w-xl">
              Manage {filteredProjects.length} active projects with <span className="font-semibold text-white">{users.length} team members</span> collaboration.
            </p>
          </div>
          <Button size="lg" onClick={() => setIsCreateDialogOpen(true)} className="bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
            <Plus className="mr-2 h-5 w-5" />
            <span className="font-semibold">New Project</span>
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          <Card className="border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:border-blue-500/50">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <FolderPlus className="w-24 h-24 text-blue-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FolderPlus className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1 text-blue-500" />
                Across all statuses
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          <Card className="border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:border-green-500/50">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <BarChart className="w-24 h-24 text-green-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <BarChart className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-2xl font-bold">{projects.filter(p => p.status === 'in_progress').length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently active
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          <Card className="border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:border-purple-500/50">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <Users className="w-24 h-24 text-purple-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Available for projects
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <motion.div variants={itemVariants} className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search projects by name or description..."
            className="pl-12 h-12 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border-white/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-10 border-2">
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
      </motion.div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <FolderPlus className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No projects found</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                {searchQuery || statusFilter !== "all" ? "Try adjusting your search or filter" : "Create a new project to get started"}
              </p>
              {(searchQuery || statusFilter !== "all") && (
                <Button variant="outline" onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}>
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              variants={itemVariants}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <Card className="h-full border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 transition-all duration-300 hover:shadow-xl hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <Badge className={`${getStatusColor(project.status)} font-medium mb-2`}>
                        {project.status.replace("_", " ")}
                      </Badge>
                      <CardTitle className="text-xl truncate">{project.name}</CardTitle>
                      <CardDescription className="mt-1.5 line-clamp-2">
                        {project.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedProject({...project, teamMembers: project.teamMembers || []});
                          setIsEditDialogOpen(true);
                        }}
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 transition-all">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <strong>"{project.name}"</strong>? 
                              This action cannot be undone and will remove all associated tasks.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProject(project.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-3">
                  {/* Start Date */}
                  <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Started</p>
                      <p className="text-sm font-semibold truncate">
                        {project.startDate ? new Date(project.startDate).toLocaleDateString() : "Not set"}
                      </p>
                    </div>
                  </div>

                  {/* Project Lead */}
                  <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Project Lead</p>
                      <p className="text-sm font-semibold truncate">{getProjectLead(project.leadId)}</p>
                    </div>
                  </div>
                  
                  {/* Progress */}
                  <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Progress</span>
                      <span className="text-sm font-bold text-primary">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-1.5" />
                  </div>

                  {/* Team Members */}
                  {project.teamMembers && Array.isArray(project.teamMembers) && project.teamMembers.length > 0 && (
                    <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60">
                      <p className="text-xs text-muted-foreground mb-2">Team Members ({project.teamMembers.length})</p>
                      <div className="flex -space-x-2">
                        {project.teamMembers.slice(0, 5).map((memberId: string, idx: number) => {
                          const member = users.find((u) => u.uid === memberId)
                          return (
                            <Avatar key={idx} className="h-8 w-8 border-2 border-white dark:border-slate-800 ring-2 ring-primary/20 shadow-sm">
                              {member?.avatar && member.avatar !== "/placeholder.svg" && (
                                <AvatarImage src={member.avatar} />
                              )}
                              <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary to-blue-600 text-white">{member ? getInitials(member.name) : "?"}</AvatarFallback>
                            </Avatar>
                          )
                        })}
                        {project.teamMembers.length > 5 && (
                          <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-800 bg-gradient-to-br from-primary/20 to-blue-600/20 flex items-center justify-center ring-2 ring-primary/20 shadow-sm">
                            <span className="text-xs font-bold text-primary">+{project.teamMembers.length - 5}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
        
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[520px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-500/20 flex items-center justify-center ring-2 ring-blue-500/30">
                <FolderPlus className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Create Project</DialogTitle>
                <DialogDescription className="text-xs">
                  Add a new project and assign team members.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="grid gap-3.5 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-blue-500">•</span> Project Name
              </Label>
              <Input
                id="name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="e.g. Website Redesign, Product Launch"
                className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-blue-500">•</span> Description
              </Label>
              <Textarea
                id="description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Project details and objectives"
                rows={3}
                className="border-2 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="status" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-blue-500">•</span> Status
              </Label>
              <Select
                value={newProject.status}
                onValueChange={(value) => setNewProject({ ...newProject, status: value })}
              >
                <SelectTrigger className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20">
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
                <span className="text-blue-500">•</span> Progress (%)
              </Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={newProject.progress}
                onChange={(e) => setNewProject({ ...newProject, progress: parseInt(e.target.value) || 0 })}
                className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-blue-500">•</span> Project Lead
              </Label>
              <Select
                value={newProject.leadId}
                onValueChange={(value) => setNewProject({ ...newProject, leadId: value })}
              >
                <SelectTrigger className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20">
                  <SelectValue placeholder="Select project lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {potentialLeads.map(lead => (
                      <SelectItem key={lead.uid} value={lead.uid}>
                        {lead.name} ({lead.role === "LEAD" ? "Team Lead" : lead.role === "CEO" ? "CEO" : "C-Level"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="teamMembers" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-blue-500">•</span> Team Members
              </Label>
              <Select
                onValueChange={(value) => {
                  if (!teamMembers.includes(value)) {
                    setTeamMembers([...teamMembers, value]);
                  }
                }}
              >
                <SelectTrigger className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20">
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
                            {member?.avatar && member.avatar !== "/placeholder.svg" && (
                              <AvatarImage src={member.avatar} />
                            )}
                            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary to-blue-600 text-white">{member ? getInitials(member.name) : "?"}</AvatarFallback>
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
        
        {createError && (
          <div className="text-sm font-medium text-destructive mb-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">{createError}</div>
        )}
        
        <DialogFooter className="gap-2 pt-3 border-t border-border/50">
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreatingProject} className="h-9 border-2 hover:bg-muted">
            Cancel
          </Button>
          <Button 
            onClick={handleCreateProject} 
            disabled={isCreatingProject || !newProject.name.trim()}
            className="h-9 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all"
          >
            {isCreatingProject ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      
      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-orange-500/20 flex items-center justify-center ring-2 ring-orange-500/30">
                <Pencil className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Edit Project</DialogTitle>
                <DialogDescription className="text-xs">
                  Update project information and team members.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedProject && (
            <div className="grid gap-3.5 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-name" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-orange-500">•</span> Project Name
                </Label>
                <Input
                  id="edit-name"
                  value={selectedProject.name}
                  onChange={(e) => setSelectedProject({ ...selectedProject, name: e.target.value })}
                  className="h-9 border-2 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-description" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-orange-500">•</span> Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={selectedProject.description}
                  onChange={(e) => setSelectedProject({ ...selectedProject, description: e.target.value })}
                  rows={3}
                  className="border-2 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-status" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-orange-500">•</span> Status
                </Label>
                <Select
                  value={selectedProject.status}
                  onValueChange={(value) => setSelectedProject({ ...selectedProject, status: value })}
                >
                  <SelectTrigger className="h-9 border-2 focus:ring-2 focus:ring-orange-500/20">
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
                <Label htmlFor="edit-progress" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-orange-500">•</span> Progress (%)
                </Label>
                <Input
                  id="edit-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={selectedProject.progress}
                  onChange={(e) => setSelectedProject({ ...selectedProject, progress: parseInt(e.target.value) || 0 })}
                  className="h-9 border-2 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-lead" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-orange-500">•</span> Project Lead
                </Label>
                <Select
                  value={selectedProject.leadId}
                  onValueChange={(value) => setSelectedProject({ ...selectedProject, leadId: value })}
                >
                  <SelectTrigger className="h-9 border-2 focus:ring-2 focus:ring-orange-500/20">
                    <SelectValue placeholder="Select project lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {potentialLeads.map(lead => (
                      <SelectItem key={lead.uid} value={lead.uid}>
                        {lead.name} ({lead.role === "LEAD" ? "Team Lead" : lead.role === "CEO" ? "CEO" : "C-Level"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-team" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-orange-500">•</span> Team Members
                </Label>
                <Select
                  onValueChange={(value) => {
                    if (!selectedProject.teamMembers.includes(value)) {
                      setSelectedProject({
                        ...selectedProject,
                        teamMembers: [...selectedProject.teamMembers, value]
                      });
                    }
                  }}
                >
                  <SelectTrigger className="h-9 border-2 focus:ring-2 focus:ring-orange-500/20">
                    <SelectValue placeholder="Add team members" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProject.teamMembers?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedProject.teamMembers.map((memberId: string) => {
                      const member = users.find(u => u.uid === memberId);
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
                            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary to-blue-600 text-white">{member ? getInitials(member.name) : "?"}</AvatarFallback>
                          </Avatar>
                          <span>{member?.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 ml-1"
                            onClick={() => setSelectedProject({
                              ...selectedProject,
                              teamMembers: selectedProject.teamMembers.filter((id: string) => id !== memberId)
                            })}
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
          )}
          
          <DialogFooter className="gap-2 pt-3 border-t border-border/50">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-9 border-2 hover:bg-muted">
              Cancel
            </Button>
            <Button 
              onClick={handleEditProject}
              disabled={!selectedProject || !selectedProject.name.trim()}
              className="h-9 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
} 