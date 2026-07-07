"use client"

import type React from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
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
  SidebarSeparator,
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
  Users,
  Briefcase,
  Shield,
  UserPlus,
  FileText,
  AlertTriangle,
  BarChart,
  Building,
  Bell,
  MessageSquare,
  Calendar,
  CheckSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Lock,
} from "lucide-react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { useIsMobile, useBreakpoint, BREAKPOINTS } from "@/hooks/use-mobile"
import NotificationBell from "./notification-bell"

export default function AdminLayout({
  children,
  role,
}: {
  children: React.ReactNode
  role: "CEO" | "C_LEVEL" | "LEAD" | "EMPLOYEE"
}) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const isTablet = useBreakpoint('md')
  const isSmallScreen = useBreakpoint('lg')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    // Only redirect if we have a user and role mismatch
    if (user && role !== "EMPLOYEE") {
      if (role === "CEO" && user.role !== "CEO") {
        router.push("/dashboard")
      } else if (role === "C_LEVEL" && user.role !== "CEO" && user.role !== "C_LEVEL") {
        router.push("/dashboard")
      } else if (role === "LEAD" && user.role !== "CEO" && user.role !== "C_LEVEL" && user.role !== "LEAD") {
        router.push("/dashboard")
      }
    }
  }, [user, role, router])

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

  const getAdminPath = () => {
    if (user.role === "CEO") return "/admin/ceo"
    if (user.role === "C_LEVEL") return "/admin/c-level"
    if (user.role === "LEAD") return "/admin/lead"
    return "/dashboard"
  }

  const basePath = getAdminPath()
  
  // Memoize navigation items to prevent re-renders
  const navItems = useMemo(() => {
    const items = []
    
    // Dashboard for all roles
    items.push({
      title: "Dashboard",
      url: user.role === "EMPLOYEE" ? "/dashboard" : basePath,
      icon: BarChart,
      section: user.role === "EMPLOYEE" ? "main" : "admin"
    })
    
    // CEO specific items
    if (user.role === "CEO") {
      items.push(
        { title: "User Management", url: `${basePath}/users`, icon: Users, section: "admin" },
        { title: "Departments", url: `${basePath}/departments`, icon: Building, section: "admin" },
        { title: "Warning System", url: `${basePath}/warnings`, icon: AlertTriangle, section: "admin" }
      )
    }
    
    // CEO and C_LEVEL items
    if (user.role === "CEO" || user.role === "C_LEVEL") {
      items.push(
        { title: "Vault", url: "/vault", icon: Lock, section: "admin" },
        { title: "Announcements", url: `${basePath}/announcements`, icon: Bell, section: "admin" }
      )
    }
    
    // CEO, C_LEVEL, and LEAD items
    if (user.role === "CEO" || user.role === "C_LEVEL" || user.role === "LEAD") {
      items.push(
        { title: "Projects", url: `${basePath}/projects`, icon: Briefcase, section: "admin" },
        { title: "Team Management", url: `${basePath}/team`, icon: UserPlus, section: "admin" }
      )
    }
    
    // Common items for all roles
    items.push(
      { title: "Files", url: "/files", icon: FileText, section: "main" },
      { title: "Chat", url: "/chat", icon: MessageSquare, section: "main", badge: 3 },
      { title: "Calendar", url: "/calendar", icon: Calendar, section: "main" },
      { title: "Tasks", url: "/tasks", icon: CheckSquare, section: "main" },
      { title: "Settings", url: "/settings", icon: Settings, section: "main" }
    )
    
    return items
  }, [user.role, basePath])

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar className={`sidebar-glass border-r border-border/40 nav-item-transition overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'w-[60px]' : 'w-[256px]'}`}>
          <SidebarHeader className={`flex items-center gap-3 py-6 transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-all duration-300">
              <img 
                src="/finova-icon.png" 
                alt="Finova" 
                className="h-10 w-10 object-contain transition-transform duration-300 hover:scale-110"
              />
              {!collapsed && <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary animate-glow-pulse" />}
            </div>
            {!collapsed && (
              <div className="animate-fade-in text-center">
                <h2 className="text-lg font-bold tracking-tight">{user.role === "EMPLOYEE" ? "Finova" : "Admin Panel"}</h2>
                <p className="text-xs text-muted-foreground">{user.role === "CEO" ? "Executive" : user.role === "C_LEVEL" ? "Management" : user.role === "LEAD" ? "Team Lead" : "Portal"}</p>
              </div>
            )}
          </SidebarHeader>
          
          {/* Collapse toggle */}
          {!collapsed && (
            <div className="px-4 mb-3 flex justify-end">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground nav-item-transition"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {/* Expand button for collapsed state */}
          {collapsed && (
            <div className="mb-4 flex justify-center">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground nav-item-transition"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {/* Divider */}
          <div className={`h-px bg-border/50 transition-all duration-300 ${collapsed ? 'mx-0 mb-4' : 'mx-5 mb-5'}`} />
          <SidebarContent className={`flex-1 overflow-y-auto scrollbar-hide transition-all duration-300 ${collapsed ? 'px-0 space-y-2' : 'px-4 space-y-1'}`}>
            {/* Admin section - only show if user has admin items */}
            {navItems.filter(item => item.section === "admin").length > 0 && (
              <SidebarGroup className={collapsed ? "mb-2" : "mb-1"}>
                {!collapsed && (
                  <SidebarGroupLabel className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 animate-fade-in">
                    Administration
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className={collapsed ? "space-y-1" : "space-y-0.5"}>
                    {navItems.filter(item => item.section === "admin").map((item, index) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={pathname === item.url}>
                          <Link 
                            href={item.url} 
                            className={`
                              group relative flex items-center text-[13px] font-medium
                              nav-item-transition animate-fade-in
                              ${pathname === item.url
                                ? "bg-sidebar-accent text-foreground glow-primary"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                              }
                              ${collapsed ? "justify-center h-10 rounded-lg w-full" : "gap-3 rounded-xl px-3 py-2.5"}
                            `}
                            style={{ animationDelay: `${index * 40}ms` }}
                          >
                            {/* Active indicator bar */}
                            {pathname === item.url && !collapsed && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-full active-indicator animate-indicator-grow" />
                            )}
                            
                            {collapsed ? (
                              <div className="relative flex items-center justify-center">
                                <item.icon
                                  className={`h-[18px] w-[18px] nav-item-transition ${
                                    pathname === item.url
                                      ? "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                                      : "text-muted-foreground group-hover:text-foreground"
                                  }`}
                                />
                                {/* Notification dot for collapsed state */}
                                {item.badge && (
                                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary border border-sidebar-background animate-fade-in" />
                                )}
                              </div>
                            ) : (
                              <>
                                <item.icon
                                  className={`h-5 w-5 shrink-0 nav-item-transition ${
                                    pathname === item.url
                                      ? "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                                      : "text-muted-foreground group-hover:text-foreground"
                                  }`}
                                />
                                <span className="truncate">{item.title}</span>
                                {/* Notification badge for expanded state */}
                                {item.badge && (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ml-auto animate-fade-in">
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                            
                            {/* Tooltip for collapsed state */}
                            {collapsed && (
                              <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-lg border border-border group-hover:opacity-100 nav-item-transition">
                                {item.title}
                                {item.badge && (
                                  <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                                    {item.badge}
                                  </span>
                                )}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Show separator only if there are both admin and main sections */}
            {navItems.filter(item => item.section === "admin").length > 0 && 
             navItems.filter(item => item.section === "main").length > 0 && !collapsed && (
              <div className="mx-2 h-px bg-border/50 my-5" />
            )}

            {/* Main navigation section */}
            {navItems.filter(item => item.section === "main").length > 0 && (
              <SidebarGroup className={collapsed ? "mt-4" : ""}>
                {!collapsed && (
                  <SidebarGroupLabel className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 animate-fade-in">
                    {user.role === "EMPLOYEE" ? "Main" : "Navigation"}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className={collapsed ? "space-y-1" : "space-y-0.5"}>
                    {navItems.filter(item => item.section === "main").map((item, index) => {
                      const adminItemsCount = navItems.filter(i => i.section === "admin").length
                      return (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton asChild isActive={pathname === item.url}>
                            <Link 
                              href={item.url} 
                              className={`
                                group relative flex items-center text-[13px] font-medium
                                nav-item-transition animate-fade-in
                                ${pathname === item.url
                                  ? "bg-sidebar-accent text-foreground glow-primary"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                                }
                                ${collapsed ? "justify-center h-10 rounded-lg w-full" : "gap-3 rounded-xl px-3 py-2.5"}
                              `}
                              style={{ animationDelay: `${(adminItemsCount + index) * 40}ms` }}
                            >
                              {/* Active indicator bar */}
                              {pathname === item.url && !collapsed && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-full active-indicator animate-indicator-grow" />
                              )}
                              
                              {collapsed ? (
                                <div className="relative flex items-center justify-center">
                                  <item.icon
                                    className={`h-[18px] w-[18px] nav-item-transition ${
                                      pathname === item.url
                                        ? "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                                        : "text-muted-foreground group-hover:text-foreground"
                                    }`}
                                  />
                                  {/* Notification dot for collapsed state */}
                                  {item.badge && (
                                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary border border-sidebar-background animate-fade-in" />
                                  )}
                                </div>
                              ) : (
                                <>
                                  <item.icon
                                    className={`h-5 w-5 shrink-0 nav-item-transition ${
                                      pathname === item.url
                                        ? "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                                        : "text-muted-foreground group-hover:text-foreground"
                                    }`}
                                  />
                                  <span className="truncate">{item.title}</span>
                                  {/* Notification badge for expanded state */}
                                  {item.badge && (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ml-auto animate-fade-in">
                                      {item.badge}
                                    </span>
                                  )}
                                </>
                              )}
                              
                              {/* Tooltip for collapsed state */}
                              {collapsed && (
                                <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-lg border border-border group-hover:opacity-100 nav-item-transition">
                                  {item.title}
                                  {item.badge && (
                                    <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                                      {item.badge}
                                    </span>
                                  )}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
          <SidebarFooter className="mt-auto transition-all duration-300 pb-4">
            <div className={`h-px bg-border/50 mb-4 transition-all duration-300 ${collapsed ? 'mx-0' : 'mx-4'}`} />
            <div
              className={`
                flex items-center nav-item-transition glass-card transition-all duration-300
                ${collapsed ? "justify-center h-10 rounded-lg w-full" : "gap-3 rounded-xl px-3 py-2.5 mx-4 hover:bg-sidebar-accent"}
              `}
            >
              <div className="relative h-8 w-8 shrink-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary text-white font-bold text-sm">
                    {user?.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500 glow-dot" />
                )}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left animate-fade-in">
                    <p className="text-[13px] font-semibold leading-tight truncate">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{user?.role}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-sidebar-accent/50 rounded-lg">
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border border-border/40 shadow-xl backdrop-blur-xl bg-card/95 w-44">
                      <DropdownMenuLabel className="font-semibold text-sm py-1.5">My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="group p-2 cursor-pointer">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 mr-2.5">
                            <Settings className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-medium">Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onSelect={(e) => {
                          e.preventDefault()
                          console.log("Logout clicked from admin-layout")
                          logout()
                        }}
                        className="group p-2 cursor-pointer"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-all duration-300 mr-2.5">
                          <LogOut className="h-3.5 w-3.5 text-red-600" />
                        </div>
                        <span className="text-sm font-medium">Logout</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 md:px-6 bg-background/95 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              {isMobile && (
                <SidebarTrigger className="md:hidden hover:bg-sidebar-accent rounded-xl transition-all duration-300" />
              )}
              <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-bold tracking-tight truncate max-w-[220px] sm:max-w-none">
                  {user.role === "CEO" ? "CEO Administration" : 
                   user.role === "C_LEVEL" ? "Management Panel" : 
                   user.role === "LEAD" ? "Team Lead Panel" : 
                   "Dashboard"}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {user.role === "CEO" ? "Executive Control Center" : 
                   user.role === "C_LEVEL" ? "Strategic Management" : 
                   user.role === "LEAD" ? "Team Operations" : 
                   "Your Workspace"}
                </p>
              </div>
            </div>
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
