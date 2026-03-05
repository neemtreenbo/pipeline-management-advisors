import { useState, useEffect } from 'react'
import type { Task } from '@/lib/tasks'
import { getClientsForTasks } from '@/lib/tasks'
import TaskItem from './TaskItem'

interface TaskListProps {
    tasks: Task[]
    onToggleComplete: (task: Task) => void
    onTaskClick?: (task: Task) => void
    emptyMessage?: string
    showClient?: boolean
    editingTaskId?: string
    onSaveEdit?: (task: Task, title: string, dueAt: string) => void
    onCancelEdit?: () => void
}

export default function TaskList({
    tasks,
    onToggleComplete,
    onTaskClick,
    emptyMessage = 'No tasks found',
    showClient = true,
    editingTaskId,
    onSaveEdit,
    onCancelEdit,
}: TaskListProps) {
    const [clientsMap, setClientsMap] = useState<Record<string, { id: string; name: string }>>({})

    useEffect(() => {
        async function loadClients() {
            if (!tasks || tasks.length === 0) { setClientsMap({}); return }
            try {
                const infos = await getClientsForTasks(tasks.map(t => t.id))
                const cMap: Record<string, { id: string; name: string }> = {}
                infos.forEach(i => { cMap[i.taskId] = { id: i.clientId, name: i.clientName } })
                setClientsMap(cMap)
            } catch (err) {
                console.error('Failed to load clients', err)
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
                    showClient={showClient}
                    isEditing={editingTaskId === task.id}
                    onToggleComplete={onToggleComplete}
                    onClick={onTaskClick}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                />
            ))}
        </div>
    )
}
