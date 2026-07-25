"use client"

import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"

export interface TabOption {
  value: string
  label: string
  icon?: LucideIcon
}

interface AnimatedTabsProps {
  tabs: TabOption[]
  activeTab: string
  onTabChange: (value: string) => void
  layoutId?: string
}

export function AnimatedTabs({ tabs, activeTab, onTabChange, layoutId = "animatedTab" }: AnimatedTabsProps) {
  return (
    <div className="flex bg-slate-100/60 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-white/10 w-full justify-start overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={`relative px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors rounded-lg outline-none whitespace-nowrap ${
              isActive ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-white shadow-sm dark:bg-slate-700 rounded-lg"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
