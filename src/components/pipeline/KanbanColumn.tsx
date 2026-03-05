import { Plus } from 'lucide-react'
import { Droppable } from '@hello-pangea/dnd'
import type { Deal, DealStage } from '@/lib/deals'

import DealCard from './DealCard'

interface AttachmentCounts {
    [dealId: string]: { proposal: number; total: number }
}

interface KanbanColumnProps {
    stage: DealStage
    deals: Deal[]
    attachmentCounts: AttachmentCounts
    onAddDeal: (stage: DealStage) => void
    onStageChange?: (dealId: string, newStage: DealStage) => void
}

export default function KanbanColumn({
    stage,
    deals,
    attachmentCounts,
    onAddDeal,
    onStageChange,
}: KanbanColumnProps) {
    return (
        <div
            className="flex flex-col bg-muted/50 rounded-xl p-3 min-w-[240px] w-64 shrink-0"
            id={`kanban-column-${stage.toLowerCase().replace(/\s+/g, '-')}`}
        >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-foreground/80 tracking-wide">
                        {stage}
                    </span>
                    {deals.length > 0 && (
                        <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                            {deals.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => onAddDeal(stage)}
                    className="text-muted-foreground/50 hover:text-foreground transition-colors duration-150 p-0.5 rounded hover:bg-muted/60"
                    id={`add-deal-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                    title={`Add deal to ${stage}`}
                >
                    <Plus size={13} />
                </button>
            </div>

            {/* Deal cards */}
            <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col gap-2 flex-1 min-h-[120px] rounded-lg transition-all duration-150 ${
                            snapshot.isDraggingOver ? 'ring-1 ring-border bg-muted/30' : ''
                        }`}
                    >
                        {deals.map((deal, index) => {
                            const counts = attachmentCounts[deal.id] ?? { proposal: 0, total: 0 }
                            return (
                                <DealCard
                                    key={deal.id}
                                    deal={deal}
                                    index={index}
                                    proposalCount={counts.proposal}
                                    attachmentCount={counts.total}
                                    onStageChange={onStageChange}
                                />
                            )
                        })}
                        {provided.placeholder}

                        {deals.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex-1 flex items-center justify-center min-h-[80px]">
                                <span className="text-[11px] text-muted-foreground/40">No deals</span>
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </div>
    )
}
