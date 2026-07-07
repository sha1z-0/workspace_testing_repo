"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usersAPI, departmentsAPI } from "@/lib/api"
import { useEffect, useState } from "react"
import { Loader2, Plus, Search, UserPlus, Building, Users, Pencil, Trash2, TrendingUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function DepartmentManagementPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null)
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false)
  const [createError, setCreateError] = useState("")
  
  // New department form state
  const [newDepartment, setNewDepartment] = useState({
    name: "",
    description: "",
    manager: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          // Get all users and departments from database
          const [usersData, departmentsData] = await Promise.all([
            usersAPI.getAll(),
            departmentsAPI.getAll()
          ])
          
          setUsers(usersData)
          
          // Enrich departments with actual user count
          const enrichedDepartments = departmentsData.map(dept => {
            const deptUsers = usersData.filter(u => u.department === dept.name)
            const manager = dept.head_id ? usersData.find(u => u.uid === dept.head_id) : null
            
            return {
              ...dept,
              userCount: deptUsers.length,
              manager: manager?.name || dept.head_name || "Unassigned",
              managerId: dept.head_id,
            }
          })
          
          setDepartments(enrichedDepartments)
        } catch (error) {
          console.error("Error fetching data:", error)
          toast({
            title: "Error",
            description: "Failed to load departments data",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.manager || "").toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Get potential managers (LEAD or C_LEVEL users)
  const potentialManagers = users.filter(u => 
    u.role === "LEAD" || u.role === "C_LEVEL"
  )
  
  const handleCreateDepartment = async () => {
    if (!user) return
    
    try {
      setIsCreatingDepartment(true)
      setCreateError("")
      
      // Validate input
      if (!newDepartment.name.trim()) {
        setCreateError("Department name is required")
        setIsCreatingDepartment(false)
        return
      }
      
      // Create new department
      await departmentsAPI.createDepartment({
        name: newDepartment.name,
        description: newDepartment.description,
        head_id: newDepartment.manager || null,
        head_name: null,
        member_count: 0
      })
      
      // Show success message
      toast({
        title: "Department Created",
        description: `Department "${newDepartment.name}" has been created successfully.`,
      })
      
      // Reset form and close dialog
      setNewDepartment({
        name: "",
        description: "",
        manager: "",
      })
      setIsCreateDialogOpen(false)

      // Refresh departments list from database
      const departmentsData = await departmentsAPI.getAll()
      const usersData = await usersAPI.getAll()
      
      const enrichedDepartments = departmentsData.map(dept => {
        const deptUsers = usersData.filter(u => u.department === dept.name)
        const manager = dept.head_id ? usersData.find(u => u.uid === dept.head_id) : null
        
        return {
          ...dept,
          userCount: deptUsers.length,
          manager: manager?.name || dept.head_name || "Unassigned",
          managerId: dept.head_id,
        }
      })
      
      setDepartments(enrichedDepartments)
      setUsers(usersData)
      
    } catch (error: any) {
      console.error("Error creating department:", error)
      setCreateError(error.message || "Failed to create department")
      toast({
        title: "Error",
        description: error.message || "Failed to create department",
        variant: "destructive",
      })
    } finally {
      setIsCreatingDepartment(false)
    }
  }
  
  const handleEditDepartment = async () => {
    if (!user || !selectedDepartment) return
    
    try {
      // Update department in database
      await departmentsAPI.updateDepartment(selectedDepartment.id, {
        name: selectedDepartment.name,
        description: selectedDepartment.description || "",
        head_id: selectedDepartment.managerId || null,
        head_name: selectedDepartment.manager === "Unassigned" ? null : selectedDepartment.manager,
      })
      
      // Close dialog
      setIsEditDialogOpen(false)
      setSelectedDepartment(null)
      
      toast({
        title: "Department Updated",
        description: `Department "${selectedDepartment.name}" has been updated.`,
      })

      // Refresh departments list
      const departmentsData = await departmentsAPI.getAll()
      const usersData = await usersAPI.getAll()
      
      const enrichedDepartments = departmentsData.map(dept => {
        const deptUsers = usersData.filter(u => u.department === dept.name)
        const manager = dept.head_id ? usersData.find(u => u.uid === dept.head_id) : null
        
        return {
          ...dept,
          userCount: deptUsers.length,
          manager: manager?.name || dept.head_name || "Unassigned",
          managerId: dept.head_id,
        }
      })
      
      setDepartments(enrichedDepartments)
      
    } catch (error: any) {
      console.error("Error updating department:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update department",
        variant: "destructive",
      })
    }
  }
  
  const handleDeleteDepartment = async (departmentName: string) => {
    if (!user) return
    
    try {
      // Find the department by name
      const dept = departments.find(d => d.name === departmentName)
      if (!dept || !dept.id) {
        throw new Error("Department not found")
      }

      // Delete from database
      await departmentsAPI.deleteDepartment(dept.id)
      
      toast({
        title: "Department Deleted",
        description: `Department "${departmentName}" has been deleted.`,
      })

      // Refresh departments list
      const departmentsData = await departmentsAPI.getAll()
      const usersData = await usersAPI.getAll()
      
      const enrichedDepartments = departmentsData.map(dept => {
        const deptUsers = usersData.filter(u => u.department === dept.name)
        const manager = dept.head_id ? usersData.find(u => u.uid === dept.head_id) : null
        
        return {
          ...dept,
          userCount: deptUsers.length,
          manager: manager?.name || dept.head_name || "Unassigned",
          managerId: dept.head_id,
        }
      })
      
      setDepartments(enrichedDepartments)
      
    } catch (error: any) {
      console.error("Error deleting department:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete department",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
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
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-white/20 backdrop-blur-sm border border-white/10">
              <Building className="h-4 w-4" />
              <span className="text-sm font-semibold">Organization Structure</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">
              Department Management
            </h1>
            <p className="text-blue-100/90 text-lg max-w-xl">
              Manage {departments.length} departments with <span className="font-semibold text-white">{users.length} team members</span> across the organization.
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
                <Plus className="mr-2 h-5 w-5" />
                <span className="font-semibold">New Department</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
            <DialogHeader className="space-y-2 pb-1">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-purple-500/20 flex items-center justify-center ring-2 ring-purple-500/30">
                  <Building className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">Create Department</DialogTitle>
                  <DialogDescription className="text-xs">
                    Add a new department to the organization structure.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="grid gap-3.5 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-purple-500">•</span> Department Name
                </Label>
                <Input
                  id="name"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                  placeholder="e.g. Marketing, Engineering, Finance"
                  className="h-9 border-2 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="description" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-purple-500">•</span> Description
                </Label>
                <Textarea
                  id="description"
                  value={newDepartment.description}
                  onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                  placeholder="Department responsibilities and purpose"
                  rows={3}
                  className="border-2 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="manager" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-purple-500">•</span> Department Manager
                </Label>
                <select
                  id="manager"
                  value={newDepartment.manager}
                  onChange={(e) => setNewDepartment({ ...newDepartment, manager: e.target.value })}
                  className="flex h-9 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a manager</option>
                  {potentialManagers.map(manager => (
                    <option key={manager.uid} value={manager.uid}>
                      {manager.name} ({manager.role === "LEAD" ? "Team Lead" : "C-Level"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="gap-2 pt-3 border-t border-border/50">
              {createError && (
                <p className="text-sm text-red-500 mb-2 w-full">{createError}</p>
              )}
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreatingDepartment} className="h-9 border-2 hover:bg-muted">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateDepartment} 
                disabled={isCreatingDepartment || !newDepartment.name.trim()}
                className="h-9 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                {isCreatingDepartment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Department
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          <Card className="border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:border-purple-500/50">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <Building className="w-24 h-24 text-purple-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Departments</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Building className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-2xl font-bold">{departments.length}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1 text-purple-500" />
                Active structures
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          <Card className="border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:border-blue-500/50">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <Users className="w-24 h-24 text-blue-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all departments
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          <Card className="border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden relative group transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:border-green-500/50">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <UserPlus className="w-24 h-24 text-green-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Managers</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-2xl font-bold">{departments.filter(d => d.managerId).length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {departments.filter(d => d.managerId).length} / {departments.length} assigned
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search Bar */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search departments by name, description, or manager..."
            className="pl-12 h-12 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border-white/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Departments List */}
      {filteredDepartments.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Building className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No departments found</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                {searchQuery ? "Try adjusting your search terms" : "Get started by creating your first department"}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredDepartments.map((department, index) => (
            <motion.div
              key={department.name}
              variants={itemVariants}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <Card className="h-full border border-white/20 shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg ring-1 ring-slate-900/5 dark:ring-white/10 transition-all duration-300 hover:shadow-xl hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                        <Building className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl font-bold truncate">{department.name}</CardTitle>
                        <CardDescription className="text-sm line-clamp-2 mt-1">
                          {department.description || "No description provided"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all"
                        onClick={() => {
                          setSelectedDepartment(department)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 transition-all">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Department</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the "{department.name}" department? 
                              This will not delete the users in this department, but they will need 
                              to be reassigned.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteDepartment(department.name)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Team Members */}
                  <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Team Members</p>
                          <p className="text-lg font-bold">{department.userCount}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {((department.userCount / users.length) * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <Progress value={(department.userCount / users.length) * 100} className="h-1.5" />
                  </div>
                  
                  {/* Manager */}
                  <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Department Manager</p>
                          <p className="text-sm font-semibold truncate">{department.manager}</p>
                        </div>
                      </div>
                      <Badge variant={department.managerId ? "default" : "secondary"}>
                        {department.managerId ? "Active" : "Vacant"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
          <DialogHeader className="space-y-2 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-orange-500/20 flex items-center justify-center ring-2 ring-orange-500/30">
                <Pencil className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Edit Department</DialogTitle>
                <DialogDescription className="text-xs">
                  Update department information and manager.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedDepartment && (
            <div className="grid gap-3.5 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-name" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-orange-500">•</span> Department Name
                </Label>
                <Input
                  id="edit-name"
                  value={selectedDepartment.name}
                  onChange={(e) => setSelectedDepartment({ ...selectedDepartment, name: e.target.value })}
                  className="h-9 border-2 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-description" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-orange-500">•</span> Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={selectedDepartment.description}
                  onChange={(e) => setSelectedDepartment({ ...selectedDepartment, description: e.target.value })}
                  rows={3}
                  className="border-2 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-manager" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-orange-500">•</span> Department Manager
                </Label>
                <select
                  id="edit-manager"
                  value={selectedDepartment.managerId || ""}
                  onChange={(e) => {
                    const newManagerId = e.target.value;
                    const newManager = users.find(u => u.uid === newManagerId);
                    setSelectedDepartment({ 
                      ...selectedDepartment, 
                      managerId: newManagerId,
                      manager: newManager ? newManager.name : "Unassigned"
                    });
                  }}
                  className="flex h-9 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">No manager assigned</option>
                  {potentialManagers.map(manager => (
                    <option key={manager.uid} value={manager.uid}>
                      {manager.name} ({manager.role === "LEAD" ? "Team Lead" : "C-Level"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 pt-3 border-t border-border/50">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-9 border-2 hover:bg-muted">
              Cancel
            </Button>
            <Button 
              onClick={handleEditDepartment}
              disabled={!selectedDepartment || !selectedDepartment.name.trim()}
              className="h-9 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
} 