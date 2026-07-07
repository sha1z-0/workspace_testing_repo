"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { Loader2, Plus, Users, Megaphone, FolderKanban } from "lucide-react"
import { projectsAPI, teamsAPI, announcementsAPI } from "@/lib/api"
import { AnnouncementsList } from "@/components/announcements-list"
import { ProjectsList } from "@/components/projects-list"
import { TeamsList } from "@/components/teams-list"
import { CreateAnnouncement } from "@/components/create-announcement"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { CreateTeamDialog } from "@/components/create-team-dialog"
import { motion } from "framer-motion"

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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">C-Level Dashboard</h1>
            <p className="text-indigo-100 max-w-xl text-lg">
              Manage announcements, projects, and teams
            </p>
          </div>
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
                <Megaphone className="h-5 w-5 text-blue-500" />
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
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="border-2 border-green-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:-translate-y-1">
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
      </motion.div>

      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Announcements</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage company-wide announcements
              </p>
            </div>
            <CreateAnnouncement onSuccess={fetchData} />
          </div>
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
            <CardContent className="p-6">
              <AnnouncementsList announcements={announcements} onUpdate={fetchData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Projects</h3>
              <p className="text-sm text-muted-foreground">
                Manage ongoing and upcoming projects
              </p>
            </div>
            <Button onClick={() => setIsCreateProjectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
            <CardContent className="p-6">
              <ProjectsList projects={projects} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Teams</h3>
              <p className="text-sm text-muted-foreground">
                Manage team structures and assignments
              </p>
            </div>
            <Button onClick={() => setIsCreateTeamOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Team
            </Button>
          </div>
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
            <CardContent className="p-6">
              <TeamsList teams={teams} onUpdate={fetchData} />
            </CardContent>
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
