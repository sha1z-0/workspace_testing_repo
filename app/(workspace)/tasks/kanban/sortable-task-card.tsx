"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import TaskCard from "./task-card"
import type { FirebaseTask } from "@/lib/firebase-types"

interface SortableTaskCardProps {
  task: FirebaseTask & { id: string }
  getUser: (uid: string) => { uid: string; id: string; name: string; email: string; avatar?: string; role?: string } | null
  currentUser: any
  isCEO: boolean
}

export default function SortableTaskCard({ 
  task, 
  getUser, 
  currentUser,
  isCEO 
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <TaskCard 
        task={task}
        getUser={getUser}
        currentUser={currentUser}
        isCEO={isCEO}
      />
    </div>
  )
} 