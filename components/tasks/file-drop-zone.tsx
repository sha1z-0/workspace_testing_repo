"use client"

import { cn } from "@/lib/utils"
import { Upload, FileText, Paperclip } from "lucide-react"
import { Input } from "@/components/ui/input"

type FileDropZoneProps = {
  required?: boolean
  tint?: "blue" | "purple" | "neutral"
  file: File | null
  onChange: (file: File | null) => void
  helperText?: string
}

const TINT_COLORS = {
  blue:    { border: "border-[#3B82F6]/30", bg: "bg-[#3B82F6]/[0.04]", icon: "text-[#93C5FD]", fileIcon: "text-[#3B82F6]", required: "text-[#93C5FD]" },
  purple:  { border: "border-[#8B5CF6]/40", bg: "bg-[#8B5CF6]/[0.08]", icon: "text-[#C4B5FD]", fileIcon: "text-[#8B5CF6]", required: "text-[#C4B5FD]" },
  neutral: { border: "border-white/[0.08]", bg: "bg-white/[0.02]", icon: "text-[#64748B]", fileIcon: "text-[#64748B]", required: "text-[#64748B]" },
}

export function FileDropZone({ required = false, tint = "neutral", file, onChange, helperText }: FileDropZoneProps) {
  const c = TINT_COLORS[tint]

  return (
    <div className={cn(
      "grid gap-2 p-4 rounded-[10px] border-[1.5px] border-dashed transition-colors",
      c.border, c.bg
    )}>
      <label htmlFor={`file-${tint}`} className={cn(
        "flex flex-col items-center gap-1.5 cursor-pointer group py-3"
      )}>
        <Upload className={cn("h-5 w-5 transition-transform group-hover:scale-110 group-hover:-translate-y-0.5", c.icon)} />
        <span className="text-[13px] font-medium text-[#CBD5E1]">Drag a file here or click to browse</span>
        <span className="text-[11px] text-[#64748B]">PDF, DOC, DOCX, PNG, JPEG, GIF up to 10MB</span>
        {required && !file && (
          <span className={cn("text-[11px] text-[#64748B] mt-0.5", c.required)}>
            File attachment is required for completion review.
          </span>
        )}
        {helperText && (
          <span className="text-[11px] text-[#64748B] mt-0.5">{helperText}</span>
        )}
      </label>
      <Input
        id={`file-${tint}`}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="hidden"
      />
      {file && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0F1523] border border-white/[0.06]">
          <FileText className={cn("h-3.5 w-3.5 flex-shrink-0", c.fileIcon)} />
          <span className="text-[13px] text-[#CBD5E1] truncate flex-1">{file.name}</span>
          <span className="text-[11px] text-[#64748B] flex-shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-1 text-[#64748B] hover:text-[#EF4444] transition-colors"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
