import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { ACCENT_PALETTE, getAccentBg } from '@/lib/colors'

export interface ActivityRecord {
    id: string
    event_type: string
    entity_type?: string
    entity_id?: string
    data: Record<string, unknown>
    created_at: string
    actor_id: string
    actor?: { full_name: string; avatar_url: string | null }
}

interface ActivityTimelineProps {
    activities: ActivityRecord[]
    contextDeals?: { id: string; name: string }[]
    showActorNames?: boolean
}

const EVENT_LABELS: Record<string, string> = {
    deal_created: 'Deal created',
    deal_stage_changed: 'Stage changed',
    deal_value_changed: 'Deal value changed',
    deal_deleted: 'Deal deleted',
    proposal_uploaded: 'Proposal uploaded',
    note_created: 'Note added',
    note_linked: 'Note linked',
    note_edited: 'Note edited',
    task_created: 'Task added',
    task_completed: 'Task completed',
    task_uncompleted: 'Task reopened',
    task_assigned: 'Task assigned',
    task_deleted: 'Task deleted',
    client_created: 'Client created',
    client_edited: 'Client edited',
    client_deleted: 'Client deleted',
    service_created: 'Service record created',
    service_completed: 'Service completed',
    service_status_changed: 'Service status changed',
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
                    <span className="text-muted-foreground/30">&rarr;</span>
                    <span className="text-foreground/70 font-medium">{d.to_stage as string}</span>
                </span>
            )
        case 'deal_value_changed':
            return (
                <span className="inline-flex items-center gap-1">
                    <span className="text-muted-foreground/60">${Number(d.from_value).toLocaleString()}</span>
                    <span className="text-muted-foreground/30">&rarr;</span>
                    <span className="text-foreground/70 font-medium">${Number(d.to_value).toLocaleString()}</span>
                </span>
            )
        case 'deal_deleted':
            return d.title ? `"${d.title as string}"` : null
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
        case 'task_assigned':
        case 'task_deleted':
            return (d.title as string) || null
        case 'client_created':
        case 'client_deleted':
            return (d.name as string) || null
        case 'client_edited': {
            const fields = d.changed_fields as string[] | undefined
            return fields ? `Fields: ${fields.join(', ')}` : null
        }
        case 'service_created':
            return d.title ? `"${d.title as string}"` : null
        case 'service_completed':
            return d.title ? `"${d.title as string}"` : null
        case 'service_status_changed':
            return (
                <span className="inline-flex items-center gap-1">
                    <span className="text-muted-foreground/60">{d.from_status as string}</span>
                    <span className="text-muted-foreground/30">&rarr;</span>
                    <span className="text-foreground/70 font-medium">{d.to_status as string}</span>
                </span>
            )
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

const EVENT_DOT_COLORS: Record<string, typeof ACCENT_PALETTE[keyof typeof ACCENT_PALETTE]> = {
    deal_created:       ACCENT_PALETTE.blue,
    deal_stage_changed: ACCENT_PALETTE.purple,
    deal_value_changed: ACCENT_PALETTE.purple,
    deal_deleted:       ACCENT_PALETTE.red,
    proposal_uploaded:  ACCENT_PALETTE.orange,
    note_created:       ACCENT_PALETTE.gold,
    note_linked:        ACCENT_PALETTE.gold,
    note_edited:        ACCENT_PALETTE.gold,
    task_created:       ACCENT_PALETTE.teal,
    task_completed:     ACCENT_PALETTE.green,
    task_uncompleted:   ACCENT_PALETTE.cyan,
    task_assigned:      ACCENT_PALETTE.teal,
    task_deleted:       ACCENT_PALETTE.red,
    client_created:     ACCENT_PALETTE.blue,
    client_edited:      ACCENT_PALETTE.purple,
    client_deleted:     ACCENT_PALETTE.red,
    service_created:    ACCENT_PALETTE.orange,
    service_completed:  ACCENT_PALETTE.green,
    service_status_changed: ACCENT_PALETTE.orange,
}

export default function ActivityTimeline({ activities, contextDeals, showActorNames = false }: ActivityTimelineProps) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

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
                const actorName = showActorNames && activity.actor?.full_name

                return (
                    <div key={activity.id} className="flex gap-3">
                        {/* Dot + line */}
                        <div className="flex flex-col items-center pt-[5px]">
                            <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{
                                    backgroundColor: EVENT_DOT_COLORS[activity.event_type]
                                        ? getAccentBg(EVENT_DOT_COLORS[activity.event_type], isDark)
                                        : 'hsl(var(--border))',
                                }}
                            />
                            {!isLast && <div className="w-px flex-1 bg-border/50 mt-2 mb-1" />}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-4'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">

                                    {isDealActivity ? (
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
                                                        <span className="mx-1 text-muted-foreground/30">&middot;</span>
                                                        <span className="text-[12px]">{detail}</span>
                                                    </>
                                                )}
                                            </p>
                                        </>
                                    ) : (
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

                                    {actorName && (
                                        <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                                            by {actorName}
                                        </p>
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
