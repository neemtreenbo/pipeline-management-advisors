import { useState, useEffect } from 'react'
import { Plus, CheckSquare } from 'lucide-react'
import { getTasks, updateTask } from '@/lib/tasks'
import type { Task } from '@/lib/tasks'
import { Button } from '@/components/ui/button'
import TaskList from './TaskList'
import TaskDialog from './TaskDialog'

interface EntityTasksProps {
    orgId: string
    clientId?: string
    dealId?: string
}

export default function EntityTasks({ orgId, clientId, dealId }: EntityTasksProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined)

    useEffect(() => {
        if (!orgId) return
        loadTasks()
    }, [orgId, clientId, dealId])

    const loadTasks = async () => {
        setLoading(true)
        try {
            // Fetch all tasks for this entity (you can filter out completed if you want, but for entity view might be nice to see all)
            const data = await getTasks({ orgId, clientId, dealId, view: 'all' })
            // Let's sort to non-completed first, then by due date
            const sorted = data.sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1
                if (a.status !== 'completed' && b.status === 'completed') return -1
                if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
                return 0
            })
            setTasks(sorted)
        } catch (error) {
            console.error('Failed to load entity tasks', error)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleComplete = async (task: Task) => {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed'

        setTasks(prev =>
            prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
        )

        try {
            await updateTask(task.id, { status: newStatus })
        } catch (error) {
            console.error('Failed to update task', error)
            setTasks(prev =>
                prev.map(t => t.id === task.id ? { ...t, status: task.status } : t)
            )
        }
    }

    const openCreateDialog = () => {
        setTaskToEdit(undefined)
        setIsDialogOpen(true)
    }

    if (loading) {
        return <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading tasks...</div>
    }

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-border bg-white rounded-xl border-dashed">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <CheckSquare size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No tasks linked</p>
                <p className="text-xs text-muted-foreground mb-4">Add tasks to track follow-ups.</p>
                <Button onClick={openCreateDialog} variant="secondary" size="sm" disabled={!orgId}>
                    <Plus size={14} />
                    Create Task
                </Button>
                <TaskDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSaved={loadTasks}
                    orgId={orgId}
                    defaultClientId={clientId}
                    defaultDealId={dealId}
                />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-end mb-2">
                <Button onClick={openCreateDialog} size="sm" disabled={!orgId}>
                    <Plus size={14} />
                    New Task
                </Button>
            </div>

            <TaskList
                tasks={tasks}
                onToggleComplete={handleToggleComplete}
                onTaskClick={(t) => { setTaskToEdit(t); setIsDialogOpen(true) }}
            />

            <TaskDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSaved={loadTasks}
                orgId={orgId}
                taskToEdit={taskToEdit}
                defaultClientId={clientId}
                defaultDealId={dealId}
            />
        </div>
    )
}
