"use client"

const BADGES: Record<string, { label: string; bg: string; text: string }> = {
  not_started:    { label: "Not Started",    bg: "bg-white/[0.06]", text: "text-[#94A3B8]" },
  in_progress:    { label: "In Progress",    bg: "bg-[#3B82F6]/[0.12]", text: "text-[#93C5FD]" },
  pending_review: { label: "Pending Review", bg: "bg-[#F59E0B]/[0.14]", text: "text-[#FBBF24]" },
  approved:       { label: "Approved",       bg: "bg-[#10B981]/[0.12]", text: "text-[#6EE7B7]" },
}

export function MilestoneStatusBadge({ status }: { status: string }) {
  const b = BADGES[status] || BADGES.not_started
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${b.bg} ${b.text}`}>
      {b.label}
    </span>
  )
}
