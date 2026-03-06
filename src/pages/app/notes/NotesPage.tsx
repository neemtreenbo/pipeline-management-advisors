import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { getNotesByOrgPaginated, createNote, getClientsForNotes } from '@/lib/notes'
import type { Note, NoteClientInfo } from '@/lib/notes'
import { extractTextFromContent } from '@/lib/extract-text'
import { Button } from '@/components/ui/button'

function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const ClientNoteGroup = memo(function ClientNoteGroup({ clientId, clientName, profilePictureUrl, notes }: { clientId: string, clientName: string, profilePictureUrl: string | null, notes: Note[] }) {
    const [isExpanded, setIsExpanded] = useState(true)

    return (
        <div className="mb-8 last:mb-0">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
            >
                {isExpanded ? <ChevronDown size={18} className="text-muted-foreground shrink-0" /> : <ChevronRight size={18} className="text-muted-foreground shrink-0" />}
                <div className="flex items-center gap-2">
                    {clientId !== 'unassigned' && (
                        profilePictureUrl ? (
                            <img src={profilePictureUrl} alt={clientName} className="w-6 h-6 rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-primary">{getInitials(clientName)}</span>
                            </div>
                        )
                    )}
                    <h2 className="text-lg font-semibold text-foreground">{clientName}</h2>
                    <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{notes.length}</span>
                </div>
            </button>

            {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-2">
                    {notes.map((note) => (
                        <NoteCard key={note.id} note={note} />
                    ))}
                </div>
            )}
        </div>
    )
})

const NoteCard = memo(function NoteCard({ note }: { note: Note }) {
    const preview = useMemo(() => extractTextFromContent(note.content), [note.content])

    return (
        <Link
            to={`/app/notes/${note.id}`}
            className="relative flex flex-col rounded-xl border border-border bg-card p-4 group transition-all duration-150 hover:-translate-y-1 hover:shadow-md hover:scale-[1.015] hover:border-border overflow-hidden"
        >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent/0 via-accent/80 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-foreground line-clamp-1 leading-snug group-hover:text-accent transition-colors duration-300">
                    {note.title || 'Untitled Note'}
                </h3>
                <FileText size={14} className="text-muted-foreground/50 group-hover:text-accent/60 transition-colors duration-300 shrink-0 mt-0.5" />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3 min-h-[48px]">
                {preview || 'No content yet…'}
            </p>

            <p className="text-[11px] text-muted-foreground/60 mt-auto">
                {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
        </Link>
    )
})

export default function NotesPage() {
    const { user } = useAuth()
    const { orgId } = useOrg()
    const navigate = useNavigate()
    const PAGE_SIZE = 24
    const [notes, setNotes] = useState<Note[]>([])
    const [noteClients, setNoteClients] = useState<Record<string, NoteClientInfo>>({})
    const [loading, setLoading] = useState(true)
    const [hasMore, setHasMore] = useState(false)
    const [cursor, setCursor] = useState<string | null>(null)
    const [loadingMore, setLoadingMore] = useState(false)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    // Load client metadata for a batch of notes (non-blocking)
    const loadClientInfo = useCallback(async (noteIds: string[], cancelled: { current: boolean }) => {
        if (noteIds.length === 0) return
        try {
            const clientInfos = await getClientsForNotes(noteIds)
            if (cancelled.current) return
            setNoteClients(prev => {
                const merged = { ...prev }
                clientInfos.forEach(c => { merged[c.noteId] = c })
                return merged
            })
        } catch {
            // Client metadata is non-critical — notes still display
        }
    }, [])

    useEffect(() => {
        if (!orgId) return
        const cancelled = { current: false }

        async function loadNotes() {
            setLoading(true)
            try {
                // Load notes and client metadata in parallel before rendering
                const result = await getNotesByOrgPaginated(orgId!, PAGE_SIZE)
                if (cancelled.current) return

                // Fetch client info before showing — avoids "Standalone" flash
                const noteIds = result.notes.map(n => n.id)
                if (noteIds.length > 0) {
                    const clientInfos = await getClientsForNotes(noteIds)
                    if (cancelled.current) return
                    const merged: Record<string, NoteClientInfo> = {}
                    clientInfos.forEach(c => { merged[c.noteId] = c })
                    setNoteClients(merged)
                }

                setNotes(result.notes)
                setHasMore(result.hasMore)
                setCursor(result.nextCursor)
            } catch (error) {
                console.error('Failed to load notes', error)
            } finally {
                if (!cancelled.current) setLoading(false)
            }
        }

        loadNotes()
        return () => { cancelled.current = true }
    }, [orgId])

    const loadMore = useCallback(async () => {
        if (!orgId || !hasMore || loadingMore) return
        setLoadingMore(true)
        try {
            const result = await getNotesByOrgPaginated(orgId, PAGE_SIZE, cursor)
            setNotes(prev => [...prev, ...result.notes])
            setHasMore(result.hasMore)
            setCursor(result.nextCursor)

            // Fetch client info for the new batch
            const cancelled = { current: false }
            loadClientInfo(result.notes.map(n => n.id), cancelled)
        } catch (error) {
            console.error('Failed to load more notes', error)
        } finally {
            setLoadingMore(false)
        }
    }, [orgId, hasMore, cursor, loadingMore, loadClientInfo])

    const handleCreateNote = useCallback(async () => {
        if (!orgId || !user) return
        try {
            const newNote = await createNote(orgId, user.id, 'Untitled Note', [])
            navigate(`/app/notes/${newNote.id}`)
        } catch (error) {
            console.error('Failed to create note', error)
        }
    }, [orgId, user, navigate])

    const sortedGroups = useMemo(() => {
        const grouped = notes.reduce((acc, note) => {
            const clientInfo = noteClients[note.id]
            const groupKey = clientInfo ? clientInfo.clientId : 'unassigned'
            const groupName = clientInfo ? clientInfo.clientName : 'Standalone Notes'
            const profilePictureUrl = clientInfo?.profilePictureUrl ?? null

            if (!acc[groupKey]) {
                acc[groupKey] = { id: groupKey, name: groupName, profilePictureUrl, notes: [] }
            }
            acc[groupKey].notes.push(note)
            return acc
        }, {} as Record<string, { id: string, name: string, profilePictureUrl: string | null, notes: Note[] }>)

        return Object.values(grouped).sort((a, b) => {
            if (a.id === 'unassigned') return 1
            if (b.id === 'unassigned') return -1
            return a.name.localeCompare(b.name)
        })
    }, [notes, noteClients])

    return (
        <div className="min-h-screen bg-transparent pt-6">
            <div className="max-w-5xl mx-auto px-6 pb-8">

                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-lg font-semibold text-foreground">Notes</h1>
                        <Button onClick={handleCreateNote} className="h-8 text-xs rounded-full px-3 font-medium">
                            <Plus size={14} className="mr-1.5" /> Add
                        </Button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                <FileText size={24} className="text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-1">No notes found</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                                Capture meeting summaries, context, and interconnected knowledge.
                            </p>
                            <Button onClick={handleCreateNote} variant="secondary">
                                    <Plus size={16} />
                                    Draft a note
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {sortedGroups.map((group) => (
                                <ClientNoteGroup key={group.id} clientId={group.id} clientName={group.name} profilePictureUrl={group.profilePictureUrl} notes={group.notes} />
                            ))}

                            {hasMore && (
                                <div className="flex justify-center pt-4 pb-2">
                                    <Button
                                        variant="secondary"
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                        className="h-8 text-xs rounded-full px-5 font-medium"
                                    >
                                        {loadingMore ? 'Loading…' : 'Load more'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
            </div>
        </div>
    )
}
