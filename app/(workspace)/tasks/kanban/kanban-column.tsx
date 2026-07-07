"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ReactNode } from "react"
import type { FirebaseTask, FirebaseUser } from "@/lib/firebase-types"
import SortableTaskCard from "./sortable-task-card"

interface KanbanColumnProps {
  id: string
  title: string
  tasks: (FirebaseTask & { id: string })[]
  icon?: ReactNode
  getUser: (uid: string) => { uid: string; id: string; name: string; email: string; avatar?: string; role?: string } | null
  currentUser: any
}

export default function KanbanColumn({ 
  id, 
  title, 
  tasks, 
  icon,
  getUser,
  currentUser
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div>
      <Card className="h-full">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-md font-medium">
              {title}
              {icon}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div
            ref={setNodeRef}
            className="min-h-[200px] rounded-md border-2 border-dashed p-2"
          >
            <SortableContext
              id={id}
              items={tasks.map(task => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed p-2">
                  <p className="text-sm text-muted-foreground">
                    No tasks yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <SortableTaskCard 
                      key={task.id} 
                      task={task} 
                      getUser={getUser}
                      currentUser={currentUser}
                      isCEO={currentUser?.role === "CEO"}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 