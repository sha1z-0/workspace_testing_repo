"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Loader2, Users, UserCheck, Building, Briefcase, PieChart, Plus, UserPlus, Crown, Award, Target, UserCircle2, TrendingUp, ArrowRight } from "lucide-react"
import { usersAPI, projectsAPI } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

export default function TeamManagementPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [projects, setProjects] = useState<any[]>([])
  
  // Dialog states
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        setLoading(true)
        try {
          const [usersData, projectsData] = await Promise.all([
            usersAPI.getAll(),
            projectsAPI.getAll()
          ])
          
          setUsers(usersData)
          setProjects(projectsData)
          
          // Extract unique departments
          const depts = [...new Set(usersData.map((u: any) => u.department || "Unassigned"))]
          setDepartments(depts)
          
        } catch (error) {
          console.error("Error fetching data:", error)
        } finally {
          setLoading(false)
        }
      }
    }
    
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])
  
  // Handle team member assignment
  const handleAssignTeamMember = async () => {
    if (!selectedProject || !selectedEmployee) return;
    
    setIsSubmitting(true);
    
    try {
      // Get current team members
      const teamMembers = selectedProject.teamMembers || [];
      
      // Add new team member if not already in team
      if (!teamMembers.includes(selectedEmployee)) {
        const updatedTeamMembers = [...teamMembers, selectedEmployee];
        
        // Update project with new team members
        await projectsAPI.updateProject(selectedProject.id, {
          team_members: updatedTeamMembers
        });
        
        // Refresh projects data
        const refreshedProjects = await projectsAPI.getAll();
        setProjects(refreshedProjects);
        
        toast({
          title: "Team Member Assigned",
          description: "The team member has been successfully assigned to the project.",
        });
      } else {
        toast({
          title: "Team Member Already Assigned",
          description: "This team member is already part of the project team.",
          variant: "destructive"
        });
      }
      
      // Reset and close dialog
      setSelectedEmployee("");
      setIsAssignDialogOpen(false);
      
    } catch (error: any) {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign team member. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Calculate department stats
  const getDepartmentStats = () => {
    let stats = departments.map(dept => {
      const deptUsers = users.filter(u => (u.department || "Unassigned") === dept);
      return {
        name: dept,
        count: deptUsers.length,
        percentage: Math.round((deptUsers.length / users.length) * 100)
      };
    });
    
    // Sort by count, descending
    return stats.sort((a, b) => b.count - a.count);
  };
  
  // Calculate role distribution
  const getRoleDistribution = () => {
    const roles = {
      CEO: users.filter(u => u.role === "CEO").length,
      C_LEVEL: users.filter(u => u.role === "C_LEVEL").length,
      LEAD: users.filter(u => u.role === "LEAD").length,
      EMPLOYEE: users.filter(u => u.role === "EMPLOYEE").length,
    };
    
    return roles;
  };
  
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-blue-600 p-8 text-white shadow-xl ring-1 ring-white/10 dark:from-blue-900 dark:to-slate-900">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">Team Management</h1>
          <p className="text-indigo-100 max-w-xl text-lg">
            Manage teams, assignments, and departmental structure
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList className="bg-card/30 dark:bg-slate-900/30 p-1.5 rounded-2xl backdrop-blur-xl border border-border/50 w-full md:w-auto inline-flex h-auto gap-2">
          <TabsTrigger value="overview" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium">Overview</TabsTrigger>
          <TabsTrigger value="departments" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium">Departments</TabsTrigger>
          <TabsTrigger value="teams" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium">Project Teams</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center ring-2 ring-blue-500/30">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {departments.length} departments
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Leadership Team</CardTitle>
                <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center ring-2 ring-green-500/30">
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {users.filter(u => u.role === "CEO" || u.role === "C_LEVEL" || u.role === "LEAD").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  CEO, C-Level & Team Leads
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Departments</CardTitle>
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center ring-2 ring-purple-500/30">
                  <Building className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{departments.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Organizational units
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center ring-2 ring-orange-500/30">
                  <Briefcase className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {projects.filter(p => p.status !== "completed" && p.status !== "cancelled").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Out of {projects.length} total projects
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-xl">Department Distribution</CardTitle>
                <CardDescription>Employee distribution across departments</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-5">
                  {getDepartmentStats().map((dept) => (
                    <div key={dept.name} className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{dept.name}</div>
                        <div className="text-sm text-muted-foreground font-medium">{dept.count} employees</div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Progress value={dept.percentage} className="h-2.5 flex-1" />
                        <div className="w-12 text-right text-sm font-bold text-primary">{dept.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Organization Structure</CardTitle>
                    <CardDescription className="text-xs">Role distribution within organization</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 pb-8">
                {/* Role Distribution Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {Object.entries(getRoleDistribution()).map(([role, count]) => {
                    const roleConfig = {
                      CEO: { icon: Crown, color: "blue", gradient: "from-blue-500 via-blue-600 to-cyan-600", label: "Ceo" },
                      C_LEVEL: { icon: Award, color: "purple", gradient: "from-purple-500 via-purple-600 to-pink-600", label: "C-Level" },
                      LEAD: { icon: Target, color: "amber", gradient: "from-amber-500 via-orange-500 to-red-500", label: "Lead" },
                      EMPLOYEE: { icon: UserCircle2, color: "green", gradient: "from-green-500 via-emerald-500 to-teal-500", label: "Employee" }
                    }[role] || { icon: UserCircle2, color: "gray", gradient: "from-gray-500 via-gray-600 to-slate-600", label: role };
                    
                    const Icon = roleConfig.icon;
                    
                    return (
                      <div 
                        key={role} 
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-card to-card/50 border border-border/50 p-3.5 hover:border-primary/40 transition-all duration-300 hover:shadow-lg"
                      >
                        <div className="relative z-10">
                          <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${roleConfig.gradient} flex items-center justify-center shadow-md mb-2.5`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="font-bold text-sm mb-0.5">{roleConfig.label}</div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              {count} {count === 1 ? "employee" : "employees"}
                            </div>
                            <div className={`text-lg font-bold bg-gradient-to-br ${roleConfig.gradient} bg-clip-text text-transparent`}>
                              {count}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Organization Hierarchy Flow */}
                <div className="mt-6 pt-6 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary/20 to-blue-600/20 flex items-center justify-center">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold">Organization Hierarchy</h4>
                  </div>
                  
                  <div className="relative bg-gradient-to-br from-slate-50/50 to-slate-100/30 dark:from-slate-900/30 dark:to-slate-800/20 rounded-xl p-5 border border-border/30">
                    {/* Connecting Lines Background */}
                    <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-blue-500/40 via-purple-500/40 via-amber-500/40 to-green-500/40" />
                    
                    <div className="relative space-y-3.5">
                      {/* CEO Level */}
                      <div className="relative pl-9">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-3 h-px bg-blue-500/60" />
                        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-blue-500/15 via-blue-600/10 to-cyan-500/10 border border-blue-500/40 shadow-sm hover:shadow-md hover:border-blue-500/60 transition-all backdrop-blur-sm">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 flex items-center justify-center shadow-sm">
                            <Crown className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="font-bold text-sm text-blue-600 dark:text-blue-400">CEO</span>
                        </div>
                      </div>
                      
                      {/* C-Level */}
                      <div className="relative pl-9">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-3 h-px bg-purple-500/60" />
                        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-purple-500/15 via-purple-600/10 to-pink-500/10 border border-purple-500/40 shadow-sm hover:shadow-md hover:border-purple-500/60 transition-all backdrop-blur-sm">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-sm">
                            <Award className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="font-bold text-sm text-purple-600 dark:text-purple-400">C-Level Executives</span>
                        </div>
                      </div>
                      
                      {/* Team Leads */}
                      <div className="relative pl-9">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-3 h-px bg-amber-500/60" />
                        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-red-500/10 border border-amber-500/40 shadow-sm hover:shadow-md hover:border-amber-500/60 transition-all backdrop-blur-sm">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-sm">
                            <Target className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="font-bold text-sm text-amber-600 dark:text-amber-400">Team Leads</span>
                        </div>
                      </div>
                      
                      {/* Team Members */}
                      <div className="relative pl-9">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-3 h-px bg-green-500/60" />
                        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-green-500/15 via-emerald-500/10 to-teal-500/10 border border-green-500/40 shadow-sm hover:shadow-md hover:border-green-500/60 transition-all backdrop-blur-sm">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
                            <UserCircle2 className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="font-bold text-sm text-green-600 dark:text-green-400">Team Members</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="departments" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.map((dept) => {
              const deptUsers = users.filter((u) => (u.department || "Unassigned") === dept);
              const leadUsers = deptUsers.filter((u) => u.role === "LEAD" || u.role === "C_LEVEL");
              
              return (
                <Card key={dept} className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{dept}</CardTitle>
                        <CardDescription className="mt-1">{deptUsers.length} team members</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {leadUsers.length > 0 && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <h4 className="text-sm font-semibold mb-3">Department Leadership</h4>
                          <div className="space-y-2.5">
                            {leadUsers.map((leader) => (
                              <div key={leader.uid} className="flex items-center space-x-3 p-2 rounded-lg bg-background/50">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-blue-600/30 flex items-center justify-center font-semibold text-primary ring-2 ring-primary/20">
                                  {leader.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">{leader.name}</p>
                                  <p className="text-xs text-muted-foreground">{leader.role}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <h4 className="text-sm font-semibold mb-3">Team Members</h4>
                        <div className="space-y-2.5">
                          {deptUsers
                            .filter((u) => u.role === "EMPLOYEE")
                            .slice(0, 5)
                            .map((employee) => (
                              <div key={employee.uid} className="flex items-center space-x-3 p-2 rounded-lg bg-background/50">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center font-medium text-sm ring-2 ring-border">
                                  {employee.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{employee.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                                </div>
                              </div>
                            ))}
                        </div>
                        
                        {deptUsers.filter((u) => u.role === "EMPLOYEE").length > 5 && (
                          <p className="text-xs text-muted-foreground mt-3 font-medium">
                            +{deptUsers.filter((u) => u.role === "EMPLOYEE").length - 5} more employees
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="teams" className="mt-6">
          <div className="space-y-6">
            {projects.map((project) => {
              const projectLead = users.find((u) => u.uid === project.leadId);
              const teamMembers = users.filter((u) => 
                project.teamMembers && project.teamMembers.includes(u.uid)
              );
              
              return (
                <Card key={project.id} className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="border-b border-border/50">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{project.name}</CardTitle>
                        <CardDescription className="mt-1.5">
                          {project.status.replace("_", " ")} • {teamMembers.length} team members
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-semibold border border-primary/20">
                          {Math.round(project.progress)}% Complete
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedProject(project);
                            setIsAssignDialogOpen(true);
                          }}
                          className="border-2 hover:bg-primary/10"
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                          Add Member
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="space-y-4">
                      {projectLead && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <h4 className="text-sm font-semibold mb-3">Project Lead</h4>
                          <div className="flex items-center space-x-3 p-2 rounded-lg bg-background/50">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-blue-600/30 flex items-center justify-center text-primary font-bold ring-2 ring-primary/30">
                              {projectLead.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{projectLead.name}</p>
                              <p className="text-xs text-muted-foreground">{projectLead.role} • {projectLead.department || "No department"}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <h4 className="text-sm font-semibold mb-3">Team Members</h4>
                        {teamMembers.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">No team members assigned yet</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {teamMembers.map((member) => (
                              <div key={member.uid} className="flex items-center space-x-2.5 p-2 rounded-lg bg-background/50">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center font-medium text-sm ring-2 ring-border">
                                  {member.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{member.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{member.department || "No department"}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Dialog for assigning team members */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
          <DialogHeader className="space-y-2 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-green-500/20 flex items-center justify-center ring-2 ring-green-500/30">
                <UserPlus className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Assign Team Member</DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedProject && (
                    <span>Add a new team member to <strong>"{selectedProject.name}"</strong> project</span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <div className="grid gap-3.5">
              <div className="grid gap-1.5">
                <Label htmlFor="employee" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-green-500">•</span> Select Employee
                </Label>
                <Select 
                  value={selectedEmployee} 
                  onValueChange={setSelectedEmployee}
                >
                  <SelectTrigger id="employee" className="h-9 border-2 focus:ring-2 focus:ring-green-500/20">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) => {
                        // Filter out users who are already in the team
                        if (!selectedProject) return true;
                        const currentTeam = selectedProject.teamMembers || [];
                        return !currentTeam.includes(u.uid);
                      })
                      .sort((a, b) => {
                        // Sort by department first, then by name
                        if ((a.department || "Unassigned") < (b.department || "Unassigned")) return -1;
                        if ((a.department || "Unassigned") > (b.department || "Unassigned")) return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((employee) => (
                        <SelectItem key={employee.uid} value={employee.uid}>
                          {employee.name} ({employee.department || "No department"})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 pt-3 border-t border-border/50">
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} className="h-9 border-2 hover:bg-muted">
              Cancel
            </Button>
            <Button 
              onClick={handleAssignTeamMember}
              disabled={isSubmitting || !selectedEmployee}
              className="h-9 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign to Team
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 