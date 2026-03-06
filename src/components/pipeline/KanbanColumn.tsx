import { memo, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Droppable } from '@hello-pangea/dnd'
import { AnimatePresence } from 'framer-motion'
import type { Deal, DealStage, NewDealInput, StageTransition } from '@/lib/deals'
import { useTheme } from '@/contexts/ThemeContext'

import DealCard from './DealCard'
import InlineAddDeal from './InlineAddDeal'
import ClientAvatar from './ClientAvatar'
import { STAGE_COLORS } from './stageColors'

interface AttachmentCounts {
    [dealId: string]: { proposal: number; total: number }
}

interface KanbanColumnProps {
    stage: DealStage
    deals: Deal[]
    attachmentCounts: AttachmentCounts
    stageHistories: Record<string, StageTransition[]>
    onCreateDeal: (input: NewDealInput) => void
    onStageChange?: (dealId: string, newStage: DealStage) => void
    onDealDeleted?: (dealId: string) => void
}

interface ClientGroup {
    clientId: string
    clientName: string
    profilePictureUrl: string | null
    deals: Deal[]
}

function groupDealsByClient(deals: Deal[]): ClientGroup[] {
    const map = new Map<string, ClientGroup>()
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
    stageHistories,
    onCreateDeal,
    onStageChange,
    onDealDeleted,
}: KanbanColumnProps) {
    const [isAdding, setIsAdding] = useState(false)
    const { theme } = useTheme()
    const isDark = theme === 'dark'
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
            className="flex flex-col bg-muted dark:bg-muted/50 rounded-xl p-3 min-w-[280px] w-72 shrink-0"
            id={`kanban-column-${stage.toLowerCase().replace(/\s+/g, '-')}`}
        >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-2">
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: isDark ? STAGE_COLORS[stage].bgDark : STAGE_COLORS[stage].bg }}
                    />
                    <span className="text-sm font-medium text-foreground dark:text-foreground/80 tracking-wide">
                        {stage}
                    </span>
                    {deals.length > 0 && (
                        <span className="text-xs text-muted-foreground dark:text-muted-foreground/60 tabular-nums">
                            {deals.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="text-muted-foreground/70 dark:text-muted-foreground/50 hover:text-foreground transition-colors duration-150 p-0.5 rounded hover:bg-muted/60"
                    id={`add-deal-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                    title={`Add deal to ${stage}`}
                >
                    <Plus size={13} />
                </button>
            </div>

            {/* Inline add deal form */}
            <AnimatePresence>
                {isAdding && (
                    <div className="mb-2">
                        <InlineAddDeal
                            stage={stage}
                            onCreated={(input) => {
                                onCreateDeal(input)
                                setIsAdding(false)
                            }}
                            onCancel={() => setIsAdding(false)}
                        />
                    </div>
                )}
            </AnimatePresence>

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
                                    <ClientAvatar
                                        name={group.clientName}
                                        profilePictureUrl={group.profilePictureUrl}
                                        size="sm"
                                    />
                                    <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/70 truncate">
                                        {group.clientName}
                                    </span>
                                </div>

                                {/* Deals for this client */}
                                <div className="flex flex-col gap-1.5 pl-1 border-l-2 border-border dark:border-border/30 ml-3">
                                    {group.deals.map((deal) => {
                                        const counts = attachmentCounts[deal.id] ?? { proposal: 0, total: 0 }
                                        return (
                                            <DealCard
                                                key={deal.id}
                                                deal={deal}
                                                index={flatIndexMap.get(deal.id) ?? 0}
                                                proposalCount={counts.proposal}
                                                attachmentCount={counts.total}
                                                stageHistory={stageHistories[deal.id] ?? []}
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
