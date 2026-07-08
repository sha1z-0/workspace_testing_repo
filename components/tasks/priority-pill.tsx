"use client"

import { cn } from "@/lib/utils"

type PriorityVariant = "low" | "medium" | "high" | "urgent"

const PRIORITY_CONFIG: Record<PriorityVariant, { label: string; dot: string; bg: string; text: string }> = {
  low:     { label: "Low",     dot: "bg-[#94A3B8]", bg: "bg-white/[0.06]", text: "text-[#94A3B8]" },
  medium:  { label: "Medium",  dot: "bg-[#93C5FD]", bg: "bg-[#3B82F6]/[0.12]", text: "text-[#93C5FD]" },
  high:    { label: "High",    dot: "bg-[#FBBF24]", bg: "bg-[#F59E0B]/[0.12]", text: "text-[#FBBF24]" },
  urgent:  { label: "Urgent",  dot: "bg-[#FCA5A5]", bg: "bg-[#EF4444]/[0.12]", text: "text-[#FCA5A5]" },
}

export function PriorityPill({ priority, className }: { priority: string | undefined; className?: string }) {
  const config = PRIORITY_CONFIG[priority as PriorityVariant] || PRIORITY_CONFIG.medium
  return (
    <span className={cn(
      "inline-flex items-center whitespace-nowrap gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
      config.bg, config.text, className
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  )
}
