import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
    ArrowLeft,
    ChevronDown,
    DollarSign,
    Calendar,
    User,
} from 'lucide-react'
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
import { Button } from '@/components/ui/button'

const STAGE_BADGE_VARIANTS: Record<string, 'accent' | 'success' | 'warning' | 'muted'> = {
    Prospect: 'muted',
    Contacted: 'accent',
    'Fact Find': 'accent',
    'Proposal Sent': 'warning',
    Underwriting: 'warning',
    Issued: 'success',
    Lost: 'muted',
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

type Tab = 'proposals' | 'activity'

export default function DealDetailPage() {
    const { dealId } = useParams<{ dealId: string }>()
    const navigate = useNavigate()
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

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading deal...</div>
            </div>
        )
    }

    if (!deal) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">Deal not found.</p>
                <Button variant="secondary" onClick={() => navigate('/app/pipeline')}>
                    <ArrowLeft size={16} /> Back to Pipeline
                </Button>
            </div>
        )
    }

    const stageVariant = STAGE_BADGE_VARIANTS[deal.stage] ?? 'muted'

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-white sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <button
                        onClick={() => navigate('/app/pipeline')}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
                    >
                        <ArrowLeft size={14} />
                        Pipeline
                    </button>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                            {deal.client && (
                                <Link
                                    to={`/app/clients/${deal.client.id}`}
                                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors mt-1"
                                >
                                    <User size={13} />
                                    {deal.client.name}
                                </Link>
                            )}
                        </div>

                        {/* Stage selector */}
                        <div className="relative">
                            <button
                                onClick={() => setEditingStage((v) => !v)}
                                className="flex items-center gap-1.5"
                                id="stage-selector-btn"
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
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-6 mt-4 flex-wrap">
                        {/* Value */}
                        <div className="flex items-center gap-2">
                            <DollarSign size={14} className="text-muted-foreground" />
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
            </div>

            {/* Tabs */}
            <div className="max-w-4xl mx-auto px-6">
                <div className="flex gap-1 border-b border-border pt-4">
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
                            id={`tab-${tab}`}
                        >
                            {tab === 'proposals' ? `Proposals${attachments.length > 0 ? ` (${attachments.length})` : ''}` : 'Activity'}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="py-6">
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
    )
}
