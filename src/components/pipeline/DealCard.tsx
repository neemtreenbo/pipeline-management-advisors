import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import { Draggable } from '@hello-pangea/dnd'
import type { Deal, DealStage } from '@/lib/deals'
import { Card } from '@/components/ui/card'
import DealDetailsModal from './DealDetailsModal'
import { getDealIcon } from './DealIcon'

interface DealCardProps {
    deal: Deal
    index: number
    proposalCount: number
    attachmentCount: number
    onStageChange?: (dealId: string, newStage: DealStage) => void
}

const STAGES_NEEDING_PROPOSAL: DealStage[] = ['Proposal Presented', 'Decision Pending']

function formatCurrency(value: number) {
    if (!value) return null
    if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `₱${(value / 1_000).toFixed(0)}K`
    return `₱${value.toLocaleString()}`
}

export default function DealCard({
    deal,
    index,
    proposalCount,
    attachmentCount,
    onStageChange,
}: DealCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    const clientName = deal.client?.name ?? 'Unknown Client'
    const title = (deal.data as Record<string, string>)?.title

    const hasProposal = proposalCount > 0
    const needsProposal = STAGES_NEEDING_PROPOSAL.includes(deal.stage) && !hasProposal
    const formattedValue = deal.value > 0 ? formatCurrency(deal.value) : null
    const closeDate = deal.expected_close_date
        ? new Date(deal.expected_close_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
        : null

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
                                'p-3 cursor-pointer select-none bg-white border-border/60',
                                'hover:border-border hover:shadow-md hover:-translate-y-1 hover:scale-[1.015]',
                                'transition-all duration-150',
                                snapshot.isDragging
                                    ? 'opacity-80 scale-[1.02] shadow-lg rotate-[0.5deg]'
                                    : '',
                            ].join(' ')}
                        >
                            {/* Client label */}
                            <p className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground/60 truncate mb-1.5">
                                {clientName}
                            </p>

                            {/* Deal title with inline icon */}
                            <div className="flex items-start gap-1.5">
                                <span className="text-muted-foreground/40 shrink-0 mt-px">
                                    {getDealIcon(title || '', 11)}
                                </span>
                                <h3 className="text-[13px] font-medium text-foreground leading-snug">
                                    {title || clientName}
                                </h3>
                            </div>

                            {/* Value */}
                            {formattedValue && (
                                <p className="text-xs text-foreground/50 font-medium mt-1.5 tabular-nums">
                                    {formattedValue}
                                </p>
                            )}

                            {/* Footer row */}
                            {(hasProposal || needsProposal || attachmentCount > 0 || closeDate) && (
                                <div className="flex items-center gap-3 mt-2.5">
                                    {/* Proposal status */}
                                    {hasProposal && (
                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
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

                                    {/* Close date */}
                                    {closeDate && (
                                        <span className="text-[11px] text-muted-foreground/50">
                                            {closeDate}
                                        </span>
                                    )}

                                    {/* Attachments */}
                                    {attachmentCount > 0 && (
                                        <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground/50 ml-auto">
                                            <Paperclip size={10} />
                                            {attachmentCount}
                                        </span>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </Draggable>

            {isModalOpen && (
                <DealDetailsModal
                    dealId={deal.id}
                    onClose={() => setIsModalOpen(false)}
                    onStageChange={onStageChange}
                />
            )}
        </>
    )
}
