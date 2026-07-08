"use client"

import { cn } from "@/lib/utils"

function getProgressColor(progress: number, status: string): string {
  if (status === "completed") return "bg-[#10B981]"
  if (status === "pending_completion_review") return "bg-[#8B5CF6]"
  if (status === "pending_review") return "bg-[#F59E0B]"
  if (progress > 0) return "bg-[#3B82F6]"
  return "bg-white/[0.07]"
}

export function CardProgressBar({ progress, status }: { progress: number; status: string }) {
  const fillColor = getProgressColor(progress, status)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-[5px] rounded-full bg-white/[0.07] overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", fillColor)} style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[11px] font-medium text-[#94A3B8] w-8 text-right tabular-nums">{progress}%</span>
    </div>
  )
}
