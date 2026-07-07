"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usersAPI, projectsAPI, tasksAPI, announcementsAPI } from "@/lib/api"
import { useEffect, useState } from "react"
import { Loader2, AlertTriangle, Users, CheckSquare, Briefcase, Megaphone, Plus } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { useSearchParams } from "next/navigation"

export default function CEOAdminDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "departments"
  
  // Announcement dialog state
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false)
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false)
  const [announcementError, setAnnouncementError] = useState("")
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    priority: "medium" as "low" | "medium" | "high"
  })

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const [usersData, projectsData, tasksData, announcementsData] = await Promise.all([
            usersAPI.getAll(),
            projectsAPI.getAll(),
            tasksAPI.getUserTasks(user.id, user.role),
            announcementsAPI.getAll()
          ])

          setUsers(usersData)
          setProjects(projectsData)
          setTasks(tasksData)
          setAnnouncements(announcementsData)
        } catch (error) {
          console.error("Error fetching data:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Create announcement handler
  const handleCreateAnnouncement = async () => {
    if (!user) return;
    
    try {
      setIsCreatingAnnouncement(true);
      setAnnouncementError("");
      
      // Validate input
      if (!newAnnouncement.title.trim()) {
        setAnnouncementError("Title is required");
        setIsCreatingAnnouncement(false);
        return;
      }
      
      if (!newAnnouncement.content.trim()) {
        setAnnouncementError("Content is required");
        setIsCreatingAnnouncement(false);
        return;
      }
      
      // Create announcement
      await announcementsAPI.create({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        priority: newAnnouncement.priority,
        createdBy: user.id,
        createdByName: user.name
      });
      
      // Show success message
      toast({
        title: "Announcement Created",
        description: "Your announcement has been sent to all users.",
      });
      
      // Reset form and close dialog
      setNewAnnouncement({
        title: "",
        content: "",
        priority: "medium"
      });
      setIsCreateAnnouncementOpen(false);
      
      // Refresh announcements
      const freshAnnouncements = await announcementsAPI.getAll();
      setAnnouncements(freshAnnouncements);
      
    } catch (error: any) {
      console.error("Error creating announcement:", error);
      setAnnouncementError(error.message || "Failed to create announcement");
      toast({
        title: "Error",
        description: error.message || "Failed to create announcement",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAnnouncement(false);
    }
  };

  // Calculate KPIs
  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.status === "active").length
  const totalProjects = projects.length
  const completedProjects = projects.filter((p) => p.status === "completed").length
  const inProgressProjects = projects.filter((p) => p.status === "in_progress").length
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === "completed").length
  const overdueTasks = tasks.filter((t) => {
    const dt = t.dueDatetime || t.dueDate
    if (!dt) return false
    const dueDate = new Date(dt)
    const today = new Date()
    return dueDate < today && t.status !== "completed"
  }).length

  const projectCompletionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Department statistics
  const departments = [...new Set(users.map((u) => u.department || "General"))]
  const departmentStats = departments.map((dept) => {
    const deptUsers = users.filter((u) => (u.department || "General") === dept)
    const deptTasks = tasks.filter((t) => {
      const deptUserUids = deptUsers.map((u) => u.uid)
      return t.assigneeIds?.some((id: string) => deptUserUids.includes(id))
    })
    const deptCompletedTasks = deptTasks.filter((t) => t.status === "completed").length
    const deptCompletionRate = deptTasks.length > 0 ? Math.round((deptCompletedTasks / deptTasks.length) * 100) : 0

    return {
      name: dept,
      userCount: deptUsers.length,
      taskCount: deptTasks.length,
      completedTasks: deptCompletedTasks,
      completionRate: deptCompletionRate,
    }
  })

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-blue-600 p-8 text-white shadow-xl ring-1 ring-white/10 dark:from-blue-900 dark:to-slate-900">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">CEO Administration Dashboard</h1>
            <p className="text-indigo-100 max-w-xl text-lg">
              Complete company overview and management
            </p>
          </div>
            <Dialog open={isCreateAnnouncementOpen} onOpenChange={setIsCreateAnnouncementOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg bg-white text-indigo-600 hover:bg-indigo-50 border-none">
                <Megaphone className="mr-2 h-5 w-5" />
                Create Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
              <DialogHeader className="space-y-2 pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-orange-500/20 flex items-center justify-center ring-2 ring-orange-500/30">
                    <Megaphone className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">Create Company Announcement</DialogTitle>
                    <DialogDescription className="text-xs">
                      This announcement will be sent to all users in the organization.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="grid gap-3.5 py-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="title" className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="text-orange-500">•</span> Announcement Title
                  </Label>
                  <Input
                    id="title"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="Enter announcement title"
                    className="h-9 border-2 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="content" className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="text-orange-500">•</span> Announcement Content
                  </Label>
                  <Textarea
                    id="content"
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    placeholder="Enter announcement details"
                    className="min-h-24 border-2 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none"
                    rows={5}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="priority" className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="text-orange-500">•</span> Priority
                  </Label>
                  <Select
                    value={newAnnouncement.priority}
                    onValueChange={(value: "low" | "medium" | "high") => setNewAnnouncement({ ...newAnnouncement, priority: value })}
                  >
                    <SelectTrigger id="priority" className="h-9 border-2 focus:ring-2 focus:ring-orange-500/20">
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
              <DialogFooter className="gap-2 pt-3 border-t border-border/50">
                {announcementError && (
                  <p className="text-sm text-red-500 mb-2 w-full">{announcementError}</p>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateAnnouncementOpen(false)} 
                  disabled={isCreatingAnnouncement}
                  className="h-9 border-2 hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateAnnouncement} 
                  disabled={isCreatingAnnouncement || !newAnnouncement.title.trim() || !newAnnouncement.content.trim()}
                  className="h-9 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  {isCreatingAnnouncement ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Megaphone className="mr-2 h-4 w-4" />
                      Send Announcement
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
        <Card className="border-2 border-green-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center ring-1 ring-green-500/30">
              <Users className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {activeUsers} / {totalUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{Math.round((activeUsers / totalUsers) * 100)}% active</p>
          </CardContent>
        </Card>
        </div>
        <div>
        <Card className="border-2 border-blue-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Project Completion</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/30">
              <Briefcase className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {completedProjects} / {totalProjects}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{projectCompletionRate}% completed</p>
          </CardContent>
        </Card>
        </div>
        <div>
        <Card className="border-2 border-purple-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/30">
              <CheckSquare className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {completedTasks} / {totalTasks}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{taskCompletionRate}% completed</p>
          </CardContent>
        </Card>
        </div>
        <div>
        <Card className="border-2 border-red-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-red-500/20 hover:border-red-500/40 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center ring-1 ring-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0}% of all tasks
            </p>
          </CardContent>
        </Card>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="bg-card/30 dark:bg-slate-900/30 p-1.5 rounded-2xl backdrop-blur-xl border border-border/50 w-full md:w-auto inline-flex h-auto gap-2">
          <TabsTrigger value="departments" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium">Departments</TabsTrigger>
          <TabsTrigger value="projects" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium">Projects</TabsTrigger>
          <TabsTrigger value="users" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium">Users</TabsTrigger>
          <TabsTrigger value="announcements" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium">Announcements</TabsTrigger>
        </TabsList>
        <TabsContent value="departments" className="mt-0">
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Department Performance</CardTitle>
              <CardDescription>Task completion rates by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {departmentStats.map((dept) => (
                  <div key={dept.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{dept.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {dept.completedTasks} / {dept.taskCount} tasks
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Progress value={dept.completionRate} className="h-2 flex-1" />
                      <div className="w-10 text-right text-sm font-medium">{dept.completionRate}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="projects" className="mt-0">
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Project Status</CardTitle>
              <CardDescription>Overview of all company projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.slice(0, 5).map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">Status: {project.status.replace("_", " ")}</div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Progress value={project.progress} className="h-2 flex-1" />
                      <div className="w-10 text-right text-sm font-medium">{project.progress}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users" className="mt-0">
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl">User Overview</CardTitle>
              <CardDescription>Summary of user accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border-2 border-green-500/30 bg-gradient-to-br from-green-500/20 to-emerald-500/10 p-4 backdrop-blur-sm shadow-lg">
                    <div className="text-sm font-medium text-muted-foreground">Total Users</div>
                    <div className="text-3xl font-bold mt-2">{totalUsers}</div>
                  </div>
                  <div className="rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 p-4 backdrop-blur-sm shadow-lg">
                    <div className="text-sm font-medium text-muted-foreground">Active Users</div>
                    <div className="text-3xl font-bold mt-2">{activeUsers}</div>
                  </div>
                  <div className="rounded-xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/10 p-4 backdrop-blur-sm shadow-lg">
                    <div className="text-sm font-medium text-muted-foreground">Administrators</div>
                    <div className="text-3xl font-bold mt-2">
                      {users.filter((u) => u.role === "CEO" || u.role === "C_LEVEL").length}
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/20 to-yellow-500/10 p-4 backdrop-blur-sm shadow-lg">
                    <div className="text-sm font-medium text-muted-foreground">Team Leads</div>
                    <div className="text-3xl font-bold mt-2">{users.filter((u) => u.role === "LEAD").length}</div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <h3 className="text-lg font-semibold mb-4">Task Assignment Overview</h3>
                  <div className="rounded-xl border-2 border-border/50 overflow-hidden shadow-lg">
                    <div className="grid grid-cols-12 bg-muted px-4 py-3 text-sm font-medium">
                      <div className="col-span-4">User</div>
                      <div className="col-span-2 text-center">Total Tasks</div>
                      <div className="col-span-2 text-center">Completed</div>
                      <div className="col-span-2 text-center">In Progress</div>
                      <div className="col-span-2 text-center">Completion Rate</div>
                    </div>
                    <div className="divide-y">
                      {users
                        .sort((a, b) => {
                          const aTaskCount = tasks.filter(t => t.assigneeId === a.uid).length;
                          const bTaskCount = tasks.filter(t => t.assigneeId === b.uid).length;
                          return bTaskCount - aTaskCount; // Sort by task count, descending
                        })
                        .map((user) => {
                          const userTasks = tasks.filter(t => t.assigneeId === user.uid);
                          const totalTasks = userTasks.length;
                          const completedTasks = userTasks.filter(t => t.status === "completed").length;
                          const inProgressTasks = userTasks.filter(t => t.status === "in_progress").length;
                          const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                          
                          return (
                            <div key={user.uid} className="grid grid-cols-12 px-4 py-3 text-sm">
                              <div className="col-span-4 flex items-center">
                                <div>
                                  <div>{user.name}</div>
                                  <div className="text-xs text-muted-foreground">{user.department || "General"} - {user.role}</div>
                                </div>
                              </div>
                              <div className="col-span-2 text-center">{totalTasks}</div>
                              <div className="col-span-2 text-center">{completedTasks}</div>
                              <div className="col-span-2 text-center">{inProgressTasks}</div>
                              <div className="col-span-2 text-center flex items-center justify-center">
                                <div className="w-full max-w-24">
                                  <div className="flex items-center justify-between">
                                    <Progress value={completionRate} className="h-1.5 w-16" />
                                    <span className="text-xs ml-2">{completionRate}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="announcements" className="mt-0">
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Company Announcements</CardTitle>
              <CardDescription>Recent announcements sent to the organization</CardDescription>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-8 text-center">
                  <div className="p-3 bg-primary/10 rounded-full mb-3">
                    <Megaphone className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground">No announcements have been created yet.</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateAnnouncementOpen(true)}
                    className="mt-4 border-2"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Announcement
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {announcements.map((announcement) => {
                    // Format timestamp if it exists
                    const timestamp = announcement.createdAt ? 
                      new Date(announcement.createdAt).toLocaleString() : 
                      'Unknown';
                      
                    // Get read count
                    const readCount = announcement.read?.length || 0;
                    const readPercentage = users.length > 0 ? 
                      Math.round((readCount / users.length) * 100) : 0;
                    
                    return (
                      <div 
                        key={announcement.id} 
                        className="border-2 border-primary/20 rounded-xl p-5 space-y-3 bg-gradient-to-r from-primary/5 to-transparent backdrop-blur-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{announcement.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              Posted by {announcement.authorName || 'Unknown'} • {timestamp}
                            </p>
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
                            {announcement.priority}
                          </Badge>
                        </div>
                        
                        <p className="text-sm whitespace-pre-line">{announcement.content}</p>
                        
                        <div className="flex justify-between items-center pt-2">
                          <div className="text-xs text-muted-foreground">
                            Read by {readCount} of {users.length} users ({readPercentage}%)
                          </div>
                          <Progress value={readPercentage} className="h-1.5 w-32" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
