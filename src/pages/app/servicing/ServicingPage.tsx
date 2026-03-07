import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, ClipboardList, ChevronDown, ChevronRight, Upload, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useServiceRequests, useCreateServiceRequest, useUpdateServiceRequest } from '@/hooks/queries/useServiceRequests'
import { SERVICE_REQUEST_TYPES, SERVICE_REQUEST_STATUSES, SERVICE_REQUEST_PRIORITIES, getRequestTypeLabel, logServiceRequestActivity } from '@/lib/service-requests'
import type { ServiceRequest, NewServiceRequestInput, ServiceRequestStatus, ServiceRequestType } from '@/lib/service-requests'
import { searchClients as searchClientsApi, fetchClientPolicies, createClient } from '@/lib/clients'
import type { ClientSummary, ClientPolicy } from '@/lib/clients'
import { SERVICE_STATUS_COLORS, SERVICE_PRIORITY_COLORS, getAccentBg } from '@/lib/colors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import ServiceRequestDetailsModal from '@/components/servicing/ServiceRequestDetailsModal'

function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const ServiceRequestRow = memo(function ServiceRequestRow({ sr, onStatusChange, onUpdate, isDark, onRowClick }: {
    sr: ServiceRequest
    onStatusChange: (id: string, status: ServiceRequestStatus, oldStatus?: ServiceRequestStatus) => void
    onUpdate: (id: string, updates: Partial<Pick<ServiceRequest, 'title' | 'priority' | 'request_type'>>) => void
    isDark: boolean
    onRowClick: (id: string) => void
}) {
    const [showStatusMenu, setShowStatusMenu] = useState(false)
    const [showPriorityMenu, setShowPriorityMenu] = useState(false)
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState(sr.title)
    const statusBtnRef = useRef<HTMLButtonElement>(null)
    const priorityBtnRef = useRef<HTMLButtonElement>(null)
    const titleInputRef = useRef<HTMLInputElement>(null)
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
    const [priorityMenuPos, setPriorityMenuPos] = useState({ top: 0, left: 0 })

    const statusColor = SERVICE_STATUS_COLORS[sr.status]
    const priorityColor = SERVICE_PRIORITY_COLORS[sr.priority]

    const commitTitle = () => {
        const trimmed = titleDraft.trim()
        if (trimmed && trimmed !== sr.title) {
            onUpdate(sr.id, { title: trimmed })
        } else {
            setTitleDraft(sr.title)
        }
        setEditingTitle(false)
    }

    return (
        <div
            className="grid grid-cols-[1.5fr_1.5fr_1.2fr_1fr_0.8fr_1fr] px-5 py-3 items-center border-b border-border/40 hover:bg-muted/20 transition-colors group cursor-pointer"
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

            {/* TITLE — inline editable */}
            <div className="pr-4 min-w-0" onClick={(e) => e.stopPropagation()}>
                {editingTitle ? (
                    <input
                        ref={titleInputRef}
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitTitle() }
                            if (e.key === 'Escape') { setTitleDraft(sr.title); setEditingTitle(false) }
                        }}
                        autoFocus
                        className="text-[13px] text-foreground bg-transparent border-b border-accent/40 outline-none w-full py-0.5"
                    />
                ) : (
                    <div
                        className="flex items-center gap-1.5 min-w-0 cursor-text"
                        onClick={() => { setEditingTitle(true); setTitleDraft(sr.title) }}
                    >
                        <ClipboardList size={12} className="text-muted-foreground/40 shrink-0" />
                        <span className="text-[13px] text-foreground truncate hover:text-accent/80 transition-colors">{sr.title}</span>
                    </div>
                )}
            </div>

            {/* POLICY # */}
            <div className="pr-4">
                <span className="text-[12px] text-muted-foreground/70">{sr.policy?.policy_number ?? '—'}</span>
            </div>

            {/* STATUS — inline editable (existing) */}
            <div className="pr-4 flex justify-center" onClick={(e) => e.stopPropagation()}>
                <button
                    ref={statusBtnRef}
                    onClick={() => {
                        const rect = statusBtnRef.current?.getBoundingClientRect()
                        if (rect) setMenuPos({ top: rect.bottom + 4, left: rect.left })
                        setShowStatusMenu(!showStatusMenu)
                    }}
                    className="text-[10px] font-medium w-[110px] text-center py-1 rounded-full whitespace-nowrap text-white/90 transition-colors hover:opacity-80"
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
                                    onClick={() => { onStatusChange(sr.id, s, sr.status); setShowStatusMenu(false) }}
                                    className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-muted/50 transition-colors ${sr.status === s ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* PRIORITY — inline editable */}
            <div className="pr-4 flex justify-center" onClick={(e) => e.stopPropagation()}>
                <button
                    ref={priorityBtnRef}
                    onClick={() => {
                        const rect = priorityBtnRef.current?.getBoundingClientRect()
                        if (rect) setPriorityMenuPos({ top: rect.bottom + 4, left: rect.left })
                        setShowPriorityMenu(!showPriorityMenu)
                    }}
                    className="text-[10px] font-medium w-[64px] text-center py-1 rounded-full capitalize whitespace-nowrap text-white/90 transition-colors hover:opacity-80"
                    style={priorityColor ? { backgroundColor: getAccentBg(priorityColor, isDark) } : undefined}
                >
                    {sr.priority}
                </button>
                {showPriorityMenu && (
                    <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setShowPriorityMenu(false)} />
                        <div
                            className="fixed z-[101] bg-popover border border-border rounded-xl shadow-lg py-1 w-[120px] animate-in fade-in-0 zoom-in-95 duration-100"
                            style={{ top: priorityMenuPos.top, left: priorityMenuPos.left }}
                        >
                            {SERVICE_REQUEST_PRIORITIES.map(p => (
                                <button
                                    key={p}
                                    onClick={() => { onUpdate(sr.id, { priority: p }); setShowPriorityMenu(false) }}
                                    className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-muted/50 transition-colors capitalize ${sr.priority === p ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* DOCS — opens detail modal */}
            <div className="pr-4 flex justify-center" onClick={(e) => { e.stopPropagation(); onRowClick(sr.id) }}>
                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground/40 hover:text-accent">
                    <Upload size={14} />
                </button>
            </div>

        </div>
    )
})

function InlineAddServiceRequest({ orgId, onCreated, onCancel }: {
    orgId: string
    onCreated: (input: NewServiceRequestInput) => void
    onCancel: () => void
}) {
    const { user } = useAuth()
    const [step, setStep] = useState<'client' | 'details'>('client')
    const [clientSearch, setClientSearch] = useState('')
    const [filteredClients, setFilteredClients] = useState<ClientSummary[]>([])
    const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null)
    const [requestType, setRequestType] = useState<ServiceRequestType | ''>('')
    const [title, setTitle] = useState('')
    const [saving, setSaving] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [clientPolicies, setClientPolicies] = useState<ClientPolicy[]>([])
    const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null)
    const clientInputRef = useRef<HTMLInputElement>(null)
    const titleInputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Server-side client search with debounce
    const doSearchClients = useCallback((query: string) => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
        searchTimerRef.current = setTimeout(async () => {
            try {
                const data = await searchClientsApi(orgId, query)
                setFilteredClients(data)
            } catch {
                // silently ignore search errors
            }
        }, 200)
    }, [orgId])

    // Initial load + cleanup
    useEffect(() => {
        doSearchClients('')
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
    }, [doSearchClients])

    // Auto-focus
    useEffect(() => { clientInputRef.current?.focus() }, [])
    useEffect(() => { if (step === 'details') titleInputRef.current?.focus() }, [step])

    const exactMatchExists = useMemo(
        () => filteredClients.some(c => c.name.toLowerCase() === clientSearch.trim().toLowerCase()),
        [filteredClients, clientSearch]
    )

    const handleSelectClient = useCallback(async (client: ClientSummary) => {
        setSelectedClient(client)
        setClientSearch(client.name)
        setShowDropdown(false)
        setStep('details')
        try {
            const policies = await fetchClientPolicies(orgId, client.id)
            setClientPolicies(policies)
        } catch {
            setClientPolicies([])
        }
        setSelectedPolicyId(null)
    }, [orgId])

    async function handleCreateClient() {
        if (!user || !clientSearch.trim()) return
        try {
            const data = await createClient(orgId, user.id, clientSearch.trim())
            setFilteredClients(prev => [...prev, data])
            handleSelectClient(data)
        } catch {
            // silently ignore create errors
        }
    }

    const handleSubmit = useCallback(async () => {
        if (!user || !selectedClient || saving) return
        setSaving(true)
        const type: ServiceRequestType = requestType || 'INQUIRY'
        onCreated({
            org_id: orgId,
            owner_id: user.id,
            client_id: selectedClient.id,
            policy_id: selectedPolicyId,
            request_type: type,
            title: title.trim() || getRequestTypeLabel(type),
            priority: 'medium',
        })
    }, [user, selectedClient, requestType, selectedPolicyId, saving, orgId, title, onCreated])

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onCancel()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onCancel])

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mb-4"
        >
            <div className="bg-card border border-border/80 dark:border-border/60 rounded-xl px-4 py-3 shadow-sm max-w-md">
                <AnimatePresence mode="wait">
                    {step === 'client' ? (
                        <motion.div key="client" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                            <div className="relative">
                                <Input
                                    ref={clientInputRef}
                                    placeholder="Search or create client..."
                                    value={clientSearch}
                                    onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); doSearchClients(e.target.value) }}
                                    onFocus={() => setShowDropdown(true)}
                                    onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}
                                    className="h-9 text-sm rounded-lg bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-background shadow-none"
                                />
                                <button
                                    onClick={onCancel}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                            {showDropdown && (
                                <div className="mt-1.5 border border-border rounded-lg overflow-hidden max-h-56 overflow-y-auto bg-popover shadow-md">
                                    {filteredClients.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2"
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => handleSelectClient(c)}
                                        >
                                            {c.profile_picture_url ? (
                                                <img src={c.profile_picture_url} alt={c.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                                    <span className="text-[9px] font-semibold text-accent/70">{getInitials(c.name)}</span>
                                                </div>
                                            )}
                                            <span className="text-sm text-foreground truncate">{c.name}</span>
                                        </button>
                                    ))}
                                    {filteredClients.length === 0 && !clientSearch.trim() && (
                                        <div className="px-3 py-2.5 text-xs text-muted-foreground text-center">No clients yet</div>
                                    )}
                                    {!exactMatchExists && clientSearch.trim() && (
                                        <button
                                            type="button"
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={handleCreateClient}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors border-t border-border"
                                        >
                                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0">+</span>
                                            <span className="truncate">Create &ldquo;{clientSearch.trim()}&rdquo;</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="flex flex-col gap-2.5">
                            {/* Selected client chip */}
                            <div className="flex items-center gap-2">
                                {selectedClient?.profile_picture_url ? (
                                    <img src={selectedClient.profile_picture_url} alt={selectedClient.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                        <span className="text-[9px] font-semibold text-accent/70">{getInitials(selectedClient?.name ?? '')}</span>
                                    </div>
                                )}
                                <span className="text-xs text-muted-foreground truncate flex-1">{selectedClient?.name}</span>
                                <button
                                    onClick={() => { setStep('client'); setSelectedClient(null); setClientSearch(''); setClientPolicies([]); setSelectedPolicyId(null) }}
                                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                >
                                    <X size={11} />
                                </button>
                            </div>

                            {/* Policy picker */}
                            {clientPolicies.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {clientPolicies.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedPolicyId(selectedPolicyId === p.id ? null : p.id)
                                                titleInputRef.current?.focus()
                                            }}
                                            className={`px-2 py-1 text-[11px] rounded-md border transition-colors truncate ${
                                                selectedPolicyId === p.id
                                                    ? 'bg-accent text-white font-medium border-accent'
                                                    : 'bg-background text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
                                            }`}
                                        >
                                            {p.policy_number ?? 'No #'}{p.product ? ` · ${p.product}` : ''}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-muted-foreground/50">No policies found for this client</p>
                            )}

                            {/* Request type + Title input + submit */}
                            <div className="flex items-center gap-1.5">
                                <select
                                    value={requestType}
                                    onChange={e => setRequestType(e.target.value as ServiceRequestType)}
                                    className="h-7 text-[11px] rounded-lg bg-muted/30 border border-muted-foreground/10 text-muted-foreground px-1.5 outline-none focus:border-accent/40 shrink-0"
                                >
                                    <option value="">Type</option>
                                    {SERVICE_REQUEST_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <Input
                                    ref={titleInputRef}
                                    placeholder="Title... (Enter to create)"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
                                        if (e.key === 'Escape') onCancel()
                                    }}
                                    className="h-7 text-sm rounded-lg bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-background shadow-none flex-1"
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="px-2.5 py-1 text-[11px] font-medium text-white bg-accent rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 shrink-0"
                                >
                                    {saving ? '...' : 'Add'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}

const StageSection = memo(function StageSection({
    status,
    requests,
    isExpanded,
    onToggle,
    onStatusChange,
    onUpdate,
    isDark,
    onRowClick
}: {
    status: ServiceRequestStatus;
    requests: ServiceRequest[];
    isExpanded: boolean;
    onToggle: () => void;
    onStatusChange: (id: string, status: ServiceRequestStatus, oldStatus?: ServiceRequestStatus) => void;
    onUpdate: (id: string, updates: Partial<Pick<ServiceRequest, 'title' | 'priority' | 'request_type'>>) => void;
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
                        <ServiceRequestRow key={sr.id} sr={sr} onStatusChange={onStatusChange} onUpdate={onUpdate} isDark={isDark} onRowClick={onRowClick} />
                    ))}
                </div>
            )}
        </div>
    )
})

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
    const createMutation = useCreateServiceRequest(orgId ?? '')
    const [search, setSearch] = useState('')
    const [showInlineAdd, setShowInlineAdd] = useState(false)
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

    const handleStatusChange = useCallback((id: string, status: ServiceRequestStatus, oldStatus?: ServiceRequestStatus) => {
        updateMutation.mutate({ id, updates: { status } })
        if (oldStatus && oldStatus !== status && user) {
            logServiceRequestActivity(orgId!, user.id, id, 'status_changed', {
                from: oldStatus,
                to: status,
            })
        }
    }, [updateMutation, user, orgId])

    const handleInlineUpdate = useCallback((id: string, updates: Partial<Pick<ServiceRequest, 'title' | 'priority' | 'request_type'>>) => {
        updateMutation.mutate({ id, updates })
    }, [updateMutation])

    const toggleStage = useCallback((status: string) => {
        setCollapsedStages(prev => ({
            ...prev,
            [status]: !prev[status]
        }))
    }, [])

    const handleRowClick = useCallback((id: string) => {
        setSelectedRequestId(id)
    }, [])

    const handleInlineAddCreated = useCallback(async (input: NewServiceRequestInput) => {
        await createMutation.mutateAsync(input)
        setShowInlineAdd(false)
    }, [createMutation])

    const handleInlineAddCancel = useCallback(() => {
        setShowInlineAdd(false)
    }, [])

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
                        <Button onClick={() => setShowInlineAdd(true)} className="h-8 text-xs rounded-full px-3 font-medium">
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
                            <Button onClick={() => setShowInlineAdd(true)} variant="secondary">
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
                    <div>
                        <AnimatePresence>
                            {showInlineAdd && (
                                <InlineAddServiceRequest
                                    orgId={orgId!}
                                    onCreated={handleInlineAddCreated}
                                    onCancel={handleInlineAddCancel}
                                />
                            )}
                        </AnimatePresence>
                    <Card className="border-none shadow-none bg-transparent">
                        {/* Table Header */}
                        <div className="grid grid-cols-[1.5fr_1.5fr_1.2fr_1fr_0.8fr_1fr] px-5 py-2.5 border-b border-border/60 mb-2">
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider">Client</div>
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider">Title</div>
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider">Policy #</div>
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider text-center">Status</div>
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider text-center">Priority</div>
                            <div className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider text-center">Docs</div>
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
                                onUpdate={handleInlineUpdate}
                                isDark={isDark}
                                onRowClick={handleRowClick}
                            />
                        ))}
                    </Card>
                    </div>
                )}
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
