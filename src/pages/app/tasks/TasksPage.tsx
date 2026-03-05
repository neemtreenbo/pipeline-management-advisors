import { useState, useEffect, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { usePageActions } from '@/contexts/PageActionsContext'
import { supabase } from '@/lib/supabase'
import { getTasks, createTask, updateTask, setTaskClientLink } from '@/lib/tasks'
import type { Task, TaskInsert } from '@/lib/tasks'

interface ClientOption { id: string; name: string }

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TaskList from '@/components/tasks/TaskList'

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
    const { orgId } = useOrg()

    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<ViewType>('today')


    // Available clients for @mention
    const [availableClients, setAvailableClients] = useState<ClientOption[]>([])

    useEffect(() => {
        if (!orgId) return
        supabase.from('clients').select('id, name').eq('org_id', orgId).order('name')
            .then(({ data }) => setAvailableClients(data ?? []))
    }, [orgId])

    // Inline add state
    const [addingNew, setAddingNew] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newDue, setNewDue] = useState(todayString())
    const [newClientId, setNewClientId] = useState<string>('')
    const [newMentionQuery, setNewMentionQuery] = useState<string | null>(null)
    const [addSaving, setAddSaving] = useState(false)
    const newTitleRef = useRef<HTMLInputElement>(null)

    // Inline edit state
    const [editingTaskId, setEditingTaskId] = useState<string | undefined>(undefined)

    const { setPortalNode } = usePageActions()

    const loadTasks = async (silent = false) => {
        if (!orgId) return
        if (!silent) setLoading(true)
        try {
            const data = await getTasks({ orgId, view })
            setTasks(data)
        } catch (error) {
            console.error('Failed to load tasks', error)
        } finally {
            if (!silent) setLoading(false)
        }
    }

    useEffect(() => {
        if (!orgId) return
        loadTasks()
    }, [orgId, view])

    const openInlineAdd = () => {
        setNewTitle('')
        setNewDue(todayString())
        setNewClientId('')
        setNewMentionQuery(null)
        setAddingNew(true)
        setTimeout(() => newTitleRef.current?.focus(), 0)
    }

    const cancelInlineAdd = () => {
        setAddingNew(false)
        setNewTitle('')
        setNewClientId('')
        setNewMentionQuery(null)
    }

    const handleNewTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setNewTitle(val)
        const lastAt = val.lastIndexOf('@')
        if (lastAt !== -1) {
            const afterAt = val.slice(lastAt + 1)
            if (!afterAt.includes(' ')) { setNewMentionQuery(afterAt); return }
        }
        setNewMentionQuery(null)
    }

    const selectNewMention = (c: ClientOption) => {
        const lastAt = newTitle.lastIndexOf('@')
        setNewTitle(newTitle.slice(0, lastAt).trimEnd())
        setNewClientId(c.id)
        setNewMentionQuery(null)
        setTimeout(() => newTitleRef.current?.focus(), 0)
    }

    const newMentionClients = newMentionQuery !== null
        ? availableClients.filter(c => c.name.toLowerCase().includes(newMentionQuery.toLowerCase())).slice(0, 6)
        : []

    const newClientName = availableClients.find(c => c.id === newClientId)?.name ?? null

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
            const task = await createTask(input, [])
            if (newClientId) {
                await setTaskClientLink(task.id, orgId, newClientId, user.id)
            }
            setAddingNew(false)
            setNewTitle('')
            setNewClientId('')
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

    const handleInlineEdit = async (task: Task, title: string, dueAt: string, clientId?: string | null) => {
        // Optimistic update — reflect title/due immediately
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, title, due_at: toISO(dueAt) } : t))
        setEditingTaskId(undefined)
        try {
            await updateTask(task.id, { title, due_at: toISO(dueAt) })
            if (orgId && user && clientId !== undefined) {
                await setTaskClientLink(task.id, orgId, clientId, user.id)
            }
            // Silent refresh so client avatar/name reflects the new link without a loading flash
            await loadTasks(true)
        } catch {
            setTasks(prev => prev.map(t => t.id === task.id ? task : t))
        }
    }

    // Inject search + "Add Task" button into the Island navigation
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
        <div className="flex flex-col h-full bg-transparent relative pt-6">

            <div className="flex-1 overflow-y-auto pb-20">
                <div className="max-w-2xl mx-auto px-6 flex flex-col gap-5">

                    {/* View tabs */}
                    <Tabs value={view} onValueChange={(v) => setView(v as ViewType)} className="self-start">
                        <TabsList className="bg-transparent p-0 h-auto gap-4">
                            {(['today', 'upcoming', 'overdue'] as ViewType[]).map(v => (
                                <TabsTrigger
                                    key={v}
                                    value={v}
                                    className="bg-transparent shadow-none px-0 pb-2 text-sm font-medium capitalize text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none transition-colors"
                                >
                                    {v === 'today' ? 'Today' : v === 'upcoming' ? 'Upcoming' : 'Overdue'}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {/* Content */}
                    {loading ? (
                        <div className="flex flex-col gap-1">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Inline add row — inserted at top of list visually */}
                            {addingNew && (
                                <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-3 px-4 py-3">
                                        <div className="w-4 h-4 rounded-full border border-border/50 shrink-0" />
                                        <input
                                            ref={newTitleRef}
                                            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/30 text-foreground"
                                            placeholder="Task title… type @ to link a client"
                                            value={newTitle}
                                            onChange={handleNewTitleChange}
                                            onKeyDown={e => {
                                                if (e.key === 'Escape') {
                                                    if (newMentionQuery !== null) { setNewMentionQuery(null); return }
                                                    cancelInlineAdd()
                                                }
                                                if (e.key === 'Enter' && newMentionQuery === null) handleInlineAdd()
                                            }}
                                            disabled={addSaving}
                                        />
                                        <input
                                            type="date"
                                            className="text-[11px] text-muted-foreground/50 bg-transparent outline-none border-0 cursor-pointer"
                                            value={newDue}
                                            onChange={e => setNewDue(e.target.value)}
                                            disabled={addSaving}
                                        />
                                        <button
                                            onClick={handleInlineAdd}
                                            disabled={addSaving || !newTitle.trim()}
                                            className="text-[11px] font-medium text-foreground hover:text-foreground/60 disabled:text-muted-foreground/30 transition-colors"
                                        >
                                            {addSaving ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                            onClick={cancelInlineAdd}
                                            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    {/* @mention popup */}
                                    {newMentionQuery !== null && newMentionClients.length > 0 && newTitleRef.current && (
                                        <div
                                            style={{
                                                position: 'fixed',
                                                top: newTitleRef.current.getBoundingClientRect().bottom + 4,
                                                left: newTitleRef.current.getBoundingClientRect().left,
                                                zIndex: 50,
                                            }}
                                            className="bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[180px]"
                                        >
                                            {newMentionClients.map(c => (
                                                <button
                                                    key={c.id}
                                                    onMouseDown={(e) => { e.preventDefault(); selectNewMention(c) }}
                                                    className="w-full text-left px-4 py-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                >
                                                    <span className="text-muted-foreground/40 mr-0.5">@</span>
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Selected client chip */}
                                    {newClientId && newClientName && (
                                        <div className="flex items-center gap-2 px-4 pb-2.5 pl-11">
                                            <span className="flex items-center gap-1 text-[11px] text-foreground/80 bg-muted rounded-full px-2.5 py-0.5">
                                                <span className="text-foreground/40">@</span>
                                                {newClientName}
                                                <button
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => setNewClientId('')}
                                                    className="ml-0.5 text-foreground/30 hover:text-foreground/60 transition-colors"
                                                >
                                                    <X size={9} />
                                                </button>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <TaskList
                                tasks={tasks}
                                orgId={orgId ?? undefined}
                                onToggleComplete={handleToggleComplete}
                                onTaskClick={(task) => { setAddingNew(false); setEditingTaskId(task.id) }}
                                editingTaskId={editingTaskId}
                                onSaveEdit={handleInlineEdit}
                                onCancelEdit={() => setEditingTaskId(undefined)}
                                emptyMessage={`No ${view} tasks.`}
                            />
                        </>
                    )}

                </div>
            </div>
        </div>
    )
}
