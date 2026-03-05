import { useState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { getTasks, createTask, updateTask } from '@/lib/tasks'
import type { Task, TaskInsert } from '@/lib/tasks'
import { useAuth } from '@/contexts/AuthContext'
import TaskList from './TaskList'
import TaskDialog from './TaskDialog'

interface EntityTasksProps {
    orgId: string
    clientId?: string
    dealId?: string
    inlineAdd?: boolean
}

function todayString() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EntityTasks({ orgId, clientId, dealId, inlineAdd }: EntityTasksProps) {
    const { user } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    // Inline add state
    const [adding, setAdding] = useState(false)
    const [title, setTitle] = useState('')
    const [dueAt, setDueAt] = useState(todayString())
    const [saving, setSaving] = useState(false)
    const titleRef = useRef<HTMLInputElement>(null)

    // Dialog state (edit only)
    const [taskToEdit, setTaskToEdit] = useState<Task | undefined>()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    useEffect(() => {
        if (!orgId) return
        loadTasks()
    }, [orgId, clientId, dealId])

    async function loadTasks() {
        setLoading(true)
        try {
            const data = await getTasks({ orgId, clientId, dealId, view: 'all' })
            setTasks(data.sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1
                if (a.status !== 'completed' && b.status === 'completed') return -1
                if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
                return 0
            }))
        } catch (err) {
            console.error('Failed to load entity tasks', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleToggleComplete(task: Task) {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed'
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
        try {
            await updateTask(task.id, { status: newStatus })
        } catch {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
        }
    }

    function openInlineAdd() {
        setTitle('')
        setDueAt(todayString())
        setAdding(true)
        setTimeout(() => titleRef.current?.focus(), 0)
    }

    function cancelInlineAdd() {
        setAdding(false)
        setTitle('')
    }

    async function handleInlineSave() {
        if (!user || !title.trim()) return
        setSaving(true)
        try {
            const [year, month, day] = dueAt.split('-').map(Number)
            const dueAtISO = dueAt
                ? new Date(year, month - 1, day, 23, 59, 59, 999).toISOString()
                : null

            const taskInput: TaskInsert = {
                org_id: orgId,
                owner_id: user.id,
                assignee_id: user.id,
                title: title.trim(),
                description: null,
                status: 'todo',
                due_at: dueAtISO,
            }

            const links: { toId: string; toType: string }[] = []
            if (clientId) links.push({ toId: clientId, toType: 'client' })
            if (dealId) links.push({ toId: dealId, toType: 'deal' })

            await createTask(taskInput, links)
            await loadTasks()
            setAdding(false)
            setTitle('')
        } catch (err) {
            console.error('Failed to create task', err)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="py-8 text-center text-sm text-muted-foreground/40 animate-pulse">Loading…</div>
    }

    // Inline add form row
    const inlineForm = (
        <div className="flex items-center gap-2 bg-white border border-border/60 rounded-xl px-3 py-2.5">
            <input
                ref={titleRef}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground"
                placeholder="Task title…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInlineSave()
                    if (e.key === 'Escape') cancelInlineAdd()
                }}
                disabled={saving}
            />
            <input
                type="date"
                className="text-[12px] text-muted-foreground bg-transparent outline-none border-0 cursor-pointer"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                disabled={saving}
            />
            <button
                onClick={handleInlineSave}
                disabled={saving || !title.trim()}
                className="text-[12px] font-medium text-accent hover:text-accent/80 disabled:text-muted-foreground/30 transition-colors px-1"
            >
                {saving ? 'Saving…' : 'Add'}
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
            {/* Add button / inline form */}
            {inlineAdd ? (
                adding ? inlineForm : (
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

            {/* Task list or empty state */}
            {tasks.length === 0 && !adding ? (
                <div className="py-8 text-center text-[13px] text-muted-foreground/40">
                    No tasks yet
                </div>
            ) : (
                <TaskList
                    tasks={tasks}
                    onToggleComplete={handleToggleComplete}
                    onTaskClick={(t) => { setTaskToEdit(t); setIsDialogOpen(true) }}
                />
            )}

            {/* Dialog for editing only */}
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
