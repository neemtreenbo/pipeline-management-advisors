import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Calendar, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getNotesLinkedToEntity, createNote, linkNoteToEntity, updateNote } from '@/lib/notes'
import type { Note } from '@/lib/notes'

type OptimisticActivity = {
    id: string
    event_type: string
    entity_type?: string
    entity_id?: string
    data: Record<string, unknown>
    created_at: string
    actor_id: string
}

interface NotesListProps {
    entityType: string
    entityId: string
    orgId?: string
    inlineAdd?: boolean
    onActivityAdded?: (activity: OptimisticActivity) => void
}

function extractPreview(content: any): string {
    if (!Array.isArray(content) || content.length === 0) return ''
    return content
        .map((b: any) => b.content?.map((c: any) => c.text ?? '').join('') ?? '')
        .filter(Boolean)
        .join(' ')
        .slice(0, 120)
}

function makeParagraphContent(text: string) {
    if (!text.trim()) return []
    return [{ type: 'paragraph', content: [{ type: 'text', text: text.trim() }] }]
}

export default function NotesList({ entityType, entityId, orgId, inlineAdd, onActivityAdded }: NotesListProps) {
    const { user } = useAuth()
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)

    // Inline add state
    const [adding, setAdding] = useState(false)
    const [addTitle, setAddTitle] = useState('')
    const [addBody, setAddBody] = useState('')
    const [addSaving, setAddSaving] = useState(false)
    const addTitleRef = useRef<HTMLInputElement>(null)

    // Inline edit state (title only)
    const [editingNoteId, setEditingNoteId] = useState<string | undefined>()
    const [editTitle, setEditTitle] = useState('')

    useEffect(() => {
        if (!entityType || !entityId) return
        loadNotes()
    }, [entityType, entityId])

    async function loadNotes() {
        setLoading(true)
        try {
            setNotes(await getNotesLinkedToEntity(entityType, entityId))
        } catch (err) {
            console.error('Failed to load linked notes', err)
        } finally {
            setLoading(false)
        }
    }

    function openInlineAdd() {
        setEditingNoteId(undefined)
        setAddTitle('')
        setAddBody('')
        setAdding(true)
        setTimeout(() => addTitleRef.current?.focus(), 0)
    }

    async function handleAddNote() {
        if (!user || !orgId || !addTitle.trim()) return
        setAddSaving(true)
        try {
            const content = makeParagraphContent(addBody)
            const newNote = await createNote(orgId, user.id, addTitle.trim(), content)
            await linkNoteToEntity(newNote.id, entityType, entityId, orgId, user.id)
            // Optimistic activity update
            onActivityAdded?.({
                id: `optimistic-note-${newNote.id}`,
                event_type: 'note_created',
                entity_type: 'note',
                entity_id: newNote.id,
                data: { title: newNote.title, note_id: newNote.id },
                created_at: new Date().toISOString(),
                actor_id: user.id,
            })
            await loadNotes()
            setAdding(false)
            setAddTitle('')
            setAddBody('')
        } catch (err) {
            console.error('Failed to create note', err)
        } finally {
            setAddSaving(false)
        }
    }

    // Non-inline: navigate-away flow (original)
    async function handleAddNoteNavigate() {
        if (!user || !orgId) return
        try {
            const newNote = await createNote(orgId, user.id, 'Untitled Note', [])
            await linkNoteToEntity(newNote.id, entityType, entityId, orgId, user.id)
            window.location.href = `/app/notes/${newNote.id}`
        } catch (err) {
            console.error('Failed to create and link note', err)
        }
    }

    function startEditTitle(note: Note) {
        setAdding(false)
        setEditingNoteId(note.id)
        setEditTitle(note.title ?? '')
    }

    async function saveEditTitle(note: Note) {
        if (!editTitle.trim()) { setEditingNoteId(undefined); return }
        setNotes(prev => prev.map(n => n.id === note.id ? { ...n, title: editTitle.trim() } : n))
        setEditingNoteId(undefined)
        try {
            await updateNote(note.id, { title: editTitle.trim() })
        } catch {
            setNotes(prev => prev.map(n => n.id === note.id ? note : n))
        }
    }

    if (loading) {
        return <div className="py-8 text-center text-sm text-muted-foreground/40 animate-pulse">Loading…</div>
    }

    // ── Non-inline mode (original behaviour) ──────────────────────────────────
    if (!inlineAdd) {
        return (
            <div className="flex flex-col gap-3">
                <div className="flex justify-end mb-2">
                    <button
                        onClick={handleAddNoteNavigate}
                        disabled={!orgId}
                        className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Plus size={13} />
                        New Note
                    </button>
                </div>
                {notes.length === 0 ? (
                    <div className="py-8 text-center text-[13px] text-muted-foreground/40">No notes yet</div>
                ) : notes.map(note => (
                    <Link
                        key={note.id}
                        to={`/app/notes/${note.id}`}
                        className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-border hover:shadow-sm transition-all group"
                    >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <h4 className="text-sm font-medium text-foreground truncate">{note.title || 'Untitled'}</h4>
                            <p className="text-[12px] text-muted-foreground/60 line-clamp-1">{extractPreview(note.content) || 'Empty note'}</p>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/40 mt-1">
                                <Calendar size={10} />
                                <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        )
    }

    // ── Inline mode ───────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-2">
            {/* Add trigger / form */}
            {adding ? (
                <div className="flex flex-col gap-2 bg-card border border-border/60 rounded-xl px-3 py-2.5">
                    <input
                        ref={addTitleRef}
                        className="w-full text-sm font-medium bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground"
                        placeholder="Note title…"
                        value={addTitle}
                        onChange={(e) => setAddTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') { setAdding(false) }
                        }}
                        disabled={addSaving}
                    />
                    <textarea
                        className="w-full text-[13px] text-foreground bg-transparent outline-none resize-none placeholder:text-muted-foreground/40 min-h-[56px]"
                        placeholder="Add a quick note… (open in editor for rich text)"
                        value={addBody}
                        onChange={(e) => setAddBody(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') { setAdding(false) }
                        }}
                        disabled={addSaving}
                    />
                    <div className="flex items-center gap-3 pt-1 border-t border-border/40">
                        <button
                            onClick={handleAddNote}
                            disabled={addSaving || !addTitle.trim()}
                            className="text-[12px] font-medium text-accent hover:text-accent/80 disabled:text-muted-foreground/30 transition-colors"
                        >
                            {addSaving ? 'Saving…' : 'Add'}
                        </button>
                        <button
                            onClick={() => setAdding(false)}
                            className="text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={openInlineAdd}
                    disabled={!orgId}
                    className="flex items-center gap-1.5 text-[12px] text-muted-foreground/50 hover:text-foreground transition-colors py-1 w-fit"
                >
                    <Plus size={13} />
                    Add note
                </button>
            )}

            {/* Note list */}
            {notes.length === 0 && !adding ? (
                <div className="py-8 text-center text-[13px] text-muted-foreground/40">No notes yet</div>
            ) : (
                <div className="bg-card rounded-xl border border-border/60 overflow-hidden flex flex-col">
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            className="flex items-start gap-3 px-3 py-2.5 border-b border-border/50 last:border-0 group hover:bg-muted/30 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                {/* Editable title */}
                                {editingNoteId === note.id ? (
                                    <input
                                        autoFocus
                                        className="w-full text-[13px] font-medium bg-transparent outline-none border-b border-foreground/20 text-foreground"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onBlur={() => saveEditTitle(note)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveEditTitle(note)
                                            if (e.key === 'Escape') setEditingNoteId(undefined)
                                        }}
                                    />
                                ) : (
                                    <p
                                        className="text-[13px] font-medium text-foreground truncate cursor-text"
                                        onClick={() => startEditTitle(note)}
                                    >
                                        {note.title || 'Untitled'}
                                    </p>
                                )}

                                {/* Content preview */}
                                {extractPreview(note.content) && (
                                    <p className="text-[12px] text-muted-foreground/60 line-clamp-1 mt-0.5">
                                        {extractPreview(note.content)}
                                    </p>
                                )}

                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground/40 mt-1">
                                    <Calendar size={10} />
                                    <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Open in full editor */}
                            <Link
                                to={`/app/notes/${note.id}`}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-accent shrink-0 mt-0.5"
                                title="Open in editor"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink size={13} />
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
