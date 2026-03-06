import { useMemo } from 'react'
import type { Task } from '@/lib/tasks'
import type { ClientOption } from '@/hooks/useMention'
import { useTaskClientInfo } from '@/hooks/queries/useTasks'
import { useClients } from '@/hooks/queries/useClients'
import TaskItem from './TaskItem'

interface TaskListProps {
    tasks: Task[]
    orgId?: string
    onToggleComplete: (task: Task) => void
    onTaskClick?: (task: Task) => void
    emptyMessage?: string
    showClient?: boolean
    editingTaskId?: string
    onSaveEdit?: (task: Task, title: string, dueAt: string, clientId?: string | null) => void
    onCancelEdit?: () => void
}

export default function TaskList({
    tasks,
    orgId,
    onToggleComplete,
    onTaskClick,
    emptyMessage = 'No tasks found',
    showClient = true,
    editingTaskId,
    onSaveEdit,
    onCancelEdit,
}: TaskListProps) {
    const taskIds = useMemo(() => tasks.map(t => t.id), [tasks])
    const { data: clientInfos = [] } = useTaskClientInfo(taskIds)
    const { data: clientsList = [] } = useClients(orgId)

    const clientsMap = useMemo(() => {
        const cMap: Record<string, { id: string; name: string; profilePictureUrl: string | null }> = {}
        clientInfos.forEach(i => { cMap[i.taskId] = { id: i.clientId, name: i.clientName, profilePictureUrl: i.profilePictureUrl } })
        return cMap
    }, [clientInfos])

    const availableClients = useMemo<ClientOption[]>(
        () => clientsList.map(c => ({ id: c.id, name: c.name })),
        [clientsList]
    )

    if (!tasks || tasks.length === 0) {
        return (
            <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground/50">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
            {tasks.map(task => (
                <TaskItem
                    key={task.id}
                    task={task}
                    client={clientsMap[task.id]}
                    currentClientId={clientsMap[task.id]?.id}
                    availableClients={availableClients}
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
