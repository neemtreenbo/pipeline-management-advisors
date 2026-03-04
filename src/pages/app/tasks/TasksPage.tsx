import { useState, useEffect } from 'react'
import { Plus, CheckSquare } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getTasks, updateTask } from '@/lib/tasks'
import type { Task } from '@/lib/tasks'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TaskList from '@/components/tasks/TaskList'
import TaskDialog from '@/components/tasks/TaskDialog'

type ViewType = 'today' | 'upcoming' | 'overdue'

export default function TasksPage() {
    const { user } = useAuth()

    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [orgId, setOrgId] = useState<string | null>(null)
    const [view, setView] = useState<ViewType>('today')

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined)

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
                if (data) {
                    setOrgId(data.org_id)
                }
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

    const handleToggleComplete = async (task: Task) => {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed'

        // Optimistic update
        setTasks(prev =>
            prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
        )

        try {
            await updateTask(task.id, { status: newStatus })
            // Optional: Reload to ensure correctness, or remove from list if completed and we only show uncompleted
            if (newStatus === 'completed' && view !== 'today') {
                // Usually completed tasks disappear from overdue/upcoming
                setTimeout(() => loadTasks(), 500)
            }
        } catch (error) {
            console.error('Failed to update task', error)
            // Revert on error
            setTasks(prev =>
                prev.map(t => t.id === task.id ? { ...t, status: task.status } : t)
            )
        }
    }

    const openCreateDialog = () => {
        setTaskToEdit(undefined)
        setIsDialogOpen(true)
    }

    const openEditDialog = (task: Task) => {
        setTaskToEdit(task)
        setIsDialogOpen(true)
    }

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-white sticky top-0 z-10 shrink-0">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <CheckSquare size={24} className="text-muted-foreground" />
                        Tasks
                    </h1>
                    <p className="text-sm text-muted-foreground">Execution tracking and follow-ups</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus size={16} className="mr-2" />
                    Add Task
                </Button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6 pb-20">
                <div className="max-w-4xl mx-auto flex flex-col gap-6">

                    <Tabs value={view} onValueChange={(v) => setView(v as ViewType)} className="w-full sm:w-auto self-start">
                        <TabsList className="bg-muted/50 p-1 rounded-xl">
                            <TabsTrigger value="today" className="rounded-lg px-4 py-2">Today</TabsTrigger>
                            <TabsTrigger value="upcoming" className="rounded-lg px-4 py-2">Upcoming</TabsTrigger>
                            <TabsTrigger value="overdue" className="rounded-lg px-4 py-2">Overdue</TabsTrigger>
                        </TabsList>
                    </Tabs>

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

            {orgId && (
                <TaskDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSaved={loadTasks}
                    orgId={orgId!}
                    taskToEdit={taskToEdit}
                />
            )}
        </div>
    )
}
