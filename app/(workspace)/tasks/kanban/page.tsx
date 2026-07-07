"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { tasksAPI, usersAPI } from "@/lib/api"
import { useState, useEffect } from "react"
import { Loader2, Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core"
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable"
import { Badge } from "@/components/ui/badge"
import TaskCard from "./task-card"
import KanbanColumn from "./kanban-column"
import type { FirebaseTask, FirebaseUser } from "@/lib/firebase-types"

export default function KanbanBoardPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<(FirebaseTask & { id: string })[]>([])
  const [users, setUsers] = useState<{uid: string; id: string; name: string; email: string; avatar?: string; role?: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  const isCEO = user?.role === "CEO"
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const fetchTasks = async () => {
      if (user) {
        try {
          console.log("Kanban - Fetching tasks for user:", user.id)
          const userTasks = isCEO 
            ? await tasksAPI.getAll()
            : await tasksAPI.getUserTasks(user.id)
          console.log("Kanban - Fetched tasks:", userTasks)
          setTasks(userTasks)
        } catch (error) {
          console.error("Error fetching tasks:", error)
          toast({
            title: "Error",
            description: "Failed to load tasks. Please try again.",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }
    }

    const fetchUsers = async () => {
      if (user && isCEO) {
        try {
          const allUsers = await usersAPI.getAll()
          setUsers(allUsers.map(u => ({
            ...u,
            uid: u.uid || u.id
          })))
        } catch (error) {
          console.error("Error fetching users:", error)
        }
      }
    }

    fetchTasks()
    fetchUsers()
  }, [user, isCEO])

  const filteredTasks = tasks.filter(task => {
    return (
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const todoTasks = filteredTasks.filter(task => task.status === "todo")
  const inProgressTasks = filteredTasks.filter(task => task.status === "in_progress")
  const inReviewTasks = filteredTasks.filter(task => task.status === "pending_review" || task.status === "pending_completion_review")
  const completedTasks = filteredTasks.filter(task => task.status === "completed")

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return
    
    const taskId = active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    // Extract column ID from over.id which is in format "column-[status]"
    const columnId = over.id as string
    const newStatus = columnId.replace("column-", "") as "todo" | "in_progress" | "pending_review" | "completed"
    
    // Only update if status actually changed
    if (task.status === newStatus) return
    
    try {
      // Set progress based on status
      const progress = 
        newStatus === "completed" ? 100 : 
        newStatus === "pending_review" ? 50 :
        newStatus === "in_progress" ? 25 : 0
      
      await tasksAPI.updateTask(taskId, {
        status: newStatus,
        progress
      })
      
      // Update task locally
      setTasks(tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            status: newStatus,
            progress
          }
        }
        return t
      }))
      
      toast({
        title: "Task updated",
        description: `Task moved to ${newStatus.replace("_", " ")}`,
      })
      
    } catch (error) {
      console.error("Error updating task status:", error)
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      })
    }
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
          <h2 className="text-2xl font-bold">Task Board</h2>
          <p className="text-muted-foreground">
            Drag and drop tasks between columns to update their status
          </p>
        </div>
        <Button asChild>
          <a href="/tasks">
            Switch to List View
          </a>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KanbanColumn 
              id="column-todo" 
              title="To Do" 
              tasks={todoTasks}
              icon={<Badge variant="outline" className="ml-2 bg-slate-100">
                {todoTasks.length}
              </Badge>}
              getUser={(uid: string) => users.find(u => u.uid === uid) || null}
              currentUser={user}
            />
            
            <KanbanColumn 
              id="column-in_progress" 
              title="In Progress" 
              tasks={inProgressTasks}
              icon={<Badge variant="outline" className="ml-2 bg-blue-100">
                {inProgressTasks.length}
              </Badge>}
              getUser={(uid: string) => users.find(u => u.uid === uid) || null}
              currentUser={user}
            />
            
            <KanbanColumn 
              id="column-in_review" 
              title="In Review" 
              tasks={inReviewTasks}
              icon={<Badge variant="outline" className="ml-2 bg-yellow-100">
                {inReviewTasks.length}
              </Badge>}
              getUser={(uid: string) => users.find(u => u.uid === uid) || null}
              currentUser={user}
            />
            
            <KanbanColumn 
              id="column-completed" 
              title="Completed" 
              tasks={completedTasks}
              icon={<Badge variant="outline" className="ml-2 bg-green-100">
                {completedTasks.length}
              </Badge>}
              getUser={(uid: string) => users.find(u => u.uid === uid) || null}
              currentUser={user}
            />
          </div>
        </DndContext>
      </div>
    </div>
  )
} 