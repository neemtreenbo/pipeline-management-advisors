import { useCallback, useMemo, useRef } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import DealDetailsModal from '@/components/pipeline/DealDetailsModal'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import {
    PIPELINE_STAGES,
    createDeal,
    updateDealStage,
    logDealActivity,
} from '@/lib/deals'
import type { Deal, DealStage, NewDealInput } from '@/lib/deals'
import { useDeals, useDealAttachmentCounts, useDealStageHistories } from '@/hooks/queries/useDeals'
import { queryKeys } from '@/lib/queryKeys'
import KanbanColumn from '@/components/pipeline/KanbanColumn'

interface AttachmentCounts {
    [dealId: string]: { proposal: number; total: number }
}

export default function PipelinePage() {
    const { user } = useAuth()
    const { orgId } = useOrg()
    const navigate = useNavigate()
    const qc = useQueryClient()
    const [searchParams] = useSearchParams()
    const dealIdFromSearch = searchParams.get('deal')

    const { data: deals = [], isLoading: loading } = useDeals(orgId ?? undefined)
    const dealIds = useMemo(() => deals.map(d => d.id), [deals])
    const { data: attachmentCounts = {} } = useDealAttachmentCounts(orgId ?? undefined, dealIds)
    const { data: stageHistories = {} } = useDealStageHistories(orgId ?? undefined, dealIds)

    const dealsRef = useRef(deals)
    dealsRef.current = deals

    const dealsByStage = useMemo(() => {
        const grouped: Record<DealStage, Deal[]> = PIPELINE_STAGES.reduce(
            (acc, stage) => ({ ...acc, [stage]: [] }),
            {} as Record<DealStage, Deal[]>
        )
        const sorted = [...deals].sort((a, b) => {
            if (a.order_index === b.order_index) {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            }
            return (a.order_index ?? 0) - (b.order_index ?? 0)
        })
        sorted.forEach((deal) => {
            if (grouped[deal.stage]) {
                grouped[deal.stage].push(deal)
            }
        })
        return grouped
    }, [deals])

    async function handleDragEnd(result: DropResult) {
        const { source, destination, draggableId } = result
        if (!destination) return
        if (source.droppableId === destination.droppableId && source.index === destination.index) return

        const fromStage = source.droppableId as DealStage
        const toStage = destination.droppableId as DealStage
        const snapshotDeals = dealsRef.current
        const dealToMove = snapshotDeals.find(d => d.id === draggableId)
        if (!dealToMove || !user || !orgId) return

        const updatedDeals = [...snapshotDeals]
        let newOrderIndex = dealToMove.order_index || 0
        const destDeals = dealsByStage[toStage]

        if (fromStage === toStage) {
            const columnDeals = [...destDeals]
            columnDeals.splice(source.index, 1)
            columnDeals.splice(destination.index, 0, dealToMove)

            if (columnDeals.length === 1) {
                newOrderIndex = Date.now() / 1000
            } else if (destination.index === 0) {
                newOrderIndex = (columnDeals[1]?.order_index ?? Date.now() / 1000) - 1000
            } else if (destination.index === columnDeals.length - 1) {
                newOrderIndex = (columnDeals[columnDeals.length - 2]?.order_index ?? Date.now() / 1000) + 1000
            } else {
                const prevOrd = columnDeals[destination.index - 1]?.order_index ?? 0
                const nextOrd = columnDeals[destination.index + 1]?.order_index ?? (prevOrd + 2000)
                newOrderIndex = (prevOrd + nextOrd) / 2.0
            }
        } else {
            const destDealsCopy = [...destDeals]
            destDealsCopy.splice(destination.index, 0, dealToMove)

            if (destDealsCopy.length === 1) {
                newOrderIndex = Date.now() / 1000
            } else if (destination.index === 0) {
                newOrderIndex = (destDealsCopy[1]?.order_index ?? Date.now() / 1000) - 1000
            } else if (destination.index === destDealsCopy.length - 1) {
                newOrderIndex = (destDealsCopy[destDealsCopy.length - 2]?.order_index ?? Date.now() / 1000) + 1000
            } else {
                const prevOrd = destDealsCopy[destination.index - 1]?.order_index ?? 0
                const nextOrd = destDealsCopy[destination.index + 1]?.order_index ?? (prevOrd + 2000)
                newOrderIndex = (prevOrd + nextOrd) / 2.0
            }
        }

        const dealsKey = queryKeys.deals.all(orgId)
        const targetDealIdx = updatedDeals.findIndex(d => d.id === dealToMove.id)
        if (targetDealIdx !== -1) {
            updatedDeals[targetDealIdx] = { ...dealToMove, stage: toStage, order_index: newOrderIndex }
            qc.setQueryData<Deal[]>(dealsKey, updatedDeals)
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
            qc.setQueryData<Deal[]>(dealsKey, snapshotDeals)
        }
    }

    const handleCreateDeal = useCallback(async (input: NewDealInput) => {
        if (!user || !orgId) return
        try {
            const deal = await createDeal(input)
            await logDealActivity(orgId, user.id, deal.id, 'deal_created', {
                stage: deal.stage,
                title: input.title,
            })
            qc.setQueryData<Deal[]>(queryKeys.deals.all(orgId), (prev) => prev ? [deal, ...prev] : [deal])
            qc.setQueryData<AttachmentCounts>(queryKeys.deals.attachmentCounts(orgId), (prev) => ({ ...prev, [deal.id]: { proposal: 0, total: 0 } }))
        } catch (err: unknown) {
            console.error('Failed to create deal:', err)
        }
    }, [user, orgId, qc])

    const handleDealStageChange = useCallback((dealId: string, newStage: DealStage) => {
        if (!orgId) return
        qc.setQueryData<Deal[]>(queryKeys.deals.all(orgId), (prev) => prev?.map((d) => d.id === dealId ? { ...d, stage: newStage } : d))
    }, [orgId, qc])

    const handleDealDeleted = useCallback((dealId: string) => {
        if (!orgId) return
        qc.setQueryData<Deal[]>(queryKeys.deals.all(orgId), (prev) => prev?.filter((d) => d.id !== dealId))
    }, [orgId, qc])


    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            {loading ? (
                <div className="flex gap-4 px-6 py-8 overflow-x-auto w-full h-full">
                    {PIPELINE_STAGES.map((stage) => (
                        <div
                            key={stage}
                            className="min-w-[280px] w-72 h-64 rounded-xl bg-muted/40 animate-pulse shrink-0"
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
                                stageHistories={stageHistories}
                                onCreateDeal={handleCreateDeal}
                                onStageChange={handleDealStageChange}
                                onDealDeleted={handleDealDeleted}
                            />
                        ))}
                    </div>
                </DragDropContext>
            )}

            {dealIdFromSearch && (
                <DealDetailsModal
                    dealId={dealIdFromSearch}
                    onClose={() => navigate('/app/pipeline', { replace: true })}
                    onStageChange={handleDealStageChange}
                    onDeleted={handleDealDeleted}
                />
            )}
        </div>
    )
}
