import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Link as LinkIcon, User, Briefcase, FileText, CheckSquare, X, Plus, File } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getEntitiesLinkedToNote, unlinkNoteFromEntity, linkNoteToEntity } from '@/lib/notes'
import type { NoteLink } from '@/lib/notes'
import AddLinkModal from './AddLinkModal'
import { useAuth } from '@/contexts/AuthContext'
import ClientSelector from '@/components/ui/ClientSelector'

const TYPE_ICONS: Record<string, React.ElementType> = {
    client: User,
    deal: Briefcase,
    task: CheckSquare,
    note: FileText,
    proposal: File
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

            // Group by type for batch fetching
            const byType = rawLinks.reduce((acc, link) => {
                if (!acc[link.to_type]) acc[link.to_type] = []
                acc[link.to_type].push(link)
                return acc
            }, {} as Record<string, NoteLink[]>)

            const entities: LinkedEntity[] = []

            for (const [type, typeLinks] of Object.entries(byType)) {
                const ids = typeLinks.map(l => l.to_id)
                let tableName = ''
                let nameField = 'title' // default

                if (type === 'client') { tableName = 'clients'; nameField = 'name' }
                else if (type === 'deal') { tableName = 'deals'; nameField = 'data->>title' } // Deal title is in data jsonb, let's just select data
                else if (type === 'task') { tableName = 'tasks' }
                else if (type === 'note') { tableName = 'notes' }
                else if (type === 'proposal') { tableName = 'proposals' }

                if (!tableName) continue

                const { data } = await supabase
                    .from(tableName)
                    .select('*')
                    .in('id', ids)

                if (data) {
                    typeLinks.forEach(link => {
                        const entity = data.find(e => e.id === link.to_id)
                        let name = 'Unknown'
                        if (entity) {
                            if (type === 'client') name = entity.name
                            else if (type === 'deal') name = (entity.data as any)?.title || 'Deal'
                            else if (nameField === 'title') name = entity.title || 'Untitled'
                        }
                        entities.push({
                            linkId: link.id,
                            type: link.to_type,
                            id: link.to_id,
                            name
                        })
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

    useEffect(() => {
        fetchLinks()
    }, [noteId])

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
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon size={12} />
                    Linked To
                </h4>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsClientSelectorOpen(prev => !prev)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title="Link Client"
                    >
                        <User size={12} />
                        <span>Client</span>
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title="Link Other"
                    >
                        <Plus size={12} />
                        <span>Other</span>
                    </button>
                </div>
            </div>

            {isClientSelectorOpen && (
                <div className="p-3 bg-muted/20 border border-border rounded-xl mt-1 relative animate-in fade-in slide-in-from-top-1">
                    <button className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10" onClick={() => setIsClientSelectorOpen(false)}>
                        <X size={14} />
                    </button>
                    <div className="pr-6">
                        <label className="text-xs font-medium text-foreground/80 mb-2 block">Link Client</label>
                        <ClientSelector
                            orgId={orgId}
                            value=""
                            onChange={handleLinkClient}
                        />
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-2 mt-1">
                {links.length === 0 && !loading && (
                    <span className="text-xs text-muted-foreground/60 italic">No links attached</span>
                )}
                {links.map((link) => {
                    const Icon = TYPE_ICONS[link.type] || LinkIcon
                    let href = ''
                    if (link.type === 'client') href = `/app/clients/${link.id}`
                    else if (link.type === 'deal') href = `/app/pipeline?deal=${link.id}`
                    else if (link.type === 'note') href = `/app/notes/${link.id}`

                    return (
                        <div key={link.linkId} className="flex items-center gap-1 bg-muted border border-border rounded-full pl-2 pr-1 py-1 group">
                            <Icon size={12} className="text-muted-foreground" />
                            {href ? (
                                <Link to={href} className="text-xs font-medium text-foreground hover:underline max-w-[150px] truncate">
                                    {link.name}
                                </Link>
                            ) : (
                                <span className="text-xs font-medium text-foreground max-w-[150px] truncate">{link.name}</span>
                            )}
                            <button
                                onClick={() => handleUnlink(link.type, link.id)}
                                className="p-0.5 rounded-full hover:bg-black/10 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove link"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )
                })}
            </div>

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
