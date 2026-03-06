import { useState, memo } from 'react'
import { Paperclip, Clock } from 'lucide-react'
import { Draggable } from '@hello-pangea/dnd'
import type { Deal, DealStage, StageTransition } from '@/lib/deals'
import { formatCurrency, getDueDateInfo, getDaysInStageColor } from '@/lib/format'
import { Card } from '@/components/ui/card'
import DealDetailsModal from './DealDetailsModal'
import { getDealIcon } from './DealIcon'
import StageGanttBar from './StageGanttBar'

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
