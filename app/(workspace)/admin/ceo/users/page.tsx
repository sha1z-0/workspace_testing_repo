"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { usersAPI, departmentsAPI } from "@/lib/api"
import { useEffect, useState } from "react"
import { Loader2, Plus, Search, Edit, Trash2, UserPlus, RefreshCw } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

// Define types
interface Department {
  id: string;
  name: string;
  description?: string;
}

// Add password validation function
const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number" };
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one special character (!@#$%^&*)" };
  }
  return { isValid: true, message: "" };
};

export default function UserManagementPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  // Form states
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    department: "",
  })

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createError, setCreateError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const refreshUsers = async () => {
    try {
      setIsRefreshing(true);
      const data = await usersAPI.getAll();
      setUsers(data);
      toast({
        title: "Success",
        description: "User list refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing users:", error);
      toast({
        title: "Error",
        description: "Failed to refresh user list",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          // Fetch users
          const data = await usersAPI.getAll()
          setUsers(data)
          
          // Fetch departments
          const departmentsList = await departmentsAPI.getAll();
          
          // If no departments found, add a default "General" department
          if (departmentsList.length === 0) {
            departmentsList.push({ 
              id: "default", 
              name: "General", 
              description: "Default department" 
            });
          }
          
          setDepartments(departmentsList);
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

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const filteredUsers = users.filter(
    (user) =>
      (user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      ((user.department || "")?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
  )

  const handleCreateUser = async () => {
    if (!user) return;
    
    try {
      setIsCreatingUser(true);
      setCreateError("");
      
      // Check if all required fields are filled
      if (!newUser.name || !newUser.email || !newUser.password || !newUser.department) {
        setCreateError("Please fill in all required fields");
        return;
      }

      // Validate password
      const passwordValidation = validatePassword(newUser.password);
      if (!passwordValidation.isValid) {
        setCreateError(passwordValidation.message);
        return;
      }
      
      try {
        // Use the server API endpoint to create the user
        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            role: newUser.role,
            department: newUser.department,
          }),
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response received:', text);
          throw new Error('Server returned an invalid response. Please check if the API route exists.');
        }
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to create user');
        }
        
        // Show success message
        toast({
          title: "Success",
          description: "User has been created successfully. A verification email has been sent.",
        });
        
        // Refresh the users list
        const updatedUsers = await usersAPI.getAll();
        setUsers(updatedUsers);
        
        // Reset form and close dialog
        setIsCreateDialogOpen(false);
        setNewUser({
          name: "",
          email: "",
          password: "",
          role: "EMPLOYEE",
          department: "",
        });
      } catch (error: any) {
        throw error; // Pass error to the outer catch block
      }
      
    } catch (error: any) {
      console.error("Error creating user:", error);
      let errorMessage = "Failed to create user";
      
      // Handle specific Firebase Auth errors
      if (error.message?.includes("auth/email-already-in-use")) {
        errorMessage = "This email is already registered";
      } else if (error.message?.includes("auth/invalid-email")) {
        errorMessage = "Invalid email address";
      } else if (error.message?.includes("auth/weak-password")) {
        errorMessage = "Password is too weak";
      }
      
      setCreateError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    
    try {
      // Update user document
      await usersAPI.updateUser(selectedUser.id, {
        name: selectedUser.name,
        role: selectedUser.role,
        department: selectedUser.department,
        status: selectedUser.status
      });
      
      // Show success message
      toast({
        title: "Success",
        description: "User has been updated successfully",
      });
      
      // Refresh the users list
      const updatedUsers = await usersAPI.getAll();
      setUsers(updatedUsers);
      
      // Close dialog
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.uid === userId);
    if (user) {
      setUserToDelete(user);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // Find the Firestore document ID of the user with this uid
      if (!userToDelete.id) {
        throw new Error("User not found");
      }
      
      // Delete the user
      await usersAPI.deleteUser(userToDelete.id);
      
      // Refresh the users list from the database to ensure consistency
      const updatedUsers = await usersAPI.getAll();
      setUsers(updatedUsers);
      
      toast({
        title: "Success",
        description: "User has been deleted successfully",
      });
      
      // Close dialog and reset state
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

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

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">User Management</h1>
            <p className="text-indigo-100 max-w-xl text-lg">
              Create, edit, and manage user accounts across your organization
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg bg-white text-indigo-600 hover:bg-indigo-50 border-none">
                <UserPlus className="mr-2 h-5 w-5" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
              <DialogHeader className="space-y-2 pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/20 flex items-center justify-center ring-2 ring-blue-500/30">
                    <UserPlus className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">Create New User</DialogTitle>
                    <DialogDescription className="text-xs">
                      Add a new user to your workspace with specific roles and permissions.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            <div className="grid gap-3.5 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-blue-500">•</span> Full Name
                </Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter full name"
                  className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-blue-500">•</span> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter email address"
                  className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-blue-500">•</span> Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter secure password"
                  className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <p className="text-xs text-muted-foreground">
                  Must contain 8+ characters, uppercase, lowercase, number, and special character.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="role" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-blue-500">•</span> Role
                </Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger id="role" className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="LEAD">Team Lead</SelectItem>
                    <SelectItem value="C_LEVEL">C-Level</SelectItem>
                    <SelectItem value="CEO">CEO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="department" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-blue-500">•</span> Department
                </Label>
                <Select 
                  value={newUser.department} 
                  onValueChange={(value) => setNewUser({ ...newUser, department: value })}
                >
                  <SelectTrigger id="department" className="h-9 border-2 focus:ring-2 focus:ring-blue-500/20">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 pt-3 border-t border-border/50">
              {createError && (
                <p className="text-sm text-red-500 mb-2 w-full">{createError}</p>
              )}
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreatingUser} className="h-9 border-2 hover:bg-muted">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateUser} 
                disabled={isCreatingUser || !newUser.name || !newUser.email || !newUser.password || !newUser.department}
                className="h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                {isCreatingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or department..."
            className="pl-12 h-12 bg-card/50 border-2 border-primary/20 rounded-2xl focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all backdrop-blur-sm shadow-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          onClick={refreshUsers}
          disabled={isRefreshing}
          className="h-12 px-4 bg-primary/10 hover:bg-primary/20 text-primary border-2 border-primary/20 rounded-2xl transition-all"
          variant="outline"
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-xl">All Users</CardTitle>
          <CardDescription>Manage user accounts and permissions</CardDescription>
        </CardHeader>
          <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 p-8 text-center m-6">
              <h3 className="font-medium">No users found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? "Try adjusting your search" : "Create a new user to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="p-4 text-left font-semibold text-muted-foreground">User</th>
                    <th className="p-4 text-left font-semibold text-muted-foreground">Email</th>
                    <th className="p-4 text-left font-semibold text-muted-foreground">Role</th>
                    <th className="p-4 text-left font-semibold text-muted-foreground">Department</th>
                    <th className="p-4 text-left font-semibold text-muted-foreground">Status</th>
                    <th className="p-4 text-right font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
                            {user.avatar && user.avatar !== "/placeholder.svg" && (
                              <AvatarImage src={user.avatar} />
                            )}
                            <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 font-semibold">{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{user.name}</span>
                          </div>
                        </td>
                      <td className="p-4 text-muted-foreground">{user.email}</td>
                      <td className="p-4">
                        <Badge 
                          variant="outline" 
                          className={`font-medium
                            ${user.role === 'CEO' ? 'bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400' : ''}
                            ${user.role === 'C_LEVEL' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400' : ''}
                            ${user.role === 'LEAD' ? 'bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400' : ''}
                            ${user.role === 'EMPLOYEE' ? 'bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400' : ''}
                          `}
                          >
                            {user.role}
                          </Badge>
                        </td>
                      <td className="p-4 text-muted-foreground">{user.department || "General"}</td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={`font-medium
                            ${user.status === "active" ? "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400" : ""}
                            ${user.status === "inactive" ? "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400" : ""}
                            ${user.status === "suspended" ? "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400" : ""}
                          `}
                          >
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user)
                                  setIsEditDialogOpen(true)
                                }}
                                className="cursor-pointer"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit User</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user.uid)}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete User</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
          <DialogHeader className="space-y-2 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-green-500/20 flex items-center justify-center ring-2 ring-green-500/30">
                <Edit className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Edit User</DialogTitle>
                <DialogDescription className="text-xs">
                  Update user information and permissions.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-3.5 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-name" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-green-500">•</span> Full Name
                </Label>
                <Input
                  id="edit-name"
                  value={selectedUser.name || ""}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  className="h-9 border-2 focus:ring-2 focus:ring-green-500/20 transition-all"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-email" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-green-500">•</span> Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser.email || ""}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  disabled
                  className="h-9 border-2 bg-muted/50 cursor-not-allowed"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-role" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-green-500">•</span> Role
                </Label>
                <Select
                  value={selectedUser.role || "EMPLOYEE"}
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                >
                  <SelectTrigger id="edit-role" className="h-9 border-2 focus:ring-2 focus:ring-green-500/20">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="LEAD">Team Lead</SelectItem>
                    <SelectItem value="C_LEVEL">C-Level</SelectItem>
                    <SelectItem value="CEO">CEO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-department" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-green-500">•</span> Department
                </Label>
                <Select
                  value={selectedUser.department || "General"}
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, department: value })}
                >
                  <SelectTrigger id="edit-department" className="h-9 border-2 focus:ring-2 focus:ring-green-500/20">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-status" className="text-xs font-semibold flex items-center gap-1.5">
                  <span className="text-green-500">•</span> Status
                </Label>
                <Select
                  value={selectedUser.status || "active"}
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, status: value })}
                >
                  <SelectTrigger id="edit-status" className="h-9 border-2 focus:ring-2 focus:ring-green-500/20">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 pt-3 border-t border-border/50">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-9 border-2 hover:bg-muted">
              Cancel
            </Button>
            <Button 
              onClick={handleEditUser}
              className="h-9 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Edit className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gradient-to-br from-card via-card to-card/95 border-2 border-red-500/30 shadow-2xl backdrop-blur-xl">
          <AlertDialogHeader className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center ring-2 ring-red-500/30">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold">Delete User</AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{userToDelete?.name}</span> ({userToDelete?.email})? 
              This will permanently remove their account and all associated data.
            </p>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              className="h-9 border-2 hover:bg-muted"
              onClick={() => setUserToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              disabled={isDeleting}
              className="h-9 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
