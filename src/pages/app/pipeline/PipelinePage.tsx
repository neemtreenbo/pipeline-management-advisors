import { useState, useEffect, useCallback } from 'react'
import { Plus, LayoutGrid } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
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
    const [orgId, setOrgId] = useState<string | null>(null)
    const [deals, setDeals] = useState<Deal[]>([])
    const [attachmentCounts, setAttachmentCounts] = useState<AttachmentCounts>({})
    const [loading, setLoading] = useState(true)
    const [showNewDeal, setShowNewDeal] = useState(false)
    const [newDealStage, setNewDealStage] = useState<DealStage>('Prospect')
    const [draggingDeal, setDraggingDeal] = useState<{ id: string; fromStage: DealStage } | null>(null)

    // Fetch org membership once
    useEffect(() => {
        if (!user) return
        supabase
            .from('memberships')
            .select('org_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
                if (data) setOrgId(data.org_id)
            })
    }, [user])

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

    // Deal lookup by stage
    const dealsByStage: Record<DealStage, Deal[]> = PIPELINE_STAGES.reduce(
        (acc, stage) => ({ ...acc, [stage]: [] }),
        {} as Record<DealStage, Deal[]>
    )
    deals.forEach((deal) => {
        if (dealsByStage[deal.stage]) {
            dealsByStage[deal.stage].push(deal)
        }
    })

    // Drag
    function handleDragStart(e: React.DragEvent, dealId: string, fromStage: DealStage) {
        setDraggingDeal({ id: dealId, fromStage })
        e.dataTransfer.effectAllowed = 'move'
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    async function handleDrop(e: React.DragEvent, toStage: DealStage) {
        e.preventDefault()
        if (!draggingDeal || !user || !orgId) return
        const { id: dealId, fromStage } = draggingDeal
        setDraggingDeal(null)
        if (fromStage === toStage) return

        // Optimistic update
        setDeals((prev) =>
            prev.map((d) => (d.id === dealId ? { ...d, stage: toStage } : d))
        )

        try {
            await updateDealStage(dealId, toStage)
            await logDealActivity(orgId, user.id, dealId, 'deal_stage_changed', {
                from_stage: fromStage,
                to_stage: toStage,
            })
        } catch {
            // Revert on failure
            setDeals((prev) =>
                prev.map((d) => (d.id === dealId ? { ...d, stage: fromStage } : d))
            )
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

    function handleOpenNewDeal(stage: DealStage) {
        setNewDealStage(stage)
        setShowNewDeal(true)
    }

    const totalDeals = deals.length

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="border-b border-border bg-white sticky top-0 z-10">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LayoutGrid size={20} className="text-muted-foreground" />
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">Pipeline</h1>
                            {!loading && (
                                <p className="text-xs text-muted-foreground">
                                    {totalDeals} {totalDeals === 1 ? 'deal' : 'deals'}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button
                        id="new-deal-btn"
                        onClick={() => handleOpenNewDeal('Prospect')}
                    >
                        <Plus size={16} />
                        New Deal
                    </Button>
                </div>
            </div>

            {/* Kanban Board */}
            {loading ? (
                <div className="flex gap-4 px-6 py-6 overflow-x-auto">
                    {PIPELINE_STAGES.map((stage) => (
                        <div
                            key={stage}
                            className="min-w-[240px] w-64 h-64 rounded-xl bg-muted/40 animate-pulse shrink-0"
                        />
                    ))}
                </div>
            ) : (
                <div className="flex gap-4 px-6 py-6 overflow-x-auto flex-1 items-start">
                    {PIPELINE_STAGES.map((stage) => (
                        <KanbanColumn
                            key={stage}
                            stage={stage}
                            deals={dealsByStage[stage]}
                            attachmentCounts={attachmentCounts}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onAddDeal={handleOpenNewDeal}
                            draggingDealId={draggingDeal?.id ?? null}
                        />
                    ))}
                </div>
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
