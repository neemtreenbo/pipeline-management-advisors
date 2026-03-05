import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Calendar } from 'lucide-react'
import type { PartialBlock } from '@blocknote/core'
import { getNoteById, updateNote, deleteNote, logNoteActivityThrottled } from '@/lib/notes'
import type { Note } from '@/lib/notes'
import { useAuth } from '@/contexts/AuthContext'
import BlockNoteEditor from '@/components/notes/BlockNoteEditor'
import NoteLinks from '@/components/notes/NoteLinks'
import { Button } from '@/components/ui/button'

export default function NoteDetailPage() {
    const { noteId } = useParams<{ noteId: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [note, setNote] = useState<Note | null>(null)
    const [loading, setLoading] = useState(true)
    const [title, setTitle] = useState('')
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | ''>('')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // Use refs for debounced saving to avoid stale closures
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const latestContent = useRef<PartialBlock[] | null>(null)
    const latestTitle = useRef<string>('')

    useEffect(() => {
        if (!noteId) return
        loadNote()
        return () => {
            if (saveTimeout.current) clearTimeout(saveTimeout.current)
        }
    }, [noteId])

    async function loadNote() {
        setLoading(true)
        try {
            const data = await getNoteById(noteId!)
            if (data) {
                setNote(data)
                setTitle(data.title || '')
                latestTitle.current = data.title || ''
                latestContent.current = data.content
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const triggerSave = () => {
        if (!noteId) return
        setSaveStatus('saving')
        if (saveTimeout.current) clearTimeout(saveTimeout.current)

        saveTimeout.current = setTimeout(async () => {
            try {
                await updateNote(noteId, {
                    title: latestTitle.current,
                    content: latestContent.current
                })
                if (note?.org_id && user?.id) {
                    logNoteActivityThrottled(note.org_id, user.id, noteId, latestTitle.current || 'Untitled Note', 'note_edited').catch(console.error)
                }
                setSaveStatus('saved')
                setTimeout(() => setSaveStatus(''), 2000)
            } catch (err) {
                console.error('Failed to save note', err)
                setSaveStatus('error')
            }
        }, 1000)
    }

    const handleContentChange = (content: PartialBlock[]) => {
        latestContent.current = content
        triggerSave()
    }

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setTitle(val)
        latestTitle.current = val
        triggerSave()
    }

    const handleDelete = async () => {
        if (!noteId) return
        setDeleting(true)
        try {
            await deleteNote(noteId)
            navigate('/app/notes')
        } catch (err) {
            console.error('Failed to delete note', err)
            setDeleting(false)
            setConfirmDelete(false)
        }
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
        )
    }

    if (!note) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-background gap-4">
                <p className="text-muted-foreground">Note not found.</p>
                <Button variant="secondary" onClick={() => navigate('/app/notes')}>
                    <ArrowLeft size={16} />
                    Back to Notes
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Top Bar */}
            <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-background sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/app/notes')}
                        className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Notes</span>
                    </button>
                    {saveStatus === 'saving' && <span className="text-xs text-muted-foreground ml-2 animate-pulse">Saving...</span>}
                    {saveStatus === 'saved' && <span className="text-xs text-muted-foreground ml-2 transition-opacity">Saved</span>}
                    {saveStatus === 'error' && <span className="text-xs text-destructive ml-2">Error saving</span>}
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar size={12} />
                        <span>Last edited {new Date(note.updated_at).toLocaleString()}</span>
                    </div>
                    {confirmDelete ? (
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-destructive font-medium">Delete?</span>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="h-7 px-2.5 text-xs"
                            >
                                {deleting ? 'Deleting…' : 'Yes'}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmDelete(false)}
                                className="h-7 px-2.5 text-xs"
                            >
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(true)}
                            className="text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                            title="Delete note"
                        >
                            <Trash2 size={16} />
                        </Button>
                    )}
                </div>
            </header>

            {/* Note Canvas */}
            <div className="flex-1 overflow-y-auto w-full pb-32">
                <div className="max-w-4xl mx-auto w-full px-4 sm:px-12 pt-12">

                    {/* Title */}
                    <div className="mb-6 px-12 blocknote-title-wrapper">
                        <input
                            type="text"
                            placeholder="Untitled Note"
                            className="w-full text-4xl font-bold bg-transparent border-none outline-none text-foreground placeholder-muted-foreground/50 tracking-tight"
                            value={title}
                            onChange={handleTitleChange}
                        />
                    </div>

                    {/* Meta / Links Sidebar equivalent placed inline below title */}
                    {noteId && note?.org_id && (
                        <div className="mb-10 px-12">
                            <NoteLinks noteId={noteId} orgId={note.org_id} />
                        </div>
                    )}

                    {/* BlockNote Editor */}
                    <BlockNoteEditor
                        initialContent={note.content}
                        onChange={handleContentChange}
                    />

                </div>
            </div>
        </div>
    )
}
