"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Loader2, Megaphone, Bell, TrendingUp, Search, Calendar } from "lucide-react"
import { announcementsAPI } from "@/lib/api"
import { AnnouncementsList } from "@/components/announcements-list"
import { CreateAnnouncement } from "@/components/create-announcement"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const fetchData = async () => {
    if (user) {
      try {
        const announcementsData = await announcementsAPI.getAll()
        setAnnouncements(announcementsData)
      } catch (error) {
        console.error("Error fetching announcements:", error)
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const filteredAnnouncements = announcements.filter(
    (ann) =>
      ann.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.createdByName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const todayAnnouncements = announcements.filter((ann) => {
    const createdDate = new Date(ann.createdAt)
    const today = new Date()
    return createdDate.toDateString() === today.toDateString()
  }).length

  const highPriorityCount = announcements.filter((ann) => ann.priority === "high").length

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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">Announcements</h1>
            <p className="text-indigo-100 max-w-xl text-lg">
              Create and broadcast important updates to your organization
            </p>
          </div>
          <CreateAnnouncement onSuccess={fetchData} />
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
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-primary/20 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Announcements</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/30">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{announcements.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Company-wide communications</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="border-2 border-purple-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Posted Today</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/30">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{todayAnnouncements}</div>
              <p className="text-xs text-muted-foreground mt-1">Recent updates</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="border-2 border-orange-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center ring-1 ring-orange-500/30">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{highPriorityCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Urgent announcements</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search announcements by title, content, or author..."
          className="pl-12 h-12 border-2 border-primary/20 focus:border-primary/40 rounded-xl"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredAnnouncements.length === 0 ? (
        <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No announcements found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery ? "Try adjusting your search terms" : "Create your first announcement to communicate with your team"}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-4">
                Clear search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6">
            <AnnouncementsList announcements={filteredAnnouncements} onUpdate={fetchData} />
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
} 