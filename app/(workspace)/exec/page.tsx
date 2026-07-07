"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usersAPI, projectsAPI, tasksAPI } from "@/lib/api"
import { useEffect, useState } from "react"
import { Loader2, AlertTriangle, Users, CheckSquare, Briefcase } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export default function ExecutiveDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    // Only CEO can access this page
    if (user && user.role !== "CEO") {
      redirect("/dashboard")
    }

    const fetchData = async () => {
      if (user) {
        try {
          const [usersData, projectsData, tasksData] = await Promise.all([
            usersAPI.getAll(),
            projectsAPI.getAll(),
            tasksAPI.getAll(),
          ])

          setUsers(usersData)
          setProjects(projectsData)
          setTasks(tasksData)
        } catch (error) {
          console.error("Error fetching data:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchData()
  }, [user])

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  // Calculate KPIs
  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.status === "active").length
  const totalProjects = projects.length
  const completedProjects = projects.filter((p) => p.status === "completed").length
  const inProgressProjects = projects.filter((p) => p.status === "in_progress").length
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === "completed").length
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate) return false
    const dueDate = new Date(t.dueDate)
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
      const assignee = users.find((u) => u.uid === t.assigneeId)
      return assignee && (assignee.department || "General") === dept
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Executive Dashboard</h2>
        <p className="text-muted-foreground">Company-wide performance metrics and insights</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeUsers} / {totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">{Math.round((activeUsers / totalUsers) * 100)}% active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Project Completion</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedProjects} / {totalProjects}
            </div>
            <p className="text-xs text-muted-foreground">{projectCompletionRate}% completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedTasks} / {totalTasks}
            </div>
            <p className="text-xs text-muted-foreground">{taskCompletionRate}% completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground">
              {totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0}% of all tasks
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        <TabsContent value="departments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
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
        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
              <CardDescription>Overview of all company projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.slice(0, 5).map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{project.name}</div>
                      <Badge
                        className={
                          project.status === "completed"
                            ? "bg-green-500"
                            : project.status === "in_progress"
                              ? "bg-yellow-500"
                              : project.status === "planning"
                                ? "bg-blue-500"
                                : project.status === "on_hold"
                                  ? "bg-orange-500"
                                  : "bg-red-500"
                        }
                      >
                        {project.status.replace("_", " ")}
                      </Badge>
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
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user roles and access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.slice(0, 10).map((user) => (
                  <div key={user.uid} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={user.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email} • {user.department || "General"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{user.role}</Badge>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
