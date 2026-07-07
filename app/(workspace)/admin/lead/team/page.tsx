"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { teamsAPI } from "@/lib/api"
import { useEffect, useState } from "react"
import { Loader2, Users, UserCheck, Mail, Building, Plus, X } from "lucide-react"
import { motion } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface TeamMember {
  uid: string
  name: string
  email: string
  avatar?: string
}

interface Team {
  id: string
  name: string
  description: string
  department: string
  leader_id: string
  members: TeamMember[]
  created_at: string
  updated_at: string
}

interface AvailableUser {
  uid: string
  name: string
  email: string
  role: string
  department: string
}

export default function LeadTeamPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<Team | null>(null)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)

  const fetchTeam = async () => {
    if (user) {
      try {
        const teamData = await teamsAPI.getTeamByLeadIdWithMembers(user.id)
        setTeam(teamData)
      } catch (error) {
        console.error("Error fetching team:", error)
        toast({
          title: "Error",
          description: "Failed to load team data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const fetchAvailableUsers = async () => {
    if (team?.id) {
      try {
        const users = await teamsAPI.getAvailableUsers(team.id)
        setAvailableUsers(users)
      } catch (error) {
        console.error("Error fetching available users:", error)
        toast({
          title: "Error",
          description: "Failed to load available users",
          variant: "destructive",
        })
      }
    }
  }

  useEffect(() => {
    fetchTeam()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (isAddMemberOpen && team?.id) {
      fetchAvailableUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddMemberOpen, team?.id])

  const handleAddMember = async () => {
    if (!selectedUserId || !team?.id) return

    setIsAddingMember(true)
    try {
      await teamsAPI.addMember(team.id, selectedUserId)
      toast({
        title: "Success",
        description: "Team member added successfully",
      })
      setIsAddMemberOpen(false)
      setSelectedUserId("")
      await fetchTeam()
    } catch (error: any) {
      console.error("Error adding member:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add team member",
        variant: "destructive",
      })
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!team?.id || !memberToRemove) return

    setRemovingMemberId(memberToRemove.uid)
    try {
      await teamsAPI.removeMember(team.id, memberToRemove.uid)
      toast({
        title: "Success",
        description: "Team member removed successfully",
      })
      await fetchTeam()
      setMemberToRemove(null)
    } catch (error: any) {
      console.error("Error removing member:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      })
    } finally {
      setRemovingMemberId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const getInitials = (name: string) => {
    if (!name) return "M"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
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

        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">Team Management</h1>
          <p className="text-indigo-100 max-w-xl text-lg">
            View and manage your team members
          </p>
        </div>
      </motion.div>

      {team ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-blue-500/5 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center ring-2 ring-blue-500/30">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{team.name}</CardTitle>
                    <CardDescription className="text-base mt-1">{team.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 border text-sm px-3 py-1">
                    {team.members?.filter(m => m.uid !== team.leader_id).length || 0} Members
                  </Badge>
                  <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Add Team Member</DialogTitle>
                        <DialogDescription className="text-base">
                          Select a user from your department to add to the team
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="user-select" className="text-sm font-semibold flex items-center gap-1.5">
                            <span className="text-primary">•</span> Select User
                          </Label>
                          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger id="user-select" className="h-10 border-2 focus:ring-2 focus:ring-primary/20">
                              <SelectValue placeholder="Choose a user..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUsers.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No available users to add
                                </div>
                              ) : (
                                availableUsers.map((user) => (
                                  <SelectItem key={user.uid} value={user.uid}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{user.name}</span>
                                      <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddMemberOpen(false)} disabled={isAddingMember} className="h-9 border-2 hover:bg-muted">
                          Cancel
                        </Button>
                        <Button onClick={handleAddMember} disabled={!selectedUserId || isAddingMember} className="h-9 bg-primary hover:bg-primary/90 shadow-lg">
                          {isAddingMember ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add Member"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/5 p-5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Department</h3>
                  </div>
                  <p className="text-lg font-medium">{team.department}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Team Members
                  </h3>
                  {team.members && team.members.filter(m => m.uid !== team.leader_id).length > 0 ? (
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
                      className="grid gap-3 md:grid-cols-2"
                    >
                      {team.members.filter(member => member.uid !== team.leader_id).map((member: TeamMember) => (
                        <motion.div
                          key={member.uid}
                          variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}
                          className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary/20 bg-gradient-to-r from-card to-card/50 hover:shadow-lg hover:border-primary/40 transition-all duration-300"
                        >
                          <Avatar className="h-11 w-11 ring-2 ring-primary/20">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-foreground font-semibold">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{member.name}</p>
                            {member.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Mail className="h-3 w-3" />
                                <span>{member.email}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setMemberToRemove(member)}
                            disabled={removingMemberId === member.uid || member.uid === user?.id}
                            title={member.uid === user?.id ? "You cannot remove yourself" : "Remove member"}
                          >
                            {removingMemberId === member.uid ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-muted/30 p-8 text-center"
                    >
                      <div className="p-3 bg-primary/10 rounded-full mb-3">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">No team members yet</p>
                      <Button size="sm" variant="outline" onClick={() => setIsAddMemberOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Member
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex h-80 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/20 bg-card/50 backdrop-blur-sm p-8 text-center"
        >
          <div className="p-4 bg-primary/10 rounded-full mb-4 shadow-sm">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">No team assigned</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            Contact an administrator to be assigned to a team
          </p>
        </motion.div>
      )}

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent className="bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to remove <span className="font-semibold text-foreground">{memberToRemove?.name}</span> from the team? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingMemberId === memberToRemove?.uid} className="h-9 border-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={removingMemberId === memberToRemove?.uid}
              className="h-9 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg"
            >
              {removingMemberId === memberToRemove?.uid ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
