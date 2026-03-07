import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Calendar, Clock, Check, AlertCircle, Loader2, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { usePageActions } from '@/contexts/PageActionsContext'
import { supabase } from '@/lib/supabase'
import { useServiceRecordsByOrg, useCompleteServiceRecord } from '@/hooks/queries/useServiceRecords'
import { useOrgMembers } from '@/hooks/queries/useActivities'
import { SERVICE_TYPE_LABELS, type ServiceRecord, type ServiceRecordStatus } from '@/lib/serviceRecords'

const STATUS_TABS: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'completed', label: 'Completed' },
]

const STATUS_CONFIG: Record<ServiceRecordStatus, { icon: typeof Clock; variant: 'accent' | 'warning' | 'success' | 'destructive'; label: string }> = {
    upcoming: { icon: Calendar, variant: 'accent', label: 'Upcoming' },
    in_progress: { icon: Clock, variant: 'warning', label: 'In Progress' },
    completed: { icon: Check, variant: 'success', label: 'Completed' },
    overdue: { icon: AlertCircle, variant: 'destructive', label: 'Overdue' },
}

function groupByTimeframe(records: ServiceRecord[]): Record<string, ServiceRecord[]> {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    const groups: Record<string, ServiceRecord[]> = {
        'Overdue': [],
        'Today': [],
        'This Week': [],
        'This Month': [],
        'Later': [],
        'Completed': [],
    }

    for (const r of records) {
        if (r.status === 'completed') {
            groups['Completed'].push(r)
            continue
        }
        const due = new Date(r.due_date + 'T00:00:00')
        if (due < today) {
            groups['Overdue'].push(r)
        } else if (due.getTime() === today.getTime()) {
            groups['Today'].push(r)
        } else if (due <= endOfWeek) {
            groups['This Week'].push(r)
        } else if (due <= endOfMonth) {
            groups['This Month'].push(r)
        } else {
            groups['Later'].push(r)
        }
    }

    return groups
}

export default function ServicePage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { setPortalNode } = usePageActions()
    const [orgId, setOrgId] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [assigneeFilter, setAssigneeFilter] = useState('')

    const { data: records = [], isLoading } = useServiceRecordsByOrg(
        orgId ?? undefined,
        {
            status: statusFilter === 'all' ? undefined : statusFilter,
            assigneeId: assigneeFilter || undefined,
        }
    )
    const { data: members = [] } = useOrgMembers(orgId ?? undefined)
    const completeMutation = useCompleteServiceRecord(orgId ?? '')

    // Fetch org
    useEffect(() => {
        if (!user) return
        supabase
            .from('memberships')
            .select('org_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1)
            .single()
            .then(({ data }) => {
                if (data) setOrgId(data.org_id)
            })
    }, [user])

    // Page actions
    useEffect(() => {
        setPortalNode(null)
        return () => setPortalNode(null)
    }, [setPortalNode])

    const handleComplete = useCallback(async (record: ServiceRecord) => {
        if (!user) return
        await completeMutation.mutateAsync({ id: record.id, actorId: user.id })
    }, [user, completeMutation])

    const groups = groupByTimeframe(records)

    return (
        <div className="min-h-screen bg-transparent">
            <div className="max-w-4xl mx-auto px-6 py-6">
                <div className="flex items-center gap-3 mb-6">
                    <RefreshCw size={20} className="text-accent" />
                    <h1 className="text-lg font-semibold text-foreground">Service Records</h1>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    {/* Status tabs */}
                    <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => setStatusFilter(tab.value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    statusFilter === tab.value
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Assignee filter */}
                    {members.length > 1 && (
                        <div className="flex items-center gap-1.5">
                            <Filter size={12} className="text-muted-foreground" />
                            <select
                                value={assigneeFilter}
                                onChange={e => setAssigneeFilter(e.target.value)}
                                className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">All members</option>
                                {members.map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={20} className="animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && records.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <RefreshCw size={24} className="text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground/60">No service records found</p>
                        <p className="text-xs text-muted-foreground/40">
                            Create service records from client detail pages
                        </p>
                    </div>
                )}

                {/* Grouped records */}
                {!isLoading && Object.entries(groups).map(([groupName, groupRecords]) => {
                    if (groupRecords.length === 0) return null
                    return (
                        <div key={groupName} className="mb-6">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                {groupName} ({groupRecords.length})
                            </h3>
                            <div className="flex flex-col gap-2">
                                {groupRecords.map(record => {
                                    const effectiveStatus = record.status !== 'completed' && record.status !== 'overdue'
                                        ? (new Date(record.due_date + 'T23:59:59') < new Date() ? 'overdue' : record.status)
                                        : record.status
                                    const config = STATUS_CONFIG[effectiveStatus as ServiceRecordStatus]
                                    const StatusIcon = config.icon
                                    const isCompleted = record.status === 'completed'

                                    return (
                                        <div
                                            key={record.id}
                                            className={`rounded-xl border bg-card p-4 flex items-start gap-3 group transition-colors hover:border-border ${
                                                isCompleted ? 'opacity-50 border-border/50' : effectiveStatus === 'overdue' ? 'border-red-200 dark:border-red-900/40' : 'border-border'
                                            }`}
                                        >
                                            {/* Complete button */}
                                            {!isCompleted ? (
                                                <button
                                                    onClick={() => handleComplete(record)}
                                                    disabled={completeMutation.isPending}
                                                    className="mt-0.5 w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center justify-center shrink-0"
                                                    title="Mark complete"
                                                >
                                                    <Check size={10} className="text-transparent group-hover:text-green-500" />
                                                </button>
                                            ) : (
                                                <div className="mt-0.5 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                                    <Check size={10} className="text-green-600 dark:text-green-400" />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-foreground/60' : 'text-foreground'}`}>
                                                            {record.title}
                                                        </p>
                                                        {/* Client name */}
                                                        {record.client && (
                                                            <button
                                                                onClick={() => navigate(`/app/clients/${record.client!.id}`)}
                                                                className="text-xs text-accent hover:underline mt-0.5"
                                                            >
                                                                {record.client.name}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <Badge variant={config.variant} className="text-[10px] shrink-0">
                                                        <StatusIcon size={10} className="mr-1" />
                                                        {config.label}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {SERVICE_TYPE_LABELS[record.type]}
                                                    </Badge>
                                                    <span className={effectiveStatus === 'overdue' && !isCompleted ? 'text-red-500 font-medium' : ''}>
                                                        Due {new Date(record.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    {record.assignee?.full_name && (
                                                        <span>&middot; {record.assignee.full_name}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
