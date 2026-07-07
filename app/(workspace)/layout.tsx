"use client"

import type React from "react"
import AdminLayout from "@/components/admin-layout"
import { useAuth } from "@/components/auth-provider"

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  
  // AdminLayout handles its own loading states
  return <AdminLayout role={user?.role || "EMPLOYEE"}>{children}</AdminLayout>
}
