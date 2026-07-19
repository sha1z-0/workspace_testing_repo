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
      className="space-y-6 min-h-screen p-1"
      style={{ background: "#0B0F1A" }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#121826] p-6"
      >
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#3B82F6]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[#6366F1]/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-3 py-1 mb-3">
              <Shield className="h-3 w-3 text-[#93C5FD]" />
              <span className="text-[11px] font-semibold text-[#93C5FD] uppercase tracking-wider">Management Panel</span>
            </div>
            <h1 className="text-[28px] font-semibold text-[#F1F5F9] tracking-tight leading-tight">
              C-Level Dashboard
            </h1>
            <p className="text-[#64748B] text-[14px] mt-1">
              Manage announcements, projects, and teams
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 rounded-[10px] bg-[#0F1523] border border-white/[0.06] px-3 py-2">
              <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
              <span className="text-[12px] text-[#94A3B8]">
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-[10px] bg-[#3B82F6]/[0.08] border border-[#3B82F6]/20 px-3 py-2">
              <TrendingUp className="h-3.5 w-3.5 text-[#93C5FD]" />
              <span className="text-[12px] text-[#93C5FD] font-medium">Operations Active</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Stat Card 1 — Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <div className="relative overflow-hidden rounded-[14px] border border-white/[0.06] bg-[#121826] p-5 group hover:border-[#3B82F6]/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.08)]">
            <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-[14px] bg-gradient-to-b from-[#3B82F6] to-[#6366F1]" />
            <div className="absolute -right-3 -bottom-3 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity">
              <Megaphone className="h-24 w-24 text-[#3B82F6]" />
            </div>
            <div className="relative z-10 pl-1">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] font-medium text-[#64748B] uppercase tracking-wider">Announcements</p>
                <div className="h-8 w-8 rounded-[8px] bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center">
                  <Megaphone className="h-4 w-4 text-[#93C5FD]" />
                </div>
              </div>
              <div className="text-[36px] font-bold text-[#F1F5F9] leading-none">{announcements.length}</div>
              <p className="text-[12px] text-[#475569] mt-2">Company-wide communications</p>
            </div>
          </div>
        </motion.div>
        {/* Stat Card 2 — Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <div className="relative overflow-hidden rounded-[14px] border border-white/[0.06] bg-[#121826] p-5 group hover:border-[#8B5CF6]/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.08)]">
            <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-[14px] bg-gradient-to-b from-[#8B5CF6] to-[#EC4899]" />
            <div className="absolute -right-3 -bottom-3 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity">
              <FolderKanban className="h-24 w-24 text-[#8B5CF6]" />
            </div>
            <div className="relative z-10 pl-1">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] font-medium text-[#64748B] uppercase tracking-wider">Active Projects</p>
                <div className="h-8 w-8 rounded-[8px] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
                  <FolderKanban className="h-4 w-4 text-[#C4B5FD]" />
                </div>
              </div>
              <div className="text-[36px] font-bold text-[#F1F5F9] leading-none">{projects.length}</div>
              <p className="text-[12px] text-[#475569] mt-2">Ongoing initiatives</p>
            </div>
          </div>
        </motion.div>
        {/* Stat Card 3 — Teams */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
          <div className="relative overflow-hidden rounded-[14px] border border-white/[0.06] bg-[#121826] p-5 group hover:border-[#10B981]/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]">
            <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-[14px] bg-gradient-to-b from-[#10B981] to-[#3B82F6]" />
            <div className="absolute -right-3 -bottom-3 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity">
              <Users className="h-24 w-24 text-[#10B981]" />
            </div>
            <div className="relative z-10 pl-1">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] font-medium text-[#64748B] uppercase tracking-wider">Team Groups</p>
                <div className="h-8 w-8 rounded-[8px] bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#6EE7B7]" />
                </div>
              </div>
              <div className="text-[36px] font-bold text-[#F1F5F9] leading-none">{teams.length}</div>
              <p className="text-[12px] text-[#475569] mt-2">Organized teams</p>
            </div>
          </div>
        </motion.div>
      </div>

      <Tabs defaultValue="announcements" className="space-y-0">
        <div className="flex gap-1 p-1 rounded-[12px] bg-[#121826] border border-white/[0.06] w-fit">
          <TabsList className="bg-transparent p-0 h-auto gap-1">
            <TabsTrigger
              value="announcements"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors data-[state=active]:bg-white/10 data-[state=active]:text-[#F1F5F9] data-[state=inactive]:text-[#64748B] data-[state=inactive]:hover:text-[#CBD5E1]"
            >
              <Megaphone className="h-3.5 w-3.5" />
              Announcements
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors data-[state=active]:bg-white/10 data-[state=active]:text-[#F1F5F9] data-[state=inactive]:text-[#64748B] data-[state=inactive]:hover:text-[#CBD5E1]"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              Projects
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[13px] font-medium transition-colors data-[state=active]:bg-white/10 data-[state=active]:text-[#F1F5F9] data-[state=inactive]:text-[#64748B] data-[state=inactive]:hover:text-[#CBD5E1]"
            >
              <Users className="h-3.5 w-3.5" />
              Teams
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="announcements" className="space-y-0 mt-4">
          <div className="rounded-[14px] border border-white/[0.06] bg-[#121826] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-[15px] font-semibold text-[#F1F5F9] flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-[#93C5FD]" />
                  Announcements
                </h3>
                <p className="text-[12px] text-[#64748B] mt-0.5">Create and manage company-wide announcements</p>
              </div>
              <CreateAnnouncement onSuccess={fetchData} />
            </div>
            <div className="p-5">
              <AnnouncementsList announcements={announcements} onUpdate={fetchData} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-0 mt-4">
          <div className="rounded-[14px] border border-white/[0.06] bg-[#121826] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-[15px] font-semibold text-[#F1F5F9] flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-[#C4B5FD]" />
                  Projects
                </h3>
                <p className="text-[12px] text-[#64748B] mt-0.5">Manage ongoing and upcoming projects</p>
              </div>
              <Button onClick={() => setIsCreateProjectOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
            <div className="p-5">
              <ProjectsList projects={projects} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-0 mt-4">
          <div className="rounded-[14px] border border-white/[0.06] bg-[#121826] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-[15px] font-semibold text-[#F1F5F9] flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#6EE7B7]" />
                  Teams
                </h3>
                <p className="text-[12px] text-[#64748B] mt-0.5">Manage team structures and assignments</p>
              </div>
              <Button onClick={() => setIsCreateTeamOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Team
              </Button>
            </div>
            <div className="p-5">
              <TeamsList teams={teams} onUpdate={fetchData} />
            </div>
          </div>
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
