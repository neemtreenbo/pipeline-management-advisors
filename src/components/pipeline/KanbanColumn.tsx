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
}

const STAGE_COLORS: Record<string, string> = {
    Opportunity: 'bg-zinc-100 text-zinc-600',
    Contacted: 'bg-blue-50 text-blue-600',
    Engaged: 'bg-purple-50 text-purple-600',
    'Schedule To Present': 'bg-amber-50 text-amber-600',
    'Proposal Presented': 'bg-orange-50 text-orange-600',
    'Decision Pending': 'bg-yellow-50 text-yellow-700',
    Closed: 'bg-green-50 text-green-700',
}

export default function KanbanColumn({
    stage,
    deals,
    attachmentCounts,
    onAddDeal,
}: KanbanColumnProps) {
    const colorClass = STAGE_COLORS[stage] ?? 'bg-muted text-muted-foreground'

    return (
        <div
            className="flex flex-col bg-muted/40 rounded-xl p-3 min-w-[240px] w-64 shrink-0"
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
            <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col gap-2 flex-1 min-h-[120px] rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-black/5' : ''
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
                                />
                            )
                        })}
                        {provided.placeholder}

                        {deals.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground border-2 border-dashed border-border/50 rounded-lg py-6 my-1">
                                Drop here
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </div>
    )
}
