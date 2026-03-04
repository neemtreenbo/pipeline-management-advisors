import { useState } from 'react'
import { Paperclip, AlertTriangle, CheckCircle2 } from 'lucide-react'
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
}: DealCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    const clientName = deal.client?.name ?? 'Unknown Client'
    const title = (deal.data as Record<string, string>)?.title

    const hasProposal = proposalCount > 0
    const needsProposal = STAGES_NEEDING_PROPOSAL.includes(deal.stage) && !hasProposal

    return (
        <>
            <Draggable draggableId={deal.id} index={index}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="select-none relative z-10"
                        style={provided.draggableProps.style}
                    >
                        <Card
                            id={`deal-card-${deal.id}`}
                            onClick={() => setIsModalOpen(true)}
                            className={[
                                'p-3 cursor-pointer select-none relative h-full',
                                'hover:border-zinc-300 hover:shadow-md',
                                'transition-all duration-150',
                                snapshot.isDragging ? 'opacity-90 scale-[1.02] rotate-1 shadow-xl border-primary ring-1 ring-primary/20 z-50' : '',
                            ].join(' ')}
                        >
                            {/* Client name */}
                            <p className="text-xs text-muted-foreground truncate mb-0.5">{clientName}</p>

                            {/* Deal title or fallback */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-muted-foreground shrink-0 shadow-sm border border-border/50 bg-muted/30 rounded p-0.5">
                                    {getDealIcon(title || '', 12)}
                                </span>
                                <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                                    {title || clientName}
                                </h3>
                            </div>

                            {/* Value */}
                            {deal.value > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatCurrency(deal.value)}
                                </p>
                            )}

                            {/* Badges row */}
                            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                {/* Proposal badge */}
                                {hasProposal && (
                                    <span className="flex items-center gap-1 text-[11px] font-medium text-success">
                                        <CheckCircle2 size={11} />
                                        Proposal ✓
                                    </span>
                                )}
                                {needsProposal && (
                                    <span className="flex items-center gap-1 text-[11px] font-medium text-warning">
                                        <AlertTriangle size={11} />
                                        Proposal missing
                                    </span>
                                )}

                                {/* Attachment count */}
                                {attachmentCount > 0 && (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
                                        <Paperclip size={11} />
                                        {attachmentCount}
                                    </span>
                                )}
                            </div>

                            {/* Expected close */}
                            {deal.expected_close_date && (
                                <p className="text-[11px] text-muted-foreground mt-1.5">
                                    Close {new Date(deal.expected_close_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                </p>
                            )}
                        </Card>
                    </div>
                )}
            </Draggable>

            {isModalOpen && (
                <DealDetailsModal
                    dealId={deal.id}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </>
    )
}
