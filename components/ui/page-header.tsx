"use client"

import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  title: string
  description: string
  icon?: LucideIcon
  action?: React.ReactNode
}

export function PageHeader({ title, description, icon: Icon, action }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900 p-8 text-slate-900 dark:text-white shadow-xl ring-1 ring-slate-200/50 dark:ring-white/10"
    >
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/40 dark:bg-white/5 blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-blue-300/20 dark:bg-indigo-500/10 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2 flex items-center gap-3">
            {Icon && <Icon className="h-8 w-8 text-blue-600 dark:text-white" />}
            {title}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 max-w-xl text-lg">
            {description}
          </p>
        </div>
        
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </motion.div>
  )
}
