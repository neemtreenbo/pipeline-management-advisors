import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'

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

const EVENT_LABELS: Record<string, string> = {
    deal_created: 'Deal created',
    deal_stage_changed: 'Stage changed',
    proposal_uploaded: 'Proposal uploaded',
    note_created: 'Note added',
    note_linked: 'Note linked',
    note_edited: 'Note edited',
    task_created: 'Task added',
    task_completed: 'Task completed',
    task_uncompleted: 'Task reopened',
}

function getLabel(eventType: string) {
    return EVENT_LABELS[eventType] ?? eventType.replace(/_/g, ' ')
}

function getDetail(activity: ActivityRecord): React.ReactNode {
    const d = activity.data

    switch (activity.event_type) {
        case 'deal_created':
            return d.title ? `"${d.title as string}"` : null
        case 'deal_stage_changed':
            return (
                <span className="inline-flex items-center gap-1">
                    <span className="text-muted-foreground/60">{d.from_stage as string}</span>
                    <span className="text-muted-foreground/30">→</span>
                    <span className="text-foreground/70 font-medium">{d.to_stage as string}</span>
                </span>
            )
        case 'proposal_uploaded':
            return d.file_name ? (d.file_name as string) : null
        case 'note_created':
        case 'note_linked':
        case 'note_edited':
            if (d.note_id) {
                return (
                    <Link
                        to={`/app/notes/${d.note_id as string}`}
                        className="text-accent hover:underline underline-offset-2"
                    >
                        {(d.title as string) || 'Untitled note'}
                    </Link>
                )
            }
            return (d.title as string) || null
        case 'task_created':
        case 'task_completed':
        case 'task_uncompleted':
            return (d.title as string) || null
        default:
            return null
    }
}

function formatTime(dateStr: string): string {
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

function formatAbsolute(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

function getDotStyle(eventType: string): string {
    if (eventType === 'task_completed') return 'bg-foreground/50'
    if (eventType === 'deal_stage_changed') return 'bg-foreground/70'
    if (eventType === 'proposal_uploaded') return 'bg-foreground/60'
    return 'bg-border'
}

export default function ActivityTimeline({ activities, contextDeals }: ActivityTimelineProps) {
    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <Activity size={18} className="text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground/40">No activity yet</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col">
            {activities.map((activity, idx) => {
                const detail = getDetail(activity)
                const isLast = idx === activities.length - 1
                const dealContext = contextDeals?.find(d => d.id === activity.entity_id)
                const isDealActivity = activity.entity_type === 'deal' && !!dealContext

                return (
                    <div key={activity.id} className="flex gap-3">
                        {/* Dot + line */}
                        <div className="flex flex-col items-center pt-[5px]">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDotStyle(activity.event_type)}`} />
                            {!isLast && <div className="w-px flex-1 bg-border/50 mt-2 mb-1" />}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-4'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">

                                    {isDealActivity ? (
                                        // Client context: deal name is the primary anchor, event is secondary
                                        <>
                                            <Link
                                                to={`/app/pipeline?deal=${activity.entity_id}`}
                                                className="text-[13px] font-medium text-foreground/80 hover:text-accent transition-colors duration-150 leading-snug truncate block"
                                            >
                                                {dealContext!.name}
                                            </Link>
                                            <p className="text-[12px] text-muted-foreground/60 mt-0.5 leading-snug">
                                                {getLabel(activity.event_type)}
                                                {detail && (
                                                    <>
                                                        <span className="mx-1 text-muted-foreground/30">·</span>
                                                        <span className="text-[12px]">{detail}</span>
                                                    </>
                                                )}
                                            </p>
                                        </>
                                    ) : (
                                        // Deal modal context or non-deal activity: event label is primary
                                        <>
                                            <p className="text-[13px] font-medium text-foreground/80 leading-snug">
                                                {getLabel(activity.event_type)}
                                            </p>
                                            {detail && (
                                                <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                                                    {detail}
                                                </p>
                                            )}
                                        </>
                                    )}

                                </div>

                                <time
                                    className="text-[11px] text-muted-foreground/40 shrink-0 tabular-nums mt-0.5"
                                    title={formatAbsolute(activity.created_at)}
                                >
                                    {formatTime(activity.created_at)}
                                </time>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
