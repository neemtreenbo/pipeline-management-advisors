import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { usePageActions } from '@/contexts/PageActionsContext'
import {
    PIPELINE_STAGES,
    fetchDealsByOrg,
    createDeal,
    updateDealStage,
    logDealActivity,
} from '@/lib/deals'
import type { Deal, DealStage, NewDealInput } from '@/lib/deals'
import { fetchAttachmentsByDeal } from '@/lib/attachments'
import type { DealAttachment } from '@/lib/attachments'
import KanbanColumn from '@/components/pipeline/KanbanColumn'
import NewDealModal from '@/components/pipeline/NewDealModal'
import { Button } from '@/components/ui/button'

interface AttachmentCounts {
    [dealId: string]: { proposal: number; total: number }
}

export default function PipelinePage() {
    const { user } = useAuth()
    const { orgId } = useOrg()
    const [deals, setDeals] = useState<Deal[]>([])
    const [attachmentCounts, setAttachmentCounts] = useState<AttachmentCounts>({})
    const [loading, setLoading] = useState(true)
    const [showNewDeal, setShowNewDeal] = useState(false)
    const [newDealStage, setNewDealStage] = useState<DealStage>('Opportunity')

    const { setPortalNode } = usePageActions()

    // Fetch deals when orgId is known
    const loadDeals = useCallback(async () => {
        if (!orgId) return
        setLoading(true)
        try {
            const data = await fetchDealsByOrg(orgId)
            setDeals(data)

            // Fetch attachment counts for all deals in parallel
            const counts: AttachmentCounts = {}
            await Promise.all(
                data.map(async (deal) => {
                    try {
                        const attachments: DealAttachment[] = await fetchAttachmentsByDeal(deal.id)
                        counts[deal.id] = {
                            proposal: attachments.filter((a) => a.file_type === 'proposal').length,
                            total: attachments.length,
                        }
                    } catch {
                        counts[deal.id] = { proposal: 0, total: 0 }
                    }
                })
            )
            setAttachmentCounts(counts)
        } finally {
            setLoading(false)
        }
    }, [orgId])

    useEffect(() => {
        loadDeals()
    }, [loadDeals])

    const filteredDeals = deals

    // Deal lookup by stage
    const dealsByStage: Record<DealStage, Deal[]> = PIPELINE_STAGES.reduce(
        (acc, stage) => ({ ...acc, [stage]: [] }),
        {} as Record<DealStage, Deal[]>
    )

    // Make sure to order deals within columns for consistent rendering, matching the db index
    filteredDeals.sort((a, b) => {
        if (a.order_index === b.order_index) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        return (a.order_index ?? 0) - (b.order_index ?? 0)
    }).forEach((deal) => {
        if (dealsByStage[deal.stage]) {
            dealsByStage[deal.stage].push(deal)
        }
    })

    // Drag and Drop using @hello-pangea/dnd
    async function handleDragEnd(result: DropResult) {
        const { source, destination, draggableId } = result

        // Dropped outside a valid column
        if (!destination) return

        // Dropped in the same spot
        if (source.droppableId === destination.droppableId && source.index === destination.index) return

        const fromStage = source.droppableId as DealStage
        const toStage = destination.droppableId as DealStage

        const dealToMove = deals.find(d => d.id === draggableId)
        if (!dealToMove || !user || !orgId) return

        // Create a copy of deals for optimistic update
        const updatedDeals = [...deals]

        // We'll calculate the new order_index
        let newOrderIndex = dealToMove.order_index || 0

        // Find the specific column's deals
        const destDeals = dealsByStage[toStage]

        // 1. If moving within the SAME column
        if (fromStage === toStage) {
            // Remove from old pos, insert to new pos (optimistic array move)
            const columnDeals = [...destDeals]
            columnDeals.splice(source.index, 1)
            columnDeals.splice(destination.index, 0, dealToMove)

            // Calculate new position using surrounding items
            if (columnDeals.length === 1) {
                // It's the only one (edge case, usually impossible within same col)
                newOrderIndex = Date.now() / 1000
            } else if (destination.index === 0) {
                // Moved to top
                const nextItem = columnDeals[1] // it's at index 0 now
                newOrderIndex = (nextItem?.order_index ?? Date.now() / 1000) - 1000
            } else if (destination.index === columnDeals.length - 1) {
                // Moved to bottom
                const prevItem = columnDeals[columnDeals.length - 2]
                newOrderIndex = (prevItem?.order_index ?? Date.now() / 1000) + 1000
            } else {
                // Sandwiched between two items
                const prevItem = columnDeals[destination.index - 1]
                const nextItem = columnDeals[destination.index + 1]
                const prevOrd = prevItem?.order_index ?? 0
                const nextOrd = nextItem?.order_index ?? (prevOrd + 2000)
                newOrderIndex = (prevOrd + nextOrd) / 2.0
            }
        } else {
            // 2. Moving to a DIFFERENT column
            const destDealsCopy = [...destDeals]
            destDealsCopy.splice(destination.index, 0, dealToMove)

            if (destDealsCopy.length === 1) {
                // Only item in new col
                newOrderIndex = Date.now() / 1000
            } else if (destination.index === 0) {
                // Moved to top of new col
                const nextItem = destDealsCopy[1]
                newOrderIndex = (nextItem?.order_index ?? Date.now() / 1000) - 1000
            } else if (destination.index === destDealsCopy.length - 1) {
                // Moved to bottom of new col
                const prevItem = destDealsCopy[destDealsCopy.length - 2]
                newOrderIndex = (prevItem?.order_index ?? Date.now() / 1000) + 1000
            } else {
                // Sandwiched in new col
                const prevItem = destDealsCopy[destination.index - 1]
                const nextItem = destDealsCopy[destination.index + 1]
                const prevOrd = prevItem?.order_index ?? 0
                const nextOrd = nextItem?.order_index ?? (prevOrd + 2000)
                newOrderIndex = (prevOrd + nextOrd) / 2.0
            }
        }

        // Optimistically apply visual changes immediately
        const targetDealIdx = updatedDeals.findIndex(d => d.id === dealToMove.id)
        if (targetDealIdx !== -1) {
            updatedDeals[targetDealIdx] = {
                ...dealToMove,
                stage: toStage,
                order_index: newOrderIndex
            }
            setDeals(updatedDeals)
        }

        try {
            await updateDealStage(dealToMove.id, toStage, newOrderIndex)
            if (fromStage !== toStage) {
                await logDealActivity(orgId, user.id, dealToMove.id, 'deal_stage_changed', {
                    from_stage: fromStage,
                    to_stage: toStage,
                })
            }
        } catch (err: unknown) {
            console.error('Failed to update stage/position', err)
            // Revert state if the API fails
            setDeals(deals)
        }
    }

    async function handleNewDeal(input: NewDealInput) {
        if (!user || !orgId) return
        try {
            const deal = await createDeal(input)
            await logDealActivity(orgId, user.id, deal.id, 'deal_created', {
                stage: deal.stage,
                title: input.title,
            })
            setDeals((prev) => [deal, ...prev])
            setAttachmentCounts((prev) => ({ ...prev, [deal.id]: { proposal: 0, total: 0 } }))
            setShowNewDeal(false)
        } catch (err: unknown) {
            console.error('Failed to create deal:', err)
        }
    }

    function handleDealStageChange(dealId: string, newStage: DealStage) {
        setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage: newStage } : d))
    }

    function handleOpenNewDeal(stage: DealStage) {
        setNewDealStage(stage)
        setShowNewDeal(true)
    }

    // Inject search + "New Deal" button into the Island navigation
    useEffect(() => {
        setPortalNode(
            <Button
                id="nav-new-deal-btn"
                onClick={() => handleOpenNewDeal('Opportunity')}
                className="h-8 text-xs sm:text-xs rounded-full shadow-sm px-3 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
                <Plus size={14} className="sm:mr-1.5" />
                <span className="hidden sm:inline">Add</span>
            </Button>
        )
        return () => setPortalNode(null)
    }, [setPortalNode])

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            {/* Kanban Board */}
            {loading ? (
                <div className="flex gap-4 px-6 py-8 overflow-x-auto w-full h-full">
                    {PIPELINE_STAGES.map((stage) => (
                        <div
                            key={stage}
                            className="min-w-[240px] w-64 h-64 rounded-xl bg-muted/40 animate-pulse shrink-0"
                        />
                    ))}
                </div>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 px-6 py-8 overflow-x-auto flex-1 items-start w-full">
                        {PIPELINE_STAGES.map((stage) => (
                            <KanbanColumn
                                key={stage}
                                stage={stage}
                                deals={dealsByStage[stage]}
                                attachmentCounts={attachmentCounts}
                                onAddDeal={handleOpenNewDeal}
                                onStageChange={handleDealStageChange}
                            />
                        ))}
                    </div>
                </DragDropContext>
            )}

            {/* New Deal Modal */}
            {showNewDeal && orgId && (
                <NewDealModal
                    orgId={orgId}
                    defaultStage={newDealStage}
                    onClose={() => setShowNewDeal(false)}
                    onCreated={handleNewDeal}
                />
            )}
        </div>
    )
}
