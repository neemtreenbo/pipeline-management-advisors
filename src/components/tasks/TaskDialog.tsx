import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createTask, updateTask } from '@/lib/tasks'
import type { Task, TaskInsert } from '@/lib/tasks'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Client {
    id: string
    name: string
}

interface TaskDialogProps {
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
    orgId: string
    taskToEdit?: Task
    defaultClientId?: string
    defaultDealId?: string
}

export default function TaskDialog({
    isOpen,
    onClose,
    onSaved,
    orgId,
    taskToEdit,
    defaultClientId,
    defaultDealId
}: TaskDialogProps) {
    const { user } = useAuth()

    const [form, setForm] = useState({
        title: '',
        description: '',
        due_at: '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [clients, setClients] = useState<Client[]>([])
    const [clientSearch, setClientSearch] = useState('')
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
    const [creatingClient, setCreatingClient] = useState(false)
    const [selectedClientId, setSelectedClientId] = useState<string>('')

    const filteredClients = clients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
    )

    const exactMatchExists = clients.some(
        (c) => c.name.toLowerCase() === clientSearch.toLowerCase().trim()
    )

    async function handleCreateClient() {
        if (!user || !clientSearch.trim() || creatingClient) return
        setCreatingClient(true)
        setError(null)

        const clientName = clientSearch.trim()

        try {
            const { data, error: createError } = await supabase
                .from('clients')
                .insert({
                    org_id: orgId,
                    owner_id: user.id,
                    name: clientName,
                })
                .select('id, name')
                .single()

            if (createError) throw createError

            if (data) {
                setClients((prev) => [...prev, data])
                setSelectedClientId(data.id)
                setClientSearch(data.name)
            }
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to create client')
        } finally {
            setCreatingClient(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            const getLocalDayString = (dateObj: Date) => {
                const year = dateObj.getFullYear()
                const month = String(dateObj.getMonth() + 1).padStart(2, '0')
                const day = String(dateObj.getDate()).padStart(2, '0')
                return `${year}-${month}-${day}`
            }

            if (taskToEdit) {
                setForm({
                    title: taskToEdit.title,
                    description: taskToEdit.description || '',
                    due_at: taskToEdit.due_at ? getLocalDayString(new Date(taskToEdit.due_at)) : '',
                })

                supabase
                    .from('links')
                    .select('to_id')
                    .eq('from_type', 'task')
                    .eq('from_id', taskToEdit.id)
                    .eq('to_type', 'client')
                    .maybeSingle()
                    .then(({ data }) => {
                        if (data) {
                            setSelectedClientId(data.to_id)
                            supabase.from('clients').select('name').eq('id', data.to_id).maybeSingle().then(cRes => {
                                if (cRes.data) setClientSearch(cRes.data.name)
                            })
                        } else {
                            setSelectedClientId('')
                            setClientSearch('')
                        }
                    })

            } else {
                setForm({
                    title: '',
                    description: '',
                    due_at: getLocalDayString(new Date()), // Default to today in local time
                })

                if (defaultClientId) {
                    setSelectedClientId(defaultClientId)
                    supabase.from('clients').select('name').eq('id', defaultClientId).maybeSingle().then(cRes => {
                        if (cRes.data) setClientSearch(cRes.data.name)
                    })
                } else {
                    setSelectedClientId('')
                    setClientSearch('')
                }
            }
            setError(null)
            setSaving(false)

            supabase
                .from('clients')
                .select('id, name')
                .eq('org_id', orgId)
                .order('name')
                .then(({ data }) => setClients(data ?? []))
        }
    }, [isOpen, taskToEdit, defaultClientId, orgId])

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!user) return
        if (!form.title.trim()) { setError('Title is required.'); return }

        setSaving(true)
        setError(null)

        try {
            let dueAtISO = null
            if (form.due_at) {
                const [year, month, day] = form.due_at.split('-').map(Number)
                // Set due time to the absolute end of the selected day in local time
                dueAtISO = new Date(year, month - 1, day, 23, 59, 59, 999).toISOString()
            }

            if (taskToEdit) {
                await updateTask(taskToEdit.id, {
                    title: form.title.trim(),
                    description: form.description.trim() || null,
                    due_at: dueAtISO,
                })

                await supabase.from('links').delete().eq('from_type', 'task').eq('from_id', taskToEdit.id).eq('to_type', 'client')
                if (selectedClientId) {
                    await supabase.from('links').insert({ org_id: orgId, from_type: 'task', from_id: taskToEdit.id, to_type: 'client', to_id: selectedClientId, created_by: user.id })
                }
            } else {
                const taskInput: TaskInsert = {
                    org_id: orgId,
                    owner_id: user.id,
                    assignee_id: user.id, // Assign to self by default
                    title: form.title.trim(),
                    description: form.description.trim() || null,
                    status: 'todo',
                    due_at: dueAtISO,
                }

                const links: { toId: string, toType: string }[] = []
                if (selectedClientId) links.push({ toId: selectedClientId, toType: 'client' })
                if (defaultDealId) links.push({ toId: defaultDealId, toType: 'deal' })

                await createTask(taskInput, links)
            }

            onSaved()
            onClose()
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to save task')
            setSaving(false)
        }
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                <div className="bg-white rounded-[24px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] w-full max-w-lg flex flex-col overflow-hidden border border-black/[0.04] pointer-events-auto">
                    <div className="flex items-center justify-between px-8 py-6 pb-2">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold tracking-tight text-foreground">
                                {taskToEdit ? 'Edit Task' : 'New Task'}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {taskToEdit ? 'Update task details' : 'Add a new task to your list'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors self-start"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 flex flex-col gap-6">

                        {/* Client Search */}
                        <div className="flex flex-col gap-2 relative">
                            <Label htmlFor="task-client-search" className="text-sm font-medium text-foreground/80">Linked Client (Optional)</Label>
                            <div className="relative">
                                <Input
                                    id="task-client-search"
                                    placeholder="Search or create client..."
                                    value={clientSearch}
                                    onFocus={() => setClientDropdownOpen(true)}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            setClientDropdownOpen(false)
                                        }, 150)
                                    }}
                                    onChange={(e) => {
                                        setClientSearch(e.target.value)
                                        setSelectedClientId('')
                                        setClientDropdownOpen(true)
                                    }}
                                    className="h-11 pr-10 rounded-xl bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-white transition-all shadow-none"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                    onClick={() => {
                                        setClientDropdownOpen(!clientDropdownOpen)
                                        if (!clientDropdownOpen) document.getElementById('task-client-search')?.focus()
                                    }}
                                >
                                    <ChevronDown size={16} className={`transition-transform duration-200 ${clientDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {clientDropdownOpen && !selectedClientId && (
                                <div className="absolute top-[100%] left-0 z-10 w-full mt-1 border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-md bg-white">
                                    {filteredClients.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                                            onClick={() => {
                                                setSelectedClientId(c.id)
                                                setClientSearch(c.name)
                                                setClientDropdownOpen(false)
                                            }}
                                        >
                                            {c.name}
                                        </button>
                                    ))}

                                    {filteredClients.length === 0 && !clientSearch.trim() && (
                                        <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                            No clients created yet.
                                        </div>
                                    )}

                                    {!exactMatchExists && clientSearch.trim() && (
                                        <div className="border-t border-border bg-muted/20">
                                            <button
                                                type="button"
                                                disabled={creatingClient}
                                                onClick={handleCreateClient}
                                                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                                            >
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary shrink-0">
                                                    +
                                                </span>
                                                <div className="flex flex-col items-start truncate text-left">
                                                    <span className="truncate w-full max-w-[300px]">Create "{clientSearch.trim()}"</span>
                                                    <span className="text-xs text-muted-foreground font-normal">Add as a new client</span>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedClientId && (
                                <div className="text-[13px] font-medium text-emerald-600 flex items-center justify-between mt-0.5 px-3 py-2 bg-emerald-50/50 border border-emerald-100/50 rounded-lg">
                                    <span className="flex items-center gap-2">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] shadow-sm">✓</span>
                                        {clients.find((c) => c.id === selectedClientId)?.name || clientSearch}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedClientId('')
                                            setClientSearch('')
                                            setTimeout(() => document.getElementById('task-client-search')?.focus(), 0)
                                        }}
                                        className="text-[11px] text-muted-foreground hover:text-foreground underline decoration-muted-foreground/30 underline-offset-2"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="task-title" className="text-sm font-medium text-foreground/80">Title</Label>
                            <Input
                                id="task-title"
                                autoFocus
                                placeholder="What needs to be done?"
                                value={form.title}
                                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                className="h-11 rounded-xl bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-white transition-all shadow-none"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="task-desc" className="text-sm font-medium text-foreground/80">Description (Optional)</Label>
                            <textarea
                                id="task-desc"
                                placeholder="Add more details..."
                                value={form.description}
                                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                className="flex min-h-[80px] w-full rounded-xl border border-muted-foreground/10 bg-muted/30 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:bg-white transition-all shadow-none resize-y"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="task-date" className="text-sm font-medium text-foreground/80">Due Date</Label>
                            <Input
                                id="task-date"
                                type="date"
                                value={form.due_at}
                                onChange={(e) => setForm(f => ({ ...f, due_at: e.target.value }))}
                                className="h-11 rounded-xl bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-white transition-all shadow-none"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-destructive bg-red-50/50 border border-red-100 rounded-xl px-4 py-3">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-3 pt-4 mt-2 border-t border-border/40">
                            <Button
                                type="button"
                                variant="secondary"
                                className="flex-1 h-11 rounded-xl shadow-none font-medium text-muted-foreground hover:bg-muted/50 border-muted-foreground/20"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-11 rounded-xl shadow-none font-medium"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : (taskToEdit ? 'Save Changes' : 'Create Task')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}
