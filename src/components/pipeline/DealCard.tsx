import { useNavigate } from 'react-router-dom'
import { Paperclip, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Deal, DealStage } from '@/lib/deals'
import { Card } from '@/components/ui/card'

interface DealCardProps {
    deal: Deal
    proposalCount: number
    attachmentCount: number
    isDragging?: boolean
    onDragStart: (e: React.DragEvent, dealId: string, fromStage: DealStage) => void
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
    proposalCount,
    attachmentCount,
    isDragging = false,
    onDragStart,
}: DealCardProps) {
    const navigate = useNavigate()

    const clientName = deal.client?.name ?? 'Unknown Client'
    const title = (deal.data as Record<string, string>)?.title

    const hasProposal = proposalCount > 0
    const needsProposal = STAGES_NEEDING_PROPOSAL.includes(deal.stage) && !hasProposal

    return (
        <Card
            id={`deal-card-${deal.id}`}
            draggable
            onDragStart={(e) => onDragStart(e, deal.id, deal.stage)}
            onClick={() => navigate(`/app/deals/${deal.id}`)}
            className={[
                'p-3 cursor-pointer select-none',
                'hover:border-zinc-300 hover:shadow-md',
                'transition-all duration-150',
                isDragging ? 'opacity-75 scale-[1.02] rotate-1 shadow-lg' : '',
            ].join(' ')}
        >
            {/* Client name */}
            <p className="text-xs text-muted-foreground truncate mb-0.5">{clientName}</p>

            {/* Deal title or fallback */}
            <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                {title || clientName}
            </h3>

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
    )
}
