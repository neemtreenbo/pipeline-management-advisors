import { CheckCircle2, Circle, Calendar } from 'lucide-react'
import type { Task } from '@/lib/tasks'
import { useCallback } from 'react'

interface TaskItemProps {
    task: Task
    client?: { name: string }
    onToggleComplete: (task: Task) => void
    onClick?: (task: Task) => void
}

function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function TaskItem({ task, client, onToggleComplete, onClick }: TaskItemProps) {
    const isCompleted = task.status === 'completed'

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        onToggleComplete(task)
    }, [task, onToggleComplete])



    const formatDueDate = (dateString: string | null) => {
        if (!dateString) return null
        const date = new Date(dateString)
        const today = new Date()
        const isToday = date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()

        if (isToday) return 'Today'
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
    }

    const dueDateStr = formatDueDate(task.due_at)

    return (
        <div
            onClick={() => onClick?.(task)}
            className={`flex items-start gap-3 p-3 group cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors ${isCompleted ? 'opacity-50' : ''
                }`}
        >
            <button
                onClick={handleToggle}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title={isCompleted ? "Mark as uncompleted" : "Mark as completed"}
            >
                {isCompleted ? (
                    <CheckCircle2 size={18} className="text-success" />
                ) : (
                    <Circle size={18} />
                )}
            </button>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {client && (
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
                        <div className={`flex items-center gap-1 text-xs ${new Date(task.due_at!) < new Date() && !isCompleted ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                            <Calendar size={12} />
                            <span>{dueDateStr}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
