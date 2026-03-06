import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import type { Task } from '@/lib/tasks'
import { toDateInput, formatDueDate } from '@/lib/date-utils'
import { useMention } from '@/hooks/useMention'
import type { ClientOption } from '@/hooks/useMention'
import MentionPopup from '@/components/ui/MentionPopup'
import ClientChip from '@/components/ui/ClientChip'

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

const ClientAvatar = React.memo(function ClientAvatar({ name, profilePictureUrl }: { name: string; profilePictureUrl?: string | null }) {
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
})

const TaskItem = React.memo(function TaskItem({
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
    const titleRef = useRef<HTMLInputElement>(null)

    const mention = useMention(availableClients, currentClientId)

    // Resolve name with fallback to client prop
    const resolvedClientName = mention.selectedClientName ?? (mention.selectedClientId ? client?.name : null) ?? null

    useEffect(() => {
        if (isEditing) {
            setTitleDraft(task.title)
            setDueDraft(toDateInput(task.due_at))
            mention.reset(currentClientId)
            setTimeout(() => titleRef.current?.focus(), 0)
        }
    }, [isEditing, task.title, task.due_at, currentClientId])

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        onToggleComplete(task)
    }, [task, onToggleComplete])

    const handleSave = useCallback(() => {
        if (!titleDraft.trim()) return
        onSaveEdit?.(task, titleDraft.trim(), dueDraft, mention.selectedClientId || null)
    }, [task, titleDraft, dueDraft, mention.selectedClientId, onSaveEdit])

    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setTitleDraft(val)
        mention.detectMention(val)
    }, [mention])

    const handleSelectMention = useCallback((c: ClientOption) => {
        setTitleDraft(prev => mention.selectMention(c, prev))
        setTimeout(() => titleRef.current?.focus(), 0)
    }, [mention])

    const dueInfo = useMemo(() => formatDueDate(task.due_at), [task.due_at])

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
                                if (mention.mentionQuery !== null) { mention.closeMention(); return }
                                onCancelEdit?.()
                            }
                            if (e.key === 'Enter' && mention.mentionQuery === null) handleSave()
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

                {/* @mention popup */}
                {mention.mentionQuery !== null && mention.mentionClients.length > 0 && (
                    <MentionPopup
                        clients={mention.mentionClients}
                        anchorRef={titleRef}
                        onSelect={handleSelectMention}
                    />
                )}

                {/* Selected client chip */}
                {mention.selectedClientId && resolvedClientName && (
                    <ClientChip
                        name={resolvedClientName}
                        onRemove={() => mention.setSelectedClientId('')}
                    />
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
})

export default TaskItem
