"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState, useRef } from "react"
import { Loader2, Save, User, Bell, Palette, Lock, Briefcase, Boxes, Camera, Trash2, Mail, LayoutDashboard, MessageSquare, CheckSquare, Megaphone, Clock, ShieldCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
    const { user, updateUserData } = useAuth()
    const [loading, setLoading] = useState(true)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [changingPassword, setChangingPassword] = useState(false)
    const [savingSettings, setSavingSettings] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    })
    const [connectingService, setConnectingService] = useState<string | null>(null)
    const { theme, setTheme } = useTheme()

    // User profile data
    const [profileData, setProfileData] = useState({
        name: "",
        department: "General"
    })

    // User settings with defaults
    const [settings, setSettings] = useState({
        theme: "dark",
        notifications: {
            email: true,
            push: true,
            chat: true,
            taskAssignment: true,
            announcements: true,
            reminders: true,
        },
        emailFrequency: "daily",
        timezone: "UTC",
        language: "en",
        autoSave: true,
        filePreview: true,
        defaultCalendarView: "week",
    })

    // Load user settings from database
    useEffect(() => {
        const loadUserSettings = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            try {
                // Initialize profile data
                setProfileData({
                    name: user.name || "",
                    department: "General"
                });

                // TODO: Load settings from Supabase (create user_settings table)
                // For now, use default settings
                // Settings will be stored in browser localStorage
            } catch (error) {
                console.error("Error loading user settings:", error);
                // Continue with default settings
                toast({
                    title: "Settings not loaded",
                    description: "Using default settings instead",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        // Simulate loading and then load real settings
        const timer = setTimeout(() => {
            loadUserSettings();
        }, 1000)

        return () => clearTimeout(timer)
    }, [user?.id, user?.name, setTheme])

    // Update settings.theme when the actual theme changes
    useEffect(() => {
        if (theme && theme !== settings.theme) {
            setSettings(currentSettings => ({
                ...currentSettings,
                theme
            }));
        }
    }, [theme, settings.theme]);

    const getInitials = (name: string | undefined) => {
        if (!name) return "?";

        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
    }

    const handleSaveSettings = async () => {
        if (!user?.id) {
            toast({
                title: "Save failed",
                description: "You must be logged in to save settings",
                variant: "destructive",
            });
            return;
        }

        setSavingSettings(true);

        try {
            // TODO: Save settings to database (create user_settings table)
            // For now, store in localStorage
            localStorage.setItem(`user_settings_${user.id}`, JSON.stringify(settings));

            // Apply theme change immediately
            if (settings.theme !== theme) {
                setTheme(settings.theme);
            }

            // Save profile data if it has changed
            if (profileData.name !== user.name) {
                await usersAPI.updateUser(user.id, {
                    name: profileData.name,
                    department: profileData.department
                });

                // Update local user state
                updateUserData({ name: profileData.name });
            }

            toast({
                title: "Settings saved",
                description: "Your settings have been updated successfully",
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({
                title: "Save failed",
                description: "There was a problem saving your settings",
                variant: "destructive",
            });
        } finally {
            setSavingSettings(false);
        }
    }

    const handleProfilePhotoUpload = async () => {
        if (!fileInputRef.current?.files?.length || !user?.id) {
            toast({
                title: "Upload failed",
                description: user?.id ? "Please select a file to upload" : "User information not available",
                variant: "destructive",
            });
            return;
        }

        const file = fileInputRef.current.files[0];

        // Validate file is an image
        if (!file.type.startsWith('image/')) {
            toast({
                title: "Invalid file type",
                description: "Please select an image file (JPEG, PNG, etc.)",
                variant: "destructive",
                className: "bg-red-500 text-white border-none",
            });
            return;
        }

        // Start upload process
        setUploadingPhoto(true);
        setUploadProgress(0);

        try {
            // Create a reference to the storage location
            const storageRef = ref(storage, `users/${user.id}/profile-photo`);

            // Upload file with progress monitoring
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error("Upload error:", error);
                    toast({
                        title: "Upload failed",
                        description: error.message || "There was a problem uploading your profile picture",
                        variant: "destructive",
                    });
                    setUploadingPhoto(false);
                    setUploadProgress(0);
                }
            );

            // Wait for upload to complete
            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    null,
                    reject,
                    async () => {
                        try {
                            // Upload completed successfully, get URL
                            const downloadURL = await getDownloadURL(storageRef);

                            // Update the user record in database
                            try {
                                await usersAPI.updateUser(user.id, {
                                    avatar: downloadURL
                                });

                                // Update local user state
                                updateUserData({ avatar: downloadURL });

                                toast({
                                    title: "Profile picture updated",
                                    description: "Your profile picture has been updated successfully",
                                    className: "bg-emerald-500 text-white border-none",
                                });
                            } catch (dbError) {
                                console.error("Database update error:", dbError);
                                toast({
                                    title: "Update failed",
                                    description: "Your picture was uploaded but we couldn't update your profile",
                                    variant: "destructive",
                                });
                            }

                            // Reset state
                            setUploadingPhoto(false);
                            setUploadProgress(0);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                            resolve(downloadURL);
                        } catch (error) {
                            console.error("Download URL error:", error);
                            reject(error);
                        }
                    }
                );
            });
        } catch (error) {
            console.error("Error uploading profile photo:", error);
            toast({
                title: "Upload failed",
                description: "There was a problem uploading your profile picture",
                variant: "destructive",
            });
            setUploadingPhoto(false);
            setUploadProgress(0);
        }
    };

    const handleRemovePhoto = async () => {
        if (!user?.id) {
            toast({
                title: "Remove failed",
                description: "User information not available",
                variant: "destructive",
            });
            return;
        }

        if (!user?.avatar) {
            toast({
                title: "No profile picture",
                description: "You don't have a profile picture to remove",
            });
            return;
        }

        try {
            // If the avatar is a storage URL
            if (user.avatar.includes('firebasestorage.googleapis.com')) {
                try {
                    // Create a reference to the file to delete
                    const storageRef = ref(storage, `users/${user.id}/profile-photo`);
                    await deleteObject(storageRef);
                } catch (storageError) {
                    console.error("Storage error when removing photo:", storageError);
                    // Continue with profile update even if storage deletion fails
                }
            }

            try {
                // Update the user record in database
                await usersAPI.updateUser(user.id, {
                    avatar: null
                });

                // Update local user state
                updateUserData({ avatar: undefined });

                toast({
                    title: "Profile picture removed",
                    description: "Your profile picture has been removed",
                });
            } catch (dbError) {
                console.error("Database error when removing photo reference:", dbError);
                toast({
                    title: "Remove failed",
                    description: "There was a problem updating your profile",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error removing profile photo:", error);
            toast({
                title: "Remove failed",
                description: "There was a problem removing your profile picture",
                variant: "destructive",
            });
        }
    };

    const handlePasswordChange = async () => {
        // Validate input
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            toast({
                title: "Missing fields",
                description: "Please fill in all password fields",
                variant: "destructive",
            });
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast({
                title: "Passwords don't match",
                description: "New password and confirmation do not match",
                variant: "destructive",
            });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast({
                title: "Password too short",
                description: "Password should be at least 6 characters long",
                variant: "destructive",
            });
            return;
        }

        setChangingPassword(true);

        try {
            const user = auth.currentUser;
            if (!user || !user.email) {
                throw new Error("User not authenticated");
            }

            // Re-authenticate user before changing password
            try {
                const credential = EmailAuthProvider.credential(
                    user.email,
                    passwordData.currentPassword
                );
                await reauthenticateWithCredential(user, credential);
            } catch (authError) {
                console.error("Re-authentication error:", authError);
                toast({
                    title: "Authentication failed",
                    description: "Current password is incorrect",
                    variant: "destructive",
                });
                setChangingPassword(false);
                return;
            }

            // Change password
            await updatePassword(user, passwordData.newPassword);

            // Clear form fields
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });

            toast({
                title: "Password updated",
                description: "Your password has been changed successfully",
                className: "bg-emerald-500 text-white border-none",
            });
        } catch (error) {
            console.error("Password change error:", error);
            toast({
                title: "Password change failed",
                description: "There was a problem changing your password. Try again later.",
                variant: "destructive",
            });
        } finally {
            setChangingPassword(false);
        }
    };

    const handleConnectService = async (serviceName: string) => {
        if (!user?.id) {
            toast({
                title: "Connection failed",
                description: "You must be logged in to connect services",
                variant: "destructive",
            });
            return;
        }

        setConnectingService(serviceName);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            toast({
                title: "Service not available",
                description: `The ${serviceName} integration is coming soon.`,
                variant: "default",
            });
        } catch (error) {
            console.error(`Error connecting to ${serviceName}:`, error);
            toast({
                title: "Connection failed",
                description: `Could not connect to ${serviceName}. Please try again later.`,
                variant: "destructive",
            });
        } finally {
            setConnectingService(null);
        }
    };

    const handleThemeChange = (value: string) => {
        setSettings({
            ...settings,
            theme: value
        });
        setTheme(value);
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const tabs = [
        { id: "profile", label: "Profile", icon: User },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "appearance", label: "Appearance", icon: Palette },
        { id: "security", label: "Security", icon: ShieldCheck },
        { id: "workspace", label: "Workspace", icon: Briefcase },
        { id: "integrations", label: "Integrations", icon: Boxes },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            {/* Hero Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-blue-600 p-8 text-white shadow-xl ring-1 ring-white/10 dark:from-blue-900 dark:to-slate-900"
            >
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">Settings</h1>
                        <p className="text-indigo-100 max-w-xl text-lg">
                            Manage your account and preferences.
                        </p>
                    </div>
                    <Button
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="shadow-lg bg-white text-indigo-600 hover:bg-indigo-50 border-none transition-all hover:scale-105"
                    >
                        {savingSettings ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                    </Button>
                </div>
            </motion.div>

            <Tabs defaultValue="profile" className="w-full">
                <div className="relative overflow-x-auto pb-2">
                    <TabsList className="bg-white/40 dark:bg-slate-900/40 p-1 rounded-2xl backdrop-blur-xl border border-white/20 w-full min-w-[700px] grid grid-cols-6 gap-1 shadow-sm overflow-hidden h-auto">
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="w-full h-full inline-flex items-center justify-center gap-2 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-md transition-all duration-300 py-3 px-2 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 whitespace-nowrap text-sm"
                            >
                                <tab.icon className="w-4 h-4 shrink-0" />
                                <span>{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <div className="mt-6">
                    <TabsContent value="profile">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="grid gap-6 md:grid-cols-12"
                        >
                            <Card className="md:col-span-4 border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-lg rounded-3xl overflow-hidden">
                                <CardHeader className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10">
                                    <CardTitle>Profile Picture</CardTitle>
                                    <CardDescription>Your visible identity</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center pt-8 pb-8 space-y-6">
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                                        <Avatar className="h-40 w-40 border-4 border-white dark:border-slate-800 shadow-2xl">
                                            <AvatarImage src={user?.avatar || "/placeholder.svg"} className="object-cover" />
                                            <AvatarFallback className="text-4xl bg-indigo-100 text-indigo-600 font-bold">
                                                {user?.name ? getInitials(user.name) : "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-0 right-0 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-transform hover:scale-110"
                                        >
                                            <Camera className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="w-full space-y-3 px-4">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleProfilePhotoUpload}
                                        />
                                        {uploadingPhoto && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>Uploading...</span>
                                                    <span>{Math.round(uploadProgress)}%</span>
                                                </div>
                                                <Progress value={uploadProgress} className="h-1.5" />
                                            </div>
                                        )}

                                        {user?.avatar && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleRemovePhoto}
                                                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Remove Photo
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-8 border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-lg rounded-3xl overflow-hidden">
                                <CardHeader>
                                    <CardTitle>Personal Information</CardTitle>
                                    <CardDescription>Update your personal details</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                value={profileData.name}
                                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                                className="bg-white/50 dark:bg-slate-800/50 border-white/20"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input id="email" defaultValue={user?.email} disabled className="pl-9 bg-slate-100/50 dark:bg-slate-950/30 border-white/10" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="role">Role</Label>
                                            <div className="relative">
                                                <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input id="role" defaultValue={user?.role} disabled className="pl-9 bg-slate-100/50 dark:bg-slate-950/30 border-white/10" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="department">Department</Label>
                                            <Input
                                                id="department"
                                                value={profileData.department}
                                                onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                                                className="bg-white/50 dark:bg-slate-800/50 border-white/20"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="notifications">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-lg rounded-3xl">
                                <CardHeader>
                                    <CardTitle>Notification Preferences</CardTitle>
                                    <CardDescription>Choose how you want to be notified</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid gap-6">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/30 dark:bg-slate-800/30 border border-white/10">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
                                                    <Mail className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-base">Email Notifications</h4>
                                                    <p className="text-sm text-muted-foreground">Receive daily digests and important alerts</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={settings.notifications.email}
                                                onCheckedChange={(checked) =>
                                                    setSettings({
                                                        ...settings,
                                                        notifications: { ...settings.notifications, email: checked },
                                                    })
                                                }
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/30 dark:bg-slate-800/30 border border-white/10">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg dark:bg-purple-900/30 dark:text-purple-400">
                                                    <Bell className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-base">Push Notifications</h4>
                                                    <p className="text-sm text-muted-foreground">Real-time alerts in your browser</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={settings.notifications.push}
                                                onCheckedChange={(checked) =>
                                                    setSettings({
                                                        ...settings,
                                                        notifications: { ...settings.notifications, push: checked },
                                                    })
                                                }
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/30 dark:bg-slate-800/30 border border-white/10">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg dark:bg-emerald-900/30 dark:text-emerald-400">
                                                    <MessageSquare className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-base">Chat Messages</h4>
                                                    <p className="text-sm text-muted-foreground">Notifications for new direct messages</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={settings.notifications.chat}
                                                onCheckedChange={(checked) =>
                                                    setSettings({
                                                        ...settings,
                                                        notifications: { ...settings.notifications, chat: checked },
                                                    })
                                                }
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/30 dark:bg-slate-800/30 border border-white/10">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-amber-100 text-amber-600 rounded-lg dark:bg-amber-900/30 dark:text-amber-400">
                                                    <CheckSquare className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-base">Tasks & Projects</h4>
                                                    <p className="text-sm text-muted-foreground">Updates on assigned tasks and deadlines</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={settings.notifications.taskAssignment}
                                                onCheckedChange={(checked) =>
                                                    setSettings({
                                                        ...settings,
                                                        notifications: { ...settings.notifications, taskAssignment: checked },
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="appearance">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-lg rounded-3xl">
                                <CardHeader>
                                    <CardTitle>Appearance & Theme</CardTitle>
                                    <CardDescription>Customize your workspace experience</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-base">System Theme</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div
                                                onClick={() => handleThemeChange('light')}
                                                className={cn(
                                                    "cursor-pointer rounded-2xl border-2 p-4 flex flex-col items-center gap-3 transition-all hover:-translate-y-1",
                                                    settings.theme === 'light'
                                                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10"
                                                        : "border-transparent bg-white/50 dark:bg-slate-800/50"
                                                )}
                                            >
                                                <div className="w-full h-24 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                                                    <div className="h-4 bg-slate-100 border-b w-full" />
                                                    <div className="flex-1 p-2 space-y-2">
                                                        <div className="h-2 w-3/4 bg-slate-100 rounded" />
                                                        <div className="h-2 w-1/2 bg-slate-100 rounded" />
                                                    </div>
                                                </div>
                                                <span className="font-medium">Light Mode</span>
                                            </div>

                                            <div
                                                onClick={() => handleThemeChange('dark')}
                                                className={cn(
                                                    "cursor-pointer rounded-2xl border-2 p-4 flex flex-col items-center gap-3 transition-all hover:-translate-y-1",
                                                    settings.theme === 'dark'
                                                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10"
                                                        : "border-transparent bg-white/50 dark:bg-slate-800/50"
                                                )}
                                            >
                                                <div className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg shadow-sm flex flex-col overflow-hidden">
                                                    <div className="h-4 bg-slate-800 border-b border-slate-700 w-full" />
                                                    <div className="flex-1 p-2 space-y-2">
                                                        <div className="h-2 w-3/4 bg-slate-800 rounded" />
                                                        <div className="h-2 w-1/2 bg-slate-800 rounded" />
                                                    </div>
                                                </div>
                                                <span className="font-medium">Dark Mode</span>
                                            </div>

                                            <div
                                                onClick={() => handleThemeChange('system')}
                                                className={cn(
                                                    "cursor-pointer rounded-2xl border-2 p-4 flex flex-col items-center gap-3 transition-all hover:-translate-y-1",
                                                    settings.theme === 'system'
                                                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10"
                                                        : "border-transparent bg-white/50 dark:bg-slate-800/50"
                                                )}
                                            >
                                                <div className="w-full h-24 bg-gradient-to-r from-white via-slate-200 to-slate-900 border border-slate-300 rounded-lg shadow-sm flex items-center justify-center opacity-80">
                                                    <span className="text-xs font-bold px-2 py-1 bg-white/80 rounded backdrop-blur-sm">AUTO</span>
                                                </div>
                                                <span className="font-medium">System Default</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="security">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-lg rounded-3xl">
                                <CardHeader>
                                    <CardTitle>Security Settings</CardTitle>
                                    <CardDescription>Protect your account and data</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="p-5 rounded-2xl border border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-900/30">
                                        <h3 className="text-orange-800 dark:text-orange-400 font-semibold flex items-center gap-2 mb-2">
                                            <Lock className="w-4 h-4" />
                                            Change Password
                                        </h3>
                                        <div className="grid gap-4 mt-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="current-password">Current Password</Label>
                                                <Input
                                                    id="current-password"
                                                    type="password"
                                                    value={passwordData.currentPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                    disabled={changingPassword}
                                                    className="bg-white/70 dark:bg-slate-900/50"
                                                />
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="new-password">New Password</Label>
                                                    <Input
                                                        id="new-password"
                                                        type="password"
                                                        value={passwordData.newPassword}
                                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                        disabled={changingPassword}
                                                        className="bg-white/70 dark:bg-slate-900/50"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                                                    <Input
                                                        id="confirm-password"
                                                        type="password"
                                                        value={passwordData.confirmPassword}
                                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                        disabled={changingPassword}
                                                        className="bg-white/70 dark:bg-slate-900/50"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end mt-2">
                                                <Button
                                                    onClick={handlePasswordChange}
                                                    disabled={changingPassword}
                                                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0 shadow-md"
                                                >
                                                    {changingPassword ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Updating...
                                                        </>
                                                    ) : "Update Password"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    {/* Placeholder content for other tabs */}
                    <TabsContent value="workspace">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="h-60 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm"
                        >
                            <div className="text-center">
                                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-slate-500">Workspace settings coming soon</h3>
                            </div>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="integrations">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="grid md:grid-cols-2 gap-4"
                        >
                            {['Google Drive', 'Slack', 'GitHub', 'Zoom'].map((app) => (
                                <Card key={app} className="border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
                                    <CardContent className="flex items-center justify-between p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                                <Boxes className="w-6 h-6 text-slate-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold">{app}</h4>
                                                <p className="text-xs text-muted-foreground">Productivity & Sync</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => handleConnectService(app)}>Connect</Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </motion.div>
                    </TabsContent>
                </div>
            </Tabs>
        </motion.div>
    )
}
