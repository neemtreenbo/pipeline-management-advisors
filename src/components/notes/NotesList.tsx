import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getNotesLinkedToEntity, createNote, linkNoteToEntity } from '@/lib/notes'
import type { Note } from '@/lib/notes'
import { Button } from '@/components/ui/button'

interface NotesListProps {
    entityType: string
    entityId: string
    orgId?: string
}

export default function NotesList({ entityType, entityId, orgId }: NotesListProps) {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!entityType || !entityId) return
        loadNotes()
    }, [entityType, entityId])

    async function loadNotes() {
        setLoading(true)
        try {
            const data = await getNotesLinkedToEntity(entityType, entityId)
            setNotes(data)
        } catch (err) {
            console.error('Failed to load linked notes', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleAddNote() {
        if (!user || !orgId) {
            // If orgId is not provided, fall back or fail safely
            console.error('Missing user or orgId to create note')
            return
        }
        try {
            const newNote = await createNote(orgId, user.id, 'Untitled Note', [])
            await linkNoteToEntity(newNote.id, entityType, entityId, orgId, user.id)
            navigate(`/app/notes/${newNote.id}`)
        } catch (err) {
            console.error('Failed to create and link note', err)
        }
    }

    if (loading) {
        return <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading notes...</div>
    }

    if (notes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-border bg-white rounded-xl border-dashed">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <FileText size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No notes linked</p>
                <p className="text-xs text-muted-foreground mb-4">Capture meeting summaries or deal context here.</p>
                <Button onClick={handleAddNote} variant="secondary" size="sm" disabled={!orgId}>
                    <Plus size={14} />
                    Create Note
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-end mb-2">
                <Button onClick={handleAddNote} size="sm" disabled={!orgId}>
                    <Plus size={14} />
                    New Note
                </Button>
            </div>
            {notes.map(note => (
                <Link
                    key={note.id}
                    to={`/app/notes/${note.id}`}
                    className="w-full text-left flex items-start gap-4 rounded-xl border border-border bg-white p-4 hover:border-zinc-300 hover:shadow-md transition-all group"
                >
                    <div className="mt-0.5 text-muted-foreground bg-muted p-2 rounded-lg group-hover:bg-accent/10 group-hover:text-accent transition-colors shrink-0">
                        <FileText size={16} />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                            {note.title || 'Untitled Note'}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 pr-8">
                            {Array.isArray(note.content) && note.content.length > 0
                                ? note.content.map((b: any) => b.content?.map((c: any) => c.text).join('') || '').join(' ')
                                : 'Empty note'
                            }
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                            <Calendar size={10} />
                            <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    )
}
