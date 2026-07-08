"use client"

import { cn } from "@/lib/utils"

function getRingColor(progress: number, status: string): string {
  if (status === "completed") return "text-[#10B981]"
  if (status === "pending_completion_review") return "text-[#8B5CF6]"
  if (status === "pending_review") return "text-[#F59E0B]"
  if (progress > 0) return "text-[#3B82F6]"
  return "text-white/[0.12]"
}

export function ProgressRing({ progress, status, className }: { progress: number; status: string; className?: string }) {
  const color = getRingColor(progress, status)
  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/[0.06]" />
        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" strokeLinecap="round" className={color} strokeDasharray={`${Math.max(progress, 0) * 0.973} 97.3`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-[#F1F5F9] tabular-nums">{progress}%</span>
    </div>
  )
}
