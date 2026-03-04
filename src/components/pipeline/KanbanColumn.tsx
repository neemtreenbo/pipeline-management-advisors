import { Plus } from 'lucide-react'
import type { Deal, DealStage } from '@/lib/deals'

import DealCard from './DealCard'

interface AttachmentCounts {
    [dealId: string]: { proposal: number; total: number }
}

interface KanbanColumnProps {
    stage: DealStage
    deals: Deal[]
    attachmentCounts: AttachmentCounts
    onDragStart: (e: React.DragEvent, dealId: string, fromStage: DealStage) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent, toStage: DealStage) => void
    onAddDeal: (stage: DealStage) => void
    draggingDealId: string | null
}

const STAGE_COLORS: Record<string, string> = {
    Prospect: 'bg-zinc-100 text-zinc-600',
    Contacted: 'bg-blue-50 text-blue-600',
    'Fact Find': 'bg-purple-50 text-purple-600',
    'Proposal Sent': 'bg-amber-50 text-amber-600',
    Underwriting: 'bg-orange-50 text-orange-600',
    Issued: 'bg-green-50 text-green-700',
    Lost: 'bg-red-50 text-red-600',
}

export default function KanbanColumn({
    stage,
    deals,
    attachmentCounts,
    onDragStart,
    onDragOver,
    onDrop,
    onAddDeal,
    draggingDealId,
}: KanbanColumnProps) {
    const colorClass = STAGE_COLORS[stage] ?? 'bg-muted text-muted-foreground'

    return (
        <div
            className="flex flex-col bg-muted/40 rounded-xl p-3 min-w-[240px] w-64 shrink-0"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, stage)}
            id={`kanban-column-${stage.toLowerCase().replace(/\s+/g, '-')}`}
        >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
                        {stage}
                    </span>
                    {deals.length > 0 && (
                        <span className="text-[11px] text-muted-foreground">{deals.length}</span>
                    )}
                </div>
                <button
                    onClick={() => onAddDeal(stage)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-muted"
                    id={`add-deal-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                    title={`Add deal to ${stage}`}
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Deal cards */}
            <div className="flex flex-col gap-2 flex-1 min-h-[120px]">
                {deals.map((deal) => {
                    const counts = attachmentCounts[deal.id] ?? { proposal: 0, total: 0 }
                    return (
                        <DealCard
                            key={deal.id}
                            deal={deal}
                            proposalCount={counts.proposal}
                            attachmentCount={counts.total}
                            isDragging={draggingDealId === deal.id}
                            onDragStart={onDragStart}
                        />
                    )
                })}

                {deals.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground border-2 border-dashed border-border rounded-lg py-6">
                        Drop here
                    </div>
                )}
            </div>
        </div>
    )
}
