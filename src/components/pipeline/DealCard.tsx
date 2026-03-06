import { useState, memo } from 'react'
import { Paperclip, Clock } from 'lucide-react'
import { Draggable } from '@hello-pangea/dnd'
import type { Deal, DealStage, StageTransition } from '@/lib/deals'
import { PIPELINE_STAGES } from '@/lib/deals'
import { Card } from '@/components/ui/card'
import DealDetailsModal from './DealDetailsModal'
import { getDealIcon } from './DealIcon'
import { STAGE_COLORS } from './stageColors'

interface DealCardProps {
    deal: Deal
    index: number
    proposalCount: number
    attachmentCount: number
    stageHistory: StageTransition[]
    onStageChange?: (dealId: string, newStage: DealStage) => void
    onDeleted?: (dealId: string) => void
}

const STAGES_NEEDING_PROPOSAL: DealStage[] = ['Proposal Presented', 'Decision Pending']

function formatCurrency(value: number) {
    if (!value) return null
    if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `₱${(value / 1_000).toFixed(0)}K`
    return `₱${value.toLocaleString()}`
}

function getDaysInStageColor(days: number): string {
    if (days > 30) return 'text-destructive'
    if (days > 14) return 'text-warning'
    return 'text-muted-foreground dark:text-muted-foreground/50'
}

function getDueDateInfo(dueDate: string | null): { label: string; color: string } | null {
    if (!dueDate) return null
    const due = new Date(dueDate)
    const now = new Date()
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const label = due.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

    if (diffDays < 0) return { label, color: 'text-destructive' }
    if (diffDays <= 7) return { label, color: 'text-warning' }
    return { label, color: 'text-muted-foreground dark:text-muted-foreground/50' }
}

/** Mini Gantt bar showing time spent in each stage with distinct colors */
function StageGanttBar({ history, currentStage }: { history: StageTransition[]; currentStage: DealStage }) {
    if (history.length === 0) return null

    const currentStageIdx = PIPELINE_STAGES.indexOf(currentStage)
    const totalDays = history.reduce((sum, t) => sum + t.daysInStage, 0)
    const isDark = document.documentElement.classList.contains('dark')

    return (
        <div className="flex gap-[2px] mt-2 h-[4px] rounded-full overflow-hidden">
            {PIPELINE_STAGES.map((stage, idx) => {
                const transition = history.find(t => t.stage === stage)
                const colors = STAGE_COLORS[stage]

                if (idx > currentStageIdx) {
                    // Future stage — muted placeholder
                    return (
                        <div
                            key={stage}
                            className="flex-1 bg-border/30 dark:bg-muted-foreground/8 rounded-full"
                            title={stage}
                        />
                    )
                }

                const widthPercent = transition
                    ? Math.max(8, (transition.daysInStage / Math.max(totalDays, 1)) * 100)
                    : 8

                return (
                    <div
                        key={stage}
                        className="rounded-full"
                        style={{
                            flex: `${widthPercent} 0 0%`,
                            backgroundColor: isDark ? colors.bgDark : colors.bg,
                        }}
                        title={`${stage}${transition ? ` — ${transition.daysInStage}d` : ''}`}
                    />
                )
            })}
        </div>
    )
}

export default memo(function DealCard({
    deal,
    index,
    proposalCount,
    attachmentCount,
    stageHistory,
    onStageChange,
    onDeleted,
}: DealCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    const title = (deal.data as Record<string, string>)?.title

    const hasProposal = proposalCount > 0
    const needsProposal = STAGES_NEEDING_PROPOSAL.includes(deal.stage) && !hasProposal
    const formattedValue = deal.value > 0 ? formatCurrency(deal.value) : null

    // Days in current stage
    const currentTransition = stageHistory.length > 0
        ? stageHistory[stageHistory.length - 1]
        : null
    const daysInStage = currentTransition?.daysInStage ?? null

    // Due date
    const dueDateInfo = getDueDateInfo(deal.due_date)

    return (
        <>
            <Draggable draggableId={deal.id} index={index}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="select-none"
                        style={provided.draggableProps.style}
                    >
                        <Card
                            id={`deal-card-${deal.id}`}
                            onClick={() => setIsModalOpen(true)}
                            className={[
                                'px-3 py-2.5 cursor-pointer select-none bg-card border-border/80 dark:border-border/60',
                                'hover:border-border hover:shadow-md hover:-translate-y-0.5',
                                'transition-all duration-150',
                                snapshot.isDragging
                                    ? 'opacity-80 scale-[1.02] shadow-lg rotate-[0.5deg]'
                                    : '',
                            ].join(' ')}
                        >
                            {/* Deal title with icon and value */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground/60 dark:text-muted-foreground/40 shrink-0">
                                    {getDealIcon(title || '', 13)}
                                </span>
                                <h3 className="text-sm font-medium text-foreground leading-snug truncate flex-1">
                                    {title || deal.client?.name || 'Untitled'}
                                </h3>
                                {formattedValue && (
                                    <span className="text-xs text-foreground/80 dark:text-foreground/50 font-medium tabular-nums shrink-0">
                                        {formattedValue}
                                    </span>
                                )}
                            </div>

                            {/* Gantt bar */}
                            <StageGanttBar history={stageHistory} currentStage={deal.stage} />

                            {/* Footer row */}
                            <div className="flex items-center gap-2 mt-1.5">
                                {hasProposal && (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground dark:text-muted-foreground/60">
                                        <span className="w-1.5 h-1.5 rounded-full bg-success/70 shrink-0" />
                                        Proposal
                                    </span>
                                )}
                                {needsProposal && (
                                    <span className="flex items-center gap-1 text-[11px] text-warning/80">
                                        <span className="w-1.5 h-1.5 rounded-full bg-warning/60 shrink-0" />
                                        Missing
                                    </span>
                                )}

                                {daysInStage !== null && (
                                    <span className={`flex items-center gap-0.5 text-[11px] tabular-nums ${getDaysInStageColor(daysInStage)}`}>
                                        <Clock size={10} />
                                        {daysInStage}d
                                    </span>
                                )}

                                {dueDateInfo && (
                                    <span className={`text-[11px] ${dueDateInfo.color}`}>
                                        {dueDateInfo.label}
                                    </span>
                                )}

                                {attachmentCount > 0 && (
                                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground dark:text-muted-foreground/50 ml-auto">
                                        <Paperclip size={11} />
                                        {attachmentCount}
                                    </span>
                                )}
                            </div>
                        </Card>
                    </div>
                )}
            </Draggable>

            {isModalOpen && (
                <DealDetailsModal
                    dealId={deal.id}
                    onClose={() => setIsModalOpen(false)}
                    onStageChange={onStageChange}
                    onDeleted={onDeleted}
                />
            )}
        </>
    )
})
