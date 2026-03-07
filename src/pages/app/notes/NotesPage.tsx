import { useState, useCallback, useMemo, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, FileText, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { useTheme } from '@/contexts/ThemeContext'
import { ACCENT_PALETTE, getAccentBg } from '@/lib/colors'
import { createNote } from '@/lib/notes'
import type { Note } from '@/lib/notes'
import { useNotesWithClients } from '@/hooks/queries/useNotes'
import { extractTextFromContent } from '@/lib/extract-text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PALETTE_CYCLE = [
    ACCENT_PALETTE.blue,
    ACCENT_PALETTE.green,
    ACCENT_PALETTE.purple,
    ACCENT_PALETTE.orange,
    ACCENT_PALETTE.teal,
    ACCENT_PALETTE.gold,
    ACCENT_PALETTE.cyan,
]

function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const ClientNoteGroup = memo(function ClientNoteGroup({ clientId, clientName, profilePictureUrl, notes, defaultExpanded = false, colorIndex = 0 }: { clientId: string, clientName: string, profilePictureUrl: string | null, notes: Note[], defaultExpanded?: boolean, colorIndex?: number }) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const accentColor = PALETTE_CYCLE[colorIndex % PALETTE_CYCLE.length]

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
                    <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full text-white/90"
                        style={{ backgroundColor: getAccentBg(accentColor, isDark) }}
                    >{notes.length}</span>
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

    const { data: notesWithClients = [], isLoading: loading } = useNotesWithClients(orgId ?? undefined)

    const notes = notesWithClients as Note[]

    const noteClients = useMemo(() => {
        const map: Record<string, { clientId: string; clientName: string; profilePictureUrl: string | null }> = {}
        notesWithClients.forEach(n => {
            if (n.client_id && n.client_name) {
                map[n.id] = {
                    clientId: n.client_id,
                    clientName: n.client_name,
                    profilePictureUrl: n.profile_picture_url ?? null,
                }
            }
        })
        return map
    }, [notesWithClients])

    const handleCreateNote = useCallback(async () => {
        if (!orgId || !user) return
        try {
            const newNote = await createNote(orgId, user.id, 'Untitled Note', [])
            navigate(`/app/notes/${newNote.id}`)
        } catch (error) {
            console.error('Failed to create note', error)
        }
    }, [orgId, user, navigate])

    const [searchQuery, setSearchQuery] = useState('')

    const sortedGroups = useMemo(() => {
        const q = searchQuery.toLowerCase().trim()

        const filtered = q
            ? notes.filter(note => {
                const title = (note.title || '').toLowerCase()
                const clientInfo = noteClients[note.id]
                const clientName = clientInfo ? clientInfo.clientName.toLowerCase() : ''
                return title.includes(q) || clientName.includes(q)
            })
            : notes

        const grouped = filtered.reduce((acc, note) => {
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
            if (a.id === 'unassigned') return -1
            if (b.id === 'unassigned') return 1
            return a.name.localeCompare(b.name)
        })
    }, [notes, noteClients, searchQuery])

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
                            Notes
                            {!loading && notes.length > 0 && (
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-normal bg-muted text-muted-foreground">
                                    {searchQuery.trim() ? `${sortedGroups.reduce((s, g) => s + g.notes.length, 0)} / ${notes.length}` : notes.length}
                                </span>
                            )}
                        </h1>
                        <Button onClick={handleCreateNote} className="h-8 text-xs rounded-full px-3 font-medium">
                            <Plus size={14} className="mr-1.5" /> Add
                        </Button>
                    </div>

                    {!loading && notes.length > 0 && (
                        <div className="mt-5">
                            <div className="relative max-w-sm">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                                <Input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search notes..."
                                    className="h-8 pl-8 text-sm rounded-lg"
                                />
                            </div>
                        </div>
                    )}
                </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : notes.length === 0 ? (
                        /* No notes at all */
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
                    ) : sortedGroups.length === 0 && searchQuery.trim() ? (
                        /* Search returned no results */
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Search size={20} className="text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-foreground mb-1">No matching notes</p>
                            <p className="text-[13px] text-muted-foreground/60">
                                Try adjusting your search.
                            </p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-[13px] text-accent hover:text-accent/80 mt-3 transition-colors"
                            >
                                Clear search
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {sortedGroups.map((group, i) => (
                                <ClientNoteGroup key={group.id} clientId={group.id} clientName={group.name} profilePictureUrl={group.profilePictureUrl} notes={group.notes} defaultExpanded={i === 0 && !(group.id === 'unassigned' && group.notes.length > 10)} colorIndex={i} />
                            ))}
                        </div>
                    )}
            </div>
        </div>
    )
}
