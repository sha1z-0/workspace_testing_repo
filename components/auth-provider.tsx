"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { authAPI, timeTrackingAPI } from "@/lib/api"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

type User = {
  id: string
  name: string
  email: string
  role: "EMPLOYEE" | "LEAD" | "C_LEVEL" | "CEO"
  avatar?: string
}

// Define the response types for authAPI calls
type CheckSessionResponse = {
  authenticated: boolean
  user?: User
}

type LoginResponse = {
  user?: User
  needsOnboarding?: boolean
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUserData: (data: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Helper function to get user-friendly error messages
  const getErrorMessage = (error: any): string => {
    const errorMessage = error?.message || "An unknown error occurred";

    if (errorMessage.includes("Invalid login credentials") ||
      errorMessage.includes("Email not confirmed") ||
      errorMessage.includes("Invalid email or password")) {
      return "Incorrect email or password";
    } else if (errorMessage.includes("Email rate limit exceeded")) {
      return "Too many login attempts. Please try again later";
    } else if (errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("Network")) {
      return "Network error. Please check your internet connection";
    } else if (errorMessage.includes("User already registered")) {
      return "Email is already in use";
    } else if (errorMessage.includes("Invalid email")) {
      return "Invalid email address";
    } else if (errorMessage.includes("Password should be at least")) {
      return "Password is too weak";
    }

    return "Login failed. Please try again";
  }

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const result = await authAPI.checkSession()
          if (result.authenticated && result.user) {
            setUser(result.user)
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error("Error checking session:", error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only handle explicit sign out events
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      }
      // Ignore all other events to prevent unnecessary re-renders
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === "/login" || pathname === "/login/"

      if (!user && !isAuthPage) {
        router.push("/login")
      } else if (user && isAuthPage) {
        // Redirect based on user role
        if (user.role === "CEO") {
          router.push("/admin/ceo")
        } else if (user.role === "C_LEVEL") {
          router.push("/admin/c-level")
        } else if (user.role === "LEAD") {
          router.push("/admin/lead")
        } else {
          router.push("/dashboard")
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, pathname])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const result = await authAPI.login(email, password) as LoginResponse

      if (result.user) {
        setUser(result.user)

        // Start time tracking session
        if (result.user.role === "CEO" || result.user.role === "C_LEVEL" || result.user.role === "LEAD") {
          try {
            const sessionResult = await timeTrackingAPI.startSession(
              result.user.id,
              result.user.name,
              result.user.role
            );

            // Store the active session ID
            setActiveSessionId(sessionResult.id);

            // Also store in localStorage for recovery on page refresh
            localStorage.setItem('activeSessionId', sessionResult.id);
            console.log("Time tracking session started:", sessionResult.id);
          } catch (sessionError) {
            console.error("Error starting time tracking session:", sessionError);
            // Non-critical error, continue with login flow
          }
        }

        // Show success message
        toast({
          title: "Login successful",
          description: `Welcome back, ${result.user.name}!`,
        });

        // Redirect based on user role
        if (result.user.role === "CEO") {
          router.push("/admin/ceo")
        } else if (result.user.role === "C_LEVEL") {
          router.push("/admin/c-level")
        } else if (result.user.role === "LEAD") {
          router.push("/admin/lead")
        } else {
          router.push("/dashboard")
        }
      } else if (result.needsOnboarding) {
        toast({
          title: "Account requires setup",
          description: "Your account exists but has not been fully set up. Please contact an administrator.",
          variant: "destructive",
        })
        setUser(null)
      } else {
        throw new Error("Invalid login response")
      }
    } catch (error: any) {
      console.error("Login error:", error)

      // Show user-friendly error message
      toast({
        title: "Login failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });

      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    console.log("Logout initiated...")
    setLoading(true)
    try {
      // End time tracking session if active
      if (activeSessionId) {
        try {
          await timeTrackingAPI.endSession(activeSessionId);
          setActiveSessionId(null);
          localStorage.removeItem('activeSessionId');
        } catch (sessionError) {
          console.error("Error ending time tracking session:", sessionError);
          // Non-critical error, continue with logout
        }
      }

      await authAPI.logout()
      setUser(null)
      router.push("/login")

      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      console.error("Logout error:", error)

      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false)
    }
  }

  const updateUserData = (data: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...data } : null)
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, updateUserData }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
