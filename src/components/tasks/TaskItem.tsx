import { CheckCircle2, Circle, X } from 'lucide-react'
import type { Task } from '@/lib/tasks'
import { useCallback, useRef, useEffect, useState } from 'react'

interface ClientOption {
    id: string
    name: string
}

interface TaskItemProps {
    task: Task
    client?: { name: string; profilePictureUrl?: string | null }
    currentClientId?: string
    availableClients?: ClientOption[]
    showClient?: boolean
    isEditing?: boolean
    onToggleComplete: (task: Task) => void
    onClick?: (task: Task) => void
    onSaveEdit?: (task: Task, title: string, dueAt: string, clientId?: string | null) => void
    onCancelEdit?: () => void
}

function toDateInput(iso: string | null) {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDueDate(dateString: string | null): { label: string; overdue: boolean } | null {
    if (!dateString) return null
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    const overdue = date < today && !isToday
    const label = isToday
        ? 'Today'
        : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
    return { label, overdue }
}

function ClientAvatar({ name, profilePictureUrl }: { name: string; profilePictureUrl?: string | null }) {
    if (profilePictureUrl) {
        return <img src={profilePictureUrl} alt={name} className="w-5 h-5 rounded-full object-cover shrink-0" />
    }
    return (
        <div className="w-5 h-5 rounded-full bg-muted border border-border/60 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-semibold text-muted-foreground/70">
                {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
        </div>
    )
}

export default function TaskItem({
    task,
    client,
    currentClientId,
    availableClients = [],
    showClient = true,
    isEditing = false,
    onToggleComplete,
    onClick,
    onSaveEdit,
    onCancelEdit,
}: TaskItemProps) {
    const isCompleted = task.status === 'completed'
    const [titleDraft, setTitleDraft] = useState(task.title)
    const [dueDraft, setDueDraft] = useState(toDateInput(task.due_at))
    const [selectedClientId, setSelectedClientId] = useState<string>(currentClientId ?? '')
    const [mentionQuery, setMentionQuery] = useState<string | null>(null)
    const titleRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing) {
            setTitleDraft(task.title)
            setDueDraft(toDateInput(task.due_at))
            setSelectedClientId(currentClientId ?? '')
            setMentionQuery(null)
            setTimeout(() => titleRef.current?.focus(), 0)
        }
    }, [isEditing, task.title, task.due_at, currentClientId])

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        onToggleComplete(task)
    }, [task, onToggleComplete])

    const handleSave = useCallback(() => {
        if (!titleDraft.trim()) return
        onSaveEdit?.(task, titleDraft.trim(), dueDraft, selectedClientId || null)
    }, [task, titleDraft, dueDraft, selectedClientId, onSaveEdit])

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setTitleDraft(val)

        // Detect @mention — find last @ not followed by a space
        const lastAt = val.lastIndexOf('@')
        if (lastAt !== -1) {
            const afterAt = val.slice(lastAt + 1)
            if (!afterAt.includes(' ')) {
                setMentionQuery(afterAt)
                return
            }
        }
        setMentionQuery(null)
    }

    const selectMention = (c: ClientOption) => {
        // Strip the @query from title
        const lastAt = titleDraft.lastIndexOf('@')
        setTitleDraft(titleDraft.slice(0, lastAt).trimEnd())
        setSelectedClientId(c.id)
        setMentionQuery(null)
        setTimeout(() => titleRef.current?.focus(), 0)
    }

    const mentionClients = mentionQuery !== null
        ? availableClients.filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
        : []

    const selectedClientName = availableClients.find(c => c.id === selectedClientId)?.name
        ?? (selectedClientId ? client?.name : null)

    const dueInfo = formatDueDate(task.due_at)

    // Inline edit form
    if (isEditing) {
        return (
            <div className="flex flex-col border-b border-border/40 last:border-0 bg-muted/20 relative">
                {/* Title + date + actions row */}
                <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-4 h-4 rounded-full border border-border/50 shrink-0" />
                    <input
                        ref={titleRef}
                        className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground"
                        placeholder="Task title… type @ to link a client"
                        value={titleDraft}
                        onChange={handleTitleChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                if (mentionQuery !== null) { setMentionQuery(null); return }
                                onCancelEdit?.()
                            }
                            if (e.key === 'Enter' && mentionQuery === null) handleSave()
                        }}
                    />
                    <input
                        type="date"
                        className="text-[11px] text-muted-foreground/60 bg-transparent outline-none border-0 cursor-pointer"
                        value={dueDraft}
                        onChange={(e) => setDueDraft(e.target.value)}
                    />
                    <button
                        onClick={handleSave}
                        disabled={!titleDraft.trim()}
                        className="text-[11px] font-medium text-foreground hover:text-foreground/60 disabled:text-muted-foreground/30 transition-colors"
                    >
                        Save
                    </button>
                    <button
                        onClick={onCancelEdit}
                        className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                        Cancel
                    </button>
                </div>

                {/* @mention popup — fixed so it escapes overflow-hidden containers */}
                {mentionQuery !== null && mentionClients.length > 0 && titleRef.current && (
                    <div
                        style={{
                            position: 'fixed',
                            top: titleRef.current.getBoundingClientRect().bottom + 4,
                            left: titleRef.current.getBoundingClientRect().left,
                            zIndex: 50,
                        }}
                        className="bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[180px]"
                    >
                        {mentionClients.map(c => (
                            <button
                                key={c.id}
                                onMouseDown={(e) => { e.preventDefault(); selectMention(c) }}
                                className="w-full text-left px-4 py-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                                <span className="text-muted-foreground/40 mr-0.5">@</span>
                                {c.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Selected client chip */}
                {selectedClientId && selectedClientName && (
                    <div className="flex items-center gap-2 px-4 pb-2.5 pl-11">
                        <span className="flex items-center gap-1 text-[11px] text-foreground/80 bg-muted rounded-full px-2.5 py-0.5">
                            <span className="text-foreground/40">@</span>
                            {selectedClientName}
                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setSelectedClientId('')}
                                className="ml-0.5 text-foreground/30 hover:text-foreground/60 transition-colors"
                            >
                                <X size={9} />
                            </button>
                        </span>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            onClick={() => onClick?.(task)}
            className={[
                'flex items-center gap-3 px-4 py-3 group cursor-pointer',
                'border-b border-border/40 last:border-0',
                'hover:bg-muted/30 transition-colors duration-150',
                isCompleted ? 'opacity-50' : '',
            ].join(' ')}
        >
            {/* Checkbox */}
            <button
                onClick={handleToggle}
                className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground transition-colors"
                title={isCompleted ? 'Mark as uncompleted' : 'Mark as completed'}
            >
                {isCompleted
                    ? <CheckCircle2 size={16} className="text-muted-foreground/50" />
                    : <Circle size={16} />
                }
            </button>

            {/* Title */}
            <span className={`flex-1 text-sm min-w-0 truncate ${isCompleted ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
                {task.title}
            </span>

            {/* Metadata — right side */}
            <div className="flex items-center gap-3 shrink-0">
                {showClient && client && (
                    <div className="hidden sm:flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground/60 truncate max-w-[90px]">
                            {client.name}
                        </span>
                        <ClientAvatar name={client.name} profilePictureUrl={client.profilePictureUrl} />
                    </div>
                )}
                {dueInfo && (
                    <span className={`text-[11px] tabular-nums w-[52px] text-right ${dueInfo.overdue && !isCompleted ? 'text-destructive/70' : 'text-muted-foreground/40'}`}>
                        {dueInfo.label}
                    </span>
                )}
            </div>
        </div>
    )
}
