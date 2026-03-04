import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, Check, Mail, Phone, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    referral: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    walk_in: 'bg-blue-100 text-blue-700 border-blue-200',
    social_media: 'bg-purple-100 text-purple-700 border-purple-200',
    cold_call: 'bg-orange-100 text-orange-700 border-orange-200',
    event: 'bg-pink-100 text-pink-700 border-pink-200',
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
    const navigate = useNavigate()

    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [orgId, setOrgId] = useState<string | null>(null)

    // Inline edit state
    const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null)
    const [inlineSaving, setInlineSaving] = useState(false)
    const inlineInputRef = useRef<HTMLInputElement>(null)

    // Add client form
    const [form, setForm] = useState({ name: '', email: '', phone: '', source: '', tags: '' })
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    // Sort state
    const [sortField, setSortField] = useState<SortField>('name')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

    const fetchOrgAndClients = useCallback(async () => {
        setLoading(true)
        const { data: membership } = await supabase
            .from('memberships')
            .select('org_id')
            .eq('user_id', user!.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()

        if (!membership) { setLoading(false); return }
        setOrgId(membership.org_id)

        const { data } = await supabase
            .from('clients')
            .select('*')
            .eq('org_id', membership.org_id)
            .order('name', { ascending: true })

        setClients(data ?? [])
        setLoading(false)
    }, [user])

    useEffect(() => {
        if (!user) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchOrgAndClients()
    }, [user, fetchOrgAndClients])

    useEffect(() => {
        if (inlineEdit) {
            setTimeout(() => inlineInputRef.current?.focus(), 30)
        }
    }, [inlineEdit])

    async function handleAddClient(e: React.FormEvent) {
        e.preventDefault()
        if (!orgId || !user) return
        if (!form.name.trim()) { setFormError('Name is required.'); return }

        setSaving(true)
        setFormError(null)

        const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean)

        const { error } = await supabase.from('clients').insert({
            org_id: orgId,
            owner_id: user.id,
            name: form.name.trim(),
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            source: form.source.trim() || null,
            tags: tagsArr,
        })

        if (error) { setFormError(error.message); setSaving(false); return }

        setForm({ name: '', email: '', phone: '', source: '', tags: '' })
        setDrawerOpen(false)
        fetchOrgAndClients()
        setSaving(false)
    }

    async function saveInlineEdit() {
        if (!inlineEdit || inlineSaving) return
        setInlineSaving(true)

        const { id, field, value } = inlineEdit
        const patch: Record<string, string | null> = { [field]: value.trim() || null }
        // name cannot be null
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

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.toLowerCase().includes(search.toLowerCase())
    )

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
            const isEditingSource = isEditing
            return (
                <div className="relative group/cell">
                    {isEditingSource ? (
                        <select
                            autoFocus
                            value={inlineEdit?.value ?? ''}
                            onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : prev)}
                            onBlur={saveInlineEdit}
                            onKeyDown={e => { if (e.key === 'Escape') setInlineEdit(null) }}
                            className="w-full text-sm bg-white border border-primary/30 rounded-lg px-2 py-1 outline-none shadow-sm focus:ring-1 focus:ring-primary/20"
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
                        className="w-full text-sm bg-white border border-primary/30 rounded-lg px-2 py-1 outline-none shadow-sm focus:ring-1 focus:ring-primary/20"
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

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-white sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">Clients</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {loading ? '...' : `${clients.length} ${clients.length === 1 ? 'client' : 'clients'}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="client-search"
                                placeholder="Search name, email, phone..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 h-9 w-64 text-sm rounded-xl border-muted-foreground/10 bg-muted/30 shadow-none"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        <Button onClick={() => setDrawerOpen(true)} id="add-client-btn" className="h-9 text-sm rounded-xl shadow-none">
                            <Plus size={15} />
                            Add Client
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="max-w-5xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex flex-col gap-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-12 rounded-xl bg-muted/50 animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-28 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Search size={20} className="text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">{search ? 'No matches found' : 'No clients yet'}</p>
                        <p className="text-sm text-muted-foreground mb-6">
                            {search ? 'Try adjusting your search.' : 'Click "Add Client" to get started.'}
                        </p>
                        {!search && (
                            <Button onClick={() => setDrawerOpen(true)} className="rounded-xl shadow-none">
                                <Plus size={15} /> Add your first client
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-sm">
                        {/* Table header */}
                        <div className="grid grid-cols-[2.8fr_1.2fr_1.5fr_1.5fr] gap-0 border-b border-border bg-muted/30 px-5 py-2.5">
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
                            {sorted.map((client, idx) => (
                                <div
                                    key={client.id}
                                    className={`grid grid-cols-[2.8fr_1.2fr_1.5fr_1.5fr] gap-0 px-5 py-3 items-center ${idx < sorted.length - 1 ? 'border-b border-border/50' : ''} hover:bg-muted/30 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 group`}
                                >
                                    {/* Name */}
                                    <div
                                        className="min-w-0 pr-4 flex items-center gap-3 cursor-pointer"
                                        onClick={() => navigate(`/app/clients/${client.id}`)}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold text-primary">{getInitials(client.name)}</span>
                                        </div>
                                        <span className="text-sm font-medium text-foreground truncate group-hover:underline">{client.name}</span>
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

            {/* Add Client Drawer */}
            {drawerOpen && (
                <>
                    <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
                    <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-border shadow-xl z-50 flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h2 className="text-base font-semibold text-foreground">New Client</h2>
                            <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddClient} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="client-name">Full Name *</Label>
                                <Input id="client-name" placeholder="e.g. Maria Santos" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="client-email">Email</Label>
                                <Input id="client-email" type="email" placeholder="e.g. maria@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="client-phone">Phone</Label>
                                <Input id="client-phone" placeholder="e.g. +63 912 345 6789" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="client-source">Source</Label>
                                <select
                                    id="client-source"
                                    value={form.source}
                                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                                    className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
                                >
                                    {SOURCE_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="client-tags">Tags</Label>
                                <Input id="client-tags" placeholder="e.g. VIP, prospect (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                                <p className="text-xs text-muted-foreground">Separate multiple tags with commas.</p>
                            </div>

                            {formError && (
                                <p className="text-sm text-destructive bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
                            )}

                            <div className="mt-auto flex gap-3 pt-4 border-t border-border">
                                <Button type="button" variant="secondary" className="flex-1" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                                <Button type="submit" className="flex-1" disabled={saving} id="save-client-btn">
                                    <Check size={14} />
                                    {saving ? 'Saving...' : 'Save Client'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    )
}
