import { useState, useRef, memo, useCallback } from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
    PIPELINE_STAGES,
    createDeal,
    logDealActivity,
} from '@/lib/deals'
import type { Deal, DealStage } from '@/lib/deals'
import { useDealsByClient } from '@/hooks/queries/useDeals'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/format'
import { getDealIcon } from './DealIcon'
import DealDetailsModal from './DealDetailsModal'
import { PLAN_TYPE_VALUES } from './planTypes'

interface InlineDealsListProps {
    clientId: string
    orgId: string
}

const DealItem = memo(function DealItem({ deal, onSelect }: { deal: Deal; onSelect: (id: string) => void }) {
    const dealTitle = (deal.data as Record<string, string>)?.title || '—'
    const formattedValue = formatCurrency(deal.value)
    return (
        <button
            type="button"
            onClick={() => onSelect(deal.id)}
            className="w-full text-left flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-4 py-3 hover:border-border hover:shadow-sm transition-all"
        >
            <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/40 shrink-0">
                        {getDealIcon(dealTitle, 13)}
                    </span>
                    <p className="text-[13px] font-medium text-foreground truncate">{dealTitle}</p>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground/60">{deal.stage}</span>
                    {formattedValue && (
                        <span className="text-[11px] font-medium text-foreground/60">{formattedValue}</span>
                    )}
                    {deal.expected_close_date && (
                        <span className="text-[11px] text-muted-foreground/50">
                            Close {new Date(deal.expected_close_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    )}
                </div>
            </div>
            <ChevronRight size={14} className="text-muted-foreground/40 shrink-0" />
        </button>
    )
})

export default function InlineDealsList({ clientId, orgId }: InlineDealsListProps) {
    const { user } = useAuth()
    const qc = useQueryClient()
    const { data: deals = [], isLoading: loading } = useDealsByClient(clientId)
    const dealsKey = queryKeys.deals.byClient(clientId)
    const [selectedDealId, setSelectedDealId] = useState<string | null>(null)

    // Inline add state
    const [adding, setAdding] = useState(false)
    const [title, setTitle] = useState('')
    const [stage, setStage] = useState<DealStage>('Opportunity')
    const [saving, setSaving] = useState(false)
    const titleRef = useRef<HTMLInputElement>(null)

    function openAdd() {
        setTitle('')
        setStage('Opportunity')
        setAdding(true)
        setTimeout(() => titleRef.current?.focus(), 0)
    }

    async function handleAdd() {
        if (!user || !title.trim()) return
        setSaving(true)
        try {
            const deal = await createDeal({
                org_id: orgId,
                client_id: clientId,
                owner_id: user.id,
                stage,
                value: 0,
                expected_close_date: null,
                title: title.trim(),
            })
            await logDealActivity(orgId, user.id, deal.id, 'deal_created', { stage, title: title.trim() })
            qc.setQueryData<Deal[]>(dealsKey, prev => prev ? [deal, ...prev] : [deal])
            setAdding(false)
            setTitle('')
        } catch (err) {
            console.error('Failed to create deal', err)
        } finally {
            setSaving(false)
        }
    }

    const handleSelectDeal = useCallback((id: string) => setSelectedDealId(id), [])

    if (loading) {
        return <div className="py-8 text-center text-sm text-muted-foreground/40 animate-pulse">Loading…</div>
    }

    return (
        <>
            <div className="flex flex-col gap-2">
                {/* Add trigger / inline form */}
                {adding ? (
                    <div className="flex flex-col gap-3 bg-card border border-border/60 rounded-xl px-4 py-3">
                        {/* Plan type pills */}
                        <div className="flex flex-wrap gap-1.5">
                            {PLAN_TYPE_VALUES.map((plan) => (
                                <button
                                    key={plan}
                                    type="button"
                                    onClick={() => setTitle(plan)}
                                    className={`px-2.5 py-1 text-[12px] rounded-lg border transition-all ${
                                        title === plan
                                            ? 'bg-foreground text-white border-foreground'
                                            : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
                                    }`}
                                >
                                    {plan}
                                </button>
                            ))}
                        </div>

                        {/* Title + stage row */}
                        <div className="flex items-center gap-2">
                            <input
                                ref={titleRef}
                                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground border-b border-border/40 pb-0.5"
                                placeholder="Or type a custom title…"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAdd()
                                    if (e.key === 'Escape') setAdding(false)
                                }}
                                disabled={saving}
                            />
                            <select
                                value={stage}
                                onChange={(e) => setStage(e.target.value as DealStage)}
                                className="text-[12px] text-muted-foreground bg-transparent outline-none border-0 cursor-pointer"
                                disabled={saving}
                            >
                                {PIPELINE_STAGES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-1 border-t border-border/40">
                            <button
                                onClick={handleAdd}
                                disabled={saving || !title.trim()}
                                className="text-[12px] font-medium text-accent hover:text-accent/80 disabled:text-muted-foreground/30 transition-colors"
                            >
                                {saving ? 'Saving…' : 'Add deal'}
                            </button>
                            <button
                                onClick={() => setAdding(false)}
                                className="text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-1.5 text-[12px] text-muted-foreground/50 hover:text-foreground transition-colors py-1 w-fit"
                    >
                        <Plus size={13} />
                        Add deal
                    </button>
                )}

                {/* Deal list */}
                {deals.length === 0 && !adding ? (
                    <div className="py-8 text-center text-[13px] text-muted-foreground/40">No deals yet</div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {deals.map((deal) => (
                            <DealItem key={deal.id} deal={deal} onSelect={handleSelectDeal} />
                        ))}
                    </div>
                )}
            </div>

            {selectedDealId && (
                <DealDetailsModal
                    dealId={selectedDealId}
                    onClose={() => { setSelectedDealId(null); qc.invalidateQueries({ queryKey: dealsKey }) }}
                />
            )}
        </>
    )
}
