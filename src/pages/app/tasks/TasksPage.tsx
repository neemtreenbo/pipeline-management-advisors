import { useState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePageActions } from '@/contexts/PageActionsContext'
import { supabase } from '@/lib/supabase'
import { getTasks, createTask, updateTask } from '@/lib/tasks'
import type { Task, TaskInsert } from '@/lib/tasks'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TaskList from '@/components/tasks/TaskList'
import TaskDialog from '@/components/tasks/TaskDialog'

type ViewType = 'today' | 'upcoming' | 'overdue'

function todayString() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toISO(dateStr: string) {
    if (!dateStr) return null
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
}

export default function TasksPage() {
    const { user } = useAuth()

    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [orgId, setOrgId] = useState<string | null>(null)
    const [view, setView] = useState<ViewType>('today')

    // Inline add state
    const [addingNew, setAddingNew] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newDue, setNewDue] = useState(todayString())
    const [addSaving, setAddSaving] = useState(false)
    const newTitleRef = useRef<HTMLInputElement>(null)

    // Edit dialog state (edit only, not create)
    const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const { setPortalNode } = usePageActions()

    useEffect(() => {
        if (!user) return
        supabase
            .from('memberships')
            .select('org_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
                if (data) setOrgId(data.org_id)
            })
    }, [user])

    const loadTasks = async () => {
        if (!orgId) return
        setLoading(true)
        try {
            const data = await getTasks({ orgId, view })
            setTasks(data)
        } catch (error) {
            console.error('Failed to load tasks', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!orgId) return
        loadTasks()
    }, [orgId, view])

    const openInlineAdd = () => {
        setNewTitle('')
        setNewDue(todayString())
        setAddingNew(true)
        setTimeout(() => newTitleRef.current?.focus(), 0)
    }

    const cancelInlineAdd = () => {
        setAddingNew(false)
        setNewTitle('')
    }

    const handleInlineAdd = async () => {
        if (!user || !orgId || !newTitle.trim() || addSaving) return
        setAddSaving(true)
        try {
            const input: TaskInsert = {
                org_id: orgId,
                owner_id: user.id,
                assignee_id: user.id,
                title: newTitle.trim(),
                description: null,
                status: 'todo',
                due_at: toISO(newDue),
            }
            await createTask(input, [])
            setAddingNew(false)
            setNewTitle('')
            await loadTasks()
        } catch (err) {
            console.error('Failed to create task', err)
        } finally {
            setAddSaving(false)
        }
    }

    const handleToggleComplete = async (task: Task) => {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed'
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
        try {
            await updateTask(task.id, { status: newStatus })
            if (newStatus === 'completed' && view !== 'today') {
                setTimeout(() => loadTasks(), 500)
            }
        } catch (error) {
            console.error('Failed to update task', error)
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
        }
    }

    const openEditDialog = (task: Task) => {
        setTaskToEdit(task)
        setIsDialogOpen(true)
    }

    // Inject the "Add Task" button into the Island navigation
    useEffect(() => {
        setPortalNode(
            <Button onClick={openInlineAdd} className="h-8 text-xs sm:text-xs rounded-full shadow-sm px-3 font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={14} className="sm:mr-1.5" />
                <span className="hidden sm:inline">Add</span>
            </Button>
        )
        return () => setPortalNode(null)
    }, [setPortalNode])

    return (
        <div className="flex flex-col h-full bg-transparent relative pt-4">

            <div className="flex-1 overflow-y-auto pb-20">
                <div className="max-w-5xl mx-auto px-6 flex flex-col gap-6">

                    <Tabs value={view} onValueChange={(v) => setView(v as ViewType)} className="w-full sm:w-auto self-start">
                        <TabsList className="bg-muted/50 p-1 rounded-xl">
                            <TabsTrigger value="today" className="rounded-lg px-4 py-2">Today</TabsTrigger>
                            <TabsTrigger value="upcoming" className="rounded-lg px-4 py-2">Upcoming</TabsTrigger>
                            <TabsTrigger value="overdue" className="rounded-lg px-4 py-2">Overdue</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Inline add row */}
                    {addingNew && (
                        <div className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3 shadow-sm">
                            <div className="w-4 h-4 rounded-full border-2 border-border/60 shrink-0" />
                            <input
                                ref={newTitleRef}
                                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground"
                                placeholder="Task title…"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleInlineAdd()
                                    if (e.key === 'Escape') cancelInlineAdd()
                                }}
                                disabled={addSaving}
                            />
                            <input
                                type="date"
                                className="text-[12px] text-muted-foreground/60 bg-transparent outline-none border-0 cursor-pointer"
                                value={newDue}
                                onChange={e => setNewDue(e.target.value)}
                                disabled={addSaving}
                            />
                            <button
                                onClick={handleInlineAdd}
                                disabled={addSaving || !newTitle.trim()}
                                className="text-[12px] font-medium text-foreground hover:text-foreground/70 disabled:text-muted-foreground/30 transition-colors px-1"
                            >
                                {addSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                                onClick={cancelInlineAdd}
                                className="text-[12px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="bg-white rounded-xl border border-border h-[200px] flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <TaskList
                            tasks={tasks}
                            onToggleComplete={handleToggleComplete}
                            onTaskClick={openEditDialog}
                            emptyMessage={`No ${view} tasks found.`}
                        />
                    )}

                </div>
            </div>

            {/* Dialog for editing existing tasks only */}
            {orgId && (
                <TaskDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSaved={loadTasks}
                    orgId={orgId}
                    taskToEdit={taskToEdit}
                />
            )}
        </div>
    )
}
