"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function CEOAnnouncementsPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the CEO dashboard with announcements tab active
    router.push("/admin/ceo?tab=announcements")
  }, [router])

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
} 