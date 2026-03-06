import { useState, useRef, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { useClients } from '@/hooks/queries/useClients'
import { useTasks as useTasksQuery } from '@/hooks/queries/useTasks'
import { queryKeys } from '@/lib/queryKeys'
import { createTask, updateTask, setTaskClientLink } from '@/lib/tasks'
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

    const [view, setView] = useState<ViewType>('today')

    // Tasks from TanStack Query
    const { data: tasks = [], isLoading: loading, refetch: refetchTasks } = useTasksQuery({ orgId: orgId ?? '', view })

    // Available clients for @mention via TanStack Query (deduplicated across app)
    const { data: clientsData = [] } = useClients(orgId ?? undefined)
    const availableClients = useMemo<ClientOption[]>(
        () => clientsData.map(c => ({ id: c.id, name: c.name })),
        [clientsData]
    )

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

    const loadTasks = useCallback(async () => {
        refetchTasks()
    }, [refetchTasks])

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

    const qc = useQueryClient()
    const tasksQueryKey = queryKeys.tasks.filtered(orgId ?? '', view)

    const handleToggleComplete = useCallback(async (task: Task) => {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed'
        // Optimistic update
        qc.setQueryData<Task[]>(tasksQueryKey, old =>
            old?.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
        )
        try {
            await updateTask(task.id, { status: newStatus })
            if (newStatus === 'completed' && view !== 'today') {
                setTimeout(() => refetchTasks(), 500)
            }
        } catch (error) {
            console.error('Failed to update task', error)
            qc.setQueryData<Task[]>(tasksQueryKey, old =>
                old?.map(t => t.id === task.id ? { ...t, status: task.status } : t)
            )
        }
    }, [view, qc, tasksQueryKey, refetchTasks])

    const handleInlineEdit = useCallback(async (task: Task, title: string, dueAt: string, clientId?: string | null) => {
        // Optimistic update
        qc.setQueryData<Task[]>(tasksQueryKey, old =>
            old?.map(t => t.id === task.id ? { ...t, title, due_at: toISO(dueAt) } : t)
        )
        setEditingTaskId(undefined)
        try {
            await updateTask(task.id, { title, due_at: toISO(dueAt) })
            if (orgId && user && clientId !== undefined) {
                await setTaskClientLink(task.id, orgId, clientId, user.id)
            }
            await refetchTasks()
        } catch {
            qc.setQueryData<Task[]>(tasksQueryKey, old =>
                old?.map(t => t.id === task.id ? task : t)
            )
        }
    }, [orgId, user, qc, tasksQueryKey, refetchTasks])

    const handleTaskClick = useCallback((task: Task) => {
        setAddingNew(false)
        setEditingTaskId(task.id)
    }, [])

    return (
        <div className="min-h-screen bg-transparent pt-6">
            <div className="max-w-5xl mx-auto px-6 pb-8">
                <div className="flex items-center justify-between mb-6 h-8">
                    <h1 className="text-lg font-semibold text-foreground leading-none">Tasks</h1>
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
