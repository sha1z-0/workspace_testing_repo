"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { projectsAPI } from "@/lib/api"
import { useEffect, useState } from "react"
import { Loader2, Plus, FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { motion } from "framer-motion"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export default function LeadProjectsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const fetchProjects = async () => {
    if (user) {
      try {
        const data = await projectsAPI.getAll()
        setProjects(data)
      } catch (error) {
        console.error("Error fetching projects:", error)
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'on_hold':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'completed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">Projects</h1>
            <p className="text-indigo-100 max-w-xl text-lg">
              Manage your team's projects and track progress
            </p>
          </div>
          <Button 
            size="lg" 
            onClick={() => setIsCreateDialogOpen(true)}
            className="shadow-lg bg-white text-indigo-600 hover:bg-indigo-50 border-none"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Project
          </Button>
        </div>
      </motion.div>

      {projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex h-80 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/20 bg-card/50 backdrop-blur-sm p-8 text-center"
        >
          <div className="p-4 bg-primary/10 rounded-full mb-4 shadow-sm">
            <FolderKanban className="h-10 w-10 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">No projects yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            Create your first project to start tracking progress with your team
          </p>
          <Button 
            variant="outline" 
            className="mt-6 border-2"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create your first project
          </Button>
        </motion.div>
      ) : (
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
          {projects.map((project) => (
            <motion.div
              key={project.id}
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            >
              <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-primary/20 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 h-full">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/30">
                      <FolderKanban className="h-5 w-5 text-blue-500" />
                    </div>
                    <Badge className={`${getStatusColor(project.status)} border`}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <CardDescription className="mt-1.5 line-clamp-2">{project.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{project.progress || 0}%</span>
                    </div>
                    <Progress value={project.progress || 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchProjects}
      />
    </motion.div>
  )
}
