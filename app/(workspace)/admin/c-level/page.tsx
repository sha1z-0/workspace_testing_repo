"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { Loader2, Plus, Users, Megaphone, FolderKanban, Shield, Calendar, TrendingUp, Sparkles } from "lucide-react"
import { projectsAPI, teamsAPI, announcementsAPI } from "@/lib/api"
import { AnnouncementsList } from "@/components/announcements-list"
import { ProjectsList } from "@/components/projects-list"
import { TeamsList } from "@/components/teams-list"
import { CreateAnnouncement } from "@/components/create-announcement"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { CreateTeamDialog } from "@/components/create-team-dialog"
import { motion } from "framer-motion"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CLevelDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)

  const fetchData = async () => {
    if (user) {
      try {
        const [projectsData, teamsData, announcementsData] = await Promise.all([
          projectsAPI.getAll(),
          teamsAPI.getAll(),
          announcementsAPI.getAll(),
        ])
        setProjects(projectsData)
        setTeams(teamsData)
        setAnnouncements(announcementsData)
      } catch (error) {
        console.error("Error fetching data:", error)
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 p-1"
    >
      <PageHeader
        title="C-Level Dashboard"
        description="Manage announcements, projects, and teams"
        icon={Shield}
        action={
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 rounded-md shadow-lg bg-white text-slate-900 h-11 px-8 border-none">
              <Calendar className="h-5 w-5 text-slate-900" />
              <span className="text-sm font-medium text-slate-900">
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {/* Stat Card 1 — Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <Card className="border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg transition-all duration-300 hover:border-slate-500/50 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Announcements</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/30">
                <Megaphone className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{announcements.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Company-wide communications</p>
            </CardContent>
          </Card>
        </motion.div>
        {/* Stat Card 2 — Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <Card className="border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg transition-all duration-300 hover:border-slate-500/50 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/30">
                <FolderKanban className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Ongoing initiatives</p>
            </CardContent>
          </Card>
        </motion.div>
        {/* Stat Card 3 — Teams */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <Card className="border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg transition-all duration-300 hover:border-slate-500/50 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Groups</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center ring-1 ring-green-500/30">
                <Users className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{teams.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Organized teams</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs defaultValue="announcements" className="space-y-6 mt-8">
        <TabsList className="bg-white/40 dark:bg-slate-900/40 p-1 rounded-xl backdrop-blur-xl border border-slate-200/70 dark:border-white/20 dark:border-slate-800/50 w-full md:w-auto inline-flex h-auto gap-1">
          <TabsTrigger
            value="announcements"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Megaphone className="h-4 w-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger
            value="projects"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <FolderKanban className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger
            value="teams"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Users className="h-4 w-4" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-0 mt-4">
          <Card className="border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h3 className="text-[15px] font-semibold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-blue-500" />
                  Announcements
                </h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">Create and manage company-wide announcements</p>
              </div>
              <CreateAnnouncement onSuccess={fetchData} />
            </div>
            <div className="p-5">
              <AnnouncementsList announcements={announcements} onUpdate={fetchData} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-0 mt-4">
          <Card className="border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h3 className="text-[15px] font-semibold flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-purple-500" />
                  Projects
                </h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">Manage ongoing and upcoming projects</p>
              </div>
              <Button onClick={() => setIsCreateProjectOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
            <div className="p-5">
              <ProjectsList projects={projects} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-0 mt-4">
          <Card className="border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h3 className="text-[15px] font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  Teams
                </h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">Manage team structures and assignments</p>
              </div>
              <Button onClick={() => setIsCreateTeamOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Team
              </Button>
            </div>
            <div className="p-5">
              <TeamsList teams={teams} onUpdate={fetchData} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        onSuccess={(newProject) => {
          setProjects((prev) => [...prev, newProject])
        }}
      />

      <CreateTeamDialog
        open={isCreateTeamOpen}
        onOpenChange={setIsCreateTeamOpen}
        onSuccess={(newTeam) => {
          setTeams((prev) => [...prev, newTeam])
        }}
      />
    </motion.div>
  )
}
