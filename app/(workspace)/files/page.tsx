"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useEffect, useState, useRef } from "react"
import {
  Loader2,
  Plus,
  Search,
  File,
  FileText,
  FileImage,
  FileArchive,
  Download,
  Trash2,
  MoreHorizontal,
  Upload,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/ui/page-header"
import { AnimatedTabs } from "@/components/ui/animated-tabs"

export default function FilesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileDescription, setFileDescription] = useState("")
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)

  // Mock files data
  const [files, setFiles] = useState<any[]>([
    {
      id: "1",
      name: "Project Proposal.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 2500000,
      uploadedAt: new Date(2023, 4, 15),
      uploadedBy: "John Doe",
    },
    {
      id: "2",
      name: "Financial Report.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 1800000,
      uploadedAt: new Date(2023, 4, 10),
      uploadedBy: "Jane Smith",
    },
    {
      id: "3",
      name: "Company Logo.png",
      type: "image/png",
      size: 500000,
      uploadedAt: new Date(2023, 4, 5),
      uploadedBy: "John Doe",
    },
    {
      id: "4",
      name: "Client Presentation.pptx",
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      size: 3500000,
      uploadedAt: new Date(2023, 4, 1),
      uploadedBy: "Jane Smith",
    },
    {
      id: "5",
      name: "Source Code.zip",
      type: "application/zip",
      size: 10000000,
      uploadedAt: new Date(2023, 3, 25),
      uploadedBy: "John Doe",
    },
  ])

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true)

      try {
        if (user) {
          // TODO: Implement file listing with Supabase Storage
          // For now, using mock data for demo
          // Files will be stored in Supabase Storage bucket
          console.log("File management requires Supabase Storage setup");
        }
      } catch (error) {
        console.error("Error fetching files:", error)
        toast({
          title: "Error",
          description: "Could not load your files",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    // Delay to simulate loading and to ensure user is available
    const timer = setTimeout(() => {
      fetchFiles()
    }, 1000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fileInputRef.current?.files?.length) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    const file = fileInputRef.current.files[0]
    setUploadLoading(true)
    setUploadProgress(0)

    try {
      // Upload file to Firebase Storage
      const storage = getStorage()
      const storageRef = ref(storage, `files/${user?.id}/${file.name}`)

      const uploadTask = uploadBytesResumable(storageRef, file)

      // Monitor upload progress
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploadProgress(progress)
        },
        (error) => {
          throw error
        }
      )

      // Wait for upload to complete
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          null,
          (error) => reject(error),
          async () => {
            try {
              // TODO: Implement file upload with Supabase Storage
              console.log("File upload requires Supabase Storage setup");

              toast({
                title: "File upload not implemented",
                description: "Supabase Storage needs to be configured. See FRONTEND_ANALYSIS.md",
                variant: "destructive"
              });

              // Placeholder for when implemented:
              // 1. Upload file to Supabase Storage bucket
              // 2. Get public URL
              // 3. Save metadata to database
              const newFile = {
                id: Date.now().toString(),
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: new Date(),
                uploadedBy: user?.name || "User",
                url: "#",
                path: storageRef.fullPath,
              }

              setFiles(prevFiles => [newFile, ...prevFiles])

              toast({
                title: "File uploaded",
                description: "Your file has been uploaded successfully",
              })

              // Reset form
              setFileDescription("")
              if (fileInputRef.current) {
                fileInputRef.current.value = ""
              }
              setIsUploadDialogOpen(false)
              setUploadProgress(0)
              resolve(downloadURL)
            } catch (error) {
              reject(error)
            } finally {
              setUploadLoading(false)
            }
          }
        )
      })
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file",
        variant: "destructive",
      })
      setUploadProgress(0)
      setUploadLoading(false)
    }
  }

  const handleFileDownload = (file: any) => {
    // Use the actual URL from Firebase Storage if available
    if (file.url) {
      const link = document.createElement('a')
      link.href = file.url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "File download started",
        description: `Downloading ${file.name}`,
      })
    } else {
      toast({
        title: "Download failed",
        description: "File URL not available",
        variant: "destructive",
      })
    }
  }

  const handleFileDelete = async (file: any) => {
    try {
      if (file.path) {
        // Delete from Firebase Storage
        const storage = getStorage()
        const storageRef = ref(storage, file.path)
        // TODO: Delete from Supabase Storage
        console.log("File deletion requires Supabase Storage setup");
      }

      // Remove from the local state
      setFiles(files.filter(f => f.id !== file.id))

      toast({
        title: "File deleted",
        description: `${file.name} has been deleted`,
      })
    } catch (error) {
      console.error("Error deleting file:", error)
      toast({
        title: "Delete failed",
        description: "There was an error deleting your file",
        variant: "destructive",
      })
    }
  }

  const filteredFiles = files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("image")) {
      return <FileImage className="h-6 w-6 text-blue-500" />
    } else if (fileType.includes("zip") || fileType.includes("archive")) {
      return <FileArchive className="h-6 w-6 text-yellow-500" />
    } else if (fileType.includes("pdf") || fileType.includes("document")) {
      return <FileText className="h-6 w-6 text-red-500" />
    } else {
      return <File className="h-6 w-6 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Add a function to handle dialog close with reset
  const handleDialogClose = (open: boolean) => {
    setIsUploadDialogOpen(open);

    // Reset upload state when dialog is closed
    if (!open) {
      setUploadProgress(0);
      setUploadLoading(false);
      setFileDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
      <PageHeader
        title="Files"
        description="Manage and share your team's documents and assets."
        icon={FileArchive}
        action={
          <Dialog open={isUploadDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 border-none shadow-lg">
                <Upload className="mr-2 h-5 w-5" />
                Upload File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload File</DialogTitle>
                <DialogDescription>Upload a file to your workspace.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleFileUpload}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      ref={fileInputRef}
                      disabled={uploadLoading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      placeholder="Add a description for this file"
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      disabled={uploadLoading}
                    />
                  </div>
                  {uploadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Upload progress</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                      {uploadProgress === 100 && (
                        <p className="text-xs text-muted-foreground">
                          Processing file... This may take a moment.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={uploadLoading}
                  >
                    {uploadLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
                      </>
                    ) : (
                      'Upload'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-indigo-500 z-10" />
        <Input
          placeholder="Search files..."
          className="pl-10 h-11 bg-white/40 dark:bg-slate-900/40 border-slate-200/70 dark:border-white/20 backdrop-blur-xl shadow-lg focus-visible:ring-indigo-500 rounded-xl transition-all hover:bg-white/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <AnimatedTabs
          tabs={[
            { value: "all", label: "All Files" },
            { value: "recent", label: "Recent" },
            { value: "shared", label: "Shared With Me" }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          layoutId="filesTab"
        />
        <TabsContent value="all" className="mt-0">
          {filteredFiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-80 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-indigo-200/50 dark:border-indigo-800/50 bg-white/20 dark:bg-slate-900/20 p-8 text-center backdrop-blur-sm"
            >
              <div className="p-4 bg-white/50 rounded-full mb-4 shadow-sm">
                <File className="h-10 w-10 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">No files found</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                {searchQuery ? "Try adjusting your search terms to find what you're looking for." : "Upload your first file to get started with collaboration."}
              </p>
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
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <AnimatePresence>
                {filteredFiles.map((file) => (
                  <motion.div
                    key={file.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 }
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group"
                  >
                    <Card className="overflow-hidden border border-slate-200 dark:border-slate-200/70 dark:border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-[0_8px_30px_rgba(100,116,139,0.15)] dark:shadow-none hover:border-slate-500/50 transition-all duration-300 rounded-2xl group-hover:-translate-y-1">
                      <CardContent className="p-0">
                        <div className="p-5 flex items-start justify-between">
                          <div className="p-3 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-inner">
                            {getFileIcon(file.type)}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/50 dark:hover:bg-slate-800/50">
                                <MoreHorizontal className="h-4 w-4 text-slate-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-200/70 dark:border-white/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                              <DropdownMenuItem onClick={() => handleFileDownload(file)} className="focus:bg-indigo-50 dark:focus:bg-indigo-900/20 rounded-lg cursor-pointer">
                                <Download className="mr-2 h-4 w-4 text-indigo-500" />
                                <span>Download</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleFileDelete(file)} className="focus:bg-red-50 dark:focus:bg-red-900/20 rounded-lg cursor-pointer text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="px-5 pb-5">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-200 truncate mb-1" title={file.name}>
                            {file.name}
                          </h3>
                          <div className="flex items-center text-xs text-slate-500 space-x-2">
                            <span>{formatFileSize(file.size)}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>{file.uploadedAt.toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="h-1 w-full bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </TabsContent>
        <TabsContent value="recent" className="mt-6">
          <div className="flex h-60 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-indigo-200/50 p-8 text-center bg-white/20 backdrop-blur-sm">
            <h3 className="font-medium">No recent files</h3>
            <p className="text-sm text-muted-foreground">Recently accessed files will appear here</p>
          </div>
        </TabsContent>
        <TabsContent value="shared" className="mt-6">
          <div className="flex h-60 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-indigo-200/50 p-8 text-center bg-white/20 backdrop-blur-sm">
            <h3 className="font-medium">No shared files</h3>
            <p className="text-sm text-muted-foreground">Files shared with you will appear here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
