"use client"

import { useAuth } from "@/components/auth-provider"
import { downloadFile } from "@/lib/file-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { tasksAPI, usersAPI } from "@/lib/api"
import type { FirebaseTask } from "@/lib/firebase-types"
import { useEffect, useState } from "react"
import {
  Loader2, Plus, Search, Filter, CheckCircle, Clock, ArrowUpCircle, AlertCircle,
  UserCircle2, LayoutGrid, Calendar as CalendarIcon, X, Upload, FileText, Eye,
  Send, Play, MessageSquare, Download, ShieldAlert, Paperclip, Lock, ListChecks
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"

export default function TasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<(FirebaseTask & { id: string })[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [isUpdatingTask, setIsUpdatingTask] = useState(false)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Review workflow state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null)
  const [reviewType, setReviewType] = useState<"progress" | "completion" | "completion-gated">("progress")
  const [reviewNotes, setReviewNotes] = useState("")
  const [reviewFile, setReviewFile] = useState<File | null>(null)
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false)

  // View Details state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<any>(null)

  // Assigner review state
  const [assignerReviewOpen, setAssignerReviewOpen] = useState(false)
  const [assignerReviewTask, setAssignerReviewTask] = useState<any>(null)
  const [assignerProgress, setAssignerProgress] = useState(50)
  const [assignerNotes, setAssignerNotes] = useState("")
  const [assignerFile, setAssignerFile] = useState<File | null>(null)
  const [assignerAction, setAssignerAction] = useState<"review" | "approve" | "reject">("review")

  // Milestone state
  const [milestones, setMilestones] = useState<any[]>([])
  const [milestoneSummaries, setMilestoneSummaries] = useState<Record<string, { total: number; approved: number }>>({})
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [milestoneDialogId, setMilestoneDialogId] = useState<string | null>(null)
  const [milestoneComment, setMilestoneComment] = useState("")
  const [milestoneFile, setMilestoneFile] = useState<File | null>(null)
  const [milestoneAction, setMilestoneAction] = useState<"submit" | "approve" | "reject">("submit")
  const [isMilestoneSubmitting, setIsMilestoneSubmitting] = useState(false)

  // Mid-task milestone management state
  const [manageMilestonesOpen, setManageMilestonesOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<any>(null)
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("")
  const [milestoneListForManage, setMilestoneListForManage] = useState<any[]>([])

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    status: "todo" as "todo" | "in_progress" | "pending_review" | "pending_completion_review" | "completed",
    progress: 0,
    assigneeIds: [] as string[],
    viewerIds: [] as string[],
    dueDate: "",
    dueTime: "",
    useMilestones: false,
    milestones: [] as { title: string; description: string; weight?: number }[]
  })

  const isCEO = user?.role === "CEO"
  const isManager = user?.role === "CEO" || user?.role === "C_LEVEL" || user?.role === "LEAD"

  const fetchTasks = async (showLoading = false) => {
    if (!user) return
    try {
      if (showLoading) setLoading(true)
      const userTasks = await tasksAPI.getUserTasks(user.id, user.role)
      setTasks(userTasks)
      // Fetch milestone summaries for all phased tasks
      const phasedIds = userTasks.filter((t: any) => t.isPhased).map((t: any) => t.id)
      if (phasedIds.length > 0) {
        try {
          const summaries = await tasksAPI.getMilestoneSummaries(phasedIds)
          setMilestoneSummaries(summaries)
        } catch { /* milestone table may not exist yet */ }
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const fetchUsers = async () => {
    if (user && isManager) {
      try {
        const allUsers = await usersAPI.getAll()
        setUsers(allUsers.map(u => ({ ...u, uid: u.uid || u.id })))
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }
  }

  useEffect(() => { fetchTasks(true); fetchUsers() }, [user?.id])

  // Fetch milestones when View Details opens for a milestone task
  useEffect(() => {
    if (detailDialogOpen && detailTask?.isPhased) {
      tasksAPI.getTaskMilestones(detailTask.id).then(setMilestones).catch(() => setMilestones([]))
    } else if (!detailDialogOpen) {
      setMilestones([])
    }
  }, [detailDialogOpen, detailTask?.id])

  // --- Milestone handlers ---
  const handleStartMilestone = async (milestoneId: string) => {
    try {
      await tasksAPI.startMilestone(milestoneId)
      if (detailTask) { const m = await tasksAPI.getTaskMilestones(detailTask.id); setMilestones(m) }
      toast({ title: "Milestone started", description: "Work on this milestone can now begin." })
    } catch (error: any) {
      console.error("Failed to start milestone:", error)
      toast({ title: "Error", description: error?.message || "Failed to start milestone", variant: "destructive" })
    }
  }

  const handleSubmitMilestoneReview = async () => {
    if (!milestoneDialogId) return
    try {
      setIsMilestoneSubmitting(true)
      await tasksAPI.submitMilestoneReview(milestoneDialogId, milestoneComment, milestoneFile || undefined, user?.id)
      if (detailTask) { const m = await tasksAPI.getTaskMilestones(detailTask.id); setMilestones(m) }
      setMilestoneDialogOpen(false); setMilestoneComment(""); setMilestoneFile(null)
      toast({ title: "Milestone submitted for review" })
    } catch (error: any) { toast({ title: "Error", description: error?.message, variant: "destructive" }) }
    finally { setIsMilestoneSubmitting(false) }
  }

  const handleApproveMilestone = async () => {
    if (!milestoneDialogId) return
    try {
      setIsMilestoneSubmitting(true)
      await tasksAPI.approveMilestone(milestoneDialogId, milestoneComment, user!.id, milestoneFile || undefined, user?.id)
      if (detailTask) { const m = await tasksAPI.getTaskMilestones(detailTask.id); setMilestones(m); await fetchTasks() }
      setMilestoneDialogOpen(false); setMilestoneComment(""); setMilestoneFile(null)
      toast({ title: "Milestone approved" })
    } catch (error: any) { toast({ title: "Error", description: error?.message, variant: "destructive" }) }
    finally { setIsMilestoneSubmitting(false) }
  }

  const handleRejectMilestone = async () => {
    if (!milestoneDialogId) return
    try {
      setIsMilestoneSubmitting(true)
      await tasksAPI.rejectMilestone(milestoneDialogId, milestoneComment, user!.id, milestoneFile || undefined, user?.id)
      if (detailTask) { const m = await tasksAPI.getTaskMilestones(detailTask.id); setMilestones(m) }
      setMilestoneDialogOpen(false); setMilestoneComment(""); setMilestoneFile(null)
      toast({ title: "Milestone returned for revision" })
    } catch (error: any) { toast({ title: "Error", description: error?.message, variant: "destructive" }) }
    finally { setIsMilestoneSubmitting(false) }
  }

  const openMilestoneDialog = (milestoneId: string, actionType: "submit" | "approve" | "reject") => {
    setMilestoneDialogId(milestoneId); setMilestoneAction(actionType); setMilestoneComment(""); setMilestoneFile(null); setMilestoneDialogOpen(true)
  }

  // --- Mid-task milestone management handlers ---
  const openManageMilestones = async () => {
    if (!detailTask) return
    const ms = await tasksAPI.getTaskMilestones(detailTask.id)
    setMilestoneListForManage(ms)
    setManageMilestonesOpen(true)
  }

  const handleAddMilestoneMidTask = async () => {
    if (!detailTask || !newMilestoneTitle.trim()) return
    try {
      await tasksAPI.addMilestone(detailTask.id, { title: newMilestoneTitle.trim() })
      const ms = await tasksAPI.getTaskMilestones(detailTask.id)
      setMilestoneListForManage(ms)
      setMilestones(ms)
      setNewMilestoneTitle("")
      await fetchTasks()
      toast({ title: "Milestone added" })
    } catch (error: any) { toast({ title: "Error", description: error?.message, variant: "destructive" }) }
  }

  const handleEditMilestone = async () => {
    if (!editingMilestone) return
    try {
      await tasksAPI.updateMilestone(editingMilestone.id, { title: editingMilestone.title, description: editingMilestone.description, weight: editingMilestone.weight })
      const ms = await tasksAPI.getTaskMilestones(detailTask.id)
      setMilestoneListForManage(ms)
      setMilestones(ms)
      setEditingMilestone(null)
      toast({ title: "Milestone updated" })
    } catch (error: any) { toast({ title: "Error", description: error?.message, variant: "destructive" }) }
  }

  const handleDeleteMilestone = async (id: string) => {
    try {
      await tasksAPI.deleteMilestone(id)
      const ms = await tasksAPI.getTaskMilestones(detailTask.id)
      setMilestoneListForManage(ms)
      setMilestones(ms)
      await fetchTasks()
      toast({ title: "Milestone removed" })
    } catch (error: any) { toast({ title: "Error", description: error?.message, variant: "destructive" }) }
  }

  const handleReorderMilestones = async (orderedIds: string[]) => {
    if (!detailTask) return
    try {
      await tasksAPI.reorderMilestones(detailTask.id, orderedIds)
      const ms = await tasksAPI.getTaskMilestones(detailTask.id)
      setMilestoneListForManage(ms)
      setMilestones(ms)
    } catch (error: any) { toast({ title: "Error", description: error?.message, variant: "destructive" }) }
  }

  const moveMilestone = (index: number, direction: -1 | 1) => {
    const newList = [...milestoneListForManage]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newList.length) return
    ;[newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]]
    const reordered = newList.map((m, i) => ({ ...m, order_index: i }))
    setMilestoneListForManage(reordered)
    handleReorderMilestones(reordered.map(m => m.id))
  }

  const getMilestoneStatusBadge = (status: string) => {
    switch (status) {
      case "not_started": return <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500">Not Started</Badge>
      case "in_progress": return <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-600">In Progress</Badge>
      case "pending_review": return <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-600">Pending Review</Badge>
      case "needs_revision": return <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-600">Needs Revision</Badge>
      case "approved": return <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-600">Approved</Badge>
      default: return null
    }
  }

  const getNextActionableIndex = (milestones: any[]) => {
    const firstPending = milestones.find(m => m.status !== "approved")
    return firstPending ? firstPending.order_index : -1
  }

  // --- Create Task (unchanged) ---
  const handleCreateTask = async () => {
    if (!user) return
    try {
      setIsAddingTask(true)
      const assigneeIds = isManager && newTask.assigneeIds.length > 0 ? newTask.assigneeIds : [user.id]
      const assigneeNames = assigneeIds.map(id => id === user.id ? user.name : users.find(u => u.uid === id)?.name || "Unknown")
      const viewerNames = newTask.viewerIds.map(id => id === user.id ? user.name : users.find(u => u.uid === id)?.name || "Unknown")
      const dueDatetime = newTask.dueDate && newTask.dueTime
        ? new Date(`${newTask.dueDate}T${newTask.dueTime}:00`).toISOString()
        : newTask.dueDate ? new Date(`${newTask.dueDate}T23:59:59`).toISOString() : null

      await tasksAPI.createTask({
        title: newTask.title, description: newTask.description,
        status: newTask.status as any, priority: newTask.priority as any,
        progress: newTask.progress,
        assigneeIds, assigneeNames,
        viewerIds: newTask.viewerIds, viewerNames,
        project_id: null, project_name: null,
        due_datetime: dueDatetime as string | undefined,
        created_by: user.id, created_by_name: user.name,
        isPhased: newTask.useMilestones,
        milestones: newTask.useMilestones ? newTask.milestones.filter(m => m.title.trim()) : undefined
      })
      setNewTask({ title: "", description: "", priority: "medium", status: "todo", progress: 0, assigneeIds: [], viewerIds: [], dueDate: "", dueTime: "", useMilestones: false, milestones: [] })
      toast({ title: "Task created", description: isManager && assigneeIds.some(id => id !== user.id) ? `Task assigned to ${assigneeNames.join(", ")}.` : "Task created successfully." })
      await fetchTasks()
      setIsTaskDialogOpen(false)
    } catch (error: any) {
      console.error("Error creating task:", error)
      toast({ title: "Error", description: error?.message || "Failed to create task.", variant: "destructive" })
    } finally { setIsAddingTask(false) }
  }

  // --- Start Task ---
  const handleStartTask = async (taskId: string, isPhased?: boolean) => {
    try {
      if (isPhased) {
        const ms = await tasksAPI.getTaskMilestones(taskId)
        const first = ms.find((m: any) => m.order_index === 0)
        if (!first) throw new Error("No milestones found for this task.")
        await tasksAPI.startMilestone(first.id)
        await tasksAPI.startTask(taskId)
      } else {
        await tasksAPI.startTask(taskId)
      }
      await fetchTasks()
      toast({ title: "Task started", description: isPhased ? "First milestone is ready." : "Progress set to 15%. Good luck!" })
      setDetailDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to start task:", error)
      toast({ title: "Error", description: error?.message || "Failed to start task.", variant: "destructive" })
    }
  }

  // --- Progress Review ---
  const handleSubmitProgressReview = async () => {
    if (!reviewTaskId) return
    try {
      setIsReviewSubmitting(true)
      await tasksAPI.submitProgressReview(reviewTaskId, reviewNotes, reviewFile || undefined, user?.id)
      await fetchTasks()
      setReviewDialogOpen(false); setReviewNotes(""); setReviewFile(null); setReviewTaskId(null)
      toast({ title: "Progress update sent", description: "The assigner will review your progress." })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to submit.", variant: "destructive" })
    } finally { setIsReviewSubmitting(false) }
  }

  // --- Completion Review ---
  const handleSubmitCompletionReview = async () => {
    if (!reviewTaskId || !reviewFile) return
    try {
      setIsReviewSubmitting(true)
      const { fileUrl, fileName, fileSize } = await tasksAPI.uploadCompletionFile(reviewTaskId, reviewFile, user!.id)
      await tasksAPI.submitCompletionReview(reviewTaskId, fileUrl, fileName, fileSize)
      await fetchTasks()
      setReviewDialogOpen(false); setReviewFile(null); setReviewNotes(""); setReviewTaskId(null)
      toast({ title: "Completion submitted", description: "The assigner will review your work." })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to submit.", variant: "destructive" })
    } finally { setIsReviewSubmitting(false) }
  }

  // --- Assigner: Review Progress ---
  const handleAssignerReviewProgress = async () => {
    if (!assignerReviewTask) return
    try {
      setIsUpdatingTask(true)
      let reviewerFile: { url: string; name: string; size: number } | undefined
      if (assignerFile) {
        reviewerFile = await tasksAPI.uploadReviewerFile(assignerReviewTask.id, assignerFile, user!.id)
      }
      await tasksAPI.reviewProgress(assignerReviewTask.id, user!.id, assignerProgress, assignerNotes, reviewerFile)
      await fetchTasks()
      setAssignerReviewOpen(false); setAssignerFile(null)
      toast({ title: "Progress reviewed", description: `Updated to ${assignerProgress}%.` })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed.", variant: "destructive" })
    } finally { setIsUpdatingTask(false) }
  }

  // --- Assigner: Approve Completion ---
  const handleApproveCompletion = async (taskId: string) => {
    try {
      setIsUpdatingTask(true)
      let reviewerFile: { url: string; name: string; size: number } | undefined
      if (assignerFile) {
        reviewerFile = await tasksAPI.uploadReviewerFile(taskId, assignerFile, user!.id)
      }
      await tasksAPI.approveCompletion(taskId, user!.id, reviewerFile)
      await fetchTasks()
      setDetailDialogOpen(false); setAssignerFile(null)
      toast({ title: "Task completed", description: "The task has been marked complete." })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed.", variant: "destructive" })
    } finally { setIsUpdatingTask(false) }
  }

  // --- Assigner: Reject Completion ---
  const handleRejectCompletion = async (taskId: string) => {
    try {
      setIsUpdatingTask(true)
      let reviewerFile: { url: string; name: string; size: number } | undefined
      if (assignerFile) {
        reviewerFile = await tasksAPI.uploadReviewerFile(taskId, assignerFile, user!.id)
      }
      await tasksAPI.rejectCompletion(taskId, assignerNotes || "Needs more work.", reviewerFile)
      await fetchTasks()
      setAssignerReviewOpen(false); setAssignerNotes(""); setAssignerFile(null)
      toast({ title: "Completion rejected", description: "Task returned to in-progress with feedback." })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed.", variant: "destructive" })
    } finally { setIsUpdatingTask(false) }
  }

  const openReviewDialog = async (taskId: string) => {
    setReviewTaskId(taskId); setReviewType("progress"); setReviewNotes(""); setReviewFile(null)
    const task = tasks.find(t => t.id === taskId)
    if (task?.isPhased) {
      const allApproved = await tasksAPI.allMilestonesApproved(taskId)
      if (!allApproved) setReviewType("completion-gated")
      else setReviewType("progress")
    }
    setReviewDialogOpen(true)
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    return matchesSearch && matchesStatus
  })
  const getTasksByStatus = (status: string) => status === "all" ? filteredTasks : filteredTasks.filter((t) => t.status === status)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-emerald-500/20 text-emerald-600 border-emerald-500/40"
      case "medium": return "bg-amber-500/20 text-amber-600 border-amber-500/40"
      case "high": return "bg-orange-500/20 text-orange-600 border-orange-500/40"
      case "urgent": return "bg-red-500/20 text-red-600 border-red-500/40"
      default: return "bg-slate-500/20 text-slate-600 border-slate-500/40"
    }
  }

  const getStatusBadge = (task: any) => {
    const s = task.status
    if (s === "todo") return <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 border-slate-200">To Do</Badge>
    if (s === "in_progress") return <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-600 border-blue-200">In Progress</Badge>
    if (s === "pending_review") return <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-600 border-amber-200">Pending Review</Badge>
    if (s === "pending_completion_review") return <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-600 border-purple-200">Final Review</Badge>
    if (s === "completed") return <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-600 border-emerald-200">Completed</Badge>
    return null
  }

  const getDueDisplay = (task: any) => {
    const dt = task.dueDatetime || task.dueDate
    if (!dt) return null
    return task.dueDatetime ? format(new Date(dt), "MMM d, h:mm a") : format(new Date(dt), "MMM d")
  }

  const getAssigneeName = (task: any) => {
    if (!task.assigneeIds || task.assigneeIds.length === 0) return task.assigneeName || "Unknown User"
    const names = task.assigneeNames || []
    if (names.length === 1) return names[0] === user?.name ? "You" : names[0]
    const hasCurrentUser = task.assigneeIds.includes(user?.id)
    if (hasCurrentUser) {
      const otherNames = names.filter((n: string) => n !== user?.name)
      if (otherNames.length === 0) return "You"
      if (otherNames.length === 1) return `You, ${otherNames[0]}`
      return `You, ${otherNames[0]} +${otherNames.length - 1}`
    }
    return names.length === 2 ? names.join(", ") : `${names[0]}, ${names[1]} +${names.length - 2}`
  }

  const isAssignee = (task: any) => task.assigneeIds?.includes(user?.id || "")
  const isAssigner = (task: any) => task.assignedBy === user?.id

  // === TASK CARD ===
  const TaskCard = ({ task }: { task: FirebaseTask & { id: string } }) => {
    const priorityBar = task.priority === "urgent" ? "bg-red-500" : task.priority === "high" ? "bg-orange-500" : task.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"
    const isPendingReview = task.status === "pending_review" || task.status === "pending_completion_review"
    const canSubmit = isAssignee(task) && (task.status === "in_progress")
    const isComplete = task.status === "completed"

    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        layout
        whileHover={{ y: -3 }}
        className="group"
      >
        <Card className={`relative overflow-hidden border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-sm transition-all duration-200 hover:shadow-md ${isComplete ? "opacity-80" : ""}`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityBar}`} />

          <CardHeader className="pb-3 pl-5 pt-4 pr-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`capitalize rounded-md border text-[11px] px-2 py-0 ${getPriorityColor(task.priority)}`}>{task.priority}</Badge>
                  {getStatusBadge(task)}
                  {(task.due_date || task.dueDatetime) && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />{getDueDisplay(task)}
                    </span>
                  )}
                </div>
                <CardTitle className="text-[15px] font-semibold leading-snug truncate">{task.title}</CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pl-5 pb-3 pt-0 pr-4">
            <p className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{task.description}</p>

            <div className="flex items-center gap-2 mb-3 text-[12px] text-slate-400">
              <UserCircle2 className="h-3.5 w-3.5" />
              <span>{getAssigneeName(task)}</span>
              {task.assignedByName && task.assignedByName !== getAssigneeName(task) && (
                <span className="truncate">· by {task.assignedByName}</span>
              )}
              {task.isPhased && (() => {
                const summary = milestoneSummaries[task.id]
                if (summary) return (
                  <span className="flex items-center gap-1 text-slate-400"><ListChecks className="h-3 w-3" />{summary.approved}/{summary.total}</span>
                )
                return <span className="flex items-center gap-1 text-slate-400"><ListChecks className="h-3 w-3" />Phased</span>
              })()}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${task.progress >= 100 ? "bg-emerald-500" : task.progress >= 50 ? "bg-blue-500" : task.progress > 0 ? "bg-amber-500" : "bg-slate-200"}`} style={{ width: `${task.progress}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-slate-500 w-8 text-right">{task.progress}%</span>
            </div>
          </CardContent>

          {!isComplete && (
            <div className="px-5 pb-4 pt-0 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-[13px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 h-8 px-3"
                onClick={() => { setDetailTask(task); setDetailDialogOpen(true) }}
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />View Details
              </Button>

              {canSubmit && !isPendingReview && (
                <Button
                  size="sm"
                  className="text-[13px] h-8 px-4 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:hover:bg-slate-100 dark:text-slate-800"
                  onClick={() => openReviewDialog(task.id)}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />Submit for Review
                </Button>
              )}
            </div>
          )}
        </Card>
      </motion.div>
    )
  }

  // === SKELETON ===
  const TaskSkeleton = () => (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 pl-5 pt-4"><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-2" /><div className="h-5 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /></CardHeader>
          <CardContent className="pl-5 pb-4"><div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-3" /><div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-4" /><div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /></CardContent>
        </Card>
      ))}
    </div>
  )

  const containerVariants: import("framer-motion").Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }
  const itemVariants: import("framer-motion").Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50 } } }

  return (
    <div className="min-h-screen p-1 space-y-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white shadow-xl ring-1 ring-white/10"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">Taskboard</h1>
            <p className="text-slate-300 max-w-xl text-lg">{isCEO ? "Assign, track, and manage team productivity." : "Manage your tasks and track progress."}</p>
          </div>
          <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg bg-white text-slate-900 hover:bg-slate-100 border-none"><Plus className="mr-2 h-5 w-5" />{isManager ? "Assign Task" : "Create Task"}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader><DialogTitle>{isManager ? "Assign New Task" : "Create New Task"}</DialogTitle><DialogDescription>{isManager ? "Assign a task to team members." : "Create a new task."}</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label htmlFor="title">Title</Label><Input id="title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title" /></div>
                <div className="grid gap-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} placeholder="Task description" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label htmlFor="priority">Priority</Label><Select value={newTask.priority} onValueChange={(v: any) => setNewTask({ ...newTask, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
                  {isManager && (
                    <div className="grid gap-2"><Label htmlFor="assignees">Assign To</Label><Select value="placeholder" onValueChange={(v) => { if (!newTask.assigneeIds.includes(v)) setNewTask({ ...newTask, assigneeIds: [...newTask.assigneeIds, v] }) }}><SelectTrigger><SelectValue placeholder="Select users" /></SelectTrigger><SelectContent><SelectItem value={user!.id}>Myself</SelectItem>{users.filter(u => u.uid !== user?.id && !newTask.assigneeIds.includes(u.uid)).map(u => (<SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>))}</SelectContent></Select></div>
                  )}
                </div>
                {isManager && newTask.assigneeIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">{newTask.assigneeIds.map(id => { const assignee = id === user?.id ? { name: 'You' } : users.find(u => u.uid === id); return <Badge key={id} variant="secondary" className="flex items-center gap-1 py-1 px-2"><UserCircle2 className="h-3 w-3" />{assignee?.name || 'Unknown'}<button onClick={() => setNewTask({ ...newTask, assigneeIds: newTask.assigneeIds.filter(aid => aid !== id) })} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge> })}</div>
                )}
                {isManager && (
                  <>
                    <div className="grid gap-2"><Label htmlFor="viewers">Can View Progress (Optional)</Label><Select value="placeholder" onValueChange={(v) => { if (!newTask.viewerIds.includes(v) && !newTask.assigneeIds.includes(v)) setNewTask({ ...newTask, viewerIds: [...newTask.viewerIds, v] }) }}><SelectTrigger><SelectValue placeholder="Select viewers" /></SelectTrigger><SelectContent>{users.filter(u => !newTask.viewerIds.includes(u.uid) && !newTask.assigneeIds.includes(u.uid)).map(u => (<SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>))}</SelectContent></Select></div>
                    {newTask.viewerIds.length > 0 && (<div className="flex flex-wrap gap-2">{newTask.viewerIds.map(id => { const viewer = users.find(u => u.uid === id); return <Badge key={id} variant="outline" className="flex items-center gap-1 py-1 px-2"><UserCircle2 className="h-3 w-3" />{viewer?.name || 'Unknown'}<button onClick={() => setNewTask({ ...newTask, viewerIds: newTask.viewerIds.filter(vid => vid !== id) })} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge> })})</div>)}
                  </>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label htmlFor="dueDate">Due Date</Label><Input id="dueDate" type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} /></div>
                  <div className="grid gap-2"><Label htmlFor="dueTime">Due Time</Label><Input id="dueTime" type="time" value={newTask.dueTime} onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })} /></div>
                </div>

                {/* Milestone toggle */}
                {isManager && (
                  <div className="grid gap-3 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input type="checkbox" checked={newTask.useMilestones} onChange={(e) => setNewTask({ ...newTask, useMilestones: e.target.checked, milestones: e.target.checked ? [{ title: "", description: "" }] : [] })} className="rounded" />
                      Break this task into milestones?
                    </label>
                    {newTask.useMilestones && (
                      <div className="space-y-3">
                        {newTask.milestones.map((m, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-slate-400 text-xs font-bold pt-2 w-4">{i + 1}</span>
                            <div className="flex-1 space-y-1.5">
                              <Input placeholder={`Milestone ${i + 1} title`} value={m.title} onChange={(e) => { const ms = [...newTask.milestones]; ms[i] = { ...ms[i], title: e.target.value }; setNewTask({ ...newTask, milestones: ms }) }} className="h-8 text-sm" />
                              <Input placeholder="Description (optional)" value={m.description || ""} onChange={(e) => { const ms = [...newTask.milestones]; ms[i] = { ...ms[i], description: e.target.value }; setNewTask({ ...newTask, milestones: ms }) }} className="h-7 text-xs" />
                            </div>
                            {newTask.milestones.length > 1 && (
                              <button onClick={() => { const ms = newTask.milestones.filter((_, j) => j !== i); setNewTask({ ...newTask, milestones: ms }) }} className="pt-2 text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                            )}
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setNewTask({ ...newTask, milestones: [...newTask.milestones, { title: "", description: "" }] })}><Plus className="h-3 w-3 mr-1" />Add Milestone</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter><Button onClick={handleCreateTask} disabled={!newTask.title || !newTask.description || isAddingTask || (newTask.useMilestones && newTask.milestones.some(m => !m.title.trim()))}>{isAddingTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}{isManager ? "Assign Task" : "Create Task"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full md:max-w-md">
          <Input placeholder="Search tasks..." className="pl-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" asChild className="bg-white/60 backdrop-blur-sm"><a href="/tasks/kanban"><LayoutGrid className="mr-2 h-4 w-4" /> Kanban</a></Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-white/60 backdrop-blur-sm"><Filter className="mr-2 h-3.5 w-3.5 text-slate-400" /><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="pending_completion_review">Final Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs + Task Grid */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/40 dark:bg-slate-900/40 p-1 rounded-xl border border-slate-200/20 dark:border-slate-800/20 w-full justify-start overflow-x-auto">
          {[{ id: "all", label: "All" }, { id: "todo", label: "To Do" }, { id: "in_progress", label: "In Progress" }, { id: "pending_review", label: "Review" }, { id: "pending_completion_review", label: "Final" }, { id: "completed", label: "Done" }].map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="relative data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none text-xs">
              {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute inset-0 bg-slate-800 dark:bg-slate-200 rounded-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
              <span className="relative z-10">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <AnimatePresence mode="wait">
          <TabsContent value={activeTab} className="mt-6 outline-none" forceMount>
            {initialLoad ? <TaskSkeleton /> : (
              <motion.div key={activeTab} variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {getTasksByStatus(activeTab).length === 0 ? (
                  <motion.div className="col-span-full flex h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/5 p-8 text-center">
                    <CheckCircle className="h-8 w-8 text-slate-300 mb-3" />
                    <h3 className="text-base font-medium text-slate-500">No tasks found</h3>
                    <p className="text-sm text-slate-400 mt-1">{searchQuery ? "Try adjusting your search" : "Create a new task to get started"}</p>
                  </motion.div>
                ) : getTasksByStatus(activeTab).map((task) => <TaskCard key={task.id} task={task} />)}
              </motion.div>
            )}
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* ===== VIEW DETAILS MODAL ===== */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          {detailTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">{getStatusBadge(detailTask)}<Badge variant="outline" className={`rounded-md border text-[11px] ${getPriorityColor(detailTask.priority)}`}>{detailTask.priority}</Badge></div>
                <DialogTitle className="text-lg">{detailTask.title}</DialogTitle>
                <DialogDescription>{detailTask.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Progress ring */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700" />
                      <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round" className="text-blue-600" strokeDasharray={`${detailTask.progress * 0.973} 97.3`} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{detailTask.progress}%</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Progress</p>
                    <p className="text-slate-500 text-xs">Assigned to {getAssigneeName(detailTask)}</p>
                    {detailTask.dueDatetime && <p className="text-slate-400 text-xs">Due {getDueDisplay(detailTask)}</p>}
                  </div>
                </div>

                {/* Milestone stepper */}
                {(milestones.length > 0 || detailTask?.isPhased) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" />Milestones</p>
                      {isAssigner(detailTask) && (
                        <Button variant="ghost" size="sm" className="h-6 text-[11px] text-slate-500 hover:text-slate-700" onClick={openManageMilestones}>Manage</Button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {milestones.sort((a: any, b: any) => a.order_index - b.order_index).map((m: any, i: number) => {
                        const isApproved = m.status === "approved"
                        const isActionable = getNextActionableIndex(milestones) === m.order_index
                        const isLocked = !isApproved && !isActionable
                        const isAssignee = detailTask.assigneeIds?.includes(user?.id)
                        const isAssigner = detailTask.assignedBy === user?.id
                        const canStart = isAssignee && m.status === "not_started" && isActionable
                        const canSubmit = isAssignee && m.status === "in_progress" && isActionable
                        const canReview = isAssigner && m.status === "pending_review"

                        return (
                          <div key={m.id} className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${isLocked ? "bg-slate-50/50 opacity-50 border-slate-100" : isActionable ? "bg-blue-50/50 border-blue-200" : isApproved ? "bg-emerald-50/30 border-emerald-200" : "bg-white border-slate-200"}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${isApproved ? "bg-emerald-500 text-white" : isActionable ? "bg-blue-500 text-white" : "bg-slate-300 text-slate-500"}`}>
                                {isApproved ? <CheckCircle className="h-3 w-3" /> : isLocked ? <Lock className="h-3 w-3" /> : i + 1}
                              </div>
                              <span className="truncate">{m.title}</span>
                              {getMilestoneStatusBadge(m.status)}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              {canStart && <Button variant="ghost" size="sm" className="h-7 text-[11px] text-blue-600 hover:text-blue-700" onClick={() => handleStartMilestone(m.id)}><Play className="h-3 w-3 mr-1" />Start</Button>}
                              {canSubmit && <Button variant="ghost" size="sm" className="h-7 text-[11px] text-blue-600 hover:text-blue-700" onClick={() => openMilestoneDialog(m.id, "submit")}><Send className="h-3 w-3 mr-1" />Submit</Button>}
                              {canReview && <div className="flex gap-1"><Button variant="ghost" size="sm" className="h-7 text-[11px] text-green-600 hover:text-green-700" onClick={() => openMilestoneDialog(m.id, "approve")}><CheckCircle className="h-3 w-3" /></Button><Button variant="ghost" size="sm" className="h-7 text-[11px] text-red-600 hover:text-red-700" onClick={() => openMilestoneDialog(m.id, "reject")}><X className="h-3 w-3" /></Button></div>}
                              {(m.status === "needs_revision" && isAssignee && isActionable) && <Button variant="ghost" size="sm" className="h-7 text-[11px] text-amber-600" onClick={() => openMilestoneDialog(m.id, "submit")}><Send className="h-3 w-3 mr-1" />Resubmit</Button>}
                              {m.latestReview?.employee_file_url && (
                                <Button variant="ghost" size="sm" className="h-6 px-1" title="Download employee file" onClick={() => downloadFile(m.latestReview.employee_file_url, m.latestReview.employee_file_name || "file")}><FileText className="h-3 w-3 text-blue-500" /></Button>
                              )}
                              {m.latestReview?.reviewer_file_url && (
                                <Button variant="ghost" size="sm" className="h-6 px-1" title="Download reviewer file" onClick={() => downloadFile(m.latestReview.reviewer_file_url, m.latestReview.reviewer_file_name || "file")}><FileText className="h-3 w-3 text-amber-500" /></Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Assigner notes */}
                {detailTask.reviewAssignerNotes && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Assigner Notes</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">{detailTask.reviewAssignerNotes}</p>
                  </div>
                )}

                {/* Assignee notes from last review */}
                {detailTask.reviewNotes && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Progress Notes</p>
                    <p className="text-sm text-blue-800 dark:text-blue-300">{detailTask.reviewNotes}</p>
                  </div>
                )}

                {/* Submission file */}
                {detailTask.submissionFileUrl && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 min-w-0">
                      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate">{detailTask.submissionFileName || "Submission file"}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="flex-shrink-0 ml-2" onClick={() => downloadFile(detailTask.submissionFileUrl, detailTask.submissionFileName || "file")}><Download className="h-4 w-4 mr-1" />Open</Button>
                  </div>
                )}
                {/* Reviewer file */}
                {detailTask.reviewAssignerFileUrl && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 min-w-0">
                      <FileText className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span className="truncate">{detailTask.reviewAssignerFileName || "Attached file"}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="flex-shrink-0 ml-2" onClick={() => downloadFile(detailTask.reviewAssignerFileUrl, detailTask.reviewAssignerFileName || "file")}><Download className="h-4 w-4 mr-1" />Open</Button>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                {detailTask.status === "todo" && isAssignee(detailTask) && (
                  <Button onClick={() => handleStartTask(detailTask.id, detailTask.isPhased)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"><Play className="mr-2 h-4 w-4" />{detailTask.isPhased ? "Start First Milestone" : "Start Task"}</Button>
                )}
                {detailTask.status === "pending_review" && isAssigner(detailTask) && (
                  <Button onClick={() => { setAssignerReviewTask(detailTask); setAssignerProgress(detailTask.progress); setAssignerNotes(""); setAssignerFile(null); setAssignerAction("review"); setAssignerReviewOpen(true); setDetailDialogOpen(false) }} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"><MessageSquare className="mr-2 h-4 w-4" />Review Progress</Button>
                )}
                {detailTask.status === "pending_completion_review" && isAssigner(detailTask) && (
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" className="flex-1" onClick={() => { setAssignerReviewTask(detailTask); setAssignerNotes(""); setAssignerFile(null); setAssignerAction("reject"); setAssignerReviewOpen(true); setDetailDialogOpen(false) }}>Reject</Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setAssignerReviewTask(detailTask); setAssignerNotes(""); setAssignerFile(null); setAssignerAction("approve"); setAssignerReviewOpen(true); setDetailDialogOpen(false) }}>Approve & Complete</Button>
                  </div>
                )}
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== MILESTONE REVIEW DIALOG ===== */}
      <Dialog open={milestoneDialogOpen} onOpenChange={(open) => { if (!open) { setMilestoneDialogOpen(false); setMilestoneFile(null) } }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {milestoneAction === "submit" ? "Submit Milestone for Review" :
               milestoneAction === "approve" ? "Approve Milestone" : "Reject Milestone"}
            </DialogTitle>
            <DialogDescription>
              {milestoneAction === "submit" ? "Add an optional comment and file for the assigner to review." :
               milestoneAction === "approve" ? "Confirm approval for this milestone." :
               "Send the milestone back with feedback."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Comment</Label>
              <Textarea value={milestoneComment} onChange={(e) => setMilestoneComment(e.target.value)} placeholder={milestoneAction === "approve" ? "Approval notes..." : milestoneAction === "reject" ? "What needs to be fixed..." : "What I've completed..."} rows={3} />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5 text-slate-400" />Attach File <span className="text-slate-400 text-xs font-normal">(optional)</span></Label>
              <Input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif" onChange={(e) => setMilestoneFile(e.target.files?.[0] || null)} />
              {milestoneFile && <p className="text-xs text-slate-500"><FileText className="h-3 w-3 inline mr-1" />{milestoneFile.name} ({(milestoneFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button>
            {milestoneAction === "submit" && (
              <Button onClick={handleSubmitMilestoneReview} disabled={isMilestoneSubmitting}>
                {isMilestoneSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Submit for Review
              </Button>
            )}
            {milestoneAction === "approve" && (
              <Button onClick={handleApproveMilestone} disabled={isMilestoneSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                {isMilestoneSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}Approve Milestone
              </Button>
            )}
            {milestoneAction === "reject" && (
              <Button onClick={handleRejectMilestone} disabled={isMilestoneSubmitting} variant="destructive">Reject & Return</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MANAGE MILESTONES DIALOG (assigner mid-task) ===== */}
      <Dialog open={manageMilestonesOpen} onOpenChange={(open) => { if (!open) { setManageMilestonesOpen(false); setEditingMilestone(null); setNewMilestoneTitle("") } }}>
        <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Milestones</DialogTitle>
            <DialogDescription>Add, edit, reorder, or remove milestones for "{detailTask?.title}".</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {milestoneListForManage.length > 0 && (
              <div className="space-y-1.5">
                {milestoneListForManage.map((m: any, i: number) => (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] font-bold text-slate-400 w-5 flex-shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm truncate">{m.title}</span>
                    {getMilestoneStatusBadge(m.status)}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={i === 0} onClick={() => moveMilestone(i, -1)}><ArrowUpCircle className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={i === milestoneListForManage.length - 1} onClick={() => moveMilestone(i, 1)}><ArrowUpCircle className="h-3 w-3 rotate-180" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[11px] text-slate-500 hover:text-slate-700" onClick={() => setEditingMilestone({ ...m })}>Edit</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[11px] text-red-500 hover:text-red-700" onClick={() => handleDeleteMilestone(m.id)}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input placeholder="New milestone title" value={newMilestoneTitle} onChange={(e) => setNewMilestoneTitle(e.target.value)} className="h-9" />
              <Button size="sm" onClick={handleAddMilestoneMidTask} disabled={!newMilestoneTitle.trim()}><Plus className="h-4 w-4" />Add</Button>
            </div>
            {milestoneListForManage.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No milestones yet. Add one to get started.</p>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setManageMilestonesOpen(false); setEditingMilestone(null); setNewMilestoneTitle("") }}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT MILESTONE DIALOG ===== */}
      <Dialog open={!!editingMilestone} onOpenChange={(open) => { if (!open) setEditingMilestone(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={editingMilestone?.title || ""} onChange={(e) => setEditingMilestone({ ...editingMilestone, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={editingMilestone?.description || ""} onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })} rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Weight (%)</Label>
              <Input type="number" min={0} max={100} value={editingMilestone?.weight || 0} onChange={(e) => setEditingMilestone({ ...editingMilestone, weight: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMilestone(null)}>Cancel</Button>
            <Button onClick={handleEditMilestone}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SUBMIT FOR REVIEW MODAL ===== */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => { if (!open) { setReviewDialogOpen(false); setReviewFile(null); setReviewNotes("") } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Submit for Review</DialogTitle>
            <DialogDescription>Choose the type of review to send to the assigner.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Review type selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReviewType("progress")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${reviewType === "progress" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
              >
                <MessageSquare className={`h-5 w-5 mb-2 ${reviewType === "progress" ? "text-blue-600" : "text-slate-400"}`} />
                <p className={`text-sm font-semibold ${reviewType === "progress" ? "text-blue-700 dark:text-blue-400" : "text-slate-600 dark:text-slate-300"}`}>Progress Update</p>
                <p className="text-xs text-slate-400 mt-1">Share what's done, attach files optionally</p>
              </button>
              <button
                type="button"
                onClick={() => { if (reviewType !== "completion-gated") setReviewType("completion") }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${reviewType === "completion" ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : reviewType === "completion-gated" ? "border-slate-200 dark:border-slate-700 bg-slate-50/50 opacity-50 cursor-not-allowed" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
              >
                {reviewType === "completion-gated" ? <Lock className="h-5 w-5 mb-2 text-slate-400" /> : <CheckCircle className={`h-5 w-5 mb-2 ${reviewType === "completion" ? "text-purple-600" : "text-slate-400"}`} />}
                <p className={`text-sm font-semibold ${reviewType === "completion" ? "text-purple-700 dark:text-purple-400" : "text-slate-600 dark:text-slate-300"}`}>Completion Review</p>
                <p className="text-xs text-slate-400 mt-1">{reviewType === "completion-gated" ? "Complete all milestones first" : "Task is done, file attachment required"}</p>
              </button>
            </div>

            {/* Progress notes */}
            <div className="grid gap-2">
              <Label htmlFor="reviewNotes">{reviewType === "progress" ? "Progress Notes" : "Notes (optional)"}</Label>
              <Textarea id="reviewNotes" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder={reviewType === "progress" ? "What's done, what's left to do..." : "Any notes for the assigner..."} rows={3} />
            </div>

            {/* Optional file upload for progress */}
            {reviewType === "progress" && (
              <div className="grid gap-2 p-4 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10">
                <Label htmlFor="reviewFile" className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5 text-blue-600" />Attachment <span className="text-slate-400 text-xs font-normal">(optional)</span></Label>
                <Input id="reviewFile" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif" onChange={(e) => setReviewFile(e.target.files?.[0] || null)} />
                {reviewFile && <p className="text-xs text-slate-500 flex items-center gap-1"><FileText className="h-3 w-3 text-blue-500" />{reviewFile.name} ({(reviewFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
              </div>
            )}

            {/* File upload for completion */}
            {reviewType === "completion" && (
              <div className="grid gap-2 p-4 rounded-lg border border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10">
                <Label htmlFor="reviewFile" className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5 text-purple-600" />Attachment <span className="text-red-500">*</span></Label>
                <Input id="reviewFile" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif" onChange={(e) => setReviewFile(e.target.files?.[0] || null)} />
                {reviewFile && <p className="text-xs text-slate-500 flex items-center gap-1"><FileText className="h-3 w-3 text-purple-500" />{reviewFile.name} ({(reviewFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
                {!reviewFile && <p className="text-xs text-red-500">File attachment is required for completion review.</p>}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            {reviewType === "progress" ? (
              <Button onClick={handleSubmitProgressReview} disabled={!reviewNotes.trim() || isReviewSubmitting}>
                {isReviewSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Submit Progress Update
              </Button>
            ) : (
              <Button onClick={handleSubmitCompletionReview} disabled={!reviewFile || isReviewSubmitting} className="bg-purple-600 hover:bg-purple-700">
                {isReviewSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}Submit for Completion
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ASSIGNER REVIEW MODAL (progress, approve & reject) ===== */}
      <Dialog open={assignerReviewOpen} onOpenChange={(open) => { if (!open) { setAssignerReviewOpen(false); setAssignerFile(null) } }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>
              {assignerReviewTask?.status === "pending_review" ? "Review Progress" :
               assignerReviewTask?.status === "pending_completion_review" ? "Approve Completion" : "Review"}
            </DialogTitle>
            <DialogDescription>
              {assignerReviewTask?.status === "pending_review" ? "Set the actual progress percentage and leave feedback." :
               assignerReviewTask?.status === "pending_completion_review" ? "Attach an optional file and confirm approval." :
               "Send the task back with feedback explaining what needs work."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {assignerReviewTask?.status === "pending_review" && (
              <div className="grid gap-2">
                <Label>Progress ({assignerProgress}%)</Label>
                <input type="range" min={0} max={100} value={assignerProgress} onChange={(e) => setAssignerProgress(parseInt(e.target.value))} className="w-full" />
                <div className="flex justify-between text-xs text-slate-400"><span>0%</span><span>50%</span><span>100%</span></div>
                {assignerReviewTask?.reviewNotes && (
                  <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border text-sm text-blue-800 dark:text-blue-300">
                    <p className="text-xs font-medium text-blue-600 mb-1">Assignee's notes:</p>
                    {assignerReviewTask.reviewNotes}
                  </div>
                )}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="assignerNotes">Feedback</Label>
              <Textarea id="assignerNotes" value={assignerNotes} onChange={(e) => setAssignerNotes(e.target.value)} placeholder="Leave feedback or comments..." rows={3} />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5 text-slate-400" />Attach File (optional)</Label>
              <Input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif" onChange={(e) => setAssignerFile(e.target.files?.[0] || null)} />
              {assignerFile && <p className="text-xs text-slate-500 flex items-center gap-1"><FileText className="h-3 w-3 text-blue-500" />{assignerFile.name} ({(assignerFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignerReviewOpen(false)}>Cancel</Button>
            {assignerAction === "review" ? (
              <Button onClick={handleAssignerReviewProgress} disabled={isUpdatingTask} className="bg-amber-600 hover:bg-amber-700">{isUpdatingTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Set Progress</Button>
            ) : assignerAction === "approve" ? (
              <Button onClick={() => handleApproveCompletion(assignerReviewTask!.id)} disabled={isUpdatingTask} className="bg-emerald-600 hover:bg-emerald-700">{isUpdatingTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}Confirm Approval</Button>
            ) : (
              <Button onClick={() => handleRejectCompletion(assignerReviewTask!.id)} disabled={isUpdatingTask} variant="destructive">Reject & Return</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
