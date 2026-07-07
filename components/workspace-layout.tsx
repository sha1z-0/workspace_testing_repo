"use client"

import type React from "react"
import { useAuth } from "@/components/auth-provider"
import { usePathname } from "next/navigation"
import {
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    ChevronDown,
    LogOut,
    Settings,
    LayoutDashboard,
    FileText,
    Calendar,
    CheckSquare,
    MessageSquare,
    Search,
} from "lucide-react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { useIsMobile, useBreakpoint } from "@/hooks/use-mobile"
import NotificationBell from "./notification-bell"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, logout } = useAuth()
    const pathname = usePathname()
    const isMobile = useIsMobile()
    const isSmallScreen = useBreakpoint('lg')

    if (!user) {
        return (
            <div className="flex h-screen w-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const getInitials = (name: string | undefined) => {
        if (!name) return "?";

        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
    }

    const mainNavItems = [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Files",
            url: "/files",
            icon: FileText,
        },
        {
            title: "Chat",
            url: "/chat",
            icon: MessageSquare,
        },
        {
            title: "Calendar",
            url: "/calendar",
            icon: Calendar,
        },
        {
            title: "Tasks",
            url: "/tasks",
            icon: CheckSquare,
        },
        {
            title: "Settings",
            url: "/settings",
            icon: Settings,
        },
    ]

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
                <Sidebar className="border-r-2 border-primary/20 bg-gradient-to-b from-card via-card to-card/95 backdrop-blur-2xl shadow-2xl">
                    <SidebarHeader className="p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                        <div className="absolute bottom-0 left-0 h-16 w-16 rounded-full bg-blue-600/10 blur-xl" />
                        <div className="flex items-center space-x-3 relative z-10">
                            <img 
                              src="/finova-icon.png" 
                              alt="Finova" 
                              className="h-12 w-12 object-contain rounded-lg shadow-xl hover:scale-105 transition-transform duration-300"
                            />
                            <img 
                              src="/finova-logo-full.png" 
                              alt="Finova" 
                              className="h-8 w-auto object-contain"
                            />
                        </div>
                    </SidebarHeader>
                    <SidebarContent className="px-4 py-2">
                        <SidebarGroup>
                            <SidebarGroupLabel className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/70 mb-3">
                                Navigation
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="gap-2">
                                    {mainNavItems.map((item) => {
                                        // Check if exact match or sub-path (e.g. /files/123 matches /files)
                                        const isActive = pathname === item.url || pathname?.startsWith(item.url + '/');
                                        return (
                                            <SidebarMenuItem key={item.title}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={isActive}
                                                    tooltip={item.title}
                                                    className={cn(
                                                        "h-12 w-full justify-start rounded-2xl px-4 text-base font-semibold transition-all duration-300 ease-in-out border-2",
                                                        // Active state with gradient
                                                        "data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary data-[active=true]:to-blue-600 data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-primary/30 data-[active=true]:border-primary/20",
                                                        "hover:bg-primary/5 hover:border-primary/20 hover:scale-[1.02]",
                                                        "data-[active=true]:hover:shadow-xl data-[active=true]:hover:from-primary/90 data-[active=true]:hover:to-blue-600/90",
                                                        // Default non-active state
                                                        !isActive && "text-foreground/70 border-transparent hover:text-foreground"
                                                    )}
                                                >
                                                    <Link href={item.url} className="flex items-center gap-3.5">
                                                        <div className={cn(
                                                            "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300",
                                                            isActive ? "bg-white/20 ring-2 ring-white/30" : "bg-primary/10"
                                                        )}>
                                                            <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-primary")} />
                                                        </div>
                                                        <span>{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>
                    <SidebarFooter className="p-4">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-blue-600/10 border-2 border-primary/20 p-3 hover:shadow-xl hover:border-primary/30 transition-all duration-300 group cursor-pointer backdrop-blur-sm">
                            <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center space-x-3">
                                    <Avatar className="h-11 w-11 border-2 border-primary/20 shadow-lg ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                                        <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white text-sm font-bold">
                                            {user?.name ? getInitials(user.name) : "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-0.5 overflow-hidden">
                                        <p className="text-sm font-bold truncate max-w-[100px]">{user?.name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{user?.role || 'User'}</p>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 hover:text-primary rounded-xl transition-all border-2 border-transparent hover:border-primary/20">
                                            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        side="right"
                                        align="center"
                                        sideOffset={10}
                                        className="w-56 rounded-2xl shadow-2xl border-2 border-primary/20 p-2 backdrop-blur-xl bg-card/95"
                                    >
                                        <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">My Account</DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-border/50 my-1" />
                                        <DropdownMenuItem asChild className="cursor-pointer rounded-xl focus:bg-primary/10 focus:text-primary p-2.5 font-medium">
                                            <Link href="/settings">
                                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mr-2">
                                                    <Settings className="h-4 w-4 text-primary" />
                                                </div>
                                                <span>Settings</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => logout()} className="text-red-600 cursor-pointer rounded-xl focus:bg-red-50 dark:focus:bg-red-900/10 focus:text-red-700 p-2.5 font-medium">
                                            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center mr-2">
                                                <LogOut className="h-4 w-4 text-red-600" />
                                            </div>
                                            <span>Logout</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </SidebarFooter>
                </Sidebar>

                <div className="flex flex-1 flex-col overflow-hidden relative">
                    {/* Header */}
                    <header className="flex h-20 items-center justify-between border-b-2 border-primary/10 bg-card/80 backdrop-blur-2xl px-6 md:px-8 z-10 sticky top-0 transition-all duration-200 shadow-sm">
                        <div className="flex items-center space-x-4">
                            {!isMobile && (
                                <div className="relative group w-72 hidden md:block transition-all focus-within:w-80 duration-300">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <Input
                                        placeholder="Search files, tasks, events..."
                                        className="pl-12 h-11 bg-card/50 border-2 border-primary/20 focus:bg-card focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl shadow-lg text-sm font-medium backdrop-blur-sm"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <NotificationBell />
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 overflow-auto p-4 md:p-8 relative scroll-smooth">
                        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 -z-10" />
                        <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}
