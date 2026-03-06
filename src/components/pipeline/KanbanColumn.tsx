import { memo, useMemo } from 'react'
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
    onDealDeleted?: (dealId: string) => void
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
}

interface ClientGroup {
    clientId: string
    clientName: string
    profilePictureUrl: string | null
    deals: Deal[]
}

function groupDealsByClient(deals: Deal[]): ClientGroup[] {
    const map = new Map<string, ClientGroup>()
    // Build a flat index to preserve drag indices
    deals.forEach((deal) => {
        const cid = deal.client_id ?? 'unknown'
        if (!map.has(cid)) {
            map.set(cid, {
                clientId: cid,
                clientName: deal.client?.name ?? 'Unknown Client',
                profilePictureUrl: deal.client?.profile_picture_url ?? null,
                deals: [],
            })
        }
        map.get(cid)!.deals.push(deal)
    })
    return Array.from(map.values())
}

export default memo(function KanbanColumn({
    stage,
    deals,
    attachmentCounts,
    onAddDeal,
    onStageChange,
    onDealDeleted,
}: KanbanColumnProps) {
    const clientGroups = useMemo(() => groupDealsByClient(deals), [deals])

    // Build a flat index map for Draggable indices (must be sequential within droppable)
    const flatIndexMap = useMemo(() => {
        const map = new Map<string, number>()
        let idx = 0
        for (const group of clientGroups) {
            for (const deal of group.deals) {
                map.set(deal.id, idx++)
            }
        }
        return map
    }, [clientGroups])

    return (
        <div
            className="flex flex-col bg-muted/50 rounded-xl p-3 min-w-[280px] w-72 shrink-0"
            id={`kanban-column-${stage.toLowerCase().replace(/\s+/g, '-')}`}
        >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground/80 tracking-wide">
                        {stage}
                    </span>
                    {deals.length > 0 && (
                        <span className="text-xs text-muted-foreground/60 tabular-nums">
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

            {/* Deal cards grouped by client */}
            <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col gap-3 flex-1 min-h-[120px] rounded-lg transition-all duration-150 ${
                            snapshot.isDraggingOver ? 'ring-1 ring-border bg-muted/30' : ''
                        }`}
                    >
                        {clientGroups.map((group) => (
                            <div key={group.clientId} className="flex flex-col gap-1.5">
                                {/* Client header */}
                                <div className="flex items-center gap-2 px-1 pt-1">
                                    {group.profilePictureUrl ? (
                                        <img
                                            src={group.profilePictureUrl}
                                            alt={group.clientName}
                                            className="w-5 h-5 rounded-full object-cover shrink-0"
                                        />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-muted-foreground/15 flex items-center justify-center shrink-0">
                                            <span className="text-[9px] font-semibold text-muted-foreground/70 leading-none">
                                                {getInitials(group.clientName)}
                                            </span>
                                        </div>
                                    )}
                                    <span className="text-xs font-medium text-muted-foreground/70 truncate">
                                        {group.clientName}
                                    </span>
                                </div>

                                {/* Deals for this client */}
                                <div className="flex flex-col gap-1.5 pl-1 border-l-2 border-border/30 ml-3">
                                    {group.deals.map((deal) => {
                                        const counts = attachmentCounts[deal.id] ?? { proposal: 0, total: 0 }
                                        return (
                                            <DealCard
                                                key={deal.id}
                                                deal={deal}
                                                index={flatIndexMap.get(deal.id) ?? 0}
                                                proposalCount={counts.proposal}
                                                attachmentCount={counts.total}
                                                onStageChange={onStageChange}
                                                onDeleted={onDealDeleted}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                        {provided.placeholder}

                        {deals.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex-1 flex items-center justify-center min-h-[80px]">
                                <span className="text-xs text-muted-foreground/40">No deals</span>
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </div>
    )
})
