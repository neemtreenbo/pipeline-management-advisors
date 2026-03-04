import { useState, useEffect, useCallback } from 'react'
import {
    X,
    ChevronDown,
    Banknote,
    Calendar,
    User,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
    PIPELINE_STAGES,
    fetchDealById,
    updateDeal,
    updateDealStage,
    logDealActivity,
    fetchDealActivities,
} from '@/lib/deals'
import type { Deal, DealStage } from '@/lib/deals'
import { fetchAttachmentsByDeal } from '@/lib/attachments'
import type { DealAttachment } from '@/lib/attachments'
import ProposalUploader from '@/components/pipeline/ProposalUploader'
import ActivityTimeline from '@/components/pipeline/ActivityTimeline'
import { Badge } from '@/components/ui/badge'
import { getDealIcon } from './DealIcon'

const STAGE_BADGE_VARIANTS: Record<string, 'accent' | 'success' | 'warning' | 'muted'> = {
    Opportunity: 'muted',
    Contacted: 'accent',
    Engaged: 'accent',
    'Schedule To Present': 'warning',
    'Proposal Presented': 'warning',
    'Decision Pending': 'warning',
    Closed: 'success',
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

type Tab = 'proposals' | 'activity'

interface DealDetailsModalProps {
    dealId: string
    onClose: () => void
}

export default function DealDetailsModal({ dealId, onClose }: DealDetailsModalProps) {
    const { user } = useAuth()

    const [deal, setDeal] = useState<Deal | null>(null)
    const [attachments, setAttachments] = useState<DealAttachment[]>([])
    const [activities, setActivities] = useState<Array<{
        id: string; event_type: string; data: Record<string, unknown>; created_at: string; actor_id: string
    }>>([])
    const [orgId, setOrgId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('proposals')
    const [editingStage, setEditingStage] = useState(false)
    const [editingValue, setEditingValue] = useState(false)
    const [valueDraft, setValueDraft] = useState('')
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState('')

    // Fetch org
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

    const loadDeal = useCallback(async () => {
        if (!dealId) return
        setLoading(true)
        try {
            const [d, att, acts] = await Promise.all([
                fetchDealById(dealId),
                fetchAttachmentsByDeal(dealId),
                fetchDealActivities(dealId),
            ])
            setDeal(d)
            setAttachments(att)
            setActivities(acts)
        } finally {
            setLoading(false)
        }
    }, [dealId])

    useEffect(() => {
        loadDeal()
    }, [loadDeal])

    async function handleStageChange(newStage: DealStage) {
        if (!deal || !user || !orgId) return
        const oldStage = deal.stage
        setDeal((d) => d ? { ...d, stage: newStage } : d)
        setEditingStage(false)
        try {
            await updateDealStage(deal.id, newStage)
            await logDealActivity(orgId, user.id, deal.id, 'deal_stage_changed', {
                from_stage: oldStage,
                to_stage: newStage,
            })
            // Refresh activities
            const acts = await fetchDealActivities(deal.id)
            setActivities(acts)
        } catch {
            setDeal((d) => d ? { ...d, stage: oldStage } : d)
        }
    }

    async function handleValueSave() {
        if (!deal) return
        const newValue = parseFloat(valueDraft)
        if (isNaN(newValue)) { setEditingValue(false); return }
        setDeal((d) => d ? { ...d, value: newValue } : d)
        setEditingValue(false)
        await updateDeal(deal.id, { value: newValue })
    }

    async function handleTitleSave() {
        if (!deal) return
        const newTitle = titleDraft.trim()
        if (!newTitle) {
            setEditingTitle(false)
            return
        }

        const currentData = deal.data && typeof deal.data === 'object' && !Array.isArray(deal.data)
            ? (deal.data as Record<string, unknown>)
            : {}

        const newData = {
            ...currentData,
            title: newTitle
        }

        setDeal((d) => d ? { ...d, data: newData } : d)
        setEditingTitle(false)
        await updateDeal(deal.id, { title: newTitle })
    }

    function handleAttachmentUploaded(attachment: DealAttachment) {
        setAttachments((prev) => [attachment, ...prev])
        // Refresh activity timeline
        if (dealId) {
            fetchDealActivities(dealId).then(setActivities)
        }
    }

    function handleAttachmentDeleted(id: string) {
        setAttachments((prev) => prev.filter((a) => a.id !== id))
    }

    const title = (deal?.data as Record<string, string>)?.title || deal?.client?.name || '—'

    // Prevent rendering full UI initially
    if (loading) {
        return (
            <>
                <div className="fixed inset-0 bg-black/20 z-50 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none p-4">
                    <div className="bg-white rounded-[24px] shadow-xl w-full max-w-4xl p-12 flex items-center justify-center pointer-events-auto">
                        <div className="text-sm text-muted-foreground animate-pulse">Loading deal details...</div>
                    </div>
                </div>
            </>
        )
    }

    if (!deal) {
        return (
            <>
                <div className="fixed inset-0 bg-black/20 z-50 backdrop-blur-sm" onClick={onClose} />
                <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none p-4">
                    <div className="bg-white rounded-[24px] shadow-xl w-full max-w-4xl p-12 flex flex-col items-center justify-center gap-4 pointer-events-auto">
                        <p className="text-muted-foreground">Deal not found.</p>
                        <button className="px-4 py-2 bg-secondary text-foreground font-medium rounded-lg" onClick={onClose}>Close</button>
                    </div>
                </div>
            </>
        )
    }

    const stageVariant = STAGE_BADGE_VARIANTS[deal.stage] ?? 'muted'

    return (
        <>
            <div className="fixed inset-0 bg-black/20 z-50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                <div className="bg-white rounded-[24px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.2)] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-black/[0.04] pointer-events-auto">
                    {/* Header */}
                    <div className="border-b border-border bg-white sticky top-0 z-10 shrink-0">
                        <div className="px-8 py-6 pb-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 -ml-1">
                                        <div className="text-muted-foreground mt-1 shadow-sm border border-border/50 bg-muted/30 rounded p-1 mb-1">
                                            {getDealIcon(title, 20)}
                                        </div>
                                        {editingTitle ? (
                                            <input
                                                autoFocus
                                                className="text-2xl font-semibold text-foreground tracking-tight bg-transparent border-0 border-b-2 border-primary focus:ring-0 px-1 outline-none w-full max-w-md transition-colors"
                                                value={titleDraft}
                                                onChange={(e) => setTitleDraft(e.target.value)}
                                                onBlur={handleTitleSave}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleTitleSave()
                                                    if (e.key === 'Escape') setEditingTitle(false)
                                                }}
                                            />
                                        ) : (
                                            <h1
                                                className="text-2xl font-semibold text-foreground tracking-tight cursor-pointer hover:bg-muted/60 px-1 rounded transition-colors inline-block"
                                                onClick={() => { setTitleDraft(title); setEditingTitle(true) }}
                                                title="Click to edit"
                                            >
                                                {title}
                                            </h1>
                                        )}
                                    </div>
                                    {deal.client && (
                                        <Link
                                            to={`/app/clients/${deal.client.id}`}
                                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors mt-1"
                                            onClick={onClose}
                                        >
                                            <User size={13} />
                                            {deal.client.name}
                                        </Link>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Stage selector */}
                                    <div className="relative flex-shrink-0">
                                        <button
                                            onClick={() => setEditingStage((v) => !v)}
                                            className="flex items-center gap-1.5"
                                        >
                                            <Badge variant={stageVariant}>{deal.stage}</Badge>
                                            <ChevronDown size={14} className="text-muted-foreground" />
                                        </button>
                                        {editingStage && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-30"
                                                    onClick={() => setEditingStage(false)}
                                                />
                                                <div className="absolute right-0 top-full mt-1.5 bg-white border border-border rounded-xl shadow-lg z-40 py-1 min-w-[180px]">
                                                    {PIPELINE_STAGES.map((s) => (
                                                        <button
                                                            key={s}
                                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${deal.stage === s ? 'font-medium text-foreground' : 'text-muted-foreground'
                                                                }`}
                                                            onClick={() => handleStageChange(s)}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <button
                                        onClick={onClose}
                                        className="p-2 -mr-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors self-start shrink-0"
                                    >
                                        <X size={18} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-6 mt-4 flex-wrap">
                                {/* Value */}
                                <div className="flex items-center gap-2">
                                    <Banknote size={14} className="text-muted-foreground" />
                                    {editingValue ? (
                                        <input
                                            autoFocus
                                            className="text-sm border-b border-accent outline-none w-28 bg-transparent"
                                            type="number"
                                            value={valueDraft}
                                            onChange={(e) => setValueDraft(e.target.value)}
                                            onBlur={handleValueSave}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleValueSave() }}
                                        />
                                    ) : (
                                        <button
                                            onClick={() => { setValueDraft(String(deal.value)); setEditingValue(true) }}
                                            className="text-sm text-foreground hover:text-accent transition-colors"
                                        >
                                            {deal.value > 0 ? formatCurrency(deal.value) : 'Set value'}
                                        </button>
                                    )}
                                </div>

                                {/* Expected close */}
                                {deal.expected_close_date && (
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Close {new Date(deal.expected_close_date).toLocaleDateString('en-PH', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-8 flex gap-1 border-b border-border/40">
                            {(['proposals', 'activity'] as Tab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={[
                                        'px-4 py-2 text-sm font-medium capitalize transition-colors',
                                        activeTab === tab
                                            ? 'border-b-2 border-foreground text-foreground -mb-px'
                                            : 'text-muted-foreground hover:text-foreground',
                                    ].join(' ')}
                                >
                                    {tab === 'proposals' ? `Proposals${attachments.length > 0 ? ` (${attachments.length})` : ''}` : 'Activity'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Tab content */}
                    <div className="overflow-y-auto px-8 py-6 bg-muted/10 flex-1">
                        {activeTab === 'proposals' && orgId && user && (
                            <ProposalUploader
                                dealId={deal.id}
                                orgId={orgId}
                                uploadedBy={user.id}
                                attachments={attachments}
                                onUploaded={handleAttachmentUploaded}
                                onDeleted={handleAttachmentDeleted}
                                dealStage={deal.stage}
                            />
                        )}

                        {activeTab === 'activity' && (
                            <ActivityTimeline activities={activities} />
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
