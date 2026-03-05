import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Tag, Briefcase, FileText, CheckSquare, Activity, LayoutGrid, Edit2, Check, X, Linkedin, Instagram } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { fetchDealsByClient } from '@/lib/deals'
import type { Deal } from '@/lib/deals'
import ActivityTimeline from '@/components/pipeline/ActivityTimeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import InlineDealsList from '@/components/pipeline/InlineDealsList'
import NotesList from '@/components/notes/NotesList'
import EntityTasks from '@/components/tasks/EntityTasks'

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
    job_title?: string | null
    occupation?: string | null
    profile_picture_url?: string | null
    experiences?: any | null
    education?: any | null
    updates?: any | null
    ai_summary?: string | null
    talking_points?: any | null
    company_name?: string | null
    company_industry?: string | null
    company_website?: string | null
    linkedin_url?: string | null
    facebook_url?: string | null
    instagram_url?: string | null
    tiktok_url?: string | null
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

function InfoRow({ label, value, showEmpty = false }: { label: string; value: string | null | undefined, showEmpty?: boolean }) {
    if (!value && !showEmpty) return null

    // Check if it's a URL
    const isUrl = value && (value.startsWith('http://') || value.startsWith('https://'))

    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            {isUrl ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
                    {value}
                </a>
            ) : (
                <span className="text-sm text-foreground break-words">{value || '—'}</span>
            )}
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
    const [syncingLinkedIn, setSyncingLinkedIn] = useState(false)

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

                // Fetch linked notes and tasks to this client OR deals
                let orLinkQuery = `and(to_type.eq.client,to_id.eq.${data.id})`
                if (dealIds.length > 0) {
                    orLinkQuery += `,and(to_type.eq.deal,to_id.in.(${dealIds.join(',')}))`
                }
                const { data: links } = await supabase
                    .from('links')
                    .select('from_id, from_type')
                    .in('from_type', ['note', 'task'])
                    .or(orLinkQuery)

                const noteIds = Array.from(new Set(links?.filter(l => l.from_type === 'note').map(l => l.from_id) || []))
                const taskIds = Array.from(new Set(links?.filter(l => l.from_type === 'task').map(l => l.from_id) || []))

                // Build OR filter: client activities + deal activities + note activities + task activities
                let query = supabase
                    .from('activities')
                    .select('*')
                    .order('created_at', { ascending: false })

                const chunks = [`and(entity_type.eq.client,entity_id.eq.${data.id})`]
                if (dealIds.length > 0) {
                    chunks.push(`and(entity_type.eq.deal,entity_id.in.(${dealIds.join(',')}))`)
                }
                if (noteIds.length > 0) {
                    chunks.push(`and(entity_type.eq.note,entity_id.in.(${noteIds.join(',')}))`)
                }
                if (taskIds.length > 0) {
                    chunks.push(`and(entity_type.eq.task,entity_id.in.(${taskIds.join(',')}))`)
                }

                query = query.or(chunks.join(','))

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

    async function handleSyncLinkedIn() {
        if (!client || !client.linkedin_url) return;
        setSyncingLinkedIn(true);
        try {
            const { error } = await supabase.functions.invoke('n8n-linkedin-webhook', {
                body: { id: client.id, linkedin_url: client.linkedin_url }
            });

            if (error) {
                console.error("Webhook error:", error);
                alert("Failed to sync with LinkedIn. See console for details.");
            } else {
                await fetchClient();
            }
        } catch (err) {
            console.error("Error invoking webhook:", err);
            alert("Error invoking webhook.");
        } finally {
            setSyncingLinkedIn(false);
        }
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

                    <div className="max-w-4xl mx-auto px-6 pt-4 pb-0">
                        {/* Client Header */}
                        <div className="flex items-start gap-4 mb-6">
                            {/* Avatar */}
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                {client.profile_picture_url ? (
                                    <img src={client.profile_picture_url} alt={client.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-lg font-bold text-foreground">{getInitials(client.name)}</span>
                                )}
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
                                                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
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
                                            <p className="text-sm text-destructive bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg px-3 py-2">
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
                                <TabsTrigger value="intel" id="tab-intel">
                                    <Activity size={14} className="mr-1.5" />
                                    Intel
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
                            <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                                <h3 className="text-sm font-semibold text-foreground">Contact Details</h3>
                                <InfoRow label="Email" value={client.email} />
                                <InfoRow label="Phone" value={client.phone} />
                                <InfoRow label="Source" value={formatSource(client.source)} />
                            </div>
                            <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
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

                            {/* Professional Info */}
                            {(client.company_name || client.company_industry || client.company_website || client.job_title || client.occupation) && (
                                <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 sm:col-span-2">
                                    <h3 className="text-sm font-semibold text-foreground">Professional Summary</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <InfoRow label="Company" value={client.company_name} />
                                        <InfoRow label="Industry" value={client.company_industry} />
                                        <InfoRow label="Website" value={client.company_website} />
                                        <InfoRow label="Job Title" value={client.job_title} />
                                        <InfoRow label="Occupation" value={client.occupation} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Intel Tab */}
                    <TabsContent value="intel">
                        <div className="flex flex-col gap-8 animate-in fade-in duration-300 mt-2">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Inputs */}
                                <div className="lg:col-span-1 flex flex-col gap-6">
                                    <div className="flex flex-col gap-4">
                                        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                            <Linkedin size={16} className="text-muted-foreground" />
                                            LinkedIn Profile
                                        </h3>
                                        <div className="flex flex-col gap-2">
                                            <Input
                                                id="intel-linkedin"
                                                placeholder="https://linkedin.com/in/..."
                                                className="bg-background"
                                                value={client.linkedin_url || ''}
                                                onChange={async (e) => {
                                                    const val = e.target.value;
                                                    setClient(c => c ? { ...c, linkedin_url: val } : c);
                                                    await supabase.from('clients').update({ linkedin_url: val || null }).eq('id', client.id);
                                                }}
                                            />
                                            <Button
                                                onClick={handleSyncLinkedIn}
                                                disabled={syncingLinkedIn || !client.linkedin_url}
                                                variant="secondary"
                                                className="w-full justify-start mt-2"
                                            >
                                                {syncingLinkedIn ? (
                                                    <>
                                                        <div className="w-4 h-4 mr-2 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                                                        Syncing Data...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Activity size={16} className="mr-2 text-muted-foreground" />
                                                        Sync Profile Data
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4 pt-6 border-t border-border">
                                        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                            <Instagram size={16} className="text-muted-foreground" />
                                            Instagram Profile
                                        </h3>
                                        <div className="flex flex-col gap-2">
                                            <Input
                                                id="intel-instagram"
                                                placeholder="https://instagram.com/..."
                                                className="bg-background"
                                                value={client.instagram_url || ''}
                                                onChange={async (e) => {
                                                    const val = e.target.value;
                                                    setClient(c => c ? { ...c, instagram_url: val } : c);
                                                    await supabase.from('clients').update({ instagram_url: val || null }).eq('id', client.id);
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Facebook & TikTok static Info */}
                                    {(client.facebook_url || client.tiktok_url) && (
                                        <div className="flex flex-col gap-4 pt-6 border-t border-border">
                                            <h3 className="text-sm font-medium text-foreground">Other Platforms</h3>
                                            <div className="flex flex-col gap-3">
                                                <InfoRow label="Facebook" value={client.facebook_url} />
                                                <InfoRow label="TikTok" value={client.tiktok_url} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Insight Displays */}
                                <div className="lg:col-span-2 flex flex-col gap-6">
                                    {!client.ai_summary && !client.talking_points && !client.experiences && !client.education ? (
                                        <div className="rounded-xl border border-dashed border-border bg-muted/30 min-h-[300px] flex flex-col items-center justify-center text-center p-8">
                                            <Activity className="text-muted-foreground mb-4" size={24} />
                                            <h3 className="text-sm font-medium text-foreground mb-1">No Intelligence Gathered</h3>
                                            <p className="text-sm text-muted-foreground max-w-sm">Enter a LinkedIn URL and sync to extract professional insights.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-6">
                                            {/* AI Summary */}
                                            {client.ai_summary && (
                                                <div className="flex flex-col gap-3">
                                                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                                        <FileText size={16} className="text-muted-foreground" />
                                                        Summary
                                                    </h3>
                                                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                                        <p className="text-[15px] text-foreground leading-relaxed">{client.ai_summary}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Talking Points */}
                                            {client.talking_points && (
                                                <div className="flex flex-col gap-3">
                                                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                                        <CheckSquare size={16} className="text-muted-foreground" />
                                                        Talking Points
                                                    </h3>
                                                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                                        {(() => {
                                                            const tp = client.talking_points as any;
                                                            const pointsArray = Array.isArray(tp) ? tp : (tp?.items && Array.isArray(tp.items) ? tp.items : null);

                                                            if (pointsArray) {
                                                                return (
                                                                    <ul className="space-y-3">
                                                                        {pointsArray.map((point: string, idx: number) => (
                                                                            <li key={idx} className="flex gap-3 text-[15px] text-foreground">
                                                                                <span className="text-muted-foreground select-none">•</span>
                                                                                <span className="leading-relaxed">{point}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                );
                                                            }

                                                            return (
                                                                <p className="text-[15px] text-foreground font-mono break-all whitespace-pre-wrap">
                                                                    {typeof tp === 'string' ? tp : JSON.stringify(tp, null, 2)}
                                                                </p>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Raw Data Accordions / Sections */}
                                            {(client.experiences || client.education || client.updates) && (
                                                <div className="flex flex-col gap-3">
                                                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                                        <LayoutGrid size={16} className="text-muted-foreground" />
                                                        Additional Information
                                                    </h3>
                                                    <div className="flex flex-col gap-4">
                                                        {client.experiences && (
                                                            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                                                <h4 className="text-sm font-semibold text-foreground mb-3">Experiences</h4>
                                                                <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap">
                                                                    {typeof client.experiences === 'string' ? client.experiences : JSON.stringify(client.experiences, null, 2)}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {client.education && (
                                                            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                                                <h4 className="text-sm font-semibold text-foreground mb-3">Education</h4>
                                                                <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap">
                                                                    {typeof client.education === 'string' ? client.education : JSON.stringify(client.education, null, 2)}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {client.updates && (
                                                            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                                                <h4 className="text-sm font-semibold text-foreground mb-3">Updates</h4>
                                                                <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap">
                                                                    {typeof client.updates === 'string' ? client.updates : JSON.stringify(client.updates, null, 2)}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Deals */}
                    <TabsContent value="deals">
                        {client && <InlineDealsList clientId={client.id} orgId={client.org_id} />}
                    </TabsContent>

                    {/* Tasks */}
                    < TabsContent value="tasks" >
                        {client && <EntityTasks orgId={client.org_id} clientId={client.id} inlineAdd />}
                    </TabsContent >

                    {/* Notes */}
                    < TabsContent value="notes" >
                        {client && <NotesList entityType="client" entityId={client.id} orgId={client.org_id} inlineAdd />}
                    </TabsContent >

                    {/* Activity */}
                    < TabsContent value="activity" >
                        <ActivityTimeline
                            activities={activities}
                            contextDeals={deals.map(d => ({ id: d.id, name: (d.data as Record<string, string>)?.title || client?.name || 'Deal' }))}
                        />
                    </TabsContent >
                </div >
            </Tabs >

        </>
    )
}
