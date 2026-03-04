import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Tag, Briefcase, FileText, CheckSquare, Activity, LayoutGrid, Edit2, Check, X, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchDealsByClient } from '@/lib/deals'
import type { Deal } from '@/lib/deals'
import ActivityTimeline from '@/components/pipeline/ActivityTimeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getDealIcon } from '@/components/pipeline/DealIcon'
import DealDetailsModal from '@/components/pipeline/DealDetailsModal'

interface Client {
    id: string
    name: string
    email: string | null
    phone: string | null
    source: string | null
    tags: string[]
    data: Record<string, unknown>
    created_at: string
    updated_at: string
    owner_id: string
    org_id: string
}

const SOURCE_COLORS: Record<string, 'accent' | 'success' | 'warning' | 'muted'> = {
    referral: 'success',
    walk_in: 'accent',
    social_media: 'warning',
}

function getSourceVariant(source: string | null) {
    if (!source) return 'muted' as const
    return SOURCE_COLORS[source] ?? 'muted'
}

function formatSource(src: string | null) {
    if (!src) return '—'
    return src.replace(/_/g, ' ')
}

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            <span className="text-sm text-foreground">{value ?? '—'}</span>
        </div>
    )
}

function EmptySection({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Icon size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No {label} yet.</p>
        </div>
    )
}

export default function ClientDetailPage() {
    const { clientId } = useParams<{ clientId: string }>()
    const navigate = useNavigate()

    const [client, setClient] = useState<Client | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [deals, setDeals] = useState<Deal[]>([])
    const [activities, setActivities] = useState<Array<{
        id: string; event_type: string; entity_type: string; entity_id: string; data: Record<string, unknown>; created_at: string; actor_id: string
    }>>([])

    // Edit state
    const [editing, setEditing] = useState(false)
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', source: '', tags: '' })
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [selectedDealId, setSelectedDealId] = useState<string | null>(null)

    useEffect(() => {
        fetchClient()
    }, [clientId])

    async function fetchClient() {
        setLoading(true)
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single()

        if (error || !data) {
            setNotFound(true)
        } else {
            setClient(data as Client)
            setEditForm({
                name: data.name,
                email: data.email ?? '',
                phone: data.phone ?? '',
                source: data.source ?? '',
                tags: (data.tags ?? []).join(', '),
            })
            // Fetch linked deals then use their IDs to load all related activities
            fetchDealsByClient(data.id).then(async (clientDeals) => {
                setDeals(clientDeals)
                const dealIds = clientDeals.map(d => d.id)

                // Build OR filter: client activities + deal activities for this client
                let query = supabase
                    .from('activities')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (dealIds.length > 0) {
                    query = query.or(
                        `and(entity_type.eq.client,entity_id.eq.${data.id}),and(entity_type.eq.deal,entity_id.in.(${dealIds.join(',')}))`
                    )
                } else {
                    query = query.eq('entity_type', 'client').eq('entity_id', data.id)
                }

                const { data: acts } = await query
                setActivities(acts ?? [])
            }).catch(() => { setDeals([]); setActivities([]) })
        }
        setLoading(false)
    }

    async function handleSave() {
        if (!client || !editForm.name.trim()) return
        setSaving(true)
        setSaveError(null)

        const tagsArr = editForm.tags.split(',').map(t => t.trim()).filter(Boolean)

        const { error } = await supabase.from('clients').update({
            name: editForm.name.trim(),
            email: editForm.email.trim() || null,
            phone: editForm.phone.trim() || null,
            source: editForm.source || null,
            tags: tagsArr,
        }).eq('id', client.id)

        if (error) { setSaveError(error.message); setSaving(false); return }
        await fetchClient()
        setEditing(false)
        setSaving(false)
    }

    function handleCancelEdit() {
        if (!client) return
        setEditForm({
            name: client.name,
            email: client.email ?? '',
            phone: client.phone ?? '',
            source: client.source ?? '',
            tags: (client.tags ?? []).join(', '),
        })
        setEditing(false)
        setSaveError(null)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
        )
    }

    if (notFound || !client) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground text-sm">Client not found.</p>
                <Button variant="secondary" onClick={() => navigate('/app/clients')}>
                    <ArrowLeft size={16} />
                    Back to Clients
                </Button>
            </div>
        )
    }

    const memberSince = new Date(client.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    })

    return (
        <>
            <Tabs defaultValue="overview" className="min-h-screen bg-background flex flex-col">
                <div className="sticky top-0 z-20 bg-background shadow-sm border-b border-border">
                    {/* Top bar */}
                    <div className="border-b border-border bg-white">
                        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
                            <button
                                onClick={() => navigate('/app/clients')}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                id="back-to-clients"
                            >
                                <ArrowLeft size={16} />
                                Clients
                            </button>
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto px-6 pt-8 pb-0">
                        {/* Client Header */}
                        <div className="flex items-start gap-4 mb-6">
                            {/* Avatar */}
                            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <span className="text-lg font-bold text-foreground">{getInitials(client.name)}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                                {editing ? (
                                    <div className="flex flex-col gap-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <Label htmlFor="edit-name">Name *</Label>
                                                <Input
                                                    id="edit-name"
                                                    value={editForm.name}
                                                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <Label htmlFor="edit-email">Email</Label>
                                                <Input
                                                    id="edit-email"
                                                    type="email"
                                                    value={editForm.email}
                                                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <Label htmlFor="edit-phone">Phone</Label>
                                                <Input
                                                    id="edit-phone"
                                                    value={editForm.phone}
                                                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <Label htmlFor="edit-source">Source</Label>
                                                <select
                                                    id="edit-source"
                                                    value={editForm.source}
                                                    onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}
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
                                            <div className="flex flex-col gap-1 sm:col-span-2">
                                                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                                                <Input
                                                    id="edit-tags"
                                                    value={editForm.tags}
                                                    onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                                                    placeholder="e.g. VIP, prospect"
                                                />
                                            </div>
                                        </div>
                                        {saveError && (
                                            <p className="text-sm text-destructive bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                                {saveError}
                                            </p>
                                        )}
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleSave} disabled={saving} id="save-edit-btn">
                                                <Check size={14} />
                                                {saving ? 'Saving...' : 'Save'}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                                                <X size={14} />
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h1 className="text-2xl font-semibold text-foreground">{client.name}</h1>
                                            {client.source && (
                                                <Badge variant={getSourceVariant(client.source)} className="capitalize">
                                                    {formatSource(client.source)}
                                                </Badge>
                                            )}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground"
                                                onClick={() => setEditing(true)}
                                                id="edit-client-btn"
                                            >
                                                <Edit2 size={14} />
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                            {client.email && (
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Mail size={13} />
                                                    <span>{client.email}</span>
                                                </div>
                                            )}
                                            {client.phone && (
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Phone size={13} />
                                                    <span>{client.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                        {client.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {client.tags.map(tag => (
                                                    <Badge key={tag} variant="outline">
                                                        <Tag size={10} className="mr-1" />
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="pb-4">
                            <TabsList>
                                <TabsTrigger value="overview" id="tab-overview">
                                    <LayoutGrid size={14} className="mr-1.5" />
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="deals" id="tab-deals">
                                    <Briefcase size={14} className="mr-1.5" />
                                    Deals
                                </TabsTrigger>
                                <TabsTrigger value="tasks" id="tab-tasks">
                                    <CheckSquare size={14} className="mr-1.5" />
                                    Tasks
                                </TabsTrigger>
                                <TabsTrigger value="notes" id="tab-notes">
                                    <FileText size={14} className="mr-1.5" />
                                    Notes
                                </TabsTrigger>
                                <TabsTrigger value="activity" id="tab-activity">
                                    <Activity size={14} className="mr-1.5" />
                                    Activity
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-6 py-6 w-full">
                    {/* Overview */}
                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-border bg-white p-5 flex flex-col gap-4">
                                <h3 className="text-sm font-semibold text-foreground">Contact Details</h3>
                                <InfoRow label="Email" value={client.email} />
                                <InfoRow label="Phone" value={client.phone} />
                                <InfoRow label="Source" value={formatSource(client.source)} />
                            </div>
                            <div className="rounded-xl border border-border bg-white p-5 flex flex-col gap-4">
                                <h3 className="text-sm font-semibold text-foreground">Record Info</h3>
                                <InfoRow label="Member since" value={memberSince} />
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</span>
                                    {client.tags.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {client.tags.map(tag => (
                                                <Badge key={tag} variant="outline">
                                                    <Tag size={10} className="mr-1" />
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Deals */}
                    <TabsContent value="deals">
                        {deals.length === 0 ? (
                            <EmptySection icon={Briefcase} label="deals" />
                        ) : (
                            <div className="flex flex-col gap-2">
                                {deals.map((deal) => {
                                    const title = (deal.data as Record<string, string>)?.title || client?.name || '—'
                                    const formattedValue = deal.value > 0
                                        ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(deal.value)
                                        : null
                                    return (
                                        <button
                                            key={deal.id}
                                            type="button"
                                            onClick={() => setSelectedDealId(deal.id)}
                                            className="w-full text-left flex items-center justify-between gap-4 rounded-xl border border-border bg-white px-5 py-4 hover:border-zinc-300 hover:shadow-md transition-all"
                                            id={`deal-link-${deal.id}`}
                                        >
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground shrink-0 border border-border/50 bg-muted/30 rounded p-0.5 shadow-sm">
                                                        {getDealIcon(title, 14)}
                                                    </span>
                                                    <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                    <span className="text-xs text-muted-foreground">{deal.stage}</span>
                                                    {formattedValue && (
                                                        <span className="text-xs font-medium text-foreground">{formattedValue}</span>
                                                    )}
                                                    {deal.expected_close_date && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Close {new Date(deal.expected_close_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* Tasks (placeholder) */}
                    <TabsContent value="tasks">
                        <EmptySection icon={CheckSquare} label="tasks" />
                    </TabsContent>

                    {/* Notes (placeholder) */}
                    <TabsContent value="notes">
                        <EmptySection icon={FileText} label="notes" />
                    </TabsContent>

                    {/* Activity */}
                    <TabsContent value="activity">
                        <ActivityTimeline
                            activities={activities}
                            contextDeals={deals.map(d => ({ id: d.id, name: (d.data as Record<string, string>)?.title || client?.name || 'Deal' }))}
                        />
                    </TabsContent>
                </div>
            </Tabs>

            {
                selectedDealId && (
                    <DealDetailsModal
                        dealId={selectedDealId}
                        onClose={() => setSelectedDealId(null)}
                    />
                )
            }
        </>
    )
}
