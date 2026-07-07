"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usersAPI, tasksAPI } from "@/lib/api"
import { useEffect, useState } from "react"
import { Loader2, CheckSquare, AlertCircle, Clock } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export default function TeamOverviewPage() {
  const { user } = useAuth()
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [teamTasks, setTeamTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTeamData = async () => {
      if (user) {
        try {
          // For demo purposes, we'll just get all users
          // In a real app, you'd filter by department or team
          const users = await usersAPI.getAll()

          // Filter out the current user
          const filteredUsers = users.filter((u) => u.uid !== user.id)
          setTeamMembers(filteredUsers)

          // Get tasks for each team member
          const tasksPromises = filteredUsers.map((member) => tasksAPI.getUserTasks(member.uid))

          const tasksResults = await Promise.all(tasksPromises)

          // Combine tasks with user data
          const combinedTasks = tasksResults.flatMap((tasks, index) =>
            tasks.map((task) => ({
              ...task,
              assigneeName: filteredUsers[index].name,
              assigneeAvatar: filteredUsers[index].avatar,
            })),
          )

          setTeamTasks(combinedTasks)
        } catch (error) {
          console.error("Error fetching team data:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchTeamData()
  }, [user])

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getWorkloadColor = (taskCount: number) => {
    if (taskCount >= 8) return "bg-red-500"
    if (taskCount >= 5) return "bg-orange-500"
    if (taskCount >= 3) return "bg-yellow-500"
    return "bg-green-500"
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Group tasks by assignee
  const tasksByAssignee = teamMembers.map((member) => {
    const memberTasks = teamTasks.filter((task) => task.assigneeId === member.uid)
    const completedTasks = memberTasks.filter((task) => task.status === "completed")
    const overdueTasks = memberTasks.filter((task) => {
      if (!task.dueDate) return false
      const dueDate = new Date(task.dueDate)
      const today = new Date()
      return dueDate < today && task.status !== "completed"
    })

    return {
      ...member,
      tasks: memberTasks,
      taskCount: memberTasks.length,
      completedCount: completedTasks.length,
      overdueCount: overdueTasks.length,
      completionRate: memberTasks.length > 0 ? Math.round((completedTasks.length / memberTasks.length) * 100) : 0,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Team Overview</h2>
        <p className="text-muted-foreground">Monitor your team's workload and performance</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tasksByAssignee.map((member) => (
          <Card key={member.uid} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-4">
                <Avatar className="h-10 w-10">
                  {member.avatar && member.avatar !== "/placeholder.svg" && (
                    <AvatarImage src={member.avatar} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white font-semibold">{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <CardDescription>{member.department || "General"}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${getWorkloadColor(member.taskCount)}`} />
                    <span className="text-sm font-medium">Workload</span>
                  </div>
                  <Badge variant="outline">{member.taskCount} tasks</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckSquare className="h-4 w-4 text-green-500" />
                      <span>Completed</span>
                    </div>
                    <span>{member.completedCount} tasks</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span>Overdue</span>
                    </div>
                    <span>{member.overdueCount} tasks</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span>Completion Rate</span>
                    </div>
                    <span>{member.completionRate}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{member.completionRate}%</span>
                  </div>
                  <Progress value={member.completionRate} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Team Activity</CardTitle>
          <CardDescription>Latest tasks and updates from your team</CardDescription>
        </CardHeader>
        <CardContent>
          {teamTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {teamTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center space-x-4">
                  <Avatar className="h-8 w-8">
                    {task.assigneeAvatar && task.assigneeAvatar !== "/placeholder.svg" && (
                      <AvatarImage src={task.assigneeAvatar} />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white font-semibold text-xs">{getInitials(task.assigneeName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Assigned to {task.assigneeName} • Status:{" "}
                      <span className="capitalize">{task.status.replace("_", " ")}</span>
                    </p>
                  </div>
                  <Badge variant={task.status === "completed" ? "outline" : "default"}>
                    {task.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
