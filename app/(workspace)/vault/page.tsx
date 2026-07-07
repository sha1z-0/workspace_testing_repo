"use client"

import { useAuth } from "@/components/auth-provider"
import { downloadFile } from "@/lib/file-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { vaultAPI } from "@/lib/api"
import type { VaultItem } from "@/lib/firebase-types"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Search, Lock, Key, FileText, Shield, Eye, EyeOff, Download, Pencil, Trash2, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const CATEGORIES = [
  { value: "all", label: "All Items", icon: Shield },
  { value: "document", label: "Documents", icon: FileText },
  { value: "api_key", label: "API Keys", icon: Key },
  { value: "password", label: "Passwords", icon: Lock },
  { value: "other", label: "Other", icon: Shield },
] as const

type CategoryValue = (typeof CATEGORIES)[number]["value"] extends "all" ? "all" : VaultItem["category"]

export default function VaultPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<VaultItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [revealedItems, setRevealedItems] = useState<Set<string>>(new Set())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: "",
    category: "other" as VaultItem["category"],
    description: "",
    text_value: "",
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const isCLevel = user?.role === "CEO" || user?.role === "C_LEVEL"

  useEffect(() => {
    if (!user || !isCLevel) {
      router.push("/dashboard")
      return
    }
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const data = await vaultAPI.getAll()
      setItems(data as VaultItem[])
    } catch (error) {
      console.error("Error fetching vault items:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ title: "", category: "other", description: "", text_value: "" })
    setUploadFile(null)
    setIsEditing(false)
    setEditItemId(null)
  }

  const handleOpenEdit = (item: VaultItem) => {
    setForm({
      title: item.title,
      category: item.category,
      description: item.description || "",
      text_value: item.text_value || "",
    })
    setEditItemId(item.id)
    setIsEditing(true)
    setIsAddDialogOpen(true)
  }

  const handleSave = async () => {
    if (!user || !form.title) return
    try {
      setIsSaving(true)
      if (isEditing && editItemId) {
        await vaultAPI.update(editItemId, {
          title: form.title,
          category: form.category,
          description: form.description || null,
          text_value: form.text_value || null,
        })
        toast({ title: "Updated", description: "Vault item updated." })
      } else if (uploadFile && form.category === "document") {
        await vaultAPI.uploadFile(
          { title: form.title, category: form.category, description: form.description || null, created_by: user.id, created_by_name: user.name },
          uploadFile
        )
        toast({ title: "Uploaded", description: "File uploaded to vault." })
      } else {
        await vaultAPI.create({
          title: form.title,
          category: form.category,
          description: form.description || null,
          text_value: form.text_value || null,
          created_by: user.id,
          created_by_name: user.name,
        })
        toast({ title: "Created", description: "Vault item created." })
      }
      resetForm()
      setIsAddDialogOpen(false)
      await fetchItems()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to save vault item.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item: VaultItem) => {
    try {
      await vaultAPI.delete(item.id, item.file_url)
      toast({ title: "Deleted", description: "Vault item deleted." })
      setDeleteConfirmId(null)
      await fetchItems()
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete vault item.", variant: "destructive" })
    }
  }

  const handleDownload = async (item: VaultItem) => {
    if (!item.file_url) return
    try {
      await downloadFile(item.file_url, item.file_name || "download", "vault")
    } catch {
      toast({ title: "Error", description: "Failed to download file.", variant: "destructive" })
    }
  }

  const canManage = (item: VaultItem) => item.created_by === user?.id

  const filteredItems = items.filter((item) => {
    const matchesSearch = !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeTab === "all" || item.category === activeTab
    return matchesSearch && matchesCategory
  })

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "document": return <Badge variant="outline" className="bg-blue-100/50 border-blue-300 text-blue-700"><FileText className="mr-1 h-3 w-3" />Document</Badge>
      case "api_key": return <Badge variant="outline" className="bg-amber-100/50 border-amber-300 text-amber-700"><Key className="mr-1 h-3 w-3" />API Key</Badge>
      case "password": return <Badge variant="outline" className="bg-red-100/50 border-red-300 text-red-700"><Lock className="mr-1 h-3 w-3" />Password</Badge>
      case "other": return <Badge variant="outline" className="bg-slate-100/50 border-slate-300 text-slate-700"><Shield className="mr-1 h-3 w-3" />Other</Badge>
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!isCLevel) {
    return null
  }

  const containerVariants: import("framer-motion").Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  }

  const itemVariants: import("framer-motion").Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50 } }
  }

  return (
    <div className="min-h-screen p-1 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white shadow-xl ring-1 ring-white/10"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2 flex items-center gap-3">
              <Lock className="h-8 w-8" /> Company Vault
            </h1>
            <p className="text-slate-300 max-w-xl text-lg">
              Securely store and manage sensitive company assets — documents, API keys, and credentials.
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => { resetForm(); setIsAddDialogOpen(true) }}
            className="shadow-lg bg-white text-slate-900 hover:bg-slate-100 border-none"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add New Item
          </Button>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full md:max-w-md">
          <Input
            placeholder="Search vault items..."
            className="pl-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-white/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-xl border border-white/10 w-full justify-start overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="relative data-[state=active]:bg-transparent data-[state=active]:text-white">
              {activeTab === cat.value && (
                <motion.div layoutId="vaultTab" className="absolute inset-0 bg-slate-700 rounded-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
              )}
              <span className="relative z-10 flex items-center gap-1.5 text-xs">
                <cat.icon className="h-3.5 w-3.5" /> {cat.label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value={activeTab} className="mt-6 outline-none">
            <motion.div
              key={activeTab}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
            >
              {filteredItems.length === 0 ? (
                <motion.div variants={itemVariants} className="col-span-full flex h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-slate-100/50 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                    <Shield className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium">No items found</h3>
                  <p className="text-muted-foreground mt-1">
                    {searchQuery ? "Try adjusting your search terms" : "Click 'Add New Item' to secure your first asset."}
                  </p>
                </motion.div>
              ) : (
                filteredItems.map((item) => (
                  <motion.div key={item.id} variants={itemVariants} layoutId={item.id}>
                    <Card className="group relative overflow-hidden border border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg transition-all duration-300 hover:border-slate-500/50 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)]">
                      <CardHeader className="pb-3 pt-5">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {getCategoryBadge(item.category)}
                            </div>
                            <CardTitle className="text-base font-semibold leading-tight truncate">{item.title}</CardTitle>
                          </div>
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            {canManage(item) && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteConfirmId(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4 pt-0">
                        {item.description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                        )}

                        {item.category === "document" && item.file_url && (
                          <Button variant="outline" size="sm" onClick={() => handleDownload(item)} className="gap-1.5 text-xs h-8">
                            <Download className="h-3.5 w-3.5" />
                            {item.file_name || "Download"}
                            {item.file_size ? ` (${(item.file_size / 1024 / 1024).toFixed(1)} MB)` : ""}
                          </Button>
                        )}

                        {(item.category === "api_key" || item.category === "password") && item.text_value && (
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRevealedItems(prev => {
                                  const next = new Set(prev)
                                  if (next.has(item.id)) next.delete(item.id)
                                  else next.add(item.id)
                                  return next
                                })
                              }}
                              className="gap-1.5 text-xs h-8"
                            >
                              {revealedItems.has(item.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              {revealedItems.has(item.id) ? "Hide" : "Click to Reveal"}
                            </Button>
                            {revealedItems.has(item.id) && (
                              <div className="relative">
                                <code className="block text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded border break-all pr-8 font-mono">
                                  {item.text_value}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-1 right-1 h-6 w-6"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.text_value || "")
                                    toast({ title: "Copied", description: "Value copied to clipboard." })
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {item.category === "other" && item.text_value && (
                          <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-2 rounded border line-clamp-3">
                            {item.text_value}
                          </div>
                        )}

                        <div className="mt-3 text-[10px] text-muted-foreground">
                          Added by {item.created_by_name || item.created_by} · {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsAddDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Vault Item" : "Add New Vault Item"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the vault item details." : "Securely store a new company asset."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Item title" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(v: any) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Document</span>
                  </SelectItem>
                  <SelectItem value="api_key">
                    <span className="flex items-center gap-2"><Key className="h-4 w-4" /> API Key</span>
                  </SelectItem>
                  <SelectItem value="password">
                    <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Password</span>
                  </SelectItem>
                  <SelectItem value="other">
                    <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> Other</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description / Notes (optional)</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Any notes..." />
            </div>
            {form.category === "document" && !isEditing && (
              <div className="grid gap-2">
                <Label htmlFor="file">Upload File (max 10MB)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                {uploadFile && (
                  <p className="text-xs text-muted-foreground">{uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                )}
              </div>
            )}
            {form.category !== "document" && (
              <div className="grid gap-2">
                <Label htmlFor="text_value">
                  {form.category === "password" ? "Password" : form.category === "api_key" ? "API Key" : "Value"}
                </Label>
                <Textarea id="text_value" value={form.text_value} onChange={(e) => setForm({ ...form, text_value: e.target.value })} placeholder="Sensitive value..." />
                <p className="text-xs text-muted-foreground">This value will be hidden by default in the vault.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsAddDialogOpen(false) }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title || isSaving || (form.category === "document" && !uploadFile && !isEditing)}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEditing ? "Update" : "Add to Vault"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Delete Vault Item
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The item and any associated file will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              const item = items.find(i => i.id === deleteConfirmId)
              if (item) handleDelete(item)
            }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
