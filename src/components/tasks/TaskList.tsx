import { useState, useEffect, useMemo } from 'react'
import type { Task } from '@/lib/tasks'
import { getClientsForTasks } from '@/lib/tasks'
import { supabase } from '@/lib/supabase'
import type { ClientOption } from '@/hooks/useMention'
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
    const [clientsMap, setClientsMap] = useState<Record<string, { id: string; name: string; profilePictureUrl: string | null }>>({})
    const [availableClients, setAvailableClients] = useState<ClientOption[]>([])

    // Memoize task IDs to avoid unnecessary refetches
    const taskIdKey = useMemo(() => tasks.map(t => t.id).join(','), [tasks])

    useEffect(() => {
        if (!tasks || tasks.length === 0) { setClientsMap({}); return }
        let cancelled = false

        async function loadClients() {
            try {
                const infos = await getClientsForTasks(tasks.map(t => t.id))
                if (cancelled) return
                const cMap: Record<string, { id: string; name: string; profilePictureUrl: string | null }> = {}
                infos.forEach(i => { cMap[i.taskId] = { id: i.clientId, name: i.clientName, profilePictureUrl: i.profilePictureUrl } })
                setClientsMap(cMap)
            } catch (err) {
                console.error('Failed to load clients', err)
            }
        }

        loadClients()
        return () => { cancelled = true }
    }, [taskIdKey])

    useEffect(() => {
        if (!orgId) return
        let cancelled = false
        supabase
            .from('clients')
            .select('id, name')
            .eq('org_id', orgId)
            .order('name')
            .then(({ data }) => { if (!cancelled) setAvailableClients(data ?? []) })
        return () => { cancelled = true }
    }, [orgId])

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
