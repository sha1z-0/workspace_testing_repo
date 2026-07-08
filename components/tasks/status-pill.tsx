"use client"

import { cn } from "@/lib/utils"

type StatusVariant = "todo" | "in_progress" | "pending_review" | "pending_completion_review" | "completed"

const STATUS_CONFIG: Record<StatusVariant, { label: string; bg: string; text: string }> = {
  todo:              { label: "To Do",            bg: "bg-white/[0.06]", text: "text-[#94A3B8]" },
  in_progress:        { label: "In Progress",      bg: "bg-[#3B82F6]/[0.12]", text: "text-[#93C5FD]" },
  pending_review:     { label: "Pending Review",   bg: "bg-[#F59E0B]/[0.14]", text: "text-[#FBBF24]" },
  pending_completion_review: { label: "Final Review", bg: "bg-[#8B5CF6]/[0.10]", text: "text-[#C4B5FD]" },
  completed:          { label: "Completed",        bg: "bg-[#10B981]/[0.12]", text: "text-[#6EE7B7]" },
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status as StatusVariant] || STATUS_CONFIG.todo
  return (
    <span className={cn(
      "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium",
      config.bg, config.text, className
    )}>
      {config.label}
    </span>
  )
}
