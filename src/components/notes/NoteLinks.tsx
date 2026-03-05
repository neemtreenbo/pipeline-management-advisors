import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Link as LinkIcon, User, Briefcase, FileText, CheckSquare, File, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getEntitiesLinkedToNote, unlinkNoteFromEntity, linkNoteToEntity } from '@/lib/notes'
import type { NoteLink } from '@/lib/notes'
import AddLinkModal from './AddLinkModal'
import { useAuth } from '@/contexts/AuthContext'
import ClientSelector from '@/components/ui/ClientSelector'

const TYPE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    client: { icon: User,        label: 'Client',   color: 'text-blue-500 bg-blue-50' },
    deal:   { icon: Briefcase,   label: 'Deal',     color: 'text-violet-500 bg-violet-50' },
    task:   { icon: CheckSquare, label: 'Task',     color: 'text-amber-500 bg-amber-50' },
    note:   { icon: FileText,    label: 'Note',     color: 'text-emerald-500 bg-emerald-50' },
    proposal: { icon: File,      label: 'Proposal', color: 'text-rose-500 bg-rose-50' },
}

interface NoteLinksProps {
    noteId: string
    orgId: string
    onLinksChanged?: () => void
}

interface LinkedEntity {
    linkId: string
    type: string
    id: string
    name: string
    avatarUrl?: string | null
}

export default function NoteLinks({ noteId, orgId, onLinksChanged }: NoteLinksProps) {
    const { user } = useAuth()
    const [links, setLinks] = useState<LinkedEntity[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false)

    async function fetchLinks() {
        setLoading(true)
        try {
            const rawLinks = await getEntitiesLinkedToNote(noteId)
            const byType = rawLinks.reduce((acc, link) => {
                if (!acc[link.to_type]) acc[link.to_type] = []
                acc[link.to_type].push(link)
                return acc
            }, {} as Record<string, NoteLink[]>)

            const entities: LinkedEntity[] = []

            for (const [type, typeLinks] of Object.entries(byType)) {
                const ids = typeLinks.map(l => l.to_id)
                let tableName = ''
                if (type === 'client') tableName = 'clients'
                else if (type === 'deal') tableName = 'deals'
                else if (type === 'task') tableName = 'tasks'
                else if (type === 'note') tableName = 'notes'
                else if (type === 'proposal') tableName = 'proposals'
                if (!tableName) continue

                const { data } = await supabase.from(tableName).select('*').in('id', ids)
                if (data) {
                    typeLinks.forEach(link => {
                        const entity = data.find(e => e.id === link.to_id)
                        let name = 'Unknown'
                        let avatarUrl: string | null = null
                        if (entity) {
                            if (type === 'client') { name = entity.name; avatarUrl = entity.profile_picture_url ?? null }
                            else if (type === 'deal') name = (entity.data as any)?.title || 'Deal'
                            else name = entity.title || 'Untitled'
                        }
                        entities.push({ linkId: link.id, type: link.to_type, id: link.to_id, name, avatarUrl })
                    })
                }
            }
            setLinks(entities)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchLinks() }, [noteId])

    async function handleUnlink(type: string, id: string) {
        if (!confirm('Remove this link?')) return
        await unlinkNoteFromEntity(noteId, type, id)
        await fetchLinks()
        if (onLinksChanged) onLinksChanged()
    }

    async function handleLinkSelected(type: string, id: string) {
        if (!user) return
        await linkNoteToEntity(noteId, type, id, orgId, user.id)
        await fetchLinks()
        if (onLinksChanged) onLinksChanged()
    }

    async function handleLinkClient(clientId: string) {
        if (!clientId) return
        await handleLinkSelected('client', clientId)
        setIsClientSelectorOpen(false)
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest flex items-center gap-1.5">
                    <LinkIcon size={11} />
                    Linked to
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setIsClientSelectorOpen(p => !p); }}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <User size={11} />
                        Client
                    </button>
                    <span className="text-border">·</span>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Plus size={11} />
                        Other
                    </button>
                </div>
            </div>

            {/* Client selector inline */}
            {isClientSelectorOpen && (
                <div className="relative rounded-lg border border-border bg-muted/30 p-3 animate-in fade-in slide-in-from-top-1">
                    <button
                        className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsClientSelectorOpen(false)}
                    >
                        <X size={13} />
                    </button>
                    <p className="text-[11px] font-medium text-muted-foreground mb-2">Select a client</p>
                    <div className="pr-5">
                        <ClientSelector orgId={orgId} value="" onChange={handleLinkClient} />
                    </div>
                </div>
            )}

            {/* Linked items */}
            {loading ? (
                <div className="flex flex-col gap-2">
                    {[1, 2].map(i => <div key={i} className="h-7 rounded-md bg-muted animate-pulse" />)}
                </div>
            ) : links.length === 0 ? (
                <p className="text-[12px] text-muted-foreground/50 italic">No links attached yet</p>
            ) : (
                <div className="flex flex-col gap-1">
                    {links.map((link) => {
                        const meta = TYPE_META[link.type] || { icon: LinkIcon, label: link.type, color: 'text-muted-foreground bg-muted' }
                        const Icon = meta.icon
                        let href = ''
                        if (link.type === 'client') href = `/app/clients/${link.id}`
                        else if (link.type === 'deal') href = `/app/pipeline?deal=${link.id}`
                        else if (link.type === 'note') href = `/app/notes/${link.id}`

                        return (
                            <div
                                key={link.linkId}
                                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-muted/60 transition-colors"
                            >
                                {link.type === 'client' && link.avatarUrl ? (
                                    <img src={link.avatarUrl} alt={link.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                ) : link.type === 'client' ? (
                                    <div className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${meta.color}`}>
                                        <span className="text-[9px] font-bold">{link.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                                    </div>
                                ) : (
                                    <span className={`flex items-center justify-center w-5 h-5 rounded-md shrink-0 ${meta.color}`}>
                                        <Icon size={11} />
                                    </span>
                                )}
                                <span className="text-[11px] text-muted-foreground/60 w-12 shrink-0">{meta.label}</span>
                                {href ? (
                                    <Link
                                        to={href}
                                        className="text-xs font-medium text-foreground hover:text-accent truncate flex-1 transition-colors"
                                    >
                                        {link.name}
                                    </Link>
                                ) : (
                                    <span className="text-xs font-medium text-foreground truncate flex-1">{link.name}</span>
                                )}
                                <button
                                    onClick={() => handleUnlink(link.type, link.id)}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 rounded shrink-0"
                                    title="Remove link"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            <AddLinkModal
                orgId={orgId}
                noteId={noteId}
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                onLinkSelected={handleLinkSelected}
            />
        </div>
    )
}
