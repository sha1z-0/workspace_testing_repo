"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Loader2, Plus, Users, UserCheck, Crown, Search } from "lucide-react"
import { teamsAPI } from "@/lib/api"
import { TeamsList } from "@/components/teams-list"
import { CreateTeamDialog } from "@/components/create-team-dialog"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"

export default function TeamPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<any[]>([])
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchData = async () => {
    if (user) {
      try {
        const teamsData = await teamsAPI.getAll()
        setTeams(teamsData)
      } catch (error) {
        console.error("Error fetching teams:", error)
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

  const filteredTeams = teams.filter(
    (team) =>
      team.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalMembers = teams.reduce((sum, team) => sum + (team.members?.length || 0), 0)
  const teamsWithLeads = teams.filter((t) => t.leadId || t.lead).length

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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">Teams</h1>
            <p className="text-indigo-100 max-w-xl text-lg">
              Manage team structures and assignments
            </p>
          </div>
          <Button size="lg" onClick={() => setIsCreateTeamOpen(true)} className="bg-white text-primary hover:bg-white/90">
            <Plus className="mr-2 h-5 w-5" />
            New Team
          </Button>
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
              <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/30">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{teams.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Organized groups</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="border-2 border-green-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Members</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center ring-1 ring-green-500/30">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalMembers}</div>
              <p className="text-xs text-muted-foreground mt-1">Team participants</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="border-2 border-purple-500/20 shadow-2xl bg-card/90 backdrop-blur-md hover:shadow-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Leads</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/30">
                <Crown className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{teamsWithLeads}</div>
              <p className="text-xs text-muted-foreground mt-1">Assigned leaders</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search teams by name or description..."
          className="pl-12 h-12 border-2 border-primary/20 focus:border-primary/40 rounded-xl"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredTeams.length === 0 ? (
        <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No teams found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery ? "Try adjusting your search terms" : "Create your first team to get started"}
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
            <TeamsList teams={filteredTeams} onUpdate={fetchData} />
          </CardContent>
        </Card>
      )}

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