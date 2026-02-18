"use client"

import { useEffect, useState } from "react"
import { DragDropContext, Draggable, DropResult } from "@hello-pangea/dnd"
import { Plus, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KanbanColumn } from "@/components/kanban-column"
import { TaskCard } from "@/components/task-card"
import { TaskDialog } from "@/components/task-dialog"

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  agent: string
  priority: string
  labels: string
  createdAt: string
  updatedAt: string
}

const COLUMNS = [
  { id: "todo", title: "To Do", isHITL: false },
  { id: "in-progress", title: "In Progress", isHITL: false },
  { id: "hitl", title: "HITL", isHITL: true },
  { id: "done", title: "Done", isHITL: false },
]

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredAgent, setFilteredAgent] = useState("all")
  const [filteredPriority, setFilteredPriority] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams()
      if (filteredAgent !== "all") params.set("agent", filteredAgent)
      if (filteredPriority !== "all") params.set("priority", filteredPriority)

      const response = await fetch(`/api/kanban/tasks?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [filteredAgent, filteredPriority])

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    if (source.droppableId === destination.droppableId) return

    try {
      await fetch(`/api/kanban/tasks/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: destination.droppableId }),
      })

      fetchTasks()
    } catch (error) {
      console.error("Failed to update task:", error)
    }
  }

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      await fetch("/api/kanban/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      })
      fetchTasks()
    } catch (error) {
      console.error("Failed to create task:", error)
    }
  }

  const handleUpdateTask = async (taskData: Partial<Task>) => {
    if (!selectedTask) return

    try {
      await fetch(`/api/kanban/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      })
      fetchTasks()
    } catch (error) {
      console.error("Failed to update task:", error)
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await fetch(`/api/kanban/tasks/${id}`, {
        method: "DELETE",
      })
      fetchTasks()
    } catch (error) {
      console.error("Failed to delete task:", error)
    }
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status)
  }

  return (
    <>
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Kanban Board</h1>
              <p className="text-muted-foreground mt-1">
                Visual task tracking with HITL support
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filteredAgent} onValueChange={setFilteredAgent}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  <SelectItem value="pm">Luna (PM)</SelectItem>
                  <SelectItem value="builder">Bolt (Builder)</SelectItem>
                  <SelectItem value="qa">Iris (QA)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filteredPriority} onValueChange={setFilteredPriority}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={() => {
                setSelectedTask(null)
                setIsDialogOpen(true)
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8 overflow-x-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 pb-4">
            {COLUMNS.map((column) => {
              const columnTasks = getTasksByStatus(column.id)
              return (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  count={columnTasks.length}
                  isHITL={column.isHITL}
                >
                  {columnTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <TaskCard
                            task={task}
                            onClick={() => {
                              setSelectedTask(task)
                              setIsDialogOpen(true)
                            }}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                </KanbanColumn>
              )
            })}
          </div>
        </DragDropContext>
      </main>

      <TaskDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        task={selectedTask}
        onSave={selectedTask ? handleUpdateTask : handleCreateTask}
        onDelete={selectedTask ? handleDeleteTask : undefined}
      />
    </>
  )
}
