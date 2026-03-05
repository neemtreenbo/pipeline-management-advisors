import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Check, Mail, Phone, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { usePageActions } from '@/contexts/PageActionsContext'
import { Button } from '@/components/ui/button'

type SortField = 'name' | 'source' | 'email' | 'phone'

interface Client {
    id: string
    name: string
    email: string | null
    phone: string | null
    source: string | null
    tags: string[]
    created_at: string
    owner_id: string
    org_id: string
    profile_picture_url?: string | null
}

type InlineEdit = {
    id: string
    field: 'name' | 'email' | 'phone' | 'source'
    value: string
}

const SOURCE_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'referral', label: 'Referral' },
    { value: 'walk_in', label: 'Walk-in' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'cold_call', label: 'Cold Call' },
    { value: 'event', label: 'Event' },
    { value: 'other', label: 'Other' },
]

const SOURCE_COLORS: Record<string, string> = {
    referral: 'bg-muted text-muted-foreground border-border',
    walk_in: 'bg-muted text-muted-foreground border-border',
    social_media: 'bg-muted text-muted-foreground border-border',
    cold_call: 'bg-muted text-muted-foreground border-border',
    event: 'bg-muted text-muted-foreground border-border',
    other: 'bg-muted text-muted-foreground border-border',
}

function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatSource(src: string | null) {
    if (!src) return null
    return src.replace(/_/g, ' ')
}

export default function ClientsPage() {
    const { user } = useAuth()
    const { orgId } = useOrg()
    const navigate = useNavigate()
    const { setPortalNode } = usePageActions()

    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)

    // Inline edit state (existing rows)
    const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null)
    const [inlineSaving, setInlineSaving] = useState(false)
    const inlineInputRef = useRef<HTMLInputElement>(null)

    // New inline row state
    const [addingNew, setAddingNew] = useState(false)
    const [newRow, setNewRow] = useState({ name: '', email: '', phone: '', source: '' })
    const [newRowSaving, setNewRowSaving] = useState(false)
    const newNameRef = useRef<HTMLInputElement>(null)

    // Sort state
    const [sortField, setSortField] = useState<SortField>('name')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

    const fetchClients = useCallback(async () => {
        if (!orgId) return
        setLoading(true)
        const { data } = await supabase
            .from('clients')
            .select('*')
            .eq('org_id', orgId)
            .order('name', { ascending: true })
        setClients(data ?? [])
        setLoading(false)
    }, [orgId])

    useEffect(() => {
        fetchClients()
    }, [fetchClients])

    // Focus name field when new row opens
    useEffect(() => {
        if (addingNew) {
            setTimeout(() => newNameRef.current?.focus(), 30)
        }
    }, [addingNew])

    function startAddingNew() {
        setNewRow({ name: '', email: '', phone: '', source: '' })
        setAddingNew(true)
    }

    function cancelAddingNew() {
        setAddingNew(false)
        setNewRow({ name: '', email: '', phone: '', source: '' })
    }

    async function saveNewRow() {
        if (!orgId || !user || !newRow.name.trim() || newRowSaving) return
        setNewRowSaving(true)

        const { error } = await supabase.from('clients').insert({
            org_id: orgId,
            owner_id: user.id,
            name: newRow.name.trim(),
            email: newRow.email.trim() || null,
            phone: newRow.phone.trim() || null,
            source: newRow.source || null,
            tags: [],
        })

        if (!error) {
            setAddingNew(false)
            setNewRow({ name: '', email: '', phone: '', source: '' })
            fetchClients()
        }
        setNewRowSaving(false)
    }

    // Inject the Search and "Add" button into the Island navigation
    useEffect(() => {
        setPortalNode(
            <Button onClick={startAddingNew} id="nav-add-client-btn" className="h-8 text-xs sm:text-xs rounded-full shadow-sm px-3 font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={14} className="sm:mr-1.5" />
                <span className="hidden sm:inline">Add</span>
            </Button>
        )
        return () => setPortalNode(null)
    }, [setPortalNode])

    useEffect(() => {
        if (inlineEdit) {
            setTimeout(() => inlineInputRef.current?.focus(), 30)
        }
    }, [inlineEdit])

    async function saveInlineEdit() {
        if (!inlineEdit || inlineSaving) return
        setInlineSaving(true)

        const { id, field, value } = inlineEdit
        const patch: Record<string, string | null> = { [field]: value.trim() || null }
        if (field === 'name' && !value.trim()) {
            setInlineEdit(null)
            setInlineSaving(false)
            return
        }

        const { error } = await supabase.from('clients').update(patch).eq('id', id)
        if (!error) {
            setClients(prev => prev.map(c =>
                c.id === id ? { ...c, [field]: value.trim() || null } : c
            ))
        }
        setInlineEdit(null)
        setInlineSaving(false)
    }

    function startEdit(client: Client, field: InlineEdit['field']) {
        setInlineEdit({
            id: client.id,
            field,
            value: (client[field] as string) ?? '',
        })
    }

    const filtered = clients

    const sorted = [...filtered].sort((a, b) => {
        const valA = (a[sortField] || '').toLowerCase()
        const valB = (b[sortField] || '').toLowerCase()

        if (valA < valB) return sortDir === 'asc' ? -1 : 1
        if (valA > valB) return sortDir === 'asc' ? 1 : -1
        return 0
    })

    function InlineCell({ client, field, display, placeholder }: {
        client: Client
        field: InlineEdit['field']
        display: React.ReactNode
        placeholder: string
    }) {
        const isEditing = inlineEdit?.id === client.id && inlineEdit?.field === field

        if (field === 'source') {
            return (
                <div className="relative group/cell">
                    {isEditing ? (
                        <select
                            autoFocus
                            value={inlineEdit?.value ?? ''}
                            onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : prev)}
                            onBlur={saveInlineEdit}
                            onKeyDown={e => { if (e.key === 'Escape') setInlineEdit(null) }}
                            className="w-full text-sm bg-background border border-border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all"
                        >
                            {SOURCE_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    ) : (
                        <div
                            className="cursor-pointer rounded-md px-2 py-1 -mx-2 hover:bg-muted/50 transition-colors group/cell min-h-[28px] flex items-center"
                            onClick={() => startEdit(client, field)}
                        >
                            {display || <span className="text-muted-foreground/40 text-xs">{placeholder}</span>}
                        </div>
                    )}
                </div>
            )
        }

        return (
            <div className="relative group/cell">
                {isEditing ? (
                    <input
                        ref={inlineInputRef}
                        value={inlineEdit?.value ?? ''}
                        onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : prev)}
                        onBlur={saveInlineEdit}
                        onKeyDown={e => {
                            if (e.key === 'Enter') saveInlineEdit()
                            if (e.key === 'Escape') setInlineEdit(null)
                        }}
                        placeholder={placeholder}
                        className="w-full text-sm bg-background border border-border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all"
                    />
                ) : (
                    <div
                        className="cursor-text rounded-md px-2 py-1 -mx-2 hover:bg-muted/50 transition-colors min-h-[28px] flex items-center"
                        onClick={() => startEdit(client, field)}
                    >
                        {display || <span className="text-muted-foreground/30 text-xs">{placeholder}</span>}
                    </div>
                )}
            </div>
        )
    }

    const showTable = !loading && (sorted.length > 0 || addingNew)

    return (
        <div className="min-h-screen bg-transparent pt-4">
            <div className="max-w-5xl mx-auto px-6 pb-8">
                {loading ? (
                    <div className="flex flex-col gap-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-12 rounded-xl bg-muted/50 animate-pulse" />
                        ))}
                    </div>
                ) : !showTable ? (
                    <div className="flex flex-col items-center justify-center py-28 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Plus size={20} className="text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">No clients yet</p>
                        <p className="text-sm text-muted-foreground mb-6">Click "Add" to get started.</p>
                        <Button onClick={startAddingNew} className="rounded-xl shadow-none">
                            <Plus size={15} /> Add your first client
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col">
                        {/* Table header */}
                        <div className="grid grid-cols-[2.8fr_1.2fr_1.5fr_1.5fr] gap-0 border-b border-border bg-muted/95 backdrop-blur-sm px-5 py-2.5 sticky top-0 z-10 rounded-t-2xl">
                            {[
                                { field: 'name', label: 'Name' },
                                { field: 'source', label: 'Source' },
                                { field: 'email', label: 'Email' },
                                { field: 'phone', label: 'Phone' },
                            ].map(({ field, label }) => {
                                const isActive = sortField === field;
                                return (
                                    <button
                                        key={field}
                                        onClick={() => {
                                            if (isActive) {
                                                setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                                            } else {
                                                setSortField(field as SortField)
                                                setSortDir('asc')
                                            }
                                        }}
                                        className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors text-left w-fit"
                                    >
                                        {label}
                                        {isActive ? (
                                            sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : (
                                            <ArrowUpDown size={12} className="opacity-50" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex flex-col">
                            {/* New inline row */}
                            {addingNew && (
                                <div className="grid grid-cols-[2.8fr_1.2fr_1.5fr_1.5fr] gap-0 px-5 py-2.5 items-center border-b border-border bg-muted/30">
                                    {/* Name */}
                                    <div className="pr-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                                            <span className="text-[11px] font-medium text-muted-foreground/50">—</span>
                                        </div>
                                        <input
                                            ref={newNameRef}
                                            value={newRow.name}
                                            onChange={e => setNewRow(r => ({ ...r, name: e.target.value }))}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newRow.name.trim()) saveNewRow()
                                                if (e.key === 'Escape') cancelAddingNew()
                                                if (e.key === 'Tab') { e.preventDefault(); document.getElementById('new-source')?.focus() }
                                            }}
                                            placeholder="Full name"
                                            className="flex-1 text-sm bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all min-w-0 placeholder:text-muted-foreground/40"
                                        />
                                    </div>

                                    {/* Source */}
                                    <div className="pr-4">
                                        <select
                                            id="new-source"
                                            value={newRow.source}
                                            onChange={e => setNewRow(r => ({ ...r, source: e.target.value }))}
                                            onKeyDown={e => {
                                                if (e.key === 'Escape') cancelAddingNew()
                                                if (e.key === 'Tab') { e.preventDefault(); document.getElementById('new-email')?.focus() }
                                            }}
                                            className="w-full text-sm bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all text-muted-foreground"
                                        >
                                            {SOURCE_OPTIONS.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Email */}
                                    <div className="pr-4">
                                        <input
                                            id="new-email"
                                            type="email"
                                            value={newRow.email}
                                            onChange={e => setNewRow(r => ({ ...r, email: e.target.value }))}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newRow.name.trim()) saveNewRow()
                                                if (e.key === 'Escape') cancelAddingNew()
                                                if (e.key === 'Tab') { e.preventDefault(); document.getElementById('new-phone')?.focus() }
                                            }}
                                            placeholder="Email"
                                            className="w-full text-sm bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all placeholder:text-muted-foreground/40"
                                        />
                                    </div>

                                    {/* Phone + actions */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            id="new-phone"
                                            value={newRow.phone}
                                            onChange={e => setNewRow(r => ({ ...r, phone: e.target.value }))}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newRow.name.trim()) saveNewRow()
                                                if (e.key === 'Escape') cancelAddingNew()
                                            }}
                                            placeholder="Phone"
                                            className="flex-1 text-sm bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all min-w-0 placeholder:text-muted-foreground/40"
                                        />
                                        <button
                                            onClick={saveNewRow}
                                            disabled={!newRow.name.trim() || newRowSaving}
                                            className="shrink-0 w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Check size={13} strokeWidth={2.5} />
                                        </button>
                                        <button
                                            onClick={cancelAddingNew}
                                            className="shrink-0 w-7 h-7 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center hover:bg-muted/70 transition-colors"
                                        >
                                            <X size={13} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {sorted.map((client, idx) => (
                                <div
                                    key={client.id}
                                    className={`grid grid-cols-[2.8fr_1.2fr_1.5fr_1.5fr] gap-0 px-5 py-3 items-center ${idx < sorted.length - 1 ? 'border-b border-border/50' : ''} hover:bg-muted/40 hover:-translate-y-1 hover:shadow-md hover:scale-[1.005] hover:z-10 relative transition-all duration-150 group`}
                                >
                                    {/* Name */}
                                    <div
                                        className="min-w-0 pr-4 flex items-center gap-3 cursor-pointer"
                                        onClick={() => navigate(`/app/clients/${client.id}`)}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                                            {client.profile_picture_url ? (
                                                <img src={client.profile_picture_url} alt={client.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold text-primary">{getInitials(client.name)}</span>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-foreground truncate">{client.name}</span>
                                    </div>

                                    {/* Source */}
                                    <div className="pr-4">
                                        <InlineCell
                                            client={client}
                                            field="source"
                                            display={
                                                client.source ? (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${SOURCE_COLORS[client.source] ?? 'bg-muted text-muted-foreground border-border'}`}>
                                                        {formatSource(client.source)}
                                                    </span>
                                                ) : null
                                            }
                                            placeholder="Add source"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="pr-4 min-w-0">
                                        <InlineCell
                                            client={client}
                                            field="email"
                                            display={
                                                client.email ? (
                                                    <span className="flex items-center gap-1.5 text-sm text-foreground truncate">
                                                        <Mail size={12} className="text-muted-foreground shrink-0" />
                                                        <span className="truncate">{client.email}</span>
                                                    </span>
                                                ) : null
                                            }
                                            placeholder="Add email"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div className="pr-4">
                                        <InlineCell
                                            client={client}
                                            field="phone"
                                            display={
                                                client.phone ? (
                                                    <span className="flex items-center gap-1.5 text-sm text-foreground">
                                                        <Phone size={12} className="text-muted-foreground shrink-0" />
                                                        {client.phone}
                                                    </span>
                                                ) : null
                                            }
                                            placeholder="Add phone"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
