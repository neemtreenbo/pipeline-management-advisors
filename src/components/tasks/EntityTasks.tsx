import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { getTasks, createTask, updateTask } from '@/lib/tasks'
import type { Task, TaskInsert } from '@/lib/tasks'
import { todayString, toISO } from '@/lib/date-utils'
import { useAuth } from '@/contexts/AuthContext'
import TaskList from './TaskList'
import TaskDialog from './TaskDialog'

type OptimisticActivity = {
    id: string
    event_type: string
    entity_type?: string
    entity_id?: string
    data: Record<string, unknown>
    created_at: string
    actor_id: string
}

interface EntityTasksProps {
    orgId: string
    clientId?: string
    dealId?: string
    inlineAdd?: boolean
    onActivityAdded?: (activity: OptimisticActivity) => void
}

export default function EntityTasks({ orgId, clientId, dealId, inlineAdd, onActivityAdded }: EntityTasksProps) {
    const { user } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    // Inline add state
    const [adding, setAdding] = useState(false)
    const [addTitle, setAddTitle] = useState('')
    const [addDue, setAddDue] = useState(todayString())
    const [addSaving, setAddSaving] = useState(false)
    const addTitleRef = useRef<HTMLInputElement>(null)

    // Inline edit state
    const [editingTaskId, setEditingTaskId] = useState<string | undefined>()

    // Dialog state (non-inline mode only)
    const [taskToEdit, setTaskToEdit] = useState<Task | undefined>()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const sortTasks = useCallback((data: Task[]) => {
        return [...data].sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1
            if (a.status !== 'completed' && b.status === 'completed') return -1
            if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
            return 0
        })
    }, [])

    const loadTasks = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getTasks({ orgId, clientId, dealId, view: 'all' })
            setTasks(sortTasks(data))
        } catch (err) {
            console.error('Failed to load entity tasks', err)
        } finally {
            setLoading(false)
        }
    }, [orgId, clientId, dealId, sortTasks])

    useEffect(() => {
        if (!orgId) return
        let cancelled = false

        async function load() {
            setLoading(true)
            try {
                const data = await getTasks({ orgId, clientId, dealId, view: 'all' })
                if (cancelled) return
                setTasks(sortTasks(data))
            } catch (err) {
                console.error('Failed to load entity tasks', err)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => { cancelled = true }
    }, [orgId, clientId, dealId, sortTasks])

    const handleToggleComplete = useCallback(async (task: Task) => {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed'
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
        try {
            await updateTask(task.id, { status: newStatus })
        } catch {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
        }
    }, [])

    const openInlineAdd = useCallback(() => {
        setEditingTaskId(undefined)
        setAddTitle('')
        setAddDue(todayString())
        setAdding(true)
        setTimeout(() => addTitleRef.current?.focus(), 0)
    }, [])

    const cancelInlineAdd = useCallback(() => {
        setAdding(false)
        setAddTitle('')
    }, [])

    const handleInlineAdd = useCallback(async () => {
        if (!user || !addTitle.trim()) return
        setAddSaving(true)
        try {
            const taskInput: TaskInsert = {
                org_id: orgId,
                owner_id: user.id,
                assignee_id: user.id,
                title: addTitle.trim(),
                description: null,
                status: 'todo',
                due_at: toISO(addDue),
            }
            const links: { toId: string; toType: string }[] = []
            if (clientId) links.push({ toId: clientId, toType: 'client' })
            if (dealId) links.push({ toId: dealId, toType: 'deal' })
            const newTask = await createTask(taskInput, links)
            onActivityAdded?.({
                id: `optimistic-task-${newTask.id}`,
                event_type: 'task_created',
                entity_type: 'task',
                entity_id: newTask.id,
                data: { title: newTask.title },
                created_at: new Date().toISOString(),
                actor_id: user.id,
            })
            await loadTasks()
            setAdding(false)
            setAddTitle('')
        } catch (err) {
            console.error('Failed to create task', err)
        } finally {
            setAddSaving(false)
        }
    }, [user, orgId, addTitle, addDue, clientId, dealId, onActivityAdded, loadTasks])

    const handleInlineEdit = useCallback(async (task: Task, title: string, dueAt: string) => {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, title, due_at: toISO(dueAt) } : t))
        setEditingTaskId(undefined)
        try {
            await updateTask(task.id, { title, due_at: toISO(dueAt) })
        } catch {
            setTasks(prev => prev.map(t => t.id === task.id ? task : t))
        }
    }, [])

    const handleTaskClick = useCallback((task: Task) => {
        if (inlineAdd) {
            setAdding(false)
            setEditingTaskId(task.id)
        } else {
            setTaskToEdit(task)
            setIsDialogOpen(true)
        }
    }, [inlineAdd])

    if (loading) {
        return <div className="py-8 text-center text-sm text-muted-foreground/40 animate-pulse">Loading…</div>
    }

    const inlineAddForm = (
        <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3 py-2.5">
            <input
                ref={addTitleRef}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground"
                placeholder="Task title…"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInlineAdd()
                    if (e.key === 'Escape') cancelInlineAdd()
                }}
                disabled={addSaving}
            />
            <input
                type="date"
                className="text-[12px] text-muted-foreground bg-transparent outline-none border-0 cursor-pointer"
                value={addDue}
                onChange={(e) => setAddDue(e.target.value)}
                disabled={addSaving}
            />
            <button
                onClick={handleInlineAdd}
                disabled={addSaving || !addTitle.trim()}
                className="text-[12px] font-medium text-accent hover:text-accent/80 disabled:text-muted-foreground/30 transition-colors px-1"
            >
                {addSaving ? 'Saving…' : 'Add'}
            </button>
            <button
                onClick={cancelInlineAdd}
                className="text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
                Cancel
            </button>
        </div>
    )

    return (
        <div className="flex flex-col gap-2">
            {/* Add trigger */}
            {inlineAdd ? (
                adding ? inlineAddForm : (
                    <button
                        onClick={openInlineAdd}
                        className="flex items-center gap-1.5 text-[12px] text-muted-foreground/50 hover:text-foreground transition-colors py-1 w-fit"
                    >
                        <Plus size={13} />
                        Add task
                    </button>
                )
            ) : (
                <div className="flex justify-end">
                    <button
                        onClick={() => { setTaskToEdit(undefined); setIsDialogOpen(true) }}
                        className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Plus size={13} />
                        New Task
                    </button>
                </div>
            )}

            {/* Task list */}
            {tasks.length === 0 && !adding ? (
                <div className="py-8 text-center text-[13px] text-muted-foreground/40">
                    No tasks yet
                </div>
            ) : (
                <TaskList
                    tasks={tasks}
                    onToggleComplete={handleToggleComplete}
                    onTaskClick={handleTaskClick}
                    showClient={!inlineAdd}
                    editingTaskId={editingTaskId}
                    onSaveEdit={handleInlineEdit}
                    onCancelEdit={() => setEditingTaskId(undefined)}
                />
            )}

            {/* Dialog for non-inline mode only */}
            {!inlineAdd && (
                <TaskDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSaved={loadTasks}
                    orgId={orgId}
                    taskToEdit={taskToEdit}
                    defaultClientId={clientId}
                    defaultDealId={dealId}
                />
            )}
        </div>
    )
}
