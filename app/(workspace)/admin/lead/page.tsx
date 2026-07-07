"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { tasksAPI, teamsAPI, announcementsAPI } from "@/lib/api"
import { useEffect, useState } from "react"
import { Loader2, CheckSquare, AlertTriangle, Clock, Users, Calendar, BarChart3, Plus, Bell } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { FirebaseTask } from "@/lib/firebase-types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

interface TeamMember {
  id: string
  name: string
  taskCount: number
  completionRate: number
}

interface Team {
  id: string
  name: string
  leadId: string
  members: Array<{
    uid: string
    name: string
    email: string
    avatar?: string
  }>
}

interface Announcement {
  id: string
  title: string
  content: string
  createdAt: Date
  createdBy: string
  createdByName: string
  department: string
  priority: "low" | "medium" | "high"
}

export default function LeadAdminDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Array<FirebaseTask & { id: string }>>([])
  const [team, setTeam] = useState<Team | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  
  // Task creation states
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "",
    dueTime: "",
    priority: "medium"
  })
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  
  // Announcement states
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: ""
  })
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const [tasksData, teamData, announcementsData] = await Promise.all([
            tasksAPI.getUserTasks(user.id, user.role),
            teamsAPI.getTeamByLeadIdWithMembers(user.id),
            announcementsAPI.getAll()
          ])
          setTasks(tasksData)
          setTeam(teamData as Team)
          setAnnouncements(announcementsData as Announcement[])
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

  // Calculate KPIs
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === "completed").length
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length
  const todoTasks = tasks.filter((t) => t.status === "todo").length
  const overdueTasks = tasks.filter((t) => {
    const dt = t.dueDatetime || t.dueDate
    if (!dt) return false
    const dueDate = new Date(dt)
    const today = new Date()
    return dueDate < today && t.status !== "completed"
  }).length

  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calculate team member workload
  const teamMemberWorkload = team?.members?.map((member): TeamMember => {
    const memberTasks = tasks.filter((t) => t.assigneeIds && t.assigneeIds.includes(member.uid))
    const completed = memberTasks.filter((t) => t.status === "completed").length
    const total = memberTasks.length
    return {
      id: member.uid,
      name: member.name,
      taskCount: total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }) || []

  const handleCreateTask = async () => {
    if (!user || !newTask.title || !newTask.assigneeId) return;
    
    try {
      setIsCreatingTask(true);
      
      const assigneeName = team?.members.find(m => m.uid === newTask.assigneeId)?.name || ""
      const dueDatetime = newTask.dueDate && newTask.dueTime
        ? new Date(`${newTask.dueDate}T${newTask.dueTime}:00`).toISOString()
        : newTask.dueDate
          ? new Date(`${newTask.dueDate}T23:59:59`).toISOString()
          : null
      
      await tasksAPI.createTask({
        title: newTask.title,
        description: newTask.description,
        status: "todo",
        priority: newTask.priority as "low" | "medium" | "high" | "urgent",
        progress: 0,
        assigneeIds: [newTask.assigneeId],
        assigneeNames: [assigneeName],
        due_datetime: dueDatetime as string | undefined,
        created_by: user.id,
        created_by_name: user.name,
      });
      
      // Refresh tasks
      const updatedTasks = await tasksAPI.getUserTasks(user.id, user.role);
      setTasks(updatedTasks);
      
      // Reset form and close dialog
      setNewTask({
        title: "",
        description: "",
        assigneeId: "",
        dueDate: "",
        dueTime: "",
        priority: "medium"
      });
      setIsCreateTaskOpen(false);
      
      toast({
        title: "Success",
        description: "Task has been created successfully",
      });
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!user || !newAnnouncement.title || !newAnnouncement.content) return;
    
    try {
      setIsCreatingAnnouncement(true);
      
      const announcementData = {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        priority: "medium" as const,
        authorId: user.id,
        authorName: user.name
      };
      
      await announcementsAPI.create(announcementData);
      
      // Refresh announcements
      const updatedAnnouncements = await announcementsAPI.getAll();
      setAnnouncements(updatedAnnouncements as Announcement[]);
      
      // Reset form and close dialog
      setNewAnnouncement({
        title: "",
        content: ""
      });
      setIsCreateAnnouncementOpen(false);
      
      toast({
        title: "Success",
        description: "Announcement has been created successfully",
      });
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAnnouncement(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-blue-600 p-8 text-white shadow-xl ring-1 ring-white/10 dark:from-blue-900 dark:to-slate-900"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">Team Lead Dashboard</h1>
            <p className="text-indigo-100 max-w-xl text-lg">
              Manage your team's tasks, announcements, and performance
            </p>
          </div>
          <div className="flex gap-3">
            {user?.role !== "EMPLOYEE" && (
                <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="shadow-lg bg-white text-indigo-600 hover:bg-indigo-50 border-none">
                      <Plus className="mr-2 h-5 w-5" />
                      Create Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
                    <DialogHeader className="space-y-2 pb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-blue-500/20 flex items-center justify-center ring-2 ring-blue-500/30">
                          <Plus className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <DialogTitle className="text-xl font-bold">Create New Task</DialogTitle>
                          <DialogDescription className="text-xs">Assign a new task to a team member</DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="grid gap-3.5 py-4">
                      <div className="grid gap-1.5">
                        <Label htmlFor="task-title" className="text-xs font-semibold flex items-center gap-1.5">
                          <span className="text-blue-500">•</span> Title
                        </Label>
                        <Input
                          id="task-title"
                          placeholder="Enter task title..."
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                          className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="task-description" className="text-xs font-semibold flex items-center gap-1.5">
                          <span className="text-blue-500">•</span> Description
                        </Label>
                        <Textarea
                          id="task-description"
                          placeholder="Describe the task details..."
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                          className="min-h-20 border-2 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="task-assignee" className="text-xs font-semibold flex items-center gap-1.5">
                          <span className="text-blue-500">•</span> Assign To
                        </Label>
                        <Select
                          value={newTask.assigneeId}
                          onValueChange={(value) => setNewTask({ ...newTask, assigneeId: value })}
                        >
                          <SelectTrigger id="task-assignee" className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20">
                            <SelectValue placeholder="Select team member" />
                          </SelectTrigger>
                          <SelectContent>
                            {team?.members.map((member) => (
                              <SelectItem key={member.uid} value={member.uid}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                          <Label htmlFor="task-due-date" className="text-xs font-semibold flex items-center gap-1.5">
                            <span className="text-blue-500">•</span> Due Date
                          </Label>
                          <Input
                            id="task-due-date"
                            type="date"
                            value={newTask.dueDate}
                            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                            className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="task-due-time" className="text-xs font-semibold flex items-center gap-1.5">
                            <span className="text-blue-500">•</span> Due Time
                          </Label>
                          <Input
                            id="task-due-time"
                            type="time"
                            value={newTask.dueTime}
                            onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                            className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="task-priority" className="text-xs font-semibold flex items-center gap-1.5">
                          <span className="text-blue-500">•</span> Priority
                        </Label>
                        <Select
                          value={newTask.priority}
                          onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                        >
                          <SelectTrigger id="task-priority" className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20">
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
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCreateTaskOpen(false)} 
                        disabled={isCreatingTask}
                        className="h-9 border-2 hover:bg-muted"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateTask} 
                        disabled={isCreatingTask || !newTask.title || !newTask.assigneeId}
                        className="h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                      >
                        {isCreatingTask ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Task
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={isCreateAnnouncementOpen} onOpenChange={setIsCreateAnnouncementOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm">
                    <Bell className="mr-2 h-5 w-5" />
                    Create Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
                  <DialogHeader className="space-y-3 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center ring-2 ring-purple-500/30">
                        <Bell className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <DialogTitle className="text-2xl font-bold">Create Announcement</DialogTitle>
                        <DialogDescription className="text-sm">Share important updates with your team</DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="grid gap-5 py-6">
                    <div className="grid gap-2">
                      <Label htmlFor="announcement-title" className="text-sm font-semibold flex items-center gap-2">
                        <span className="text-purple-500">•</span> Title
                      </Label>
                      <Input
                        id="announcement-title"
                        placeholder="Enter announcement title..."
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        className="h-11 border-2 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="announcement-content" className="text-sm font-semibold flex items-center gap-2">
                        <span className="text-purple-500">•</span> Content
                      </Label>
                      <Textarea
                        id="announcement-content"
                        placeholder="Write your announcement message..."
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                        className="min-h-36 border-2 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 pt-4 border-t border-border/50">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateAnnouncementOpen(false)} 
                      disabled={isCreatingAnnouncement}
                      className="h-11 border-2 hover:bg-muted"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateAnnouncement} 
                      disabled={isCreatingAnnouncement || !newAnnouncement.title || !newAnnouncement.content}
                      className="h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      {isCreatingAnnouncement ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Bell className="mr-2 h-4 w-4" />
                          Create Announcement
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div key="total-tasks" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
        <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-primary/20 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/30">
              <CheckSquare className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Assigned to your team</p>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div key="completed-tasks" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
        <Card className="border-2 border-green-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center ring-1 ring-green-500/30">
              <CheckSquare className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">{taskCompletionRate}% completion rate</p>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div key="in-progress-tasks" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
        <Card className="border-2 border-yellow-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center ring-1 ring-yellow-500/30">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{inProgressTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0}% of all tasks
            </p>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div key="overdue-tasks" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
        <Card className="border-2 border-red-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-red-500/20 hover:border-red-500/40 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
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
        </motion.div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Team Member Performance</CardTitle>
            <CardDescription>Individual task completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMemberWorkload.map((member) => (
                <div key={member.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.taskCount} tasks</div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Progress value={member.completionRate} className="h-2 flex-1" />
                    <div className="w-10 text-right text-sm font-medium">{member.completionRate}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Task Distribution</CardTitle>
            <CardDescription>Workload overview by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 p-4 backdrop-blur-sm shadow-lg">
                  <div className="text-sm font-medium text-muted-foreground">To Do</div>
                  <div className="text-3xl font-bold mt-2">{todoTasks}</div>
                </div>
                <div className="rounded-xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 p-4 backdrop-blur-sm shadow-lg">
                  <div className="text-sm font-medium text-muted-foreground">In Progress</div>
                  <div className="text-3xl font-bold mt-2">{inProgressTasks}</div>
                </div>
                <div className="rounded-xl border-2 border-green-500/30 bg-gradient-to-br from-green-500/20 to-emerald-500/10 p-4 backdrop-blur-sm shadow-lg">
                  <div className="text-sm font-medium text-muted-foreground">Completed</div>
                  <div className="text-3xl font-bold mt-2">{completedTasks}</div>
                </div>
                <div className="rounded-xl border-2 border-red-500/30 bg-gradient-to-br from-red-500/20 to-pink-500/10 p-4 backdrop-blur-sm shadow-lg">
                  <div className="text-sm font-medium text-muted-foreground">Overdue</div>
                  <div className="text-3xl font-bold mt-2">{overdueTasks}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Team Overview</CardTitle>
          <CardDescription>Key metrics and performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 p-5 backdrop-blur-sm hover:shadow-xl hover:border-indigo-500/50 transition-all duration-300 shadow-lg">
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/30 flex items-center justify-center ring-1 ring-indigo-500/40">
                  <Users className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="text-sm font-medium">Team Size</div>
              </div>
              <div className="text-3xl font-bold">{team?.members?.length || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Active team members
              </div>
            </div>
            <div className="rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 p-5 backdrop-blur-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 shadow-lg">
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-blue-500/30 flex items-center justify-center ring-1 ring-blue-500/40">
                  <BarChart3 className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-sm font-medium">Team Efficiency</div>
              </div>
              <div className="text-3xl font-bold">{taskCompletionRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                Overall task completion rate
              </div>
            </div>
            <div className="rounded-xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-5 backdrop-blur-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 shadow-lg">
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/30 flex items-center justify-center ring-1 ring-emerald-500/40">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-sm font-medium">Timeline</div>
              </div>
              <div className="text-3xl font-bold">
                {overdueTasks > 0 ? "At Risk" : "On Track"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {overdueTasks} overdue tasks
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Team Announcements</CardTitle>
            <CardDescription>Important updates and information for your team</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-8 text-center backdrop-blur-sm"
              >
                <div className="p-4 bg-primary/10 rounded-full mb-4 shadow-sm">
                  <Bell className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">No announcements yet</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                  Create an announcement to share important updates with your team
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5 p-5 backdrop-blur-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300 shadow-md"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-lg">{announcement.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            announcement.priority === 'high' 
                              ? 'border-red-500/50 text-red-500 bg-red-500/10' 
                              : announcement.priority === 'medium'
                              ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10'
                              : 'border-blue-500/50 text-blue-500 bg-blue-500/10'
                          }`}
                        >
                          {announcement.priority}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mb-3">{announcement.content}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-primary/20">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/10">
                          <span className="text-xs font-semibold text-primary">
                            {announcement.authorName?.charAt(0).toUpperCase() || 'A'}
                          </span>
                        </div>
                        <span className="font-medium">Posted by <span className="text-foreground">{announcement.authorName}</span></span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {announcement.readBy?.length || 0} read
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </motion.div>
  )
}
