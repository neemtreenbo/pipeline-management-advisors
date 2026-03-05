import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus, Search, Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePageActions } from '@/contexts/PageActionsContext'
import { supabase } from '@/lib/supabase'
import { getNotesByOrg, createNote, getClientsForNotes } from '@/lib/notes'
import type { Note, NoteClientInfo } from '@/lib/notes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function ClientNoteGroup({ clientId, clientName, notes }: { clientId: string, clientName: string, notes: Note[] }) {
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
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">{getInitials(clientName)}</span>
                        </div>
                    )}
                    <h2 className="text-lg font-semibold text-foreground">{clientName}</h2>
                    <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{notes.length}</span>
                </div>
            </button>

            {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-2">
                    {notes.map((note) => (
                        <Link
                            key={note.id}
                            to={`/app/notes/${note.id}`}
                            className="relative flex flex-col h-32 rounded-xl border border-border bg-white p-5 group transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-zinc-300 overflow-hidden"
                        >
                            {/* Subtle highlight bar on hover */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/0 via-accent/80 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="flex items-start justify-between gap-2 mb-3 relative z-10 flex-1">
                                <h3 className="text-base font-medium text-foreground line-clamp-2 leading-tight group-hover:text-accent transition-colors duration-300">
                                    {note.title || 'Untitled Note'}
                                </h3>
                                <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-300 shrink-0">
                                    <FileText size={16} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50 relative z-10 group-hover:border-border/80 transition-colors duration-300">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar size={12} className="group-hover:text-foreground/70 transition-colors duration-300" />
                                    <span className="group-hover:text-foreground/70 transition-colors duration-300">
                                        {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                                {/* Subtle arrow sliding in */}
                                <span className="text-accent opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-sm font-medium leading-none">
                                    &rarr;
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function NotesPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [notes, setNotes] = useState<Note[]>([])
    const [noteClients, setNoteClients] = useState<Record<string, NoteClientInfo>>({})
    const [loading, setLoading] = useState(true)
    const [orgId, setOrgId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const { setPortalNode } = usePageActions()

    useEffect(() => {
        if (!user) return
        supabase
            .from('memberships')
            .select('org_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
                if (data) {
                    setOrgId(data.org_id)
                }
            })
    }, [user])

    useEffect(() => {
        if (!orgId) return
        loadNotes()
    }, [orgId])

    async function loadNotes() {
        if (!orgId) return
        setLoading(true)
        try {
            const data = await getNotesByOrg(orgId)
            setNotes(data)

            if (data.length > 0) {
                const clientInfos = await getClientsForNotes(data.map(n => n.id))
                const clientMap: Record<string, NoteClientInfo> = {}
                clientInfos.forEach(c => clientMap[c.noteId] = c)
                setNoteClients(clientMap)
            }
        } catch (error) {
            console.error('Failed to load notes', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateNote = useCallback(async () => {
        if (!orgId || !user) return
        try {
            const newNote = await createNote(orgId, user.id, 'Untitled Note', [])
            navigate(`/app/notes/${newNote.id}`)
        } catch (error) {
            console.error('Failed to create note', error)
        }
    }, [orgId, user, navigate])

    const filteredNotes = notes.filter((note) =>
        (note.title || 'Untitled Note').toLowerCase().includes(searchQuery.toLowerCase())
    )

    const groupedNotes = filteredNotes.reduce((acc, note) => {
        const clientInfo = noteClients[note.id]
        const groupKey = clientInfo ? clientInfo.clientId : 'unassigned'
        const groupName = clientInfo ? clientInfo.clientName : 'Standalone Notes'

        if (!acc[groupKey]) {
            acc[groupKey] = {
                id: groupKey,
                name: groupName,
                notes: []
            }
        }
        acc[groupKey].notes.push(note)
        return acc
    }, {} as Record<string, { id: string, name: string, notes: Note[] }>)

    const sortedGroups = Object.values(groupedNotes).sort((a, b) => {
        if (a.id === 'unassigned') return 1
        if (b.id === 'unassigned') return -1
        return a.name.localeCompare(b.name)
    })

    // Inject the Search and "New Note" button into the Island navigation
    useEffect(() => {
        setPortalNode(
            <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative hidden w-[140px] sm:block sm:w-[200px]">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-7 text-xs rounded-full bg-slate-100/80 border-transparent focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-white shadow-inner transition-all w-full"
                    />
                </div>
                <Button onClick={handleCreateNote} className="h-8 text-xs sm:text-xs rounded-full shadow-sm px-3 font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus size={14} className="sm:mr-1.5" />
                    <span className="hidden sm:inline">New</span>
                </Button>
            </div>
        )
        return () => setPortalNode(null)
    }, [handleCreateNote, setPortalNode, searchQuery])

    return (
        <div className="flex flex-col h-full bg-transparent">
            <div className="flex-1 overflow-y-auto pb-20 mt-4">
                <div className="max-w-5xl mx-auto px-6 flex flex-col gap-6">

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                <FileText size={24} className="text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-1">No notes found</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                                {searchQuery ? 'Try adjusting your search query.' : 'Capture meeting summaries, context, and interconnected knowledge.'}
                            </p>
                            {!searchQuery && (
                                <Button onClick={handleCreateNote} variant="secondary">
                                    <Plus size={16} />
                                    Draft a note
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {sortedGroups.map((group) => (
                                <ClientNoteGroup key={group.id} clientId={group.id} clientName={group.name} notes={group.notes} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
