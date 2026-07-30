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
  Loader2, Plus, Search, Filter, CheckCircle, CheckSquare,
  UserCircle2, LayoutGrid, Calendar as CalendarIcon, X, FileText, Eye,
  Send, Play, MessageSquare, Download, Paperclip, Lock, ListChecks, Unlock,
  ChevronDown, ArrowUpDown, Info, Trash2, Pencil, Clock
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PageHeader } from "@/components/ui/page-header"
import { AnimatedTabs } from "@/components/ui/animated-tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { StatusPill } from "@/components/tasks/status-pill"
import { PriorityPill } from "@/components/tasks/priority-pill"
import { MilestoneStatusBadge } from "@/components/tasks/milestone-status-badge"
import { FileDropZone } from "@/components/tasks/file-drop-zone"
import { TaskButton, TaskButtonGhost } from "@/components/tasks/task-button"
import { CardProgressBar } from "@/components/tasks/card-progress-bar"
import { ProgressRing } from "@/components/tasks/progress-ring"

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
  const [titleError, setTitleError] = useState(false)
  const [descriptionError, setDescriptionError] = useState(false)
  const [assigneeError, setAssigneeError] = useState(false)
  const [dueDateError, setDueDateError] = useState(false)
  const [dueTimeError, setDueTimeError] = useState(false)
  const [pastDatetimeError, setPastDatetimeError] = useState(false)
  const [milestoneFormError, setMilestoneFormError] = useState(false)
  const [milestoneErrors, setMilestoneErrors] = useState<Record<number, { title?: boolean; description?: boolean; dueDate?: boolean; dueTime?: boolean; pastDatetime?: boolean }>>({})
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
  const [activeMilestoneReviewData, setActiveMilestoneReviewData] = useState<any>(null)
  const [viewingReviewMilestone, setViewingReviewMilestone] = useState<any>(null)

  // Mid-task milestone management state
  const [manageMilestonesOpen, setManageMilestonesOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<any>(null)
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("")
  const [newMilestoneDescription, setNewMilestoneDescription] = useState("")
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState("")
  const [newMilestoneDueTime, setNewMilestoneDueTime] = useState("")
  const [milestoneListForManage, setMilestoneListForManage] = useState<any[]>([])
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null)

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
    milestones: [] as { title: string; description: string; dueDate: string; dueTime: string; weight?: number }[]
  })

  const isCEO = user?.role === "CEO"
  const isManager = user?.role === "CEO" || user?.role === "C_LEVEL" || user?.role === "LEAD"
  const isCLevel = user?.role === "CEO" || user?.role === "C_LEVEL"

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

  const refreshDetailTask = async () => {
    const freshTasks = await tasksAPI.getUserTasks(user!.id, user!.role)
    setTasks(freshTasks)
    if (detailTask) {
      const updated = freshTasks.find((t: any) => t.id === detailTask.id)
      if (updated) setDetailTask(updated)
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
      setExpandedMilestoneId(null)
    }
  }, [detailDialogOpen, detailTask?.id])

  // --- Milestone handlers ---
  const handleStartMilestone = async (milestoneId: string) => {
    try {
      await tasksAPI.startMilestone(milestoneId)
      if (detailTask) { const m = await tasksAPI.getTaskMilestones(detailTask.id); setMilestones(m) }
      toast({
        title: "Milestone started!",
        description: "This milestone is now in progress. Submit for review when done."
      })
    } catch (error: any) {
      console.error("Failed to start milestone:", error)
      toast({ title: "Error", description: error?.message || "Failed to start milestone", variant: "destructive" })
    }
  }

  const handleSubmitMilestoneReview = async () => {
    if (!milestoneDialogId) return
    if (!milestoneFile) {
      toast({ title: "Document required", description: "Please attach a supporting document for this milestone.", variant: "destructive" })
      return
    }
    try {
      setIsMilestoneSubmitting(true)
      await tasksAPI.submitMilestoneReview(milestoneDialogId, milestoneComment, milestoneFile || undefined, user?.id)
      if (detailTask) { const m = await tasksAPI.getTaskMilestones(detailTask.id); setMilestones(m) }
      await fetchTasks()
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
      if (detailTask) {
        const m = await tasksAPI.getTaskMilestones(detailTask.id);
        setMilestones(m);
        await fetchTasks();
        // Update the detailTask to reflect status changes (e.g., if it moved to completed)
        const freshTasks = await tasksAPI.getUserTasks(user!.id, user!.role);
        const updated = freshTasks.find((t: any) => t.id === detailTask.id);
        if (updated) setDetailTask(updated);
      }
      setMilestoneDialogOpen(false); setMilestoneComment(""); setMilestoneFile(null)
      toast({ title: "Milestone approved" })
    } catch (error: any) { toast({ title: "Error", description: error?.message, variant: "destructive" }) }
    finally { setIsMilestoneSubmitting(false) }
  }

  const handleRejectMilestone = async () => {
    if (!milestoneDialogId) return
    if (!milestoneComment.trim()) {
      toast({ title: "Feedback required", description: "Please provide feedback before rejecting a milestone.", variant: "destructive" })
      return
    }
    try {
      setIsMilestoneSubmitting(true)
      await tasksAPI.rejectMilestone(milestoneDialogId, milestoneComment, user!.id, milestoneFile || undefined, user?.id)
      if (detailTask) { const m = await tasksAPI.getTaskMilestones(detailTask.id); setMilestones(m) }
      await fetchTasks()
      setMilestoneDialogOpen(false); setMilestoneComment(""); setMilestoneFile(null)
      toast({ title: "Milestone returned for revision" })
    } catch (error: any) { toast({ title: "Error", description: error?.message, variant: "destructive" }) }
    finally { setIsMilestoneSubmitting(false) }
  }

  const handleQuickMilestoneAction = async (taskId: string, action: "approve" | "reject") => {
    try {
      const ms = await tasksAPI.getTaskMilestones(taskId)
      const pendingMs = ms.find(m => m.status === "pending_review")
      if (pendingMs) {
        const t = tasks.find(task => task.id === taskId)
        if (t) setDetailTask(t)
        setMilestones(ms)
        setActiveMilestoneReviewData(pendingMs)
        openMilestoneDialog(pendingMs.id, action, ms)
      } else {
        toast({ title: "No pending milestone", description: "This task does not have a milestone awaiting review." })
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to open milestone.", variant: "destructive" })
    }
  }

  const isPastDeadline = (dateStr?: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr).getTime() < Date.now();
  };

  const handleToggleLateSubmission = async (id: string, allow: boolean, isMilestone: boolean) => {
    try {
      if (isMilestone) {
        await tasksAPI.toggleLateSubmissionMilestone(id, allow);
        if (detailTask) {
          const m = await tasksAPI.getTaskMilestones(detailTask.id);
          setMilestones(m);
        }
      } else {
        await tasksAPI.toggleLateSubmissionTask(id, allow);
        await fetchTasks();
        if (detailTask && detailTask.id === id) {
          refreshDetailTask();
        }
      }
      toast({ title: allow ? "Submission Unlocked" : "Submission Locked" });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" });
    }
  };

  const handleToggleMilestoneSubmission = async (milestoneId: string, currentOpen: boolean) => {
    try {
      await tasksAPI.toggleMilestoneSubmission(milestoneId, !currentOpen)
      if (detailTask) { const m = await tasksAPI.getTaskMilestones(detailTask.id); setMilestones(m) }
      toast({
        title: !currentOpen ? "Submissions re-opened" : "Submissions closed",
        description: !currentOpen ? "The assignee can now submit this milestone." : "The deadline for this milestone is now closed."
      })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    }
  }

  const openMilestoneDialog = async (milestoneId: string, actionType: "submit" | "approve" | "reject", currentMilestoneList?: any[]) => {
    setMilestoneDialogId(milestoneId)
    setMilestoneAction(actionType)
    setMilestoneComment("")
    setMilestoneFile(null)

    const list = currentMilestoneList || milestones
    let target = list.find((m: any) => m.id === milestoneId)
    if ((!target || !target.latestReview) && detailTask?.id) {
      try {
        const ms = await tasksAPI.getTaskMilestones(detailTask.id)
        setMilestones(ms)
        target = ms.find((m: any) => m.id === milestoneId) || target
      } catch { /* fallback */ }
    }
    setActiveMilestoneReviewData(target || null)
    setMilestoneDialogOpen(true)
  }

  // --- Mid-task milestone management handlers ---
  const openManageMilestones = async () => {
    if (!detailTask) return
    const ms = await tasksAPI.getTaskMilestones(detailTask.id)
    setMilestoneListForManage(ms)
    setManageMilestonesOpen(true)
  }

  const handleAddMilestoneMidTask = async () => {
    if (!detailTask || !newMilestoneTitle.trim() || !newMilestoneDescription.trim() || !newMilestoneDueDate || !newMilestoneDueTime) return

    const [year, month, day] = newMilestoneDueDate.split('-');
    const [hours, minutes] = newMilestoneDueTime.split(':');
    const mDt = new Date();
    mDt.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
    mDt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (mDt.getTime() < Date.now()) {
      toast({
        title: "Invalid milestone date/time",
        description: "The due date and time cannot be in the past.",
        variant: "destructive"
      });
      return;
    }

    try {
      await tasksAPI.addMilestone(detailTask.id, {
        title: newMilestoneTitle.trim(),
        description: newMilestoneDescription.trim(),
        dueDate: newMilestoneDueDate,
        dueTime: newMilestoneDueTime,
      })
      const ms = await tasksAPI.getTaskMilestones(detailTask.id)
      setMilestoneListForManage(ms)
      setMilestones(ms)
      setNewMilestoneTitle("")
      setNewMilestoneDescription("")
      setNewMilestoneDueDate("")
      setNewMilestoneDueTime("")
      await fetchTasks()
      toast({ title: "Milestone added" })
    } catch (error: any) { toast({ title: "Error", description: error?.message, variant: "destructive" }) }
  }

  const handleEditMilestone = async () => {
    if (!editingMilestone) return

    const [year, month, day] = editingMilestone.dueDate.split('-');
    const [hours, minutes] = editingMilestone.dueTime.split(':');
    const mDt = new Date();
    mDt.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
    mDt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (mDt.getTime() < Date.now()) {
      toast({
        title: "Invalid milestone date/time",
        description: "The due date and time cannot be in the past.",
        variant: "destructive"
      });
      return;
    }

    // Check total weights sum to 100
    const otherMilestonesWeight = milestoneListForManage
      .filter((m: any) => m.id !== editingMilestone.id)
      .reduce((sum: number, m: any) => sum + (m.weight || 0), 0)
    const newTotal = otherMilestonesWeight + (editingMilestone.weight || 0)
    if (newTotal !== 100) {
      toast({
        title: "Invalid weight",
        description: `Total milestone weights must equal 100%. Current total: ${newTotal}%.`,
        variant: "destructive"
      })
      return
    }
    try {
      const dueDate = editingMilestone.dueDate || (editingMilestone.due_datetime ? new Date(editingMilestone.due_datetime).toISOString().split('T')[0] : "")
      const dueTime = editingMilestone.dueTime || (editingMilestone.due_datetime ? new Date(editingMilestone.due_datetime).toTimeString().slice(0, 5) : "")
      const dueDatetime = dueDate && dueTime ? new Date(`${dueDate}T${dueTime}:00`).toISOString() : null

      await tasksAPI.updateMilestone(editingMilestone.id, {
        title: editingMilestone.title,
        description: editingMilestone.description,
        weight: editingMilestone.weight,
        due_datetime: dueDatetime || undefined,
      })
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

  const getNextActionableIndex = (milestones: any[]) => {
    const firstPending = milestones.find(m => m.status !== "approved")
    return firstPending ? firstPending.order_index : -1
  }

  // Helper for auto-scrolling to missing required fields
  const scrollToElement = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 50)
  }

  // --- Create Task ---
  const handleCreateTask = async () => {
    if (!user) return

    // Validate: Title is mandatory
    if (!newTask.title.trim()) {
      setTitleError(true)
      scrollToElement("task-form-title")
      return
    }
    setTitleError(false)

    // Validate: Description is mandatory
    if (!newTask.description.trim()) {
      setDescriptionError(true)
      scrollToElement("task-form-description")
      return
    }
    setDescriptionError(false)

    // Validate: manager must select at least one assignee
    if (isManager && newTask.assigneeIds.length === 0) {
      setAssigneeError(true)
      scrollToElement("task-form-assignee")
      return
    }
    setAssigneeError(false)

    // Validate: Due Date and Due Time are mandatory
    if (!newTask.dueDate) {
      setDueDateError(true)
      scrollToElement("task-form-due-date")
      return
    }
    setDueDateError(false)

    if (!newTask.dueTime) {
      setDueTimeError(true)
      scrollToElement("task-form-due-time")
      return
    }
    setDueTimeError(false)

    // Helper to normalize 2-digit years (e.g. 26 -> 2026)
    const parseYear = (yearStr: string) => {
      let yr = parseInt(yearStr, 10)
      if (yr < 100) yr += 2000
      return yr
    }

    // Validate: combined datetime must not be in the past
    const [tYear, tMonth, tDay] = newTask.dueDate.split('-');
    const [tHours, tMinutes] = newTask.dueTime.split(':');
    const constructedDt = new Date();
    constructedDt.setFullYear(parseYear(tYear), parseInt(tMonth) - 1, parseInt(tDay));
    constructedDt.setHours(parseInt(tHours), parseInt(tMinutes), 0, 0);

    if (constructedDt.getTime() < Date.now()) {
      setPastDatetimeError(true)
      scrollToElement("task-form-due-time")
      toast({
        title: "Invalid due date/time",
        description: "The due date and time cannot be in the past.",
        variant: "destructive"
      })
      return
    }

    // Validate: milestone fields and datetimes
    if (newTask.useMilestones) {
      let milestoneErrorFound = false
      const errors: Record<number, { title?: boolean; description?: boolean; dueDate?: boolean; dueTime?: boolean; pastDatetime?: boolean }> = {}

      for (let i = 0; i < newTask.milestones.length; i++) {
        const m = newTask.milestones[i]
        const itemErrors: { title?: boolean; description?: boolean; dueDate?: boolean; dueTime?: boolean; pastDatetime?: boolean } = {}

        if (!m.title.trim()) {
          itemErrors.title = true
          milestoneErrorFound = true
          scrollToElement(`task-form-milestone-${i}-title`)
        } else if (!m.description?.trim()) {
          itemErrors.description = true
          milestoneErrorFound = true
          scrollToElement(`task-form-milestone-${i}-description`)
        } else if (!m.dueDate) {
          itemErrors.dueDate = true
          milestoneErrorFound = true
          scrollToElement(`task-form-milestone-${i}-dueDate`)
        } else if (!m.dueTime) {
          itemErrors.dueTime = true
          milestoneErrorFound = true
          scrollToElement(`task-form-milestone-${i}-dueTime`)
        } else {
          const [mYear, mMonth, mDay] = m.dueDate.split('-')
          const [mHours, mMinutes] = m.dueTime.split(':')
          const mDt = new Date()
          mDt.setFullYear(parseYear(mYear), parseInt(mMonth) - 1, parseInt(mDay))
          mDt.setHours(parseInt(mHours), parseInt(mMinutes), 0, 0)

          if (mDt.getTime() < Date.now()) {
            itemErrors.pastDatetime = true
            milestoneErrorFound = true
            toast({
              title: "Invalid milestone date/time",
              description: `Milestone "${m.title || 'Untitled'}" has a due date/time in the past.`,
              variant: "destructive"
            })
            scrollToElement(`task-form-milestone-${i}-dueTime`)
          }
        }

        if (Object.keys(itemErrors).length > 0) {
          errors[i] = itemErrors
          if (milestoneErrorFound) {
            setMilestoneErrors(errors)
            return
          }
        }
      }

      if (milestoneErrorFound) {
        setMilestoneErrors(errors)
        return
      }
      setMilestoneErrors({})
    }

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
      setTitleError(false)
      setDescriptionError(false)
      setAssigneeError(false)
      setDueDateError(false)
      setDueTimeError(false)
      setPastDatetimeError(false)
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
        const next = await tasksAPI.getNextActionableMilestone(taskId)
        if (!next) throw new Error("No milestone available to start.")
        await tasksAPI.startMilestone(next.id)
        await tasksAPI.startTask(taskId)
        if (detailTask) { const m = await tasksAPI.getTaskMilestones(detailTask.id); setMilestones(m) }
      } else {
        await tasksAPI.startTask(taskId)
      }
      await fetchTasks()
      toast({
        title: isPhased ? "Milestone started!" : "Task started!",
        description: isPhased
          ? "Your first milestone is now in progress. Good luck!"
          : "Task is now in progress. Submit a progress update when ready."
      })
      setDetailDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to start task:", error)
      toast({ title: "Error", description: error?.message || "Failed to start task.", variant: "destructive" })
    }
  }

  const handleArchiveTask = async (taskId: string) => {
    try {
      await tasksAPI.updateTask(taskId, { status: "archived" })
      await fetchTasks()
      toast({ title: "Task archived", description: "The task has been archived and hidden from active views." })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to archive task.", variant: "destructive" })
    }
  }

  // --- Progress Review ---
  const handleSubmitProgressReview = async () => {
    if (!reviewTaskId) return
    try {
      setIsReviewSubmitting(true)
      await tasksAPI.submitProgressReview(reviewTaskId, reviewNotes, reviewFile || undefined, user?.id)
      await refreshDetailTask()
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
      await tasksAPI.submitCompletionReview(reviewTaskId, fileUrl, fileName, fileSize, reviewNotes)
      await refreshDetailTask()
      setReviewDialogOpen(false); setReviewFile(null); setReviewNotes(""); setReviewTaskId(null)
      toast({ title: "Completion submitted", description: "The assigner will review your work." })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to submit.", variant: "destructive" })
    } finally { setIsReviewSubmitting(false) }
  }

  // --- Assigner: Review Progress ---
  const handleAssignerReviewProgress = async () => {
    if (!assignerReviewTask) return
    if (assignerReviewTask.isPhased) {
      toast({ title: "Milestone Task", description: "Please approve or reject individual milestones to update milestone progress.", variant: "destructive" })
      return
    }
    try {
      setIsUpdatingTask(true)
      let reviewerFile: { url: string; name: string; size: number } | undefined
      if (assignerFile) {
        reviewerFile = await tasksAPI.uploadReviewerFile(assignerReviewTask.id, assignerFile, user!.id)
      }
      await tasksAPI.reviewProgress(assignerReviewTask.id, user!.id, assignerProgress, assignerNotes, reviewerFile)
      await refreshDetailTask()
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
      await tasksAPI.approveCompletion(taskId, user!.id, reviewerFile, assignerNotes)
      await refreshDetailTask()
      setAssignerReviewOpen(false); setAssignerFile(null)
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
      await refreshDetailTask()
      setAssignerReviewOpen(false); setAssignerNotes(""); setAssignerFile(null)
      toast({ title: "Completion rejected", description: "Task returned to in-progress with feedback." })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed.", variant: "destructive" })
    } finally { setIsUpdatingTask(false) }
  }

  const openReviewDialog = async (taskId: string) => {
    setReviewTaskId(taskId); setReviewNotes(""); setReviewFile(null)
    const task = tasks.find(t => t.id === taskId)
    if (task?.isPhased) {
      const allApproved = await tasksAPI.allMilestonesApproved(taskId)
      if (!allApproved) setReviewType("completion-gated")
      else setReviewType("completion")
    } else {
      setReviewType("progress")
    }
    setReviewDialogOpen(true)
  }

  // Exclude archived tasks from all views
  const activeTasks = tasks.filter(t => (t as any).status !== "archived")

  const filteredTasks = activeTasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    return matchesSearch && matchesStatus
  })

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

  const canInteractWithTask = (task: any) => {
    // Full interaction if user assigned the task or is an assignee
    if (isAssigner(task) || isAssignee(task)) return true
    // cPanel users viewing a task they have no role in — read-only
    if (isCLevel) return false
    return true
  }

  // Sort state
  const [sortBy, setSortBy] = useState<"date" | "priority" | "deadline">("date")

  const sortTasksArray = (tasksArray: any[]) => {
    return [...tasksArray].sort((a, b) => {
      if (sortBy === "priority") {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 }
        return (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2)
      }

      if (sortBy === "deadline") {
        const dateA = a.dueDatetime || a.dueDate
        const dateB = b.dueDatetime || b.dueDate
        if (!dateA && !dateB) return 0
        if (!dateA) return 1
        if (!dateB) return -1

        const now = Date.now()
        const diffA = Math.abs(new Date(dateA).getTime() - now)
        const diffB = Math.abs(new Date(dateB).getTime() - now)
        return diffA - diffB
      }
      // Default "date" (Date assigned) - newest first
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return createdB - createdA
    })
  }

  const sortedTasks = sortTasksArray(filteredTasks)

  const getTasksByStatus = (status: string) => {
    if (status === "my_tasks") {
      return sortedTasks.filter(t =>
        t.assignedBy === user?.id ||
        (t.viewerIds && t.viewerIds.includes(user?.id || ""))
      )
    }
    if (status === "archived") {
      // Read from raw tasks (activeTasks excludes archived)
      const archivedTasks = tasks.filter(t =>
        (t as any).status === "archived" &&
        (isAssigner(t) || isAssignee(t)) &&
        (t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      return sortTasksArray(archivedTasks)
    }
    return status === "all" ? sortedTasks : sortedTasks.filter(t => t.status === status)
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

  const TAB_LABELS: Record<string, string> = {
    all: "All",
    ...(isCLevel ? { my_tasks: "My Tasks" } : {}),
    todo: "To Do",
    in_progress: "In Progress",
    pending_review: "Review",
    pending_completion_review: "Final",
    completed: "Done",
    ...(isManager ? { archived: "Archived" } : {}),
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const nowTimeStr = new Date().toTimeString().slice(0, 5)

  return (
    <div className="min-h-screen p-1 space-y-6">
      {/* Hero Header */}
      <PageHeader
        title="Taskboard"
        description={isManager ? "Assign, track, and manage team productivity." : "Manage your tasks and track progress."}
        icon={CheckSquare}
        action={
          <Dialog
            open={isTaskDialogOpen}
            onOpenChange={(open) => {
              setIsTaskDialogOpen(open)
              if (!open) {
                setTitleError(false)
                setDescriptionError(false)
                setAssigneeError(false)
                setDueDateError(false)
                setDueTimeError(false)
                setPastDatetimeError(false)
                setMilestoneErrors({})
                setNewTask({
                  title: "",
                  description: "",
                  priority: "medium",
                  status: "todo",
                  progress: 0,
                  assigneeIds: [],
                  viewerIds: [],
                  dueDate: "",
                  dueTime: "",
                  useMilestones: false,
                  milestones: [],
                })
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg bg-white text-slate-900 hover:bg-slate-100 border-none">
                <Plus className="mr-2 h-5 w-5" />{isManager ? "Assign Task" : "Create Task"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-[#F1F5F9] rounded-[16px] shadow-2xl flex flex-col overflow-hidden p-6">
              <div className="flex-shrink-0 pb-3">
                <DialogHeader>
                  <DialogTitle className="text-[18px] font-bold text-slate-900 dark:text-[#F1F5F9]">
                    {isManager ? "Assign New Task" : "Create New Task"}
                  </DialogTitle>
                  <DialogDescription className="text-[13px] text-slate-500 dark:text-[#64748B]">
                    {isManager ? "Assign a task to team members." : "Create a new task."}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden py-2 pl-2 pr-3 sm:pr-4 space-y-4">
                {/* Title */}
                <div id="task-form-title" className="grid gap-1.5">
                  <Label className="text-[13px] font-medium text-slate-700 dark:text-[#CBD5E1]">
                    Title
                  </Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => {
                      setNewTask({ ...newTask, title: e.target.value })
                      if (e.target.value.trim()) setTitleError(false)
                    }}
                    placeholder="Task title"
                    className={`w-full box-border bg-slate-50 dark:bg-[#0B0F1A] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-[10px] h-10 text-[14px] transition-colors ${titleError ? "border-red-500 focus-visible:ring-red-500/20" : "border-slate-200 dark:border-white/[0.08]"
                      }`}
                  />
                  {titleError && (
                    <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Please fill in the required field.</p>
                  )}
                </div>

                {/* Description */}
                <div id="task-form-description" className="grid gap-1.5">
                  <Label className="text-[13px] font-medium text-slate-700 dark:text-[#CBD5E1]">
                    Description <span className="text-red-500 dark:text-red-400">*</span>
                  </Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => {
                      setNewTask({ ...newTask, description: e.target.value })
                      if (e.target.value.trim()) setDescriptionError(false)
                    }}
                    placeholder="Task description (required)"
                    className={`bg-slate-50 dark:bg-[#0B0F1A] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-[10px] text-[14px] border transition-colors ${descriptionError
                        ? "border-red-500 focus-visible:ring-red-500/20"
                        : "border-slate-200 dark:border-white/[0.08]"
                      }`}
                    rows={3}
                  />
                  {descriptionError && (
                    <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Please fill in the required field.</p>
                  )}
                </div>

                {/* Manager vs Employee Grid Layout */}
                {isManager ? (
                  <>
                    {/* Priority + Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                      <div id="task-form-priority" className="grid gap-1.5">
                        <Label className="text-[13px] font-medium text-slate-700 dark:text-[#CBD5E1]">Priority</Label>
                        <Select value={newTask.priority} onValueChange={(v: any) => setNewTask({ ...newTask, priority: v })}>
                          <SelectTrigger className="bg-slate-50 dark:bg-[#0B0F1A] border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-[#F1F5F9] rounded-[10px] h-10 text-[14px]">
                            <SelectValue placeholder="Medium" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.08]">
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div id="task-form-due-date" className="grid gap-1.5">
                        <Label className="text-[13px] font-medium text-slate-700 dark:text-[#CBD5E1]">
                          Due Date <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          type="date"
                          min={todayStr}
                          value={newTask.dueDate}
                          onChange={(e) => {
                            setNewTask({ ...newTask, dueDate: e.target.value, dueTime: "" })
                            setDueDateError(false)
                            setDueTimeError(false)
                            setPastDatetimeError(false)
                          }}
                          className={`bg-slate-50 dark:bg-[#0B0F1A] text-slate-900 dark:text-[#F1F5F9] rounded-[10px] h-10 text-[14px] transition-colors ${dueDateError ? "border-red-500" : "border-slate-200 dark:border-white/[0.08]"
                            }`}
                        />
                        {dueDateError && (
                          <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Please fill in the required field.</p>
                        )}
                      </div>
                    </div>

                    {/* Assign To + Due Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div id="task-form-assignee" className="grid gap-1.5">
                        <Label className="text-[13px] font-medium text-slate-700 dark:text-[#CBD5E1]">
                          Assign To <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <div className={`rounded-[10px] bg-slate-50 dark:bg-[#0B0F1A] border px-3 py-2 transition-colors min-h-[40px] flex items-center ${assigneeError ? "border-red-500" : "border-slate-200 dark:border-white/[0.08]"
                          }`}>
                          <Select
                            value="placeholder"
                            onValueChange={(v) => {
                              if (!newTask.assigneeIds.includes(v)) {
                                setNewTask({ ...newTask, assigneeIds: [...newTask.assigneeIds, v] })
                                setAssigneeError(false)
                              }
                            }}
                          >
                            <SelectTrigger className="bg-transparent border-0 p-0 h-auto text-slate-900 dark:text-[#F1F5F9] rounded-none shadow-none ring-0 focus:ring-0 text-[14px] w-full">
                              {newTask.assigneeIds.length === 0 ? (
                                <span className="text-slate-400 dark:text-[#475569]">Select team member</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5 min-w-0 pr-2 py-0.5">
                                  {newTask.assigneeIds.map(id => {
                                    const name = id === user?.id ? "You" : users.find(u => u.uid === id)?.name || "Unknown";
                                    return (
                                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-[#3B82F6]/[0.12] text-blue-700 dark:text-[#93C5FD] px-2.5 py-0.5 text-[11px] font-medium max-w-full" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                          <UserCircle2 className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{name}</span>
                                          <button
                                            type="button"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              setNewTask(prev => ({ ...prev, assigneeIds: prev.assigneeIds.filter(aid => aid !== id) }))
                                            }}
                                            className="ml-0.5 hover:text-red-500 flex-shrink-0"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                    )
                                  })}
                                </div>
                              )}
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.08]">
                              <SelectItem value={user!.id}>Myself</SelectItem>
                              {users.filter(u => u.uid !== user?.id && !newTask.assigneeIds.includes(u.uid)).map(u => (
                                <SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {assigneeError && (
                          <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Please fill in the required field.</p>
                        )}
                      </div>

                      <div id="task-form-due-time" className="grid gap-1.5">
                        <Label className="text-[13px] font-medium text-slate-700 dark:text-[#CBD5E1]">
                          Due Time <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          type="time"
                          min={newTask.dueDate === todayStr ? nowTimeStr : undefined}
                          value={newTask.dueTime}
                          onChange={(e) => { setNewTask({ ...newTask, dueTime: e.target.value }); setDueTimeError(false); setPastDatetimeError(false) }}
                          className={`bg-slate-50 dark:bg-[#0B0F1A] text-slate-900 dark:text-[#F1F5F9] rounded-[10px] h-10 text-[14px] transition-colors ${dueTimeError ? "border-red-500" : "border-slate-200 dark:border-white/[0.08]"
                            }`}
                        />
                        {dueTimeError && (
                          <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Please fill in the required field.</p>
                        )}
                        {pastDatetimeError && (
                          <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Due date and time cannot be in the past.</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Priority (Full Width for Employee) */}
                    <div id="task-form-priority" className="grid gap-1.5">
                      <Label className="text-[13px] font-medium text-slate-700 dark:text-[#CBD5E1]">Priority</Label>
                      <Select value={newTask.priority} onValueChange={(v: any) => setNewTask({ ...newTask, priority: v })}>
                        <SelectTrigger className="bg-slate-50 dark:bg-[#0B0F1A] border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-[#F1F5F9] rounded-[10px] h-10 text-[14px]">
                          <SelectValue placeholder="Medium" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.08]">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date + Due Time (Side-by-Side for Employee) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div id="task-form-due-date" className="grid gap-1.5">
                        <Label className="text-[13px] font-medium text-slate-700 dark:text-[#CBD5E1]">
                          Due Date <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          type="date"
                          min={todayStr}
                          value={newTask.dueDate}
                          onChange={(e) => {
                            setNewTask({ ...newTask, dueDate: e.target.value, dueTime: "" })
                            setDueDateError(false)
                            setDueTimeError(false)
                            setPastDatetimeError(false)
                          }}
                          className={`bg-slate-50 dark:bg-[#0B0F1A] text-slate-900 dark:text-[#F1F5F9] rounded-[10px] h-10 text-[14px] transition-colors ${dueDateError ? "border-red-500" : "border-slate-200 dark:border-white/[0.08]"
                            }`}
                        />
                        {dueDateError && (
                          <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Please fill in the required field.</p>
                        )}
                      </div>

                      <div id="task-form-due-time" className="grid gap-1.5">
                        <Label className="text-[13px] font-medium text-slate-700 dark:text-[#CBD5E1]">
                          Due Time <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          type="time"
                          min={newTask.dueDate === todayStr ? nowTimeStr : undefined}
                          value={newTask.dueTime}
                          onChange={(e) => { setNewTask({ ...newTask, dueTime: e.target.value }); setDueTimeError(false); setPastDatetimeError(false) }}
                          className={`bg-slate-50 dark:bg-[#0B0F1A] text-slate-900 dark:text-[#F1F5F9] rounded-[10px] h-10 text-[14px] transition-colors ${dueTimeError ? "border-red-500" : "border-slate-200 dark:border-white/[0.08]"
                            }`}
                        />
                        {dueTimeError && (
                          <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Please fill in the required field.</p>
                        )}
                        {pastDatetimeError && (
                          <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Due date and time cannot be in the past.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Can View Progress (Optional) */}
                {isManager && (
                  <div id="task-form-viewers" className="grid gap-1.5">
                    <Label className="text-[13px] font-medium text-slate-700 dark:text-[#CBD5E1]">Can View Progress (Optional)</Label>
                    <div className="rounded-[10px] bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-white/[0.08] px-3 py-2 min-h-[40px] flex items-center">
                      <Select value="placeholder" onValueChange={(v) => { if (!newTask.viewerIds.includes(v) && !newTask.assigneeIds.includes(v)) setNewTask({ ...newTask, viewerIds: [...newTask.viewerIds, v] }) }}>
                        <SelectTrigger className="bg-transparent border-0 p-0 h-auto text-slate-900 dark:text-[#F1F5F9] rounded-none shadow-none ring-0 focus:ring-0 text-[14px] w-full">
                          {newTask.viewerIds.length === 0 ? (
                            <span className="text-slate-400 dark:text-[#475569]">Select who can view progress</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 min-w-0 pr-2 py-0.5">
                              {newTask.viewerIds.map(id => {
                                const name = users.find(u => u.uid === id)?.name || "Unknown";
                                return (
                                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-200 dark:bg-white/[0.06] text-slate-700 dark:text-[#94A3B8] px-2.5 py-0.5 text-[11px] font-medium max-w-full" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                    <UserCircle2 className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{name}</span>
                                    <button
                                      type="button"
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setNewTask(prev => ({ ...prev, viewerIds: prev.viewerIds.filter(vid => vid !== id) }))
                                      }}
                                      className="ml-0.5 hover:text-red-500 flex-shrink-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.08]">
                          {users.filter(u => !newTask.viewerIds.includes(u.uid) && !newTask.assigneeIds.includes(u.uid)).map(u => (
                            <SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Checkbox Section */}
                {isManager && (
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0F1523]/60 p-3.5 space-y-3.5 box-border w-full">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTask.useMilestones}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            useMilestones: e.target.checked,
                            milestones: e.target.checked ? [{ title: "", description: "", dueDate: "", dueTime: "" }] : []
                          })
                        }
                        className="mt-1 rounded accent-[#3B82F6] h-4 w-4"
                      />
                      <div>
                        <div className="text-[14px] font-semibold text-slate-900 dark:text-[#F1F5F9]">
                          Break this task into milestones?
                        </div>
                        <div className="text-[12px] text-slate-500 dark:text-[#64748B] mt-0.5">
                          Split the task into smaller, trackable steps.
                        </div>
                      </div>
                    </label>

                    {/* Expanded MILESTONES Section */}
                    {newTask.useMilestones && (
                      <div id="task-form-milestones-container" className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-[#0B0F1A]/60 p-3.5 space-y-3.5 box-border w-full">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[13px] font-bold tracking-wider uppercase text-slate-900 dark:text-white">
                            <CheckSquare className="h-4 w-4 text-[#3B82F6]" />
                            MILESTONES
                          </div>
                          <div className="flex items-center gap-1.5 text-[12px] text-blue-600 dark:text-[#60A5FA]">
                            <Info className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>All fields below are required for each milestone.</span>
                          </div>
                        </div>

                        <div className="space-y-3 w-full">
                          {newTask.milestones.map((m, i) => (
                            <div
                              key={i}
                              id={`task-form-milestone-${i}`}
                              className="rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#0B0F1A] p-3 space-y-2.5 relative box-border w-full min-w-0"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-6 h-6 rounded-full bg-[#3B82F6] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                                  {i + 1}
                                </span>
                                <div id={`task-form-milestone-${i}-title`} className="flex-1 min-w-0">
                                  <Input
                                    placeholder={`Milestone ${i + 1} title *`}
                                    value={m.title}
                                    onChange={(e) => {
                                      const ms = [...newTask.milestones]
                                      ms[i] = { ...ms[i], title: e.target.value }
                                      setNewTask({ ...newTask, milestones: ms })
                                      if (e.target.value.trim()) {
                                        setMilestoneErrors(prev => ({ ...prev, [i]: { ...prev[i], title: false } }))
                                      }
                                    }}
                                    className={`h-9 text-[13px] bg-white dark:bg-[#121826] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-[8px] flex-1 min-w-0 box-border transition-colors ${milestoneErrors[i]?.title ? "border-red-500" : "border-slate-200 dark:border-white/[0.08]"
                                      }`}
                                  />
                                  {milestoneErrors[i]?.title && (
                                    <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Please fill in the required field.</p>
                                  )}
                                </div>
                                {newTask.milestones.length > 1 && (
                                  <button
                                    onClick={() => {
                                      const ms = newTask.milestones.filter((_, j) => j !== i)
                                      setNewTask({ ...newTask, milestones: ms })
                                    }}
                                    className="text-slate-400 hover:text-red-500 p-1 flex-shrink-0 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>

                              <div id={`task-form-milestone-${i}-description`}>
                                <Textarea
                                  placeholder="Description *"
                                  value={m.description || ""}
                                  onChange={(e) => {
                                    const ms = [...newTask.milestones]
                                    ms[i] = { ...ms[i], description: e.target.value }
                                    setNewTask({ ...newTask, milestones: ms })
                                    if (e.target.value.trim()) {
                                      setMilestoneErrors(prev => ({ ...prev, [i]: { ...prev[i], description: false } }))
                                    }
                                  }}
                                  className={`text-[13px] bg-white dark:bg-[#121826] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-[8px] min-w-0 box-border w-full transition-colors ${milestoneErrors[i]?.description ? "border-red-500" : "border-slate-200 dark:border-white/[0.08]"
                                    }`}
                                  rows={2}
                                />
                                {milestoneErrors[i]?.description && (
                                  <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Please fill in the required field.</p>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <div id={`task-form-milestone-${i}-dueDate`}>
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] mb-1 block">
                                    DUE DATE <span className="text-red-500 dark:text-red-400">*</span>
                                  </Label>
                                  <Input
                                    type="date"
                                    min={todayStr}
                                    value={m.dueDate || ""}
                                    onChange={(e) => {
                                      const ms = [...newTask.milestones]
                                      ms[i] = { ...ms[i], dueDate: e.target.value, dueTime: "" }
                                      setNewTask({ ...newTask, milestones: ms })
                                      if (e.target.value) {
                                        setMilestoneErrors(prev => ({ ...prev, [i]: { ...prev[i], dueDate: false } }))
                                      }
                                    }}
                                    className={`h-9 text-[13px] bg-white dark:bg-[#121826] text-slate-900 dark:text-[#F1F5F9] rounded-[8px] min-w-0 box-border w-full transition-colors ${milestoneErrors[i]?.dueDate ? "border-red-500" : "border-slate-200 dark:border-white/[0.08]"
                                      }`}
                                  />
                                  {milestoneErrors[i]?.dueDate && (
                                    <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Please fill in the required field.</p>
                                  )}
                                </div>
                                <div id={`task-form-milestone-${i}-dueTime`}>
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] mb-1 block">
                                    DUE TIME <span className="text-red-500 dark:text-red-400">*</span>
                                  </Label>
                                  <Input
                                    type="time"
                                    min={m.dueDate === todayStr ? nowTimeStr : undefined}
                                    value={m.dueTime || ""}
                                    onChange={(e) => {
                                      const ms = [...newTask.milestones]
                                      ms[i] = { ...ms[i], dueTime: e.target.value }
                                      setNewTask({ ...newTask, milestones: ms })
                                      if (e.target.value) {
                                        setMilestoneErrors(prev => ({ ...prev, [i]: { ...prev[i], dueTime: false, pastDatetime: false } }))
                                      }
                                    }}
                                    className={`h-9 text-[13px] bg-white dark:bg-[#121826] text-slate-900 dark:text-[#F1F5F9] rounded-[8px] min-w-0 box-border w-full transition-colors ${milestoneErrors[i]?.dueTime || milestoneErrors[i]?.pastDatetime ? "border-red-500" : "border-slate-200 dark:border-white/[0.08]"
                                      }`}
                                  />
                                  {milestoneErrors[i]?.dueTime && (
                                    <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Please fill in the required field.</p>
                                  )}
                                  {milestoneErrors[i]?.pastDatetime && (
                                    <p className="text-[12px] text-red-500 dark:text-red-400 mt-0.5">Due date and time cannot be in the past.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setNewTask({
                              ...newTask,
                              milestones: [...newTask.milestones, { title: "", description: "", dueDate: "", dueTime: "" }]
                            })
                          }
                          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#3B82F6] hover:text-[#2563EB] pt-1 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add Milestone
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 border-t border-slate-200 dark:border-white/[0.06] pt-4 mt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTaskDialogOpen(false)}
                  className="px-4 py-2 text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-[8px] border border-slate-200 dark:border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateTask}
                  disabled={isAddingTask}
                  className="px-4 py-2 text-[13px] font-medium bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-[8px] inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isAddingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {isManager ? "Assign Task" : "Create Task"}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative flex-1 md:max-w-[320px]">
            <Input placeholder="Search tasks..." className="pl-9 bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-500 dark:placeholder:text-[#475569] rounded-[10px] h-10 text-[14px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-[#64748B] pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={() => {
              if (sortBy === "date") setSortBy("priority")
              else if (sortBy === "priority") setSortBy("deadline")
              else setSortBy("date")
            }}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121826] px-3 py-2 text-[13px] font-medium text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors whitespace-nowrap"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 dark:text-[#64748B]" />
            Sort by: <span className="text-slate-900 dark:text-[#F1F5F9]">
              {sortBy === "date" ? "Date assigned" : sortBy === "priority" ? "Priority" : "Nearest Deadline"}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400 dark:text-[#64748B]" />
          </button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" asChild className="bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-white/[0.06] rounded-[10px]"><a href="/tasks/kanban"><LayoutGrid className="mr-2 h-4 w-4" /> Kanban</a></Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-[#F1F5F9] rounded-[10px] h-10 text-[14px]"><Filter className="mr-2 h-3.5 w-3.5 text-slate-400 dark:text-[#64748B]" /><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.08]">
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

      {/* Filter Tabs */}
      <div className="flex gap-1 w-fit">
        <AnimatedTabs
          tabs={Object.entries(TAB_LABELS).map(([key, label]) => ({ value: key, label }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          layoutId="tasksTab"
        />
      </div>

      {/* Task Grid */}
      <AnimatePresence mode="wait">
        {initialLoad ? <TaskSkeleton /> : (
          <motion.div key={activeTab} variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {getTasksByStatus(activeTab).length === 0 ? (
              <div className="col-span-full flex h-52 flex-col items-center justify-center rounded-[14px] border border-dashed border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#121826]/50">
                <CheckCircle className="h-8 w-8 text-slate-400 dark:text-[#475569] mb-3" />
                <h3 className="text-[15px] font-medium text-slate-600 dark:text-[#64748B]">No tasks found</h3>
                <p className="text-[13px] text-slate-500 dark:text-[#475569] mt-1">{searchQuery ? "Try adjusting your search" : "Create a new task to get started"}</p>
              </div>
            ) : getTasksByStatus(activeTab).map((task) => {
              const isPhased = task.isPhased
              const summary = milestoneSummaries[task.id]
              const allMilestonesDone = isPhased && summary && summary.approved === summary.total && summary.total > 0

              const pastDue = task.dueDatetime ? isPastDeadline(task.dueDatetime) : false
              const isLocked = pastDue && !task.allowLateSubmission
              const canSubmit = isAssignee(task) && task.status === "in_progress"

              return (
                <motion.div key={task.id} layout whileHover={{ y: -2 }} className="group h-full">
                  <div className={`flex flex-col h-full rounded-[14px] border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#121826] p-4 transition-all shadow-[0_8px_30px_rgba(100,116,139,0.15)] dark:shadow-none hover:shadow-lg dark:hover:border-white/[0.10] ${task.status === "completed" ? "opacity-70" : ""}`}>
                    {/* Top row: status + priority + due date */}
                    <div className="flex items-center gap-2 mb-2.5 min-w-0">
                      <StatusPill status={task.status} className="flex-shrink-0" />
                      <PriorityPill priority={task.priority} className="flex-shrink-0" />
                      {(task.dueDate || task.dueDatetime) && (
                        <span className="ml-auto text-[11px] text-slate-500 dark:text-[#475569] flex items-center gap-1 flex-shrink-0 whitespace-nowrap"><CalendarIcon className="h-3 w-3 flex-shrink-0" />{getDueDisplay(task)}</span>
                      )}
                    </div>

                    {/* Title + description */}
                    <h3 className="text-[15px] font-medium text-slate-900 dark:text-[#F1F5F9] leading-snug truncate mb-1">{task.title}</h3>
                    <p className="text-[13px] text-slate-500 dark:text-[#64748B] line-clamp-2 mb-3">{task.description}</p>

                    {/* Assignee row + milestone chip */}
                    <div className="flex items-center gap-2 mb-3 text-[12px] min-w-0">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#94A3B8] min-w-0 overflow-hidden">
                        <UserCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate whitespace-nowrap">{getAssigneeName(task)}</span>
                        {task.assignedByName && task.assignedByName !== getAssigneeName(task) && (
                          <span className="text-slate-400 dark:text-[#475569] truncate whitespace-nowrap">· by {task.assignedByName}</span>
                        )}
                      </div>
                      {!isManager && task.createdAt && (
                        <span className="text-[11px] text-slate-400 dark:text-[#475569] flex items-center gap-1 flex-shrink-0">
                          <CalendarIcon className="h-3 w-3" />
                          Assigned {format(new Date(task.createdAt), "MMM d")}
                        </span>
                      )}
                      {task.isPhased && (
                        <span className="ml-auto flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-[#94A3B8] flex-shrink-0">
                          <ListChecks className="h-3 w-3" />{summary ? `${summary.approved}/${summary.total}` : "Phased"}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <CardProgressBar progress={task.progress} status={task.status} />

                    {/* Action buttons */}
                    <div className="mt-auto pt-3 border-t border-white/[0.04]">
                      <div className="flex flex-wrap items-center gap-2">
                        <TaskButton variant="secondary" onClick={() => { setDetailTask(task); setDetailDialogOpen(true) }}><Eye className="h-3.5 w-3.5" />View Details</TaskButton>
                        {canInteractWithTask(task) && isAssignee(task) && task.status === "in_progress" && (
                          isPhased
                            ? (allMilestonesDone && (
                              <TaskButton variant="primary" onClick={() => openReviewDialog(task.id)} disabled={isLocked} className="whitespace-nowrap">{isLocked ? <Lock className="h-3.5 w-3.5 mr-1" /> : <Send className="h-3.5 w-3.5" />}Submit for Review</TaskButton>
                            ))
                            : (
                              <TaskButton variant="primary" onClick={() => openReviewDialog(task.id)} disabled={isLocked} className="whitespace-nowrap">{isLocked ? <Lock className="h-3.5 w-3.5 mr-1" /> : <Send className="h-3.5 w-3.5" />}Submit for Review</TaskButton>
                            )
                        )}
                        {canInteractWithTask(task) && isAssigner(task) && pastDue && !isPhased && (
                          <TaskButton
                            variant={task.allowLateSubmission ? "primary" : "secondary"}
                            onClick={() => handleToggleLateSubmission(task.id, !task.allowLateSubmission, false)}
                            className="whitespace-nowrap"
                          >
                            {task.allowLateSubmission ? <Unlock className="h-3.5 w-3.5 mr-1" /> : <Lock className="h-3.5 w-3.5 mr-1" />}
                            {task.allowLateSubmission ? "Late Submission Allowed" : "Allow Submission"}
                          </TaskButton>
                        )}
                        {canInteractWithTask(task) && isAssigner(task) && task.isPhased && task.status === "pending_review" && (
                          <div className="flex flex-wrap gap-2">
                            <TaskButton variant="primary-purple" onClick={() => handleQuickMilestoneAction(task.id, "approve")} className="whitespace-nowrap"><CheckCircle className="h-3.5 w-3.5" />Approve Milestone</TaskButton>
                            <TaskButton variant="secondary" onClick={() => handleQuickMilestoneAction(task.id, "reject")} className="whitespace-nowrap"><X className="h-3.5 w-3.5" />Reject Milestone</TaskButton>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== VIEW DETAILS MODAL ===== */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[88vh] bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-[#F1F5F9] rounded-[18px] shadow-2xl flex flex-col overflow-hidden p-6">
          {detailTask && (
            <>
              {/* Header */}
              <div className="flex-shrink-0 pb-2">
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusPill status={detailTask.status} />
                    <PriorityPill priority={detailTask.priority} />
                  </div>
                  <DialogTitle className="text-[20px] font-bold text-slate-900 dark:text-[#F1F5F9]">
                    {detailTask.title}
                  </DialogTitle>
                  <DialogDescription className="text-[13px] text-slate-500 dark:text-[#64748B]">
                    {detailTask.description}
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Body Content */}
              <div className="flex-1 min-h-0 min-w-0 overflow-y-auto space-y-4 py-2 pr-1">
                {/* Progress Card */}
                <div className="flex items-center gap-4 p-4 rounded-[14px] bg-slate-50 dark:bg-[#0B0F1A]/80 border border-slate-200 dark:border-white/[0.06]">
                  <ProgressRing progress={detailTask.progress} status={detailTask.status} />
                  <div className="text-[13px] space-y-1">
                    <p className="font-bold text-slate-900 dark:text-[#F1F5F9] text-[15px]">Progress</p>
                    <p className="text-slate-600 dark:text-[#94A3B8] text-[12px] flex items-center gap-1.5">
                      <UserCircle2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      {isAssignee(detailTask) ? "Assigned to you" : `Assigned to ${getAssigneeName(detailTask)}`}
                    </p>
                    {detailTask.dueDatetime && (
                      <p className="text-red-600 dark:text-[#F87171] text-[12px] flex items-center gap-1.5 font-medium">
                        <CalendarIcon className="h-3.5 w-3.5 text-red-500" />
                        Due {getDueDisplay(detailTask)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Milestones Section */}
                {(milestones.length > 0 || detailTask?.isPhased) && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[13px] font-bold tracking-wider uppercase text-slate-900 dark:text-white">
                        <CheckSquare className="h-4 w-4 text-[#3B82F6]" />
                        <span>MILESTONES ({milestones.filter((m: any) => m.status === "approved").length}/{milestones.length})</span>
                      </div>
                      {isAssigner(detailTask) && (() => {
                        const isTaskInReview = detailTask?.status === "pending_review" || milestones.some((m: any) => m.status === "pending_review")
                        return (
                          <button
                            type="button"
                            disabled={isTaskInReview}
                            onClick={openManageMilestones}
                            title={isTaskInReview ? "Cannot manage milestones while in review" : "Manage Milestones"}
                            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 px-3 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                            Manage
                          </button>
                        )
                      })()}
                    </div>

                    <div className="space-y-3">
                      {milestones.sort((a: any, b: any) => a.order_index - b.order_index).map((m: any, i: number) => {
                        const isApproved = m.status === "approved"
                        const isActionable = getNextActionableIndex(milestones) === m.order_index
                        const isLocked = !isApproved && !isActionable
                        const isAssign = detailTask.assigneeIds?.includes(user?.id)
                        const isAssgnr = detailTask.assignedBy === user?.id
                        const canSubmit = isAssign && m.status === "in_progress" && isActionable
                        const canReview = isAssgnr && m.status === "pending_review"
                        const mDateVal = m.dueDate || m.due_date || m.due_datetime || m.dueDatetime
                        const mPastDue = mDateVal ? isPastDeadline(mDateVal) : false
                        const allowLate = m.allowLateSubmission ?? m.allow_late_submission ?? m.submission_open ?? false
                        const submissionLocked = mPastDue && !allowLate
                        const disableSubmit = submissionLocked

                        const isPendingReview = m.status === "pending_review"

                        const cardBorderBg = isApproved
                          ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-[#0F172A]/70"
                          : isPendingReview
                          ? "border-amber-400/70 dark:border-amber-500/40 bg-amber-50/40 dark:bg-[#14120C]"
                          : isActionable
                          ? "border-blue-500/40 dark:border-blue-500/40 bg-blue-50/30 dark:bg-[#0F172A]"
                          : "border-slate-200 dark:border-white/[0.06] bg-slate-50/60 dark:bg-[#0B0F1A]/50 opacity-60"

                        return (
                          <div
                            key={m.id}
                            className={`rounded-[14px] border p-4 space-y-2.5 transition-colors ${cardBorderBg}`}
                          >
                            <div className="flex items-center justify-between min-w-0 gap-2">
                              {/* Left: Number + Title */}
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold ${
                                  isApproved
                                    ? "bg-emerald-500 text-white"
                                    : isActionable
                                    ? "bg-[#3B82F6] text-white"
                                    : "bg-slate-200 dark:bg-white/[0.08] text-slate-400"
                                }`}>
                                  {isApproved ? <CheckCircle className="h-3.5 w-3.5" /> : (isLocked || submissionLocked) ? <Lock className="h-3.5 w-3.5" /> : i + 1}
                                </div>
                                <span className={`text-[15px] font-bold truncate ${isLocked ? "text-slate-400 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
                                  {m.title}
                                </span>
                              </div>

                              {/* Right: Deadline Badge + Status Badge */}
                              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                                {mDateVal && (
                                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${
                                    isLocked 
                                      ? "bg-slate-200/60 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                                      : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                  }`}>
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(mDateVal), "MMM d, h:mm a")}
                                  </span>
                                )}

                                <MilestoneStatusBadge status={m.status} />
                              </div>
                            </div>

                            {/* Clear Milestone Description - Always Visible */}
                            {m.description && (
                              <p className={`text-[13px] leading-relaxed pl-8 ${isLocked ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-[#94A3B8]"}`}>
                                {m.description}
                              </p>
                            )}

                            {/* Action buttons (Assigner Lock/Unlock, See Review & Submit) placed at bottom right */}
                            {(() => {
                              const hasReview = !!(m.latestReview?.comment || m.latestReview?.reviewer_file_url || m.latestReview?.decision)
                              const showAssignerLockBtn = isAssgnr && mPastDue && m.status !== "approved"

                              if (!canSubmit && !hasReview && !showAssignerLockBtn) return null

                              return (
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  {/* Assigner Full Lock/Unlock Button */}
                                  {showAssignerLockBtn && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleToggleLateSubmission(m.id, !allowLate, true); }}
                                      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-lg border shadow-sm transition-colors whitespace-nowrap ${
                                        allowLate
                                          ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 border-red-300 dark:border-red-500/30'
                                          : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 border-emerald-300 dark:border-emerald-500/30'
                                      }`}
                                      title={allowLate ? "Lock Late Submission" : "Allow Late Submission"}
                                    >
                                      {allowLate ? (
                                        <>
                                          <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                                          <span>Lock Submission</span>
                                        </>
                                      ) : (
                                        <>
                                          <Unlock className="h-3.5 w-3.5 flex-shrink-0" />
                                          <span>Allow Late Submission</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {/* See Review Button */}
                                  {hasReview && (
                                    <button
                                      type="button"
                                      disabled={m.status === "pending_review"}
                                      onClick={() => setViewingReviewMilestone(m)}
                                      title={m.status === "pending_review" ? "Review is pending" : "See Review"}
                                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                                    >
                                      {m.status === "pending_review" ? (
                                        <Lock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                      ) : (
                                        <Eye className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                                      )}
                                      <span>See Review</span>
                                    </button>
                                  )}

                                  {/* Submit / Locked Button */}
                                  {canSubmit && (
                                    disableSubmit ? (
                                      <button
                                        type="button"
                                        disabled
                                        className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold text-white bg-[#3B82F6] opacity-40 cursor-not-allowed rounded-lg shadow-sm whitespace-nowrap"
                                      >
                                        <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>Locked</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openMilestoneDialog(m.id, "submit")}
                                        className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg shadow-sm transition-colors whitespace-nowrap"
                                      >
                                        <Send className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>Submit</span>
                                      </button>
                                    )
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Assigner notes */}
                {detailTask.reviewAssignerNotes && (
                  <div className="p-3 rounded-[12px] bg-amber-50 dark:bg-[#0F1523] border border-amber-200 dark:border-[#F59E0B]/20">
                    <p className="text-[12px] font-medium text-amber-700 dark:text-[#FBBF24] mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" />Assigner Notes</p>
                    <p className="text-[13px] text-slate-700 dark:text-[#CBD5E1]">{detailTask.reviewAssignerNotes}</p>
                  </div>
                )}

                {/* Progress notes */}
                {detailTask.reviewNotes && (
                  <div className="p-3 rounded-[12px] bg-blue-50 dark:bg-[#0F1523] border border-blue-200 dark:border-[#3B82F6]/20">
                    <p className="text-[12px] font-medium text-blue-700 dark:text-[#93C5FD] mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" />Notes from {getAssigneeName(detailTask)}</p>
                    <p className="text-[13px] text-slate-700 dark:text-[#CBD5E1]">{detailTask.reviewNotes}</p>
                  </div>
                )}

                {/* Submission file */}
                {detailTask.submissionFileUrl && (
                  <div className="flex items-center justify-between p-3 rounded-[12px] bg-slate-50 dark:bg-[#0F1523] border border-slate-200 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-[#CBD5E1] min-w-0"><FileText className="h-4 w-4 text-blue-600 dark:text-[#93C5FD] flex-shrink-0" /><span className="truncate">{detailTask.submissionFileName || "Submission file"}</span></div>
                    <TaskButtonGhost onClick={() => downloadFile(detailTask.submissionFileUrl, detailTask.submissionFileName || "file")}><Download className="h-3.5 w-3.5" />Open</TaskButtonGhost>
                  </div>
                )}
                {detailTask.reviewAssignerFileUrl && (
                  <div className="flex items-center justify-between p-3 rounded-[12px] bg-amber-50 dark:bg-[#0F1523] border border-amber-200 dark:border-[#F59E0B]/20">
                    <div className="flex items-center gap-2 text-[13px] text-amber-700 dark:text-[#FBBF24] min-w-0"><FileText className="h-4 w-4 text-amber-600 dark:text-[#FBBF24] flex-shrink-0" /><span className="truncate">{detailTask.reviewAssignerFileName || "Attached file"}</span></div>
                    <TaskButtonGhost onClick={() => downloadFile(detailTask.reviewAssignerFileUrl, detailTask.reviewAssignerFileName || "file")}><Download className="h-3.5 w-3.5" />Open</TaskButtonGhost>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex-shrink-0 border-t border-slate-200 dark:border-white/[0.06] pt-4 mt-2 flex items-center justify-end gap-3">
                {canInteractWithTask(detailTask) && (
                  <>
                    {isAssignee(detailTask) && detailTask.isPhased && (() => {
                      const nextIndex = getNextActionableIndex(milestones)
                      const nextNotStarted = milestones.find((m: any) => m.status === "not_started" && m.order_index === nextIndex)
                      const hasInProgress = milestones.some((m: any) => m.status === "in_progress")
                      return (nextNotStarted && !hasInProgress) ? (
                        <TaskButton onClick={() => handleStartTask(detailTask.id, detailTask.isPhased)}><Play className="h-4 w-4" />Start Milestone</TaskButton>
                      ) : null
                    })()}
                    {detailTask.status === "todo" && isAssignee(detailTask) && !detailTask.isPhased && (
                      <TaskButton onClick={() => handleStartTask(detailTask.id)}><Play className="h-4 w-4" />Start Task</TaskButton>
                    )}
                    {detailTask.status === "pending_review" && isAssigner(detailTask) && !detailTask.isPhased && (
                      <TaskButton variant="primary-amber" onClick={() => { setAssignerReviewTask(detailTask); setAssignerProgress(detailTask.progress); setAssignerNotes(""); setAssignerFile(null); setAssignerAction("review"); setAssignerReviewOpen(true); setDetailDialogOpen(false) }}><MessageSquare className="h-4 w-4" />Review Progress</TaskButton>
                    )}
                    {detailTask.status === "pending_completion_review" && isAssigner(detailTask) && (
                      <div className="flex gap-2">
                        <TaskButton variant="secondary" onClick={() => { setAssignerReviewTask(detailTask); setAssignerNotes(""); setAssignerFile(null); setAssignerAction("reject"); setAssignerReviewOpen(true); setDetailDialogOpen(false) }}>Reject</TaskButton>
                        <TaskButton variant="primary-purple" onClick={() => { setAssignerReviewTask(detailTask); setAssignerNotes(""); setAssignerFile(null); setAssignerAction("approve"); setAssignerReviewOpen(true); setDetailDialogOpen(false) }}><CheckCircle className="h-4 w-4" />Approve & Complete</TaskButton>
                      </div>
                    )}
                    {isAssigner(detailTask) && (detailTask.status === "todo" || detailTask.status === "completed") && (
                      <button
                        type="button"
                        onClick={() => { handleArchiveTask(detailTask.id); setDetailDialogOpen(false) }}
                        className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-[8px] border border-slate-300 dark:border-white/10 transition-colors"
                      >
                        Archive Task
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setDetailDialogOpen(false)}
                  className="px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-[8px] border border-slate-300 dark:border-white/10 transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== MILESTONE REVIEW DIALOG ===== */}
      <Dialog open={milestoneDialogOpen} onOpenChange={(open) => { if (!open) { setMilestoneDialogOpen(false); setMilestoneFile(null); setActiveMilestoneReviewData(null); } }}>
        <DialogContent className="sm:max-w-[480px] max-h-[88vh] bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-[#F1F5F9] rounded-[18px] shadow-2xl flex flex-col overflow-hidden p-6">
          {(() => {
            const currentMilestone = activeMilestoneReviewData || milestones.find(m => m.id === milestoneDialogId)
            const milestoneTitle = currentMilestone?.title || "milestone"
            const assigneeName = detailTask ? getAssigneeName(detailTask) : "assignee"

            return (
              <>
                {/* Header */}
                <div className="flex-shrink-0 pb-2">
                  <DialogHeader>
                    <DialogTitle className="text-[20px] font-bold text-slate-900 dark:text-[#F1F5F9]">
                      {milestoneAction === "submit" ? "Submit Milestone for Review" : milestoneAction === "approve" ? "Approve Milestone" : "Reject Milestone"}
                    </DialogTitle>
                    <DialogDescription className="text-[13px] text-slate-500 dark:text-[#64748B]">
                      {milestoneAction === "submit"
                        ? "Attach a supporting document (required) and an optional comment."
                        : milestoneAction === "approve"
                        ? "Confirm approval for this milestone."
                        : `Send ${milestoneTitle} back to ${assigneeName} with feedback.`}
                    </DialogDescription>
                  </DialogHeader>
                </div>

                {/* Body Content */}
                <div className="flex-1 min-h-0 min-w-0 overflow-y-auto space-y-4 py-2 px-1.5">
                  {/* Assignee's Submission Section */}
                  {milestoneAction !== "submit" && (() => {
                    const review = currentMilestone?.latestReview
                    if (!review || (!review.comment && !review.employee_file_url)) return null
                    return (
                      <div className="rounded-xl bg-slate-50 dark:bg-[#0B0F1A]/80 border border-slate-200 dark:border-white/[0.06] p-3.5 space-y-3">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                          ASSIGNEE'S SUBMISSION
                        </h4>
                        {review.comment && (
                          <div className="text-[14px] text-slate-900 dark:text-[#F1F5F9] bg-white dark:bg-[#121826] p-3 rounded-lg border border-slate-200 dark:border-white/[0.06]">
                            {review.comment}
                          </div>
                        )}
                        {review.employee_file_url && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 dark:bg-[#3B82F6]/[0.08] border border-blue-200 dark:border-[#3B82F6]/20 text-[13px]">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-[#93C5FD] min-w-0">
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate font-medium">{review.employee_file_name || "Submission file"}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadFile(review.employee_file_url!, review.employee_file_name || "file")}
                              className="inline-flex items-center gap-1 px-3 py-1 text-[12px] font-semibold text-blue-700 dark:text-[#93C5FD] bg-blue-100 dark:bg-[#3B82F6]/20 hover:bg-blue-200 dark:hover:bg-[#3B82F6]/30 rounded-lg border border-blue-300 dark:border-[#3B82F6]/30 transition-colors flex-shrink-0"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Open
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Comment Input Section */}
                  <div className="grid gap-1.5">
                    {milestoneAction === "reject" ? (
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-[#CBD5E1]">
                        COMMENT <span className="text-red-500 dark:text-[#F87171] font-bold">― REQUIRED</span>
                      </Label>
                    ) : (
                      <Label className="text-[13px] font-medium text-slate-700 dark:text-[#CBD5E1]">Comment</Label>
                    )}
                    <Textarea
                      value={milestoneComment}
                      onChange={(e) => setMilestoneComment(e.target.value)}
                      placeholder={milestoneAction === "approve" ? "Approval notes..." : milestoneAction === "reject" ? "What needs to be fixed..." : "What I've completed..."}
                      rows={3.5}
                      className="bg-slate-50 dark:bg-[#0B0F1A] border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-[10px] text-[14px] p-3"
                    />
                  </div>

                  {/* Drag & Drop File Zone */}
                  <FileDropZone tint={milestoneAction === "submit" ? "blue" : "neutral"} required={milestoneAction === "submit"} file={milestoneFile} onChange={setMilestoneFile} />
                </div>

                {/* Footer Action Bar */}
                <div className="flex-shrink-0 border-t border-slate-200 dark:border-white/[0.06] pt-4 mt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setMilestoneDialogOpen(false)}
                    className="px-5 py-2 text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-white/10 transition-colors"
                  >
                    Cancel
                  </button>

                  {milestoneAction === "submit" && (
                    <button
                      type="button"
                      onClick={handleSubmitMilestoneReview}
                      disabled={isMilestoneSubmitting}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-[13px] font-bold text-white bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 rounded-lg shadow transition-colors"
                    >
                      {isMilestoneSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Submit for Review
                    </button>
                  )}

                  {milestoneAction === "approve" && (
                    <button
                      type="button"
                      onClick={handleApproveMilestone}
                      disabled={isMilestoneSubmitting}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-[13px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg shadow transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve Milestone
                    </button>
                  )}

                  {milestoneAction === "reject" && (
                    <button
                      type="button"
                      onClick={handleRejectMilestone}
                      disabled={isMilestoneSubmitting || !milestoneComment.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-red-700 dark:text-[#FCA5A5] bg-red-100 dark:bg-[#3B1719] hover:bg-red-200 dark:hover:bg-[#4D1F22] disabled:opacity-40 disabled:pointer-events-none rounded-lg border border-red-200 dark:border-red-900/50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Reject & Return
                    </button>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ===== MANAGE MILESTONES DIALOG ===== */}
      <Dialog open={manageMilestonesOpen} onOpenChange={(open) => { if (!open) { setManageMilestonesOpen(false); setEditingMilestone(null); setNewMilestoneTitle(""); setNewMilestoneDescription(""); setNewMilestoneDueDate(""); setNewMilestoneDueTime("") } }}>
        <DialogContent className="sm:max-w-[540px] max-h-[88vh] bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-[#F1F5F9] rounded-[18px] shadow-2xl flex flex-col overflow-hidden p-6">
          {/* Header */}
          <div className="flex-shrink-0 pb-2">
            <DialogHeader>
              <DialogTitle className="text-[20px] font-bold text-slate-900 dark:text-[#F1F5F9]">
                Manage Milestones
              </DialogTitle>
              <DialogDescription className="text-[13px] text-slate-500 dark:text-[#64748B]">
                Add, edit, reorder, or remove milestones for "{detailTask?.title}".
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Body Content */}
          <div className="flex-1 min-h-0 min-w-0 overflow-y-auto space-y-4 py-2 px-1.5">
            {/* Existing Milestone Items List */}
            {milestoneListForManage.length > 0 && (
              <div className="space-y-2">
                {milestoneListForManage.map((m: any, i: number) => (
                  <div key={m.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0F1A] transition-colors">
                    <div className="w-6 h-6 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="flex-1 text-[14px] font-bold text-slate-900 dark:text-white truncate min-w-0">
                      {m.title}
                    </span>
                    <MilestoneStatusBadge status={m.status} />

                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => moveMilestone(i, -1)}
                        className="p-1 rounded-[6px] text-slate-400 dark:text-[#64748B] hover:text-slate-700 dark:hover:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                      </button>
                      <button
                        type="button"
                        disabled={i === milestoneListForManage.length - 1}
                        onClick={() => moveMilestone(i, 1)}
                        className="p-1 rounded-[6px] text-slate-400 dark:text-[#64748B] hover:text-slate-700 dark:hover:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>

                      <span className="h-4 border-r border-slate-300 dark:border-white/10 mx-1 flex-shrink-0" />

                      <button
                        type="button"
                        onClick={() => {
                          const existingDate = m.due_datetime ? new Date(m.due_datetime).toISOString().split('T')[0] : (m.due_date ? new Date(m.due_date).toISOString().split('T')[0] : "")
                          const existingTime = m.due_datetime ? new Date(m.due_datetime).toTimeString().slice(0, 5) : (m.due_date ? new Date(m.due_date).toTimeString().slice(0, 5) : "")
                          setEditingMilestone({ ...m, dueDate: existingDate, dueTime: existingTime })
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[12px] font-medium text-slate-700 dark:text-[#CBD5E1] hover:text-[#3B82F6] hover:bg-slate-200 dark:hover:bg-white/[0.06] transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMilestone(m.id)}
                        className="p-1.5 rounded-[6px] text-slate-400 dark:text-[#64748B] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* + NEW MILESTONE Section Card */}
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50/50 dark:bg-[#0F1523]/40 p-4 space-y-3.5">
              <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Plus className="h-3.5 w-3.5 text-[#3B82F6]" />
                <span>NEW MILESTONE</span>
              </div>

              {/* Title */}
              <Input
                placeholder="New milestone title"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                className="w-full h-10 text-[14px] bg-white dark:bg-[#0B0F1A] border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-[10px]"
              />

              {/* Description */}
              <Textarea
                placeholder="Description"
                value={newMilestoneDescription}
                onChange={(e) => setNewMilestoneDescription(e.target.value)}
                rows={2.5}
                className="w-full text-[14px] bg-white dark:bg-[#0B0F1A] border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-[10px] p-3"
              />

              {/* Date & Time Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  min={todayStr}
                  value={newMilestoneDueDate}
                  onChange={(e) => { setNewMilestoneDueDate(e.target.value); setNewMilestoneDueTime("") }}
                  className="h-10 text-[14px] bg-white dark:bg-[#0B0F1A] border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-[#F1F5F9] rounded-[10px] color-scheme-dark"
                />
                <Input
                  type="time"
                  min={newMilestoneDueDate === todayStr ? nowTimeStr : undefined}
                  value={newMilestoneDueTime}
                  onChange={(e) => setNewMilestoneDueTime(e.target.value)}
                  className="h-10 text-[14px] bg-white dark:bg-[#0B0F1A] border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-[#F1F5F9] rounded-[10px] color-scheme-dark"
                />
              </div>

              {/* Subtitle & Add Button */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[12px] text-slate-500 dark:text-[#64748B]">
                  Fill in all fields above, then click "Add Milestone" to add it to the list.
                </p>

                <button
                  type="button"
                  onClick={handleAddMilestoneMidTask}
                  disabled={!newMilestoneTitle.trim() || !newMilestoneDescription.trim() || !newMilestoneDueDate || !newMilestoneDueTime}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 disabled:pointer-events-none rounded-lg shadow transition-colors ml-auto flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Add Milestone
                </button>
              </div>
            </div>

            {milestoneListForManage.length === 0 && (
              <p className="text-[13px] text-slate-500 dark:text-[#64748B] text-center py-2">No milestones yet. Add one above to get started.</p>
            )}
          </div>

          {/* Footer Action */}
          <div className="flex-shrink-0 border-t border-slate-200 dark:border-white/[0.06] pt-4 mt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => { setManageMilestonesOpen(false); setEditingMilestone(null); setNewMilestoneTitle(""); setNewMilestoneDescription(""); setNewMilestoneDueDate(""); setNewMilestoneDueTime("") }}
              className="px-6 py-2 text-[13px] font-bold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg shadow transition-colors"
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT MILESTONE DIALOG ===== */}
      <Dialog open={!!editingMilestone} onOpenChange={(open) => { if (!open) setEditingMilestone(null) }}>
        <DialogContent className="sm:max-w-[400px] bg-[#121826] border-white/[0.06] text-[#F1F5F9] rounded-[14px]">
          <DialogHeader><DialogTitle className="text-[17px] font-medium text-[#F1F5F9]">Edit Milestone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5"><Label className="text-[13px] text-[#CBD5E1]">Title</Label><Input value={editingMilestone?.title || ""} onChange={(e) => setEditingMilestone({ ...editingMilestone, title: e.target.value })} className="bg-[#0B0F1A] border-white/[0.08] text-[#F1F5F9] rounded-[10px] h-10 text-[14px]" /></div>
            <div className="grid gap-1.5"><Label className="text-[13px] text-[#CBD5E1]">Description</Label><Textarea value={editingMilestone?.description || ""} onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })} rows={2} className="bg-[#0B0F1A] border-white/[0.08] text-[#F1F5F9] rounded-[10px] text-[14px]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-[13px] text-[#CBD5E1]">Due Date <span className="text-red-400">*</span></Label>
                <Input
                  type="date"
                  min={todayStr}
                  value={editingMilestone?.dueDate || ""}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, dueDate: e.target.value, dueTime: "" })}
                  className="bg-[#0B0F1A] border-white/[0.08] text-[#F1F5F9] rounded-[10px] h-10 text-[14px] color-scheme-dark"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[13px] text-[#CBD5E1]">Due Time <span className="text-red-400">*</span></Label>
                <Input
                  type="time"
                  min={editingMilestone?.dueDate === todayStr ? nowTimeStr : undefined}
                  value={editingMilestone?.dueTime || ""}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, dueTime: e.target.value })}
                  className="bg-[#0B0F1A] border-white/[0.08] text-[#F1F5F9] rounded-[10px] h-10 text-[14px] color-scheme-dark"
                />
              </div>
            </div>
            {editingMilestone && (() => {
              const otherWeight = milestoneListForManage
                .filter((m: any) => m.id !== editingMilestone.id)
                .reduce((sum: number, m: any) => sum + (m.weight || 0), 0)
              const currentTotal = otherWeight + (editingMilestone.weight || 0)
              const remaining = 100 - otherWeight
              return (
                <p className="text-[12px] text-[#64748B]">
                  Budget for this milestone:{" "}
                  <span className={`font-semibold ${currentTotal === 100 ? "text-[#6EE7B7]" : "text-[#FBBF24]"}`}>
                    {remaining}%
                  </span>
                  {currentTotal !== 100 && (
                    <span className="ml-2">(current total: {currentTotal}%)</span>
                  )}
                </p>
              )
            })()}
            <div className="grid gap-1.5"><Label className="text-[13px] text-[#CBD5E1]">Weight (%)</Label><Input type="number" min={0} max={100} value={editingMilestone?.weight || 0} onChange={(e) => setEditingMilestone({ ...editingMilestone, weight: parseInt(e.target.value) || 0 })} className="bg-[#0B0F1A] border-white/[0.08] text-[#F1F5F9] rounded-[10px] h-10 text-[14px]" /></div>
          </div>
          <DialogFooter className="mt-2">
            <TaskButton variant="secondary" onClick={() => setEditingMilestone(null)}>Cancel</TaskButton>
            <TaskButton onClick={handleEditMilestone}>Save</TaskButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SUBMIT FOR REVIEW MODAL ===== */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => { if (!open) { setReviewDialogOpen(false); setReviewFile(null); setReviewNotes("") } }}>
        <DialogContent className="sm:max-w-[480px] bg-[#121826] border-white/[0.06] text-[#F1F5F9] rounded-[14px]">
          {(() => {
            const isPhasedTask = tasks.find(t => t.id === reviewTaskId)?.isPhased
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-[17px] font-medium text-[#F1F5F9]">
                    {isPhasedTask ? "Submit Task for Completion" : "Submit for Review"}
                  </DialogTitle>
                  <DialogDescription className="text-[13px] text-[#64748B]">
                    {isPhasedTask ? "All milestones are approved. Attach your final deliverable document." : "Choose the type of review to send to the assigner."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {!isPhasedTask && (
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setReviewType("progress")} className={`p-4 rounded-[12px] border-2 text-left transition-all ${reviewType === "progress" ? "border-[#3B82F6] bg-[#3B82F6]/[0.06]" : "border-white/[0.06] hover:border-white/[0.10]"}`}>
                        <MessageSquare className={`h-5 w-5 mb-2 ${reviewType === "progress" ? "text-[#93C5FD]" : "text-[#64748B]"}`} />
                        <p className={`text-[13px] font-semibold ${reviewType === "progress" ? "text-[#93C5FD]" : "text-[#CBD5E1]"}`}>Progress Update</p>
                        <p className="text-[12px] text-[#64748B] mt-1">Share what's done, attach files optionally</p>
                      </button>
                      <button type="button" onClick={() => { if (reviewType !== "completion-gated") setReviewType("completion") }} className={`p-4 rounded-[12px] border-2 text-left transition-all ${reviewType === "completion" ? "border-[#8B5CF6] bg-[#8B5CF6]/[0.06]" : reviewType === "completion-gated" ? "border-white/[0.06] bg-[#121826]/50 opacity-50 cursor-not-allowed" : "border-white/[0.06] hover:border-white/[0.10]"}`}>
                        {reviewType === "completion-gated" ? <Lock className="h-5 w-5 mb-2 text-[#64748B]" /> : <CheckCircle className={`h-5 w-5 mb-2 ${reviewType === "completion" ? "text-[#C4B5FD]" : "text-[#64748B]"}`} />}
                        <p className={`text-[13px] font-semibold ${reviewType === "completion" ? "text-[#C4B5FD]" : "text-[#CBD5E1]"}`}>Completion Review</p>
                        <p className="text-[12px] text-[#64748B] mt-1">{reviewType === "completion-gated" ? "Complete all milestones first" : "Task is done, file attachment required"}</p>
                      </button>
                    </div>
                  )}

                  <div className="grid gap-1.5">
                    <Label className="text-[13px] text-[#CBD5E1]">
                      {isPhasedTask || reviewType === "completion" ? "Notes (optional)" : "Progress Notes"}
                    </Label>
                    <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder={isPhasedTask || reviewType === "completion" ? "Any notes for the assigner..." : "What's done, what's left to do..."} rows={3} className="bg-[#0B0F1A] border-white/[0.08] text-[#F1F5F9] placeholder:text-[#475569] rounded-[10px] text-[14px]" />
                  </div>

                  {(isPhasedTask || reviewType === "completion") ? (
                    <FileDropZone tint="purple" required file={reviewFile} onChange={setReviewFile} />
                  ) : (
                    <FileDropZone tint="blue" file={reviewFile} onChange={setReviewFile} />
                  )}
                </div>
                <DialogFooter className="gap-2 mt-2">
                  <TaskButton variant="secondary" onClick={() => setReviewDialogOpen(false)}>Cancel</TaskButton>
                  {(isPhasedTask || reviewType === "completion") ? (
                    <TaskButton variant="primary-purple" onClick={handleSubmitCompletionReview} disabled={!reviewFile || isReviewSubmitting}>{isReviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}Submit for Completion</TaskButton>
                  ) : (
                    <TaskButton onClick={handleSubmitProgressReview} disabled={!reviewNotes.trim() || isReviewSubmitting}>{isReviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit Progress Update</TaskButton>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ===== ASSIGNER REVIEW MODAL ===== */}
      <Dialog open={assignerReviewOpen} onOpenChange={(open) => { if (!open) { setAssignerReviewOpen(false); setAssignerFile(null) } }}>
        <DialogContent className="sm:max-w-[460px] bg-[#121826] border-white/[0.06] text-[#F1F5F9] rounded-[14px]">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-medium text-[#F1F5F9]">
              {assignerAction === "review" ? "Review Progress"
                : assignerAction === "approve" ? "Approve Completion"
                  : "Reject & Return Task"}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#64748B]">
              {assignerAction === "review" ? "Set the actual progress percentage and leave feedback."
                : assignerAction === "approve" ? "Attach an optional file and confirm your approval."
                  : "Provide feedback explaining what needs to be revised."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 min-w-0">
            {assignerReviewTask?.status === "pending_review" && (
              <div className="grid gap-2 min-w-0">
                <div className="flex items-center justify-between">
                  <Label className="text-[13px] text-[#CBD5E1]">Progress</Label>
                  <span className="text-[15px] font-semibold text-[#FBBF24] tabular-nums">{assignerProgress}%</span>
                </div>
                <input type="range" min={0} max={100} value={assignerProgress} onChange={(e) => setAssignerProgress(parseInt(e.target.value))} className="w-full accent-[#FBBF24] h-2 rounded-full appearance-none bg-[#0F1523] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FBBF24] [&::-webkit-slider-thumb]:shadow-none" />
                <div className="flex justify-between text-[11px] text-[#64748B]"><span>0%</span><span>50%</span><span>100%</span></div>
                {assignerReviewTask?.reviewNotes && (
                  <div className="mt-2 p-3 rounded-[10px] bg-[#0F1523] border-l-2 border-[#3B82F6]/40">
                    <p className="text-[12px] font-medium text-[#93C5FD] mb-1">Assignee's notes:</p>
                    <p className="text-[13px] text-[#CBD5E1]">{assignerReviewTask.reviewNotes}</p>
                  </div>
                )}
              </div>
            )}
            <div className="grid gap-1.5"><Label className="text-[13px] text-[#CBD5E1]">Feedback</Label><Textarea value={assignerNotes} onChange={(e) => setAssignerNotes(e.target.value)} placeholder="Leave feedback or comments..." rows={3} className="bg-[#0B0F1A] border-white/[0.08] text-[#F1F5F9] placeholder:text-[#475569] rounded-[10px] text-[14px] resize-none" /></div>
            {assignerAction === "reject" && (
              <p className="text-[12px] text-[#94A3B8] -mt-2">
                Feedback is required when rejecting.
              </p>
            )}
            <FileDropZone tint="neutral" file={assignerFile} onChange={setAssignerFile} />
          </div>
          <DialogFooter className="gap-2 mt-2">
            <TaskButton variant="secondary" onClick={() => setAssignerReviewOpen(false)}>Cancel</TaskButton>
            {assignerAction === "review" ? (
              <TaskButton variant="primary-amber" onClick={handleAssignerReviewProgress} disabled={isUpdatingTask}>{isUpdatingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Set Progress</TaskButton>
            ) : assignerAction === "approve" ? (
              <TaskButton onClick={() => handleApproveCompletion(assignerReviewTask!.id)} disabled={isUpdatingTask}>{isUpdatingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}Confirm Approval</TaskButton>
            ) : (
              <TaskButton variant="secondary" onClick={() => handleRejectCompletion(assignerReviewTask!.id)} disabled={isUpdatingTask || !assignerNotes.trim()}>Reject & Return</TaskButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ASSIGNER'S REVIEW DIALOG ===== */}
      <Dialog open={!!viewingReviewMilestone} onOpenChange={(open) => { if (!open) setViewingReviewMilestone(null) }}>
        <DialogContent className="sm:max-w-[480px] max-h-[88vh] bg-white dark:bg-[#121826] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-[#F1F5F9] rounded-[18px] shadow-2xl flex flex-col overflow-hidden p-6">
          <div className="flex-shrink-0 pb-2">
            <DialogHeader>
              <DialogTitle className="text-[20px] font-bold text-slate-900 dark:text-[#F1F5F9]">
                Assigner's Review
              </DialogTitle>
              <DialogDescription className="text-[13px] text-slate-500 dark:text-[#64748B]">
                Reviewer feedback and attached file for "{viewingReviewMilestone?.title}".
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 min-h-0 min-w-0 overflow-y-auto space-y-4 py-2 px-1.5">
            {/* Status / Decision Pill */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                Decision:
              </span>
              {viewingReviewMilestone?.latestReview?.decision === "approved" || viewingReviewMilestone?.status === "approved" ? (
                <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Approved
                </span>
              ) : viewingReviewMilestone?.latestReview?.decision === "rejected" ? (
                <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  Rejected / Returned for Revision
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  Reviewed
                </span>
              )}
            </div>

            {/* Reviewer Comment */}
            {viewingReviewMilestone?.latestReview?.comment ? (
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                  Reviewer Comment
                </Label>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-white/[0.06] text-[14px] text-slate-900 dark:text-[#F1F5F9] leading-relaxed whitespace-pre-wrap">
                  {viewingReviewMilestone.latestReview.comment}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-slate-500 dark:text-slate-400 italic">No comment provided by reviewer.</p>
            )}

            {/* Reviewer Attachment & Download Button */}
            {viewingReviewMilestone?.latestReview?.reviewer_file_url && (
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                  Reviewer Attachment
                </Label>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/50 dark:bg-[#F59E0B]/[0.08] border border-amber-200 dark:border-[#F59E0B]/20 text-[13px]">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-[#FBBF24] min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate font-medium">{viewingReviewMilestone.latestReview.reviewer_file_name || "Reviewer attached file"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadFile(viewingReviewMilestone.latestReview.reviewer_file_url, viewingReviewMilestone.latestReview.reviewer_file_name || "file")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-amber-700 dark:text-[#FBBF24] bg-amber-100 dark:bg-[#F59E0B]/20 hover:bg-amber-200 dark:hover:bg-[#F59E0B]/30 rounded-lg border border-amber-300 dark:border-[#F59E0B]/30 transition-colors flex-shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-200 dark:border-white/[0.06] pt-4 mt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setViewingReviewMilestone(null)}
              className="px-5 py-2 text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
