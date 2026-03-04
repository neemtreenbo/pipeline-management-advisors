import { useState, useEffect } from 'react'
import type { Task } from '@/lib/tasks'
import { getClientsForTasks } from '@/lib/tasks'
import TaskItem from './TaskItem'

interface TaskListProps {
    tasks: Task[]
    onToggleComplete: (task: Task) => void
    onTaskClick?: (task: Task) => void
    emptyMessage?: string
}

export default function TaskList({
    tasks,
    onToggleComplete,
    onTaskClick,
    emptyMessage = "No tasks found"
}: TaskListProps) {
    const [clientsMap, setClientsMap] = useState<Record<string, { id: string, name: string }>>({})

    useEffect(() => {
        async function loadClients() {
            if (!tasks || tasks.length === 0) {
                setClientsMap({})
                return
            }
            try {
                const taskIds = tasks.map(t => t.id)
                const infos = await getClientsForTasks(taskIds)
                const cMap: Record<string, { id: string, name: string }> = {}
                infos.forEach(i => {
                    cMap[i.taskId] = { id: i.clientId, name: i.clientName }
                })
                setClientsMap(cMap)
            } catch (error) {
                console.error('Failed to load clients', error)
            }
        }
        loadClients()
    }, [tasks])
    if (!tasks || tasks.length === 0) {
        return (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-border flex flex-col items-center justify-center min-h-[150px]">
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
            {tasks.map(task => (
                <TaskItem
                    key={task.id}
                    task={task}
                    client={clientsMap[task.id]}
                    onToggleComplete={onToggleComplete}
                    onClick={onTaskClick}
                />
            ))}
        </div>
    )
}
