"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, ArrowUpCircle, AlertCircle, CheckCircle, UserCircle2, Calendar } from "lucide-react"
import type { FirebaseTask } from "@/lib/firebase-types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"

interface TaskCardProps {
  task: FirebaseTask & { id: string }
  getUser: (uid: string) => { uid: string; id: string; name: string; email: string; avatar?: string; role?: string } | null
  currentUser: any
  isCEO: boolean
}

export default function TaskCard({ 
  task, 
  getUser, 
  currentUser,
  isCEO 
}: TaskCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <Clock className="h-4 w-4 text-gray-500" />
      case "in_progress":
        return <ArrowUpCircle className="h-4 w-4 text-blue-500" />
      case "pending_review":
      case "pending_completion_review":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "border-green-500 text-green-500"
      case "medium":
        return "border-yellow-500 text-yellow-500"
      case "high":
        return "border-orange-500 text-orange-500"
      case "urgent":
        return "border-red-500 text-red-500"
      default:
        return "border-gray-500 text-gray-500"
    }
  }

  const getSubmissionStatusBadge = (task: FirebaseTask) => {
    switch (task.submission_status) {
      case "pending": return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-slate-100/50 border-slate-300 text-slate-600">Pending</Badge>
      case "submitted": return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100/50 border-blue-300 text-blue-600">Submitted</Badge>
      case "approved": return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100/50 border-emerald-300 text-emerald-600">Approved</Badge>
      case "rejected": return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-red-100/50 border-red-300 text-red-600">Rejected</Badge>
      default: return null
    }
  }

  const getDueDisplay = (task: FirebaseTask) => {
    const dt = (task as any).dueDatetime || task.due_date
    if (!dt) return null
    const date = new Date(dt)
    const hasTime = !!(task as any).dueDatetime
    return hasTime ? format(date, "MMM d, h:mm a") : format(date, "MMM d")
  }

  const getInitials = (name: string | undefined) => {
    if (!name) return "?"
    
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getAssigneeName = (assigneeId: string) => {
    if (assigneeId === currentUser?.id) return "You"
    const assignee = getUser(assigneeId)
    return assignee ? assignee.name : "Unknown User"
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(task.status)}
            <h3 className="font-medium text-sm line-clamp-1">{task.title}</h3>
          </div>
          <div className="flex items-center gap-1">
            {getSubmissionStatusBadge(task)}
            <Badge
              variant="outline"
              className={`text-xs ${getPriorityColor(task.priority)}`}
            >
              {task.priority}
            </Badge>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>

        {getDueDisplay(task) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Calendar className="h-3 w-3" />
            {getDueDisplay(task)}
          </div>
        )}
        
        <div className="flex flex-col space-y-2">
          <div className="flex items-center">
            <Progress value={task.progress} className="h-1 flex-1" />
            <span className="ml-2 text-xs text-muted-foreground">{task.progress}%</span>
          </div>
          
          {task.assigneeId && task.assigneeId !== currentUser?.id && isCEO && (
            <div className="flex items-center gap-1 mt-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={getUser(task.assigneeId)?.avatar || "/placeholder.svg"} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(getAssigneeName(task.assigneeId))}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {getAssigneeName(task.assigneeId)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 