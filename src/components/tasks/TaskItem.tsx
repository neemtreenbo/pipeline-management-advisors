import { CheckCircle2, Circle, Calendar } from 'lucide-react'
import type { Task } from '@/lib/tasks'
import { useCallback, useRef, useEffect, useState } from 'react'

interface TaskItemProps {
    task: Task
    client?: { name: string }
    showClient?: boolean
    isEditing?: boolean
    onToggleComplete: (task: Task) => void
    onClick?: (task: Task) => void
    onSaveEdit?: (task: Task, title: string, dueAt: string) => void
    onCancelEdit?: () => void
}

function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function toDateInput(iso: string | null) {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TaskItem({
    task,
    client,
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

    useEffect(() => {
        if (isEditing) {
            setTitleDraft(task.title)
            setDueDraft(toDateInput(task.due_at))
            setTimeout(() => titleRef.current?.focus(), 0)
        }
    }, [isEditing, task.title, task.due_at])

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        onToggleComplete(task)
    }, [task, onToggleComplete])

    const handleSave = useCallback(() => {
        if (!titleDraft.trim()) return
        onSaveEdit?.(task, titleDraft.trim(), dueDraft)
    }, [task, titleDraft, dueDraft, onSaveEdit])

    const formatDueDate = (dateString: string | null) => {
        if (!dateString) return null
        const date = new Date(dateString)
        const today = new Date()
        const isToday =
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        if (isToday) return 'Today'
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
    }

    const dueDateStr = formatDueDate(task.due_at)

    // Inline edit form
    if (isEditing) {
        return (
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50 last:border-0 bg-muted/30">
                <input
                    ref={titleRef}
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave()
                        if (e.key === 'Escape') onCancelEdit?.()
                    }}
                />
                <input
                    type="date"
                    className="text-[12px] text-muted-foreground bg-transparent outline-none border-0 cursor-pointer"
                    value={dueDraft}
                    onChange={(e) => setDueDraft(e.target.value)}
                />
                <button
                    onClick={handleSave}
                    disabled={!titleDraft.trim()}
                    className="text-[12px] font-medium text-accent hover:text-accent/80 disabled:text-muted-foreground/30 transition-colors px-1"
                >
                    Save
                </button>
                <button
                    onClick={onCancelEdit}
                    className="text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                    Cancel
                </button>
            </div>
        )
    }

    // Normal display
    return (
        <div
            onClick={() => onClick?.(task)}
            className={`flex items-start gap-3 p-3 group cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/40 hover:-translate-y-0.5 hover:shadow-md hover:scale-[1.005] hover:z-10 relative transition-all duration-150 ${isCompleted ? 'opacity-50' : ''}`}
        >
            <button
                onClick={handleToggle}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title={isCompleted ? 'Mark as uncompleted' : 'Mark as completed'}
            >
                {isCompleted ? (
                    <CheckCircle2 size={18} className="text-success" />
                ) : (
                    <Circle size={18} />
                )}
            </button>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {showClient && client && (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-primary">{getInitials(client.name)}</span>
                        </div>
                    )}
                    <h4 className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.title}
                    </h4>
                </div>
                {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {task.description}
                    </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                    {dueDateStr && (
                        <div className={`flex items-center gap-1 text-xs ${new Date(task.due_at!) < new Date() && !isCompleted ? 'text-destructive' : 'text-muted-foreground'}`}>
                            <Calendar size={12} />
                            <span>{dueDateStr}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
