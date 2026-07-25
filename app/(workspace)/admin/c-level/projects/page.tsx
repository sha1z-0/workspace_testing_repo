"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Loader2, Plus, FolderKanban, CheckCircle2, Clock, Search } from "lucide-react"
import { projectsAPI } from "@/lib/api"
import { ProjectsList } from "@/components/projects-list"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { PageHeader } from "@/components/ui/page-header"

export default function ProjectsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchData = async () => {
    if (user) {
      try {
        const projectsData = await projectsAPI.getAll()
        setProjects(projectsData)
      } catch (error) {
        console.error("Error fetching projects:", error)
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

  const filteredProjects = projects.filter(
    (project) =>
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeProjects = projects.filter((p) => p.status === "in-progress" || p.status === "active").length
  const completedProjects = projects.filter((p) => p.status === "completed").length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <PageHeader
        title="Projects"
        description="Manage ongoing and upcoming projects"
        icon={FolderKanban}
        action={
          <Button size="lg" onClick={() => setIsCreateProjectOpen(true)} className="bg-white text-slate-900 hover:bg-slate-100 border-none shadow-xl hover:shadow-2xl transition-all hover:scale-105">
            <Plus className="mr-2 h-5 w-5" />
            New Project
          </Button>
        }
      />

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
          <Card className="border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg transition-all duration-300 hover:border-slate-500/50 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/30">
                <FolderKanban className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All projects in system</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg transition-all duration-300 hover:border-slate-500/50 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center ring-1 ring-orange-500/30">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg transition-all duration-300 hover:border-slate-500/50 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center ring-1 ring-green-500/30">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully finished</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search projects by name or description..."
          className="pl-12 h-12 border-2 border-primary/20 focus:border-primary/40 rounded-xl"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredProjects.length === 0 ? (
        <Card className="border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg transition-all duration-300 hover:border-slate-500/50 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery ? "Try adjusting your search terms" : "Create your first project to get started"}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-4">
                Clear search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg transition-all duration-300 hover:border-slate-500/50 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)]">
          <CardContent className="p-6">
            <ProjectsList projects={filteredProjects} onUpdate={fetchData} />
          </CardContent>
        </Card>
      )}

      <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        onSuccess={(newProject) => {
          setProjects((prev) => [...prev, newProject])
        }}
      />
    </motion.div>
  )
} 