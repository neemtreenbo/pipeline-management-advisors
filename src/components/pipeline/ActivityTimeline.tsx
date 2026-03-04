import {
    CheckSquare,
    ArrowRight,
    Upload,
    StickyNote,
    Star,
    Activity,
} from 'lucide-react'
import { Link } from 'react-router-dom'


interface ActivityRecord {
    id: string
    event_type: string
    entity_type?: string
    entity_id?: string
    data: Record<string, unknown>
    created_at: string
    actor_id: string
}

interface ActivityTimelineProps {
    activities: ActivityRecord[]
    contextDeals?: { id: string; name: string }[]
}

const EVENT_CONFIG: Record<
    string,
    { icon: React.ReactNode; label: string; color: string }
> = {
    deal_created: {
        icon: <Star size={14} />,
        label: 'Deal created',
        color: 'text-blue-500 bg-blue-50',
    },
    deal_stage_changed: {
        icon: <ArrowRight size={14} />,
        label: 'Stage updated',
        color: 'text-purple-500 bg-purple-50',
    },
    proposal_uploaded: {
        icon: <Upload size={14} />,
        label: 'Proposal uploaded',
        color: 'text-green-600 bg-green-50',
    },
    note_created: {
        icon: <StickyNote size={14} />,
        label: 'Note added',
        color: 'text-amber-600 bg-amber-50',
    },
    note_linked: {
        icon: <StickyNote size={14} />,
        label: 'Note linked',
        color: 'text-amber-600 bg-amber-50',
    },
    note_edited: {
        icon: <StickyNote size={14} />,
        label: 'Note edited',
        color: 'text-amber-600 bg-amber-50',
    },
    task_created: {
        icon: <CheckSquare size={14} />,
        label: 'Task created',
        color: 'text-zinc-600 bg-zinc-100',
    },
    task_completed: {
        icon: <CheckSquare size={14} />,
        label: 'Task completed',
        color: 'text-green-600 bg-green-50',
    },
    task_uncompleted: {
        icon: <CheckSquare size={14} />,
        label: 'Task reopened',
        color: 'text-amber-600 bg-amber-50',
    },
}

function getEventConfig(eventType: string) {
    return (
        EVENT_CONFIG[eventType] ?? {
            icon: <Activity size={14} />,
            label: eventType.replace(/_/g, ' '),
            color: 'text-zinc-500 bg-zinc-100',
        }
    )
}

function getEventDescription(activity: ActivityRecord): React.ReactNode {
    const d = activity.data

    switch (activity.event_type) {
        case 'deal_stage_changed':
            return `Moved to ${d.to_stage as string}`
        case 'proposal_uploaded':
            return `"${d.file_name as string}"`
        case 'note_created':
        case 'note_linked':
        case 'note_edited':
            if (d.note_id) {
                return (
                    <Link
                        to={`/app/notes/${d.note_id as string}`}
                        className="font-medium text-accent hover:underline"
                    >
                        {(d.title as string) ?? 'Note'}
                    </Link>
                )
            }
            return (d.title as string) ?? 'Note'
        case 'task_created':
            return (d.title as string) ?? 'Task'
        case 'task_completed':
        case 'task_uncompleted':
            return (d.title as string) ?? 'Task'
        default:
            return ''
    }
}

function timeAgo(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export default function ActivityTimeline({ activities, contextDeals }: ActivityTimelineProps) {
    if (activities.length === 0) {
        return (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Activity size={16} />
                No activity yet.
            </div>
        )
    }

    return (
        <div className="flex flex-col">
            {activities.map((activity, idx) => {
                const config = getEventConfig(activity.event_type)
                const description = getEventDescription(activity)
                const isLast = idx === activities.length - 1

                return (
                    <div
                        key={activity.id}
                        className="flex gap-3"
                        id={`activity-${activity.id}`}
                    >
                        {/* Timeline line + dot */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${config.color}`}
                            >
                                {config.icon}
                            </div>
                            {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-medium text-foreground">{config.label}</p>
                                    {description && (
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                                            {description}
                                        </p>
                                    )}
                                    {activity.entity_type === 'deal' && contextDeals && contextDeals.find(d => d.id === activity.entity_id) && (
                                        <div className="mt-1">
                                            <Link
                                                to={`/app/deals/${activity.entity_id}`}
                                                className="text-[11px] font-medium text-accent hover:underline flex items-center"
                                            >
                                                → {contextDeals.find(d => d.id === activity.entity_id)?.name}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                                    {timeAgo(activity.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
