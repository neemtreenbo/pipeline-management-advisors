import { useState } from 'react'
import { Plus, ClipboardList, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { useServiceRequestsByClient, useCreateServiceRequest, useUpdateServiceRequest, useDeleteServiceRequest } from '@/hooks/queries/useServiceRequests'
import { SERVICE_REQUEST_TYPES, SERVICE_REQUEST_STATUSES, SERVICE_REQUEST_PRIORITIES } from '@/lib/service-requests'
import type { ServiceRequest, NewServiceRequestInput, ServiceRequestStatus, ServiceRequestType, ServiceRequestPriority } from '@/lib/service-requests'
import { queryKeys } from '@/lib/queryKeys'

interface ClientServiceRequestsListProps {
    clientId: string
    orgId: string
}

const STATUS_COLORS: Record<string, string> = {
    'New': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'Pending Documents': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Ready to Submit': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'Submitted': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    'In Progress': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'Rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

function getRequestTypeLabel(value: string) {
    return SERVICE_REQUEST_TYPES.find(t => t.value === value)?.label ?? value
}

function ServiceRequestItem({ sr, onStatusChange, onDelete }: {
    sr: ServiceRequest
    onStatusChange: (id: string, status: ServiceRequestStatus) => void
    onDelete: (id: string) => void
}) {
    const [showStatusMenu, setShowStatusMenu] = useState(false)

    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-4 py-3">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <ClipboardList size={13} className="text-muted-foreground/40 shrink-0" />
                    <p className="text-[13px] font-medium text-foreground truncate">{sr.title}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground/40">{getRequestTypeLabel(sr.request_type)}</span>
                    <span className="text-[11px] text-muted-foreground/40">
                        {new Date(sr.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </span>
                    {sr.description && (
                        <span className="text-[11px] text-muted-foreground/40 truncate max-w-[200px]">{sr.description}</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                    <button
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer ${STATUS_COLORS[sr.status] || 'bg-muted text-muted-foreground'}`}
                    >
                        {sr.status}
                    </button>
                    {showStatusMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
                            <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                                {SERVICE_REQUEST_STATUSES.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { onStatusChange(sr.id, s); setShowStatusMenu(false) }}
                                        className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-muted/50 transition-colors ${sr.status === s ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <button
                    onClick={() => onDelete(sr.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground/30 hover:text-red-500 transition-colors"
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    )
}

export default function ClientServiceRequestsList({ clientId, orgId }: ClientServiceRequestsListProps) {
    const { user } = useAuth()
    const qc = useQueryClient()
    const { data: requests = [], isLoading } = useServiceRequestsByClient(clientId)
    const createMutation = useCreateServiceRequest(orgId)
    const updateMutation = useUpdateServiceRequest(orgId)
    const deleteMutation = useDeleteServiceRequest(orgId)

    const [adding, setAdding] = useState(false)
    const [form, setForm] = useState({
        request_type: '' as ServiceRequestType | '',
        title: '',
        description: '',
        priority: 'medium' as ServiceRequestPriority,
    })

    function openAdd() {
        setForm({ request_type: '', title: '', description: '', priority: 'medium' })
        setAdding(true)
    }

    async function handleAdd() {
        if (!user || !form.request_type || !form.title.trim() || createMutation.isPending) return
        const input: NewServiceRequestInput = {
            org_id: orgId,
            owner_id: user.id,
            client_id: clientId,
            request_type: form.request_type as ServiceRequestType,
            title: form.title.trim(),
            description: form.description || undefined,
            priority: form.priority,
        }
        try {
            await createMutation.mutateAsync(input)
            setAdding(false)
        } catch (err) {
            console.error('Failed to create service request', err)
        }
    }

    function handleStatusChange(id: string, status: ServiceRequestStatus) {
        updateMutation.mutate({ id, updates: { status } })
    }

    async function handleDelete(id: string) {
        try {
            await deleteMutation.mutateAsync(id)
            qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.byClient(clientId) })
        } catch (err) {
            console.error('Failed to delete service request', err)
        }
    }

    if (isLoading) {
        return <div className="py-8 text-center text-sm text-muted-foreground/40 animate-pulse">Loading...</div>
    }

    return (
        <div className="flex flex-col gap-2">
            {adding ? (
                <div className="flex flex-col gap-3 bg-card border border-border/60 rounded-xl px-4 py-3">
                    <select
                        value={form.request_type}
                        onChange={(e) => setForm(f => ({ ...f, request_type: e.target.value as ServiceRequestType }))}
                        className="text-sm bg-transparent outline-none border-b border-border/40 pb-0.5 text-muted-foreground"
                    >
                        <option value="">Select request type...</option>
                        {SERVICE_REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input
                        placeholder="Title"
                        value={form.title}
                        onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
                        className="text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 border-b border-border/40 pb-0.5"
                    />
                    <textarea
                        placeholder="Description (optional)"
                        value={form.description}
                        onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                        rows={2}
                        className="text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 border-b border-border/40 pb-0.5 resize-none"
                    />
                    <select
                        value={form.priority}
                        onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as ServiceRequestPriority }))}
                        className="text-sm bg-transparent outline-none border-b border-border/40 pb-0.5 text-muted-foreground capitalize w-fit"
                    >
                        {SERVICE_REQUEST_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div className="flex items-center gap-3 pt-1 border-t border-border/40">
                        <button onClick={handleAdd} disabled={createMutation.isPending || !form.request_type || !form.title.trim()}
                            className="text-[12px] font-medium text-accent hover:text-accent/80 disabled:text-muted-foreground/30 transition-colors">
                            {createMutation.isPending ? 'Saving...' : 'Add request'}
                        </button>
                        <button onClick={() => setAdding(false)} className="text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">Cancel</button>
                    </div>
                </div>
            ) : (
                <button onClick={openAdd} className="flex items-center gap-1.5 text-[12px] text-muted-foreground/50 hover:text-foreground transition-colors py-1 w-fit">
                    <Plus size={13} /> New request
                </button>
            )}

            {requests.length === 0 && !adding ? (
                <div className="py-8 text-center text-[13px] text-muted-foreground/40">No service requests yet</div>
            ) : (
                <div className="flex flex-col gap-2">
                    {requests.map(sr => (
                        <ServiceRequestItem key={sr.id} sr={sr} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    )
}
