"use client"

import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "primary-purple" | "primary-amber" | "secondary"

const VARIANTS: Record<ButtonVariant, string> = {
  primary:         "bg-[#3B82F6] text-white hover:bg-[#2563EB]",
  "primary-purple": "bg-[#8B5CF6] text-white hover:bg-[#7C3AED]",
  "primary-amber":  "bg-[#FBBF24] text-[#42280A] hover:bg-[#F59E0B]",
  secondary:       "bg-transparent border border-white/[0.12] text-[#CBD5E1] hover:bg-white/[0.06]",
}

type TaskButtonProps = {
  variant?: ButtonVariant
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
  type?: "button" | "submit"
}

export function TaskButton({ variant = "primary", disabled, onClick, children, className, type = "button" }: TaskButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2.5 text-[13px] font-medium transition-all duration-150",
        "disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F1A]",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </button>
  )
}

export function TaskButtonGhost({ onClick, children, className, disabled }: { onClick?: () => void; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[12px] font-medium",
        "text-[#94A3B8] hover:text-[#CBD5E1] hover:bg-white/[0.06] transition-colors",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
    >
      {children}
    </button>
  )
}
