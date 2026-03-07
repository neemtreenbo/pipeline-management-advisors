import { useState, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, ClipboardList, ChevronDown, ChevronRight, Upload, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useServiceRequests, useCreateServiceRequest, useUpdateServiceRequest } from '@/hooks/queries/useServiceRequests'
import { SERVICE_REQUEST_TYPES, SERVICE_REQUEST_STATUSES, SERVICE_REQUEST_PRIORITIES } from '@/lib/service-requests'
import type { ServiceRequest, NewServiceRequestInput, ServiceRequestStatus, ServiceRequestType, ServiceRequestPriority } from '@/lib/service-requests'
import { SERVICE_STATUS_COLORS, SERVICE_PRIORITY_COLORS, getAccentBg } from '@/lib/colors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import ClientSelector from '@/components/ui/ClientSelector'
import ServiceRequestDetailsModal from '@/components/servicing/ServiceRequestDetailsModal'

function getRequestTypeLabel(value: string) {
    return SERVICE_REQUEST_TYPES.find(t => t.value === value)?.label ?? value
}

function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function ServiceRequestRow({ sr, onStatusChange, isDark, onRowClick }: { sr: ServiceRequest; onStatusChange: (id: string, status: ServiceRequestStatus) => void; isDark: boolean; onRowClick: (id: string) => void }) {
    const [showStatusMenu, setShowStatusMenu] = useState(false)
    const statusBtnRef = useRef<HTMLButtonElement>(null)
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

    const statusColor = SERVICE_STATUS_COLORS[sr.status]
    const priorityColor = SERVICE_PRIORITY_COLORS[sr.priority]

    return (
        <div
            className="grid grid-cols-[1.5fr_1.5fr_1.2fr_1fr_0.8fr_1fr_1fr] px-5 py-3 items-center border-b border-border/40 hover:bg-muted/20 transition-colors group cursor-pointer"
            onClick={() => onRowClick(sr.id)}
        >
            {/* CLIENT */}
            <div className="flex items-center gap-2.5 min-w-0 pr-4">
                {sr.client?.profile_picture_url ? (
                    <img src={sr.client.profile_picture_url} alt={sr.client.name} className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-border/50" />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-border/50">
                        <span className="text-[10px] font-semibold text-accent/70">{getInitials(sr.client?.name || '')}</span>
                    </div>
                )}
                <span className="text-[13px] font-medium text-foreground truncate">{sr.client?.name}</span>
            </div>

            {/* TITLE */}
            <div className="pr-4 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                    <ClipboardList size={12} className="text-muted-foreground/40 shrink-0" />
                    <span className="text-[13px] text-foreground truncate">{sr.title}</span>
                </div>
            </div>

            {/* REQUEST TYPE */}
            <div className="pr-4">
                <span className="text-[12px] text-muted-foreground/70">{getRequestTypeLabel(sr.request_type)}</span>
            </div>

            {/* STATUS */}
            <div className="pr-4 flex justify-center" onClick={(e) => e.stopPropagation()}>
                <button
                    ref={statusBtnRef}
                    onClick={() => {
                        const rect = statusBtnRef.current?.getBoundingClientRect()
                        if (rect) setMenuPos({ top: rect.bottom + 4, left: rect.left })
                        setShowStatusMenu(!showStatusMenu)
                    }}
                    className="text-[10px] font-medium w-[110px] text-center py-1 rounded-full whitespace-nowrap text-white/90 transition-colors"
                    style={statusColor ? { backgroundColor: getAccentBg(statusColor, isDark) } : undefined}
                >
                    {sr.status}
                </button>
                {showStatusMenu && (
                    <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setShowStatusMenu(false)} />
                        <div
                            className="fixed z-[101] bg-popover border border-border rounded-xl shadow-lg py-1 w-[160px] animate-in fade-in-0 zoom-in-95 duration-100"
                            style={{ top: menuPos.top, left: menuPos.left }}
                        >
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

            {/* PRIORITY */}
            <div className="pr-4 flex justify-center">
                <span
                    className="text-[10px] font-medium w-[64px] text-center py-1 rounded-full capitalize whitespace-nowrap text-white/90"
                    style={priorityColor ? { backgroundColor: getAccentBg(priorityColor, isDark) } : undefined}
                >
                    {sr.priority}
                </span>
            </div>

            {/* UPLOAD DOCUMENT */}
            <div className="pr-4 flex justify-center" onClick={(e) => e.stopPropagation()}>
                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground/40 hover:text-accent">
                    <Upload size={14} />
                </button>
            </div>

            {/* ASSIGNED TO */}
            <div className="flex items-center gap-2 pr-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 ring-1 ring-border/50">
                    <User size={12} className="text-muted-foreground/40" />
                </div>
                <span className="text-[12px] text-muted-foreground/60 truncate">Unassigned</span>
            </div>
        </div>
    )
}

function NewServiceRequestModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
    const { user } = useAuth()
    const createMutation = useCreateServiceRequest(orgId)
    const [form, setForm] = useState({
        client_id: '',
        request_type: '' as ServiceRequestType | '',
        title: '',
        description: '',
        priority: 'medium' as ServiceRequestPriority,
    })
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!user) return
        if (!form.client_id) { setError('Please select a client.'); return }
        if (!form.request_type) { setError('Please select a request type.'); return }
        if (!form.title.trim()) { setError('Please enter a title.'); return }
        setError(null)

        const input: NewServiceRequestInput = {
            org_id: orgId,
            owner_id: user.id,
            client_id: form.client_id,
            request_type: form.request_type as ServiceRequestType,
            title: form.title.trim(),
            description: form.description || undefined,
            priority: form.priority,
        }

        try {
            await createMutation.mutateAsync(input)
            onClose()
        } catch (err) {
            setError((err as Error).message)
        }
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="bg-card rounded-2xl shadow-lg w-full max-w-xl flex flex-col overflow-hidden border border-border">
                    <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border/60">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[15px] font-semibold text-foreground">New Service Request</h2>
                            <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition-colors text-sm">Cancel</button>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Client *</span>
                            <ClientSelector orgId={orgId} value={form.client_id} onChange={(id) => setForm(f => ({ ...f, client_id: id }))} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Request Type *</span>
                            <select
                                value={form.request_type}
                                onChange={(e) => setForm(f => ({ ...f, request_type: e.target.value as ServiceRequestType }))}
                                className="h-9 rounded-xl bg-muted/30 border border-muted-foreground/10 text-sm px-3 text-foreground"
                            >
                                <option value="">Select type...</option>
                                {SERVICE_REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Title *</span>
                            <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="h-9 rounded-xl bg-muted/30 border-muted-foreground/10 shadow-none text-sm" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Description</span>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                rows={3}
                                className="rounded-xl bg-muted/30 border border-muted-foreground/10 text-sm px-3 py-2 text-foreground resize-none"
                                placeholder="Add notes or details..."
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Priority</span>
                            <select
                                value={form.priority}
                                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as ServiceRequestPriority }))}
                                className="h-9 rounded-xl bg-muted/30 border border-muted-foreground/10 text-sm px-3 text-foreground capitalize"
                            >
                                {SERVICE_REQUEST_PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                            </select>
                        </div>
                        {error && <p className="text-[12px] text-destructive">{error}</p>}
                        <div className="flex gap-2 pt-2 border-t border-border/40">
                            <Button type="button" variant="secondary" className="flex-1 h-9 rounded-xl shadow-none text-sm" onClick={onClose}>Cancel</Button>
                            <Button type="submit" className="flex-1 h-9 rounded-xl shadow-none text-sm font-medium" disabled={createMutation.isPending}>
                                {createMutation.isPending ? 'Creating...' : 'Create Request'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}

function StageSection({
    status,
    requests,
    isExpanded,
    onToggle,
    onStatusChange,
    isDark,
    onRowClick
}: {
    status: ServiceRequestStatus;
    requests: ServiceRequest[];
    isExpanded: boolean;
    onToggle: () => void;
    onStatusChange: (id: string, status: ServiceRequestStatus) => void;
    isDark: boolean;
    onRowClick: (id: string) => void;
}) {
    if (requests.length === 0) return null;

    const statusColor = SERVICE_STATUS_COLORS[status]

    return (
        <div className="mb-4">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors rounded-xl group"
            >
                <div className="p-1 rounded bg-muted/50 text-muted-foreground/60 transition-colors">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-foreground uppercase tracking-wider">{status}</span>
                    <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white/90"
                        style={statusColor ? { backgroundColor: getAccentBg(statusColor, isDark) } : undefined}
                    >
                        {requests.length}
                    </span>
                </div>
                <div className="flex-1 h-px bg-border/40 mx-2" />
            </button>
            {isExpanded && (
                <div className="mt-1 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                    {requests.map(sr => (
                        <ServiceRequestRow key={sr.id} sr={sr} onStatusChange={onStatusChange} isDark={isDark} onRowClick={onRowClick} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function ServicingPage() {
    const { user } = useAuth()
    const { orgId } = useOrg()
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const srIdFromSearch = searchParams.get('sr')
    const { data: serviceRequests = [], isLoading } = useServiceRequests(orgId ?? undefined)
    const updateMutation = useUpdateServiceRequest(orgId ?? '')
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
    const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({
        'Completed': true,
        'Rejected': true
    })

    const requestsByStage = useMemo(() => {
        let items = serviceRequests
        if (search.trim()) {
            const q = search.toLowerCase()
            items = items.filter(sr =>
                sr.title.toLowerCase().includes(q) ||
                sr.client?.name?.toLowerCase().includes(q) ||
                getRequestTypeLabel(sr.request_type).toLowerCase().includes(q)
            )
        }

        const grouped: Record<ServiceRequestStatus, ServiceRequest[]> = SERVICE_REQUEST_STATUSES.reduce(
            (acc, status) => ({ ...acc, [status]: [] }),
            {} as Record<ServiceRequestStatus, ServiceRequest[]>
        )

        items.forEach((sr) => {
            if (grouped[sr.status]) {
                grouped[sr.status].push(sr)
            }
        })
        return grouped
    }, [serviceRequests, search])

    const totalVisibleCount = useMemo(() =>
        Object.values(requestsByStage).reduce((sum, list) => sum + list.length, 0),
        [requestsByStage]
    )

    function handleStatusChange(id: string, status: ServiceRequestStatus) {
        updateMutation.mutate({ id, updates: { status } })
    }

    const toggleStage = (status: string) => {
        setCollapsedStages(prev => ({
            ...prev,
            [status]: !prev[status]
        }))
    }

    if (!user || !orgId) return null

    return (
        <div className="min-h-screen bg-transparent">
            <div className="max-w-5xl mx-auto px-6 pb-8">

                <div
                    className="sticky top-0 z-20 pt-6 pb-5"
                    style={{
                        background: `radial-gradient(circle at top left, rgba(59,130,246,0.04), transparent 50%), radial-gradient(circle at bottom right, rgba(147,51,234,0.04), transparent 50%), hsl(var(--background))`,
                        backgroundAttachment: 'fixed',
                    }}
                >
                    <div className="flex items-center justify-between h-8">
                        <h1 className="text-lg font-semibold text-foreground leading-none flex items-center gap-2">
                            Servicing
                            {!isLoading && serviceRequests.length > 0 && (
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-normal bg-muted text-muted-foreground">
                                    {search.trim() ? `${totalVisibleCount} / ${serviceRequests.length}` : serviceRequests.length}
                                </span>
                            )}
                        </h1>
                        <Button onClick={() => setShowModal(true)} className="h-8 text-xs rounded-full px-3 font-medium">
                            <Plus size={14} className="mr-1.5" /> New Request
                        </Button>
                    </div>

                    {!isLoading && serviceRequests.length > 0 && (
                        <div className="mt-5">
                            <div className="relative max-w-sm">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                                <Input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search requests..."
                                    className="h-8 pl-8 text-sm rounded-lg"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="space-y-2">
                                <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
                                {[1, 2].map(j => (
                                    <div key={j} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ))}
                    </div>
                ) : totalVisibleCount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <ClipboardList size={24} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-1">No service requests found</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                            {serviceRequests.length === 0 ? "Track and manage client service requests." : "No results match your search."}
                        </p>
                        {serviceRequests.length === 0 ? (
                            <Button onClick={() => setShowModal(true)} variant="secondary">
                                <Plus size={16} />
                                Create a request
                            </Button>
                        ) : (
                            <button
                                onClick={() => setSearch('')}
                                className="text-[13px] text-accent hover:text-accent/80 transition-colors"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <Card className="border-none shadow-none bg-transparent">
                        {/* Table Header */}
                        <div className="grid grid-cols-[1.5fr_1.5fr_1.2fr_1fr_0.8fr_1fr_1fr] px-5 py-2.5 border-b border-border/60 mb-2">
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider">Client</div>
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider">Title</div>
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider">Type</div>
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider text-center">Status</div>
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider text-center">Priority</div>
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider text-center">Docs</div>
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider">Assigned</div>
                        </div>

                        {/* Grouped Stages */}
                        {SERVICE_REQUEST_STATUSES.map(status => (
                            <StageSection
                                key={status}
                                status={status}
                                requests={requestsByStage[status]}
                                isExpanded={!collapsedStages[status]}
                                onToggle={() => toggleStage(status)}
                                onStatusChange={handleStatusChange}
                                isDark={isDark}
                                onRowClick={(id) => setSelectedRequestId(id)}
                            />
                        ))}
                    </Card>
                )}

                {showModal && <NewServiceRequestModal orgId={orgId} onClose={() => setShowModal(false)} />}
                {selectedRequestId && (
                    <ServiceRequestDetailsModal
                        serviceRequestId={selectedRequestId}
                        onClose={() => setSelectedRequestId(null)}
                        onStatusChange={handleStatusChange}
                        onDeleted={() => setSelectedRequestId(null)}
                    />
                )}
                {srIdFromSearch && !selectedRequestId && (
                    <ServiceRequestDetailsModal
                        serviceRequestId={srIdFromSearch}
                        onClose={() => navigate('/app/servicing', { replace: true })}
                        onStatusChange={handleStatusChange}
                        onDeleted={() => navigate('/app/servicing', { replace: true })}
                    />
                )}
            </div>
        </div>
    )
}
