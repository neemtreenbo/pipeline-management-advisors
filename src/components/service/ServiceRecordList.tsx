import { useState } from 'react'
import { Plus, Check, Clock, AlertCircle, RefreshCw, Calendar, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useServiceRecordsByClient, useCreateServiceRecord, useCompleteServiceRecord, useDeleteServiceRecord } from '@/hooks/queries/useServiceRecords'
import { useOrgMembers } from '@/hooks/queries/useActivities'
import { useDealsByClient } from '@/hooks/queries/useDeals'
import { SERVICE_TYPE_LABELS, type ServiceRecord, type ServiceRecordStatus, type ServiceRecordType } from '@/lib/serviceRecords'
import ServiceRecordForm from './ServiceRecordForm'

const STATUS_CONFIG: Record<ServiceRecordStatus, { icon: typeof Clock; variant: 'accent' | 'warning' | 'success' | 'destructive'; label: string }> = {
    upcoming: { icon: Calendar, variant: 'accent', label: 'Upcoming' },
    in_progress: { icon: Clock, variant: 'warning', label: 'In Progress' },
    completed: { icon: Check, variant: 'success', label: 'Completed' },
    overdue: { icon: AlertCircle, variant: 'destructive', label: 'Overdue' },
}

interface ServiceRecordListProps {
    clientId: string
    orgId: string
}

export default function ServiceRecordList({ clientId, orgId }: ServiceRecordListProps) {
    const { user } = useAuth()
    const { data: records = [], isLoading } = useServiceRecordsByClient(clientId)
    const { data: members = [] } = useOrgMembers(orgId)
    const { data: deals = [] } = useDealsByClient(clientId)
    const createMutation = useCreateServiceRecord(orgId)
    const completeMutation = useCompleteServiceRecord(orgId)
    const deleteMutation = useDeleteServiceRecord()
    const [showForm, setShowForm] = useState(false)

    // Separate active vs completed
    const activeRecords = records.filter(r => r.status !== 'completed')
    const completedRecords = records.filter(r => r.status === 'completed')

    // Check for overdue records (due_date in the past and not completed)
    const enrichedActive = activeRecords.map(r => {
        if (r.status !== 'completed' && r.status !== 'overdue') {
            const dueDate = new Date(r.due_date + 'T23:59:59')
            if (dueDate < new Date()) {
                return { ...r, status: 'overdue' as ServiceRecordStatus }
            }
        }
        return r
    })

    const dealOptions = deals.map(d => ({
        id: d.id,
        title: (d.data as Record<string, unknown>)?.title as string || 'Untitled Deal',
    }))

    async function handleCreate(data: { title: string; type: string; description: string; due_date: string; assignee_id?: string; deal_id?: string }) {
        if (!user) return
        await createMutation.mutateAsync({
            org_id: orgId,
            client_id: clientId,
            owner_id: user.id,
            title: data.title,
            type: data.type as ServiceRecordType,
            description: data.description || null,
            due_date: data.due_date,
            assignee_id: data.assignee_id || undefined,
            deal_id: data.deal_id || undefined,
        })
        setShowForm(false)
    }

    async function handleComplete(record: ServiceRecord) {
        if (!user) return
        await completeMutation.mutateAsync({ id: record.id, actorId: user.id })
    }

    async function handleDelete(id: string) {
        await deleteMutation.mutateAsync(id)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <RefreshCw size={14} className="text-muted-foreground" />
                    Service Records
                    {records.length > 0 && (
                        <span className="text-xs text-muted-foreground font-normal">({records.length})</span>
                    )}
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(true)} className="h-7 px-2 text-xs">
                    <Plus size={14} className="mr-1" />
                    Add
                </Button>
            </div>

            {/* Active records */}
            {enrichedActive.length === 0 && completedRecords.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                    <RefreshCw size={18} className="text-muted-foreground/30" />
                    <p className="text-[13px] text-muted-foreground/40">No service records yet</p>
                    <Button size="sm" variant="secondary" onClick={() => setShowForm(true)} className="mt-2 h-7 text-xs">
                        <Plus size={12} className="mr-1" /> Create first record
                    </Button>
                </div>
            )}

            {enrichedActive.map(record => {
                const config = STATUS_CONFIG[record.status]
                const StatusIcon = config.icon
                const dueDate = new Date(record.due_date + 'T00:00:00')
                const isOverdue = record.status === 'overdue'

                return (
                    <div
                        key={record.id}
                        className={`rounded-xl border bg-card p-4 flex items-start gap-3 group transition-colors ${isOverdue ? 'border-red-200 dark:border-red-900/40' : 'border-border'}`}
                    >
                        {/* Complete button */}
                        <button
                            onClick={() => handleComplete(record)}
                            disabled={completeMutation.isPending}
                            className="mt-0.5 w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center justify-center shrink-0"
                            title="Mark complete"
                        >
                            <Check size={10} className="text-transparent group-hover:text-green-500" />
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{record.title}</p>
                                    {record.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{record.description}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant={config.variant} className="text-[10px]">
                                        <StatusIcon size={10} className="mr-1" />
                                        {config.label}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                                <Badge variant="outline" className="text-[10px]">
                                    {SERVICE_TYPE_LABELS[record.type]}
                                </Badge>
                                <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                                    Due {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {record.assignee?.full_name && (
                                    <span>&middot; {record.assignee.full_name}</span>
                                )}
                                {record.deal && (
                                    <span>&middot; {(record.deal.data as Record<string, unknown>)?.title as string || 'Deal'}</span>
                                )}
                                <button
                                    onClick={() => handleDelete(record.id)}
                                    className="ml-auto text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })}

            {/* Completed records */}
            {completedRecords.length > 0 && (
                <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Completed ({completedRecords.length})
                    </p>
                    {completedRecords.map(record => (
                        <div
                            key={record.id}
                            className="rounded-lg border border-border/50 bg-card/50 p-3 flex items-center gap-3 mb-2 opacity-60"
                        >
                            <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                <Check size={10} className="text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground/70 line-through truncate">{record.title}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                                {SERVICE_TYPE_LABELS[record.type]}
                            </Badge>
                        </div>
                    ))}
                </div>
            )}

            {/* Create form modal */}
            {showForm && (
                <ServiceRecordForm
                    onSubmit={handleCreate}
                    onCancel={() => setShowForm(false)}
                    saving={createMutation.isPending}
                    deals={dealOptions}
                    members={members}
                />
            )}
        </div>
    )
}
