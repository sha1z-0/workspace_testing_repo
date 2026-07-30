"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { tasksAPI, notificationsAPI } from "@/lib/api"
import type { FirebaseTask } from "@/lib/firebase-types"
import { useEffect, useState } from "react"
import { Loader2, CheckSquare, Calendar, MessageSquare, AlertCircle, BarChart3, Clock, ArrowUpRight, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { PageHeader } from "@/components/ui/page-header"

export default function DashboardPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<(FirebaseTask & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [assignedTasks, setAssignedTasks] = useState<(FirebaseTask & { id: string })[]>([])
  const [greeting, setGreeting] = useState("Welcome")

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good morning")
    else if (hour < 18) setGreeting("Good afternoon")
    else setGreeting("Good evening")

    const fetchData = async () => {
      if (user) {
        try {
          // console.log("Dashboard - Fetching data for user:", user.id);
          const [userTasks, notificationsData, unreadCount] = await Promise.all([
            tasksAPI.getUserTasks(user.id, user.role),
            notificationsAPI.getUserNotifications(user.id),
            notificationsAPI.getUnreadCount(user.id)
          ]);

          setTasks(userTasks);

          // Filter tasks assigned to the user
          const assigned = userTasks.filter((task: any) =>
            task.assigneeIds && task.assigneeIds.includes(user.id)
          );
          setAssignedTasks(assigned);

          // Set notifications data
          setNotifications(notificationsData.slice(0, 5)); // Get 5 most recent
          setUnreadNotifications(unreadCount);

        } catch (error) {
          console.error("Error fetching dashboard data:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  const todayTasks = tasks.filter((task) => {
    const dt = task.dueDatetime || task.dueDate
    if (!dt) return false
    const dueDate = new Date(dt)
    const today = new Date()
    return (
      dueDate.getDate() === today.getDate() &&
      dueDate.getMonth() === today.getMonth() &&
      dueDate.getFullYear() === today.getFullYear()
    )
  })

  const upcomingTasks = tasks.filter((task) => {
    const dt = task.dueDatetime || task.dueDate
    if (!dt) return false
    const dueDate = new Date(dt)
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)
    return dueDate > today && dueDate <= nextWeek
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-emerald-500"
      case "medium":
        return "bg-amber-500"
      case "high":
        return "bg-orange-500"
      case "urgent":
        return "bg-red-500"
      default:
        return "bg-slate-500"
    }
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return ""
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins}m`
      if (diffHours < 24) return `${diffHours}h`
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch (error) {
      return ""
    }
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
      <PageHeader
        title={`${greeting}, ${user?.name?.split(" ")[0]}`}
        description={`Here's what's happening in your workspace today. You have ${todayTasks.length} tasks due today.`}
        action={
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center min-w-[100px] border border-slate-200/70 dark:border-white/10">
              <span className="text-3xl font-bold">{tasks.filter(t => t.status === 'completed').length}</span>
              <span className="text-xs text-blue-100 uppercase tracking-wider font-medium">Completed</span>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center min-w-[100px] border border-slate-200/70 dark:border-white/10">
              <span className="text-3xl font-bold">{tasks.length}</span>
              <span className="text-xs text-blue-100 uppercase tracking-wider font-medium">Total</span>
            </div>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          <Card className="border border-slate-200 dark:border-slate-200/70 dark:border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)] hover:border-slate-500/50">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <CheckSquare className="w-24 h-24 text-primary" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Tasks</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CheckSquare className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-2xl font-bold">{todayTasks.length}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                {todayTasks.filter((t) => t.status === "completed").length > 0 && <TrendingUp className="w-3 h-3 mr-1 text-green-500" />}
                {todayTasks.length === 0
                  ? "No tasks due today"
                  : `${todayTasks.filter((t) => t.status === "completed").length} completed`}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          <Card className="border border-slate-200 dark:border-slate-200/70 dark:border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)] hover:border-slate-500/50">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <Calendar className="w-24 h-24 text-purple-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Assigned to You</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-2xl font-bold">{assignedTasks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {assignedTasks.filter((t) => t.status === "completed").length} / {assignedTasks.length} done
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          <Card className="border border-slate-200 dark:border-slate-200/70 dark:border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)] hover:border-slate-500/50">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <MessageSquare className="w-24 h-24 text-pink-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <MessageSquare className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-2xl font-bold">{unreadNotifications}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {unreadNotifications === 0 ? "All caught up" : "Unread notifications"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {user?.role === "CEO" ? (
          <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
            <Card className="border-none shadow-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white backdrop-blur-lg ring-1 ring-white/10 overflow-hidden relative group cursor-pointer">
              <Link href="/admin/ceo/time-analytics" className="absolute inset-0 z-20"></Link>
              <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
                <Clock className="w-32 h-32" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
                <CardTitle className="text-sm font-medium text-slate-300">Admin Actions</CardTitle>
                <div className="p-2 bg-white/10 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="text-xl font-bold flex items-center gap-2">
                  View Analytics <ArrowUpRight className="h-4 w-4" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Monitor platform usage
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
            <Card className="border border-slate-200 dark:border-slate-200/70 dark:border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)] hover:border-slate-500/50">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <AlertCircle className="w-24 h-24 text-amber-500" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">Announcements</CardTitle>
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="text-2xl font-bold">
                  {notifications.filter(n => n.type === "announcement").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active announcements
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Main Content Areas */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <div className="rounded-[18px] border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#121826] text-slate-900 dark:text-[#F1F5F9] shadow-xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#3B82F6] flex items-center justify-center flex-shrink-0">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[18px] font-bold text-slate-900 dark:text-[#F1F5F9] leading-tight truncate">
                    Due today
                  </h3>
                  <p className="text-[13px] text-slate-500 dark:text-[#64748B]">
                    Priority tasks for today
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <span className="px-3 py-1 rounded-full text-[12px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                  {todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}
                </span>
                <Link
                  href="/tasks"
                  className="text-[13px] font-semibold text-[#3B82F6] hover:underline inline-flex items-center gap-1 transition-colors"
                >
                  View all &gt;
                </Link>
              </div>
            </div>

            {/* Task Items List */}
            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mb-3">
                  <CheckSquare className="h-6 w-6 opacity-40" />
                </div>
                <p className="text-[14px] font-medium">You're all clear for today!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((task) => {
                  const priority = (task.priority || "medium").toLowerCase()
                  const status = (task.status || "todo").toLowerCase()

                  // Left accent bar background color based on priority
                  const priorityBarBg =
                    priority === "urgent"
                      ? "bg-red-500"
                      : priority === "high"
                      ? "bg-amber-500"
                      : priority === "medium"
                      ? "bg-amber-400"
                      : "bg-blue-500"

                  // Priority Text Color
                  const priorityTextColor =
                    priority === "urgent"
                      ? "text-red-500 dark:text-red-400"
                      : priority === "high"
                      ? "text-amber-500 dark:text-amber-400"
                      : priority === "medium"
                      ? "text-amber-500 dark:text-amber-400"
                      : "text-blue-500 dark:text-blue-400"

                  // Priority Label Capitalized
                  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1)

                  // Status badge styling
                  let statusBadgeStyle = "bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10"
                  let statusLabel = status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())

                  if (status === "in_progress") {
                    statusBadgeStyle = "bg-blue-500/10 text-blue-600 dark:text-[#93C5FD] border border-blue-500/20"
                    statusLabel = "In progress"
                  } else if (status === "pending_review") {
                    statusBadgeStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    statusLabel = "Pending review"
                  } else if (status === "completed") {
                    statusBadgeStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    statusLabel = "Completed"
                  } else if (status === "archived") {
                    statusBadgeStyle = "bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-white/10"
                    statusLabel = "Archived"
                  }

                  // Progress Bar Fill Color
                  const progressBarColor =
                    status === "completed"
                      ? "bg-emerald-500"
                      : priority === "urgent"
                      ? "bg-red-500"
                      : priority === "high" || priority === "medium"
                      ? "bg-amber-500"
                      : "bg-[#3B82F6]"

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0F1A]/80 p-3.5 pl-4.5 space-y-2.5 transition-colors"
                    >
                      {/* Left accent vertical priority bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${priorityBarBg}`} />

                      {/* Top Row: Title + Priority Label + Status Badge */}
                      <div className="flex items-center justify-between min-w-0 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-[14px] text-slate-900 dark:text-white truncate">
                            {task.title}
                          </span>
                          <span className={`text-[12px] font-semibold flex-shrink-0 ${priorityTextColor}`}>
                            {priorityLabel}
                          </span>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-[12px] font-medium flex-shrink-0 ${statusBadgeStyle}`}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Bottom Row: Full-width Progress Bar + Percentage */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums flex-shrink-0">
                          {task.progress || 0}%
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full border-none shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-pink-500" />
                Latest Updates
              </CardTitle>
              <CardDescription>Recent notifications and activities</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 opacity-50" />
                  </div>
                  <p>No new updates</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification, i) => (
                    <motion.div
                      key={notification.id}
                      initial={{ x: 10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start space-x-4 p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 transition-colors"
                    >
                      <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${!notification.read ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium leading-none">{notification.title}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                            {formatTimestamp(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.content}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
