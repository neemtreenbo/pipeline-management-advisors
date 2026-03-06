import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { supabase } from '@/lib/supabase'
import { getTasks, createTask, updateTask, setTaskClientLink } from '@/lib/tasks'
import type { Task, TaskInsert } from '@/lib/tasks'
import { todayString, toISO } from '@/lib/date-utils'
import { useMention } from '@/hooks/useMention'
import type { ClientOption } from '@/hooks/useMention'
import MentionPopup from '@/components/ui/MentionPopup'
import ClientChip from '@/components/ui/ClientChip'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TaskList from '@/components/tasks/TaskList'

type ViewType = 'today' | 'upcoming' | 'overdue'

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
        let cancelled = false
        supabase.from('clients').select('id, name').eq('org_id', orgId).order('name')
            .then(({ data }) => { if (!cancelled) setAvailableClients(data ?? []) })
        return () => { cancelled = true }
    }, [orgId])

    // Inline add state
    const [addingNew, setAddingNew] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newDue, setNewDue] = useState(todayString())
    const [addSaving, setAddSaving] = useState(false)
    const newTitleRef = useRef<HTMLInputElement>(null)

    // @mention hook
    const mention = useMention(availableClients)

    // Inline edit state
    const [editingTaskId, setEditingTaskId] = useState<string | undefined>(undefined)

    const loadTasks = useCallback(async (silent = false) => {
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
    }, [orgId, view])

    useEffect(() => {
        if (!orgId) return
        let cancelled = false

        async function load() {
            setLoading(true)
            try {
                const data = await getTasks({ orgId: orgId!, view })
                if (!cancelled) setTasks(data)
            } catch (error) {
                console.error('Failed to load tasks', error)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => { cancelled = true }
    }, [orgId, view])

    const openInlineAdd = useCallback(() => {
        setNewTitle('')
        setNewDue(todayString())
        mention.reset()
        setAddingNew(true)
        setTimeout(() => newTitleRef.current?.focus(), 0)
    }, [mention])

    const cancelInlineAdd = useCallback(() => {
        setAddingNew(false)
        setNewTitle('')
        mention.reset()
    }, [mention])

    const handleNewTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setNewTitle(val)
        mention.detectMention(val)
    }, [mention])

    const handleSelectNewMention = useCallback((c: ClientOption) => {
        setNewTitle(prev => mention.selectMention(c, prev))
        setTimeout(() => newTitleRef.current?.focus(), 0)
    }, [mention])

    const handleInlineAdd = useCallback(async () => {
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
            if (mention.selectedClientId) {
                await setTaskClientLink(task.id, orgId, mention.selectedClientId, user.id)
            }
            setAddingNew(false)
            setNewTitle('')
            mention.reset()
            await loadTasks()
        } catch (err) {
            console.error('Failed to create task', err)
        } finally {
            setAddSaving(false)
        }
    }, [user, orgId, newTitle, newDue, addSaving, mention, loadTasks])

    const handleToggleComplete = useCallback(async (task: Task) => {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed'
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
        try {
            await updateTask(task.id, { status: newStatus })
            if (newStatus === 'completed' && view !== 'today') {
                setTimeout(() => loadTasks(true), 500)
            }
        } catch (error) {
            console.error('Failed to update task', error)
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
        }
    }, [view, loadTasks])

    const handleInlineEdit = useCallback(async (task: Task, title: string, dueAt: string, clientId?: string | null) => {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, title, due_at: toISO(dueAt) } : t))
        setEditingTaskId(undefined)
        try {
            await updateTask(task.id, { title, due_at: toISO(dueAt) })
            if (orgId && user && clientId !== undefined) {
                await setTaskClientLink(task.id, orgId, clientId, user.id)
            }
            await loadTasks(true)
        } catch {
            setTasks(prev => prev.map(t => t.id === task.id ? task : t))
        }
    }, [orgId, user, loadTasks])

    const handleTaskClick = useCallback((task: Task) => {
        setAddingNew(false)
        setEditingTaskId(task.id)
    }, [])

    return (
        <div className="min-h-screen bg-transparent pt-6">
            <div className="max-w-5xl mx-auto px-6 pb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
                        <Button onClick={openInlineAdd} className="h-8 text-xs rounded-full px-3 font-medium">
                            <Plus size={14} className="mr-1.5" /> Add
                        </Button>
                    </div>

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
                            {/* Inline add row */}
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
                                                    if (mention.mentionQuery !== null) { mention.closeMention(); return }
                                                    cancelInlineAdd()
                                                }
                                                if (e.key === 'Enter' && mention.mentionQuery === null) handleInlineAdd()
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
                                    {mention.mentionQuery !== null && mention.mentionClients.length > 0 && (
                                        <MentionPopup
                                            clients={mention.mentionClients}
                                            anchorRef={newTitleRef}
                                            onSelect={handleSelectNewMention}
                                        />
                                    )}

                                    {/* Selected client chip */}
                                    {mention.selectedClientId && mention.selectedClientName && (
                                        <ClientChip
                                            name={mention.selectedClientName}
                                            onRemove={() => mention.setSelectedClientId('')}
                                        />
                                    )}
                                </div>
                            )}

                            <TaskList
                                tasks={tasks}
                                orgId={orgId ?? undefined}
                                onToggleComplete={handleToggleComplete}
                                onTaskClick={handleTaskClick}
                                editingTaskId={editingTaskId}
                                onSaveEdit={handleInlineEdit}
                                onCancelEdit={() => setEditingTaskId(undefined)}
                                emptyMessage={`No ${view} tasks.`}
                            />
                        </>
                    )}

            </div>
        </div>
    )
}
