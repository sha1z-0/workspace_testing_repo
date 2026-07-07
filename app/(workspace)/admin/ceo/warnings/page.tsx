"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Loader2, AlertTriangle, Plus, Check, X, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { warningsAPI, usersAPI } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import type { FirebaseWarning } from "@/lib/firebase-types"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DialogFooter } from "@/components/ui/dialog"

// WarningCard component
interface WarningCardProps {
  warning: FirebaseWarning;
  onResolve?: () => void;
  readOnly?: boolean;
}

function WarningCard({ warning, onResolve, readOnly = false }: WarningCardProps) {
  // Format timestamp if it exists
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch (error) {
      return "Invalid date";
    }
  };

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400 font-medium">Critical</Badge>;
      case "high": 
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400 font-medium">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:text-yellow-400 font-medium">Medium</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400 font-medium">Low</Badge>;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400 font-medium">Active</Badge>;
      case "resolved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400 font-medium">Resolved</Badge>;
      case "dismissed":
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400 font-medium">Dismissed</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <div className="border-2 border-primary/20 rounded-2xl p-5 space-y-3 bg-gradient-to-r from-primary/5 to-transparent backdrop-blur-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg">{warning.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Issued to: <span className="font-semibold">{warning.userName}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getSeverityBadge(warning.severity)}
          {getStatusBadge(warning.status)}
        </div>
      </div>
      
      <p className="text-sm whitespace-pre-line">{warning.description}</p>
      
      <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 border-t border-border/50">
        <div>
          Issued by: {warning.issuerName} • {formatDate(warning.createdAt)}
        </div>
        
        {warning.status !== "active" && warning.resolvedAt && (
          <div>
            {warning.status === "resolved" ? "Resolved" : "Dismissed"} on {formatDate(warning.resolvedAt)}
          </div>
        )}
        
        {!readOnly && onResolve && (
          <Button size="sm" variant="outline" onClick={onResolve} className="border-2 hover:bg-primary/10">
            <Check className="mr-1 h-3 w-3" />
            Resolve Warning
          </Button>
        )}
      </div>
    </div>
  );
}

export default function WarningsSystemPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [warnings, setWarnings] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("active")
  
  // Filter states
  const [filteredWarnings, setFilteredWarnings] = useState<any[]>([])
  
  // Dialog state
  const [isCreateWarningOpen, setIsCreateWarningOpen] = useState(false)
  const [isResolvingWarning, setIsResolvingWarning] = useState(false)
  const [selectedWarning, setSelectedWarning] = useState<FirebaseWarning | null>(null)

  // Form state
  const [warningForm, setWarningForm] = useState({
    userId: "",
    title: "",
    description: "",
    severity: "medium" as "low" | "medium" | "high" | "critical"
  })
  
  // Resolution form
  const [resolutionForm, setResolutionForm] = useState({
    reason: "",
    status: "resolved" as "resolved" | "dismissed"
  })

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // We'll add data fetching here later
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Fetch warnings and users in parallel
        const [warningsData, usersData] = await Promise.all([
          warningsAPI.getAll(),
          usersAPI.getAll()
        ])
        
        setWarnings(warningsData as any[])
        setUsers(usersData)
        
        // Set initial filtered warnings based on active tab
        setFilteredWarnings(warningsData.filter((warning: any) => warning.status === "active"))
        
        setLoading(false)
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load warnings data",
          variant: "destructive",
        })
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // Update filtered warnings when tab changes
  useEffect(() => {
    if (warnings.length > 0) {
      switch (activeTab) {
        case "active":
          setFilteredWarnings(warnings.filter((w) => w.status === "active"))
          break
        case "resolved":
          setFilteredWarnings(warnings.filter((w) => w.status === "resolved" || w.status === "dismissed"))
          break
        case "all":
          setFilteredWarnings(warnings)
          break
      }
    }
  }, [activeTab, warnings])

  // Handler for creating new warning
  const handleCreateWarning = async () => {
    if (!user || !warningForm.userId || !warningForm.title || !warningForm.description) {
      return;
    }
    
    setError("");
    setIsSubmitting(true);
    
    try {
      // Find selected user details
      const selectedUser = users.find(u => u.uid === warningForm.userId);
      
      if (!selectedUser) {
        setError("Selected user not found");
        setIsSubmitting(false);
        return;
      }
      
      // Create warning
      await warningsAPI.create({
        userId: selectedUser.uid,
        userName: selectedUser.name,
        issuerId: user.id,
        issuerName: user.name,
        title: warningForm.title,
        description: warningForm.description,
        severity: warningForm.severity,
        departmentId: selectedUser.department || undefined,
        departmentName: selectedUser.department || undefined
      });
      
      // Get fresh warnings data
      const freshWarnings = await warningsAPI.getAll();
      setWarnings(freshWarnings as any[]);
      
      // Update filtered warnings
      if (activeTab === "active" || activeTab === "all") {
        setFilteredWarnings(
          activeTab === "active" 
            ? freshWarnings.filter((w: any) => w.status === "active")
            : freshWarnings
        );
      }
      
      // Reset form and close dialog
      setWarningForm({
        userId: "",
        title: "",
        description: "",
        severity: "medium"
      });
      
      setIsCreateWarningOpen(false);
      
      // Show success message
      toast({
        title: "Warning Issued",
        description: `Warning has been issued to ${selectedUser.name}`,
      });
    } catch (error: any) {
      console.error("Error creating warning:", error);
      setError(error.message || "Failed to create warning");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle resolving warning
  const handleResolveWarning = async () => {
    if (!user || !selectedWarning || !resolutionForm.reason) {
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      // Update warning status
      await warningsAPI.updateStatus(
        selectedWarning.id as string,
        resolutionForm.status,
        {
          resolvedBy: user.id,
          resolvedReason: resolutionForm.reason
        }
      );
      
      // Get fresh warnings data
      const freshWarnings = await warningsAPI.getAll();
      setWarnings(freshWarnings as any[]);
      
      // Update filtered warnings based on current tab
      switch (activeTab) {
        case "active":
          setFilteredWarnings(freshWarnings.filter((w: any) => w.status === "active"));
          break;
        case "resolved":
          setFilteredWarnings(freshWarnings.filter((w: any) => w.status === "resolved" || w.status === "dismissed"));
          break;
        case "all":
          setFilteredWarnings(freshWarnings);
          break;
      }
      
      // Reset form and close dialog
      setResolutionForm({
        reason: "",
        status: "resolved"
      });
      
      setIsResolvingWarning(false);
      setSelectedWarning(null);
      
      // Show success message
      toast({
        title: `Warning ${resolutionForm.status === "resolved" ? "Resolved" : "Dismissed"}`,
        description: `The warning for ${selectedWarning.userName} has been ${
          resolutionForm.status === "resolved" ? "resolved" : "dismissed"
        }`,
      });
    } catch (error: any) {
      console.error("Error resolving warning:", error);
      setError(error.message || "Failed to resolve warning");
    } finally {
      setIsSubmitting(false);
    }
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

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">Company Warning System</h1>
            <p className="text-indigo-100 max-w-xl text-lg">
              Manage employee warnings and performance issues
            </p>
          </div>
          <Button size="lg" onClick={() => setIsCreateWarningOpen(true)} className="shadow-lg bg-white text-indigo-600 hover:bg-indigo-50 border-none">
            <Plus className="mr-2 h-5 w-5" />
            Issue New Warning
          </Button>
        </div>
      </div>
      
      {/* Create Warning Dialog */}
      <Dialog open={isCreateWarningOpen} onOpenChange={setIsCreateWarningOpen}>
        <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
          <DialogHeader className="space-y-2 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-red-500/20 flex items-center justify-center ring-2 ring-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Issue New Warning</DialogTitle>
                <DialogDescription className="text-xs">
                  Create a new warning for an employee. This will notify them immediately.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="grid gap-3.5 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="user" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-red-500">•</span> Employee
              </Label>
              <Select 
                value={warningForm.userId} 
                onValueChange={(value) => setWarningForm({...warningForm, userId: value})}
              >
                <SelectTrigger id="user" className="h-9 border-2 focus:ring-2 focus:ring-red-500/20">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(u => u.role !== "CEO") // CEO can't receive warnings
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((user) => (
                      <SelectItem key={user.uid} value={user.uid}>
                        {user.name} ({user.department || "No department"})
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="title" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-red-500">•</span> Warning Title
              </Label>
              <Input
                id="title"
                value={warningForm.title}
                onChange={(e) => setWarningForm({...warningForm, title: e.target.value})}
                placeholder="Brief description of the warning"
                className="h-9 border-2 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="description" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-red-500">•</span> Warning Details
              </Label>
              <Textarea
                id="description"
                value={warningForm.description}
                onChange={(e) => setWarningForm({...warningForm, description: e.target.value})}
                placeholder="Details about the warning, including specific incidents, expectations, and improvement plans"
                rows={4}
                className="border-2 focus:ring-2 focus:ring-red-500/20 transition-all resize-none"
              />
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="severity" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-red-500">•</span> Severity Level
              </Label>
              <Select 
                value={warningForm.severity} 
                onValueChange={(value: "low" | "medium" | "high" | "critical") => 
                  setWarningForm({...warningForm, severity: value})
                }
              >
                <SelectTrigger id="severity" className="h-9 border-2 focus:ring-2 focus:ring-red-500/20">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {error && (
            <div className="text-sm font-medium text-destructive mb-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">{error}</div>
          )}
          
          <DialogFooter className="gap-2 pt-3 border-t border-border/50">
            <Button variant="outline" onClick={() => setIsCreateWarningOpen(false)} className="h-9 border-2 hover:bg-muted">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWarning}
              disabled={isSubmitting || !warningForm.userId || !warningForm.title || !warningForm.description}
              className="h-9 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Issue Warning
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Resolve Warning Dialog */}
      <Dialog open={isResolvingWarning} onOpenChange={setIsResolvingWarning}>
        <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
          <DialogHeader className="space-y-2 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-green-500/20 flex items-center justify-center ring-2 ring-green-500/30">
                <Check className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Resolve Warning</DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedWarning && (
                    <span>
                      Resolve or dismiss the warning for <strong>{selectedWarning.userName}</strong>
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="grid gap-3.5 py-4">
            {selectedWarning && (
              <div className="rounded-xl bg-primary/5 p-4 border-2 border-primary/20">
                <h4 className="font-semibold">{selectedWarning.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {selectedWarning.description.substring(0, 150)}
                  {selectedWarning.description.length > 150 ? "..." : ""}
                </p>
              </div>
            )}
            
            <div className="grid gap-1.5">
              <Label htmlFor="status" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-green-500">•</span> Resolution Type
              </Label>
              <Select 
                value={resolutionForm.status} 
                onValueChange={(value: "resolved" | "dismissed") => 
                  setResolutionForm({...resolutionForm, status: value})
                }
              >
                <SelectTrigger id="status" className="h-9 border-2 focus:ring-2 focus:ring-green-500/20">
                  <SelectValue placeholder="Select resolution type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">
                    Resolved - Issue has been addressed
                  </SelectItem>
                  <SelectItem value="dismissed">
                    Dismissed - Warning was issued in error
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="reason" className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-green-500">•</span> Resolution Reason
              </Label>
              <Textarea
                id="reason"
                value={resolutionForm.reason}
                onChange={(e) => setResolutionForm({...resolutionForm, reason: e.target.value})}
                placeholder={
                  resolutionForm.status === "resolved" 
                    ? "Explain how the issue was addressed and any follow-up actions taken" 
                    : "Explain why this warning is being dismissed"
                }
                rows={4}
                className="border-2 focus:ring-2 focus:ring-green-500/20 transition-all resize-none"
              />
            </div>
          </div>
          
          {error && (
            <div className="text-sm font-medium text-destructive mb-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">{error}</div>
          )}
          
          <DialogFooter className="gap-2 pt-3 border-t border-border/50">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsResolvingWarning(false);
                setSelectedWarning(null);
                setResolutionForm({ reason: "", status: "resolved" });
                setError("");
              }}
              className="h-9 border-2 hover:bg-muted"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResolveWarning}
              disabled={isSubmitting || !resolutionForm.reason}
              className={`h-9 shadow-lg hover:shadow-xl transition-all ${
                resolutionForm.status === "dismissed" 
                  ? "bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700" 
                  : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              } text-white`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                resolutionForm.status === "resolved" ? 'Resolve Warning' : 'Dismiss Warning'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Tabs defaultValue="active" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/30 dark:bg-slate-900/30 p-1.5 rounded-2xl backdrop-blur-xl border border-border/50 w-full md:w-auto inline-flex h-auto gap-2">
          <TabsTrigger value="active" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium">Active Warnings</TabsTrigger>
          <TabsTrigger value="resolved" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium">Resolved Warnings</TabsTrigger>
          <TabsTrigger value="all" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium">All Warnings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-0">
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-xl">Active Warnings</CardTitle>
              <CardDescription>Currently active warnings issued to employees</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {filteredWarnings.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5">
                  <div className="p-3 bg-primary/10 rounded-full mb-3">
                    <AlertTriangle className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-medium">No active warnings found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWarnings.map((warning) => (
                    <WarningCard 
                      key={warning.id} 
                      warning={warning}
                      onResolve={() => {
                        setSelectedWarning(warning);
                        setIsResolvingWarning(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resolved" className="mt-0">
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-xl">Resolved Warnings</CardTitle>
              <CardDescription>Previously resolved employee warnings</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {filteredWarnings.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5">
                  <div className="p-3 bg-green-500/10 rounded-full mb-3">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="font-medium">No resolved warnings found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWarnings.map((warning) => (
                    <WarningCard 
                      key={warning.id} 
                      warning={warning}
                      readOnly={true}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="all" className="mt-0">
          <Card className="border-2 border-primary/20 shadow-2xl bg-card/90 backdrop-blur-md rounded-2xl">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-xl">All Warnings</CardTitle>
              <CardDescription>Complete history of employee warnings</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {filteredWarnings.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5">
                  <div className="p-3 bg-primary/10 rounded-full mb-3">
                    <AlertTriangle className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-medium">No warnings found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWarnings.map((warning) => (
                    <WarningCard 
                      key={warning.id} 
                      warning={warning}
                      onResolve={warning.status === "active" ? () => {
                        setSelectedWarning(warning);
                        setIsResolvingWarning(true);
                      } : undefined}
                      readOnly={warning.status !== "active"}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 