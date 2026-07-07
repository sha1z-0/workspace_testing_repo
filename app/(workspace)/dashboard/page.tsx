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
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-blue-600 p-8 text-white shadow-xl ring-1 ring-white/10 dark:from-blue-900 dark:to-slate-900">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">
              {greeting}, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-blue-100/90 text-lg max-w-xl">
              Here's what's happening in your workspace today. You have <span className="font-semibold text-white">{todayTasks.length} tasks</span> due today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center min-w-[100px] border border-white/10">
              <span className="text-3xl font-bold">{tasks.filter(t => t.status === 'completed').length}</span>
              <span className="text-xs text-blue-100 uppercase tracking-wider font-medium">Completed</span>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center min-w-[100px] border border-white/10">
              <span className="text-3xl font-bold">{tasks.length}</span>
              <span className="text-xs text-blue-100 uppercase tracking-wider font-medium">Total</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          <Card className="border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:border-blue-500/50">
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
          <Card className="border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:border-purple-500/50">
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
          <Card className="border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] hover:border-pink-500/50">
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
            <Card className="border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:border-amber-500/50">
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
          <Card className="h-full border-none shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                Due Today
              </CardTitle>
              <CardDescription>Priority tasks for today</CardDescription>
            </CardHeader>
            <CardContent>
              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <CheckSquare className="h-6 w-6 opacity-50" />
                  </div>
                  <p>You're all clear for today!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="flex items-center space-x-4 p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className={`h-3 w-3 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 ${getPriorityColor(task.priority)}`} />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{task.title}</p>
                        <div className="flex items-center gap-2">
                          <Progress value={task.progress} className="h-1.5 w-20" />
                          <span className="text-[10px] text-muted-foreground">{task.progress}%</span>
                        </div>
                      </div>
                      <Badge variant={task.status === "completed" ? "secondary" : "outline"} className="capitalize">
                        {task.status}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
