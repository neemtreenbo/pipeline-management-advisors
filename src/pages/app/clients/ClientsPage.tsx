import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, User, Phone, Mail, Tag, ChevronRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

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

const SOURCE_COLORS: Record<string, 'accent' | 'success' | 'warning' | 'muted'> = {
    referral: 'success',
    walk_in: 'accent',
    social_media: 'warning',
}

function getSourceVariant(source: string | null) {
    if (!source) return 'muted'
    return SOURCE_COLORS[source] ?? 'muted'
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

    // Form state
    const [form, setForm] = useState({ name: '', email: '', phone: '', source: '', tags: '' })
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    // Org id
    const [orgId, setOrgId] = useState<string | null>(null)

    useEffect(() => {
        if (!user) return
        fetchOrgAndClients()
    }, [user])

    async function fetchOrgAndClients() {
        setLoading(true)
        // Grab the user's first active membership
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
            .order('created_at', { ascending: false })

        setClients(data ?? [])
        setLoading(false)
    }

    async function handleAddClient(e: React.FormEvent) {
        e.preventDefault()
        if (!orgId || !user) return
        if (!form.name.trim()) { setFormError('Name is required.'); return }

        setSaving(true)
        setFormError(null)

        const tagsArr = form.tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)

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

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-background">
            {/* Page Header */}
            <div className="border-b border-border bg-white sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {loading ? '...' : `${clients.length} ${clients.length === 1 ? 'relationship' : 'relationships'}`}
                        </p>
                    </div>
                    <Button onClick={() => setDrawerOpen(true)} id="add-client-btn">
                        <Plus size={16} />
                        Add Client
                    </Button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Search */}
                <div className="relative mb-6">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="client-search"
                        placeholder="Search clients..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* State: loading */}
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="rounded-xl border border-border bg-muted/40 h-36 animate-pulse" />
                        ))}
                    </div>
                )}

                {/* State: empty */}
                {!loading && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <User size={24} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-medium text-foreground mb-1">
                            {search ? 'No clients found' : 'No clients yet'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            {search ? 'Try a different search term.' : 'Start building your relationships.'}
                        </p>
                        {!search && (
                            <Button onClick={() => setDrawerOpen(true)}>
                                <Plus size={16} />
                                Add your first client
                            </Button>
                        )}
                    </div>
                )}

                {/* Client Grid */}
                {!loading && filtered.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(client => (
                            <Card
                                key={client.id}
                                className="p-4 cursor-pointer hover:shadow-md hover:border-zinc-300 transition-all duration-150 group"
                                onClick={() => navigate(`/app/clients/${client.id}`)}
                                id={`client-card-${client.id}`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    {/* Avatar initial */}
                                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                                        <span className="text-sm font-semibold text-foreground">
                                            {client.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <ChevronRight
                                        size={16}
                                        className="text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                </div>

                                <div className="mt-3">
                                    <h3 className="text-sm font-semibold text-foreground leading-tight">{client.name}</h3>
                                    {client.email && (
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <Mail size={12} className="text-muted-foreground shrink-0" />
                                            <span className="text-xs text-muted-foreground truncate">{client.email}</span>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Phone size={12} className="text-muted-foreground shrink-0" />
                                            <span className="text-xs text-muted-foreground">{client.phone}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                                    {client.source && (
                                        <Badge variant={getSourceVariant(client.source)} className="capitalize">
                                            {formatSource(client.source)}
                                        </Badge>
                                    )}
                                    {client.tags.slice(0, 2).map(tag => (
                                        <Badge key={tag} variant="outline">
                                            <Tag size={10} className="mr-1" />
                                            {tag}
                                        </Badge>
                                    ))}
                                    {client.tags.length > 2 && (
                                        <span className="text-xs text-muted-foreground">+{client.tags.length - 2}</span>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Client Drawer */}
            {drawerOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
                        onClick={() => setDrawerOpen(false)}
                    />
                    {/* Drawer */}
                    <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-border shadow-xl z-50 flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h2 className="text-base font-semibold text-foreground">New Client</h2>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddClient} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="client-name">Full Name *</Label>
                                <Input
                                    id="client-name"
                                    placeholder="e.g. Maria Santos"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="client-email">Email</Label>
                                <Input
                                    id="client-email"
                                    type="email"
                                    placeholder="e.g. maria@example.com"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="client-phone">Phone</Label>
                                <Input
                                    id="client-phone"
                                    placeholder="e.g. +63 912 345 6789"
                                    value={form.phone}
                                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="client-source">Source</Label>
                                <select
                                    id="client-source"
                                    value={form.source}
                                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                                    className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
                                >
                                    <option value="">Select source...</option>
                                    <option value="referral">Referral</option>
                                    <option value="walk_in">Walk-in</option>
                                    <option value="social_media">Social Media</option>
                                    <option value="cold_call">Cold Call</option>
                                    <option value="event">Event</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="client-tags">Tags</Label>
                                <Input
                                    id="client-tags"
                                    placeholder="e.g. VIP, prospect, family (comma-separated)"
                                    value={form.tags}
                                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground">Separate multiple tags with commas.</p>
                            </div>

                            {formError && (
                                <p className="text-sm text-destructive bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                    {formError}
                                </p>
                            )}

                            <div className="mt-auto flex gap-3 pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setDrawerOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1" disabled={saving} id="save-client-btn">
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
