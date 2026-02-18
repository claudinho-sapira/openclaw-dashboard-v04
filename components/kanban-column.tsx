"use client"

import { Droppable } from "@hello-pangea/dnd"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  id: string
  title: string
  count: number
  isHITL?: boolean
  children: React.ReactNode
}

export function KanbanColumn({ id, title, count, isHITL, children }: KanbanColumnProps) {
  return (
    <div className="flex flex-col h-full min-w-[300px]">
      <div className={cn(
        "flex items-center justify-between p-3 rounded-t-lg border-b",
        isHITL ? "bg-warning/10 border-warning/30" : "bg-muted/50"
      )}>
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary">{count}</Badge>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-3 space-y-3 rounded-b-lg border border-t-0 overflow-y-auto",
              snapshot.isDraggingOver && "bg-accent/50",
              isHITL && "bg-warning/5 border-warning/30"
            )}
            style={{ minHeight: "400px" }}
          >
            {children}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
