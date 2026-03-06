import { useNavigate } from 'react-router-dom'
import {
    ChevronRight,
    AlertCircle,
    Clock,
    CircleDot,
    CheckCircle,
    Zap,
    Settings2,
    RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActionItem } from '@/lib/dashboard'

const URGENCY_STYLES = {
    high: {
        dot: 'bg-destructive',
        badge: 'text-destructive bg-destructive/8',
        label: 'High',
        icon: <AlertCircle size={12} />,
    },
    medium: {
        dot: 'bg-warning',
        badge: 'text-amber-600 dark:text-amber-400 bg-warning/10',
        label: 'Med',
        icon: <Clock size={12} />,
    },
    low: {
        dot: 'bg-accent',
        badge: 'text-accent bg-accent/8',
        label: 'Low',
        icon: <CircleDot size={12} />,
    },
}

function ActionItemRow({ item }: { item: ActionItem }) {
    const navigate = useNavigate()
    const style = URGENCY_STYLES[item.urgency]
    const title = item.dealTitle || item.taskTitle || ''
    const subtitle = item.clientName

    return (
        <button
            onClick={() => navigate(item.link)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors duration-150 group"
        >
            {/* Urgency dot */}
            <span className={cn('w-2 h-2 rounded-full shrink-0', style.dot)} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                        {title}
                    </span>
                    {subtitle && (
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                            {subtitle}
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {item.reason}
                </p>
            </div>

            {/* Urgency badge */}
            <span
                className={cn(
                    'text-[10px] font-medium rounded px-1.5 py-0.5 shrink-0 flex items-center gap-1',
                    style.badge
                )}
            >
                {style.icon}
                {style.label}
            </span>

            {/* Action */}
            <span className="text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 hidden sm:flex items-center gap-0.5">
                {item.actionLabel}
                <ChevronRight size={12} />
            </span>
        </button>
    )
}

interface ActionItemsBarProps {
    items: ActionItem[]
    loading: boolean
    onOpenRules?: () => void
    onRefresh?: () => void
}

export default function ActionItemsBar({
    items,
    loading,
    onOpenRules,
    onRefresh,
}: ActionItemsBarProps) {
    const highCount = items.filter((i) => i.urgency === 'high').length
    const medCount = items.filter((i) => i.urgency === 'medium').length

    if (loading) {
        return (
            <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="px-4 py-3 border-b border-border">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                </div>
                <div className="divide-y divide-border">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="px-4 py-3 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-muted" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3.5 w-48 bg-muted rounded animate-pulse" />
                                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-border bg-card shadow-sm">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-accent" />
                    <span className="text-sm font-semibold text-foreground">
                        Action Items
                    </span>
                    {items.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {items.length}
                        </span>
                    )}
                    {highCount > 0 && (
                        <span className="text-[10px] font-medium text-destructive bg-destructive/8 rounded px-1.5 py-0.5">
                            {highCount} urgent
                        </span>
                    )}
                    {medCount > 0 && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-warning/10 rounded px-1.5 py-0.5">
                            {medCount} attention
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="p-1 rounded-md hover:bg-muted transition-colors duration-150"
                            title="Refresh"
                        >
                            <RefreshCw
                                size={14}
                                className={cn(
                                    'text-muted-foreground',
                                    loading && 'animate-spin'
                                )}
                            />
                        </button>
                    )}
                    {onOpenRules && (
                        <button
                            onClick={onOpenRules}
                            className="p-1 rounded-md hover:bg-muted transition-colors duration-150"
                            title="Configure rules"
                        >
                            <Settings2 size={14} className="text-muted-foreground" />
                        </button>
                    )}
                </div>
            </div>

            {/* Items */}
            {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                    <CheckCircle
                        size={20}
                        className="text-success mx-auto mb-2"
                    />
                    <p className="text-sm text-muted-foreground">
                        All clear — no urgent actions right now.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-border">
                    {items.map((item) => (
                        <ActionItemRow key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    )
}
