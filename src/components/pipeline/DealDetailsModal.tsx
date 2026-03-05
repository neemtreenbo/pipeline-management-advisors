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
import { getDealIcon } from './DealIcon'
import NotesList from '@/components/notes/NotesList'
import EntityTasks from '@/components/tasks/EntityTasks'

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

type Tab = 'tasks' | 'proposals' | 'notes' | 'activity'

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
    const [activeTab, setActiveTab] = useState<Tab>('tasks')
    const [editingStage, setEditingStage] = useState(false)
    const [editingValue, setEditingValue] = useState(false)
    const [valueDraft, setValueDraft] = useState('')
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState('')

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
        if (!newTitle) { setEditingTitle(false); return }

        const currentData = deal.data && typeof deal.data === 'object' && !Array.isArray(deal.data)
            ? (deal.data as Record<string, unknown>)
            : {}

        const newData = { ...currentData, title: newTitle }
        setDeal((d) => d ? { ...d, data: newData } : d)
        setEditingTitle(false)
        await updateDeal(deal.id, { title: newTitle })
    }

    function handleAttachmentUploaded(attachment: DealAttachment) {
        setAttachments((prev) => [attachment, ...prev])
        if (dealId) fetchDealActivities(dealId).then(setActivities)
    }

    function handleAttachmentDeleted(id: string) {
        setAttachments((prev) => prev.filter((a) => a.id !== id))
    }

    const title = (deal?.data as Record<string, string>)?.title || deal?.client?.name || '—'

    if (loading) {
        return (
            <>
                <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={onClose} />
                <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl h-[65vh] flex items-center justify-center pointer-events-auto">
                        <p className="text-sm text-muted-foreground/50 animate-pulse">Loading…</p>
                    </div>
                </div>
            </>
        )
    }

    if (!deal) {
        return (
            <>
                <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={onClose} />
                <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl h-[65vh] flex flex-col items-center justify-center gap-3 pointer-events-auto">
                        <p className="text-sm text-muted-foreground">Deal not found.</p>
                        <button className="text-sm text-foreground underline underline-offset-2" onClick={onClose}>Close</button>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white rounded-2xl shadow-[0_16px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-xl h-[65vh] flex flex-col overflow-hidden border border-black/[0.06] pointer-events-auto">

                    {/* Header */}
                    <div className="shrink-0 border-b border-border/60">
                        <div className="px-6 pt-5 pb-4">
                            <div className="flex items-start justify-between gap-3">
                                {/* Left: avatar + title + client */}
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    {/* Client avatar */}
                                    {deal.client && (
                                        <div className="shrink-0 mt-0.5">
                                            {deal.client.profile_picture_url ? (
                                                <img
                                                    src={deal.client.profile_picture_url}
                                                    alt={deal.client.name}
                                                    className="w-9 h-9 rounded-full object-cover border border-border/40"
                                                />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center border border-border/40">
                                                    <span className="text-[13px] font-medium text-muted-foreground">
                                                        {deal.client.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-muted-foreground/40 shrink-0">
                                                {getDealIcon(title, 12)}
                                            </span>
                                            {editingTitle ? (
                                                <input
                                                    autoFocus
                                                    className="text-[15px] font-semibold text-foreground bg-transparent border-0 border-b border-foreground/20 focus:ring-0 outline-none w-full transition-colors"
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
                                                    className="text-[15px] font-semibold text-foreground truncate cursor-pointer hover:text-foreground/70 transition-colors"
                                                    onClick={() => { setTitleDraft(title); setEditingTitle(true) }}
                                                >
                                                    {title}
                                                </h1>
                                            )}
                                        </div>

                                        {deal.client && (
                                            <Link
                                                to={`/app/clients/${deal.client.id}`}
                                                className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-accent transition-colors w-fit"
                                                onClick={onClose}
                                            >
                                                <User size={10} />
                                                {deal.client.name}
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* Right: stage + close */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="relative">
                                        <button
                                            onClick={() => setEditingStage((v) => !v)}
                                            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-full transition-colors"
                                        >
                                            {deal.stage}
                                            <ChevronDown size={10} />
                                        </button>
                                        {editingStage && (
                                            <>
                                                <div className="fixed inset-0 z-30" onClick={() => setEditingStage(false)} />
                                                <div className="absolute right-0 top-full mt-1.5 bg-white border border-border rounded-xl shadow-lg z-40 py-1 min-w-[176px]">
                                                    {PIPELINE_STAGES.map((s) => (
                                                        <button
                                                            key={s}
                                                            className={`w-full text-left px-4 py-1.5 text-[13px] hover:bg-muted transition-colors ${deal.stage === s ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
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
                                        className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground/50 hover:text-foreground transition-colors"
                                    >
                                        <X size={15} strokeWidth={2} />
                                    </button>
                                </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-4 mt-3 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <Banknote size={12} className="text-muted-foreground/50" />
                                    {editingValue ? (
                                        <input
                                            autoFocus
                                            className="text-[13px] border-b border-foreground/20 outline-none w-24 bg-transparent"
                                            type="number"
                                            value={valueDraft}
                                            onChange={(e) => setValueDraft(e.target.value)}
                                            onBlur={handleValueSave}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleValueSave() }}
                                        />
                                    ) : (
                                        <button
                                            onClick={() => { setValueDraft(String(deal.value)); setEditingValue(true) }}
                                            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {deal.value > 0 ? formatCurrency(deal.value) : <span className="text-muted-foreground/40">Set value</span>}
                                        </button>
                                    )}
                                </div>

                                {deal.expected_close_date && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={12} className="text-muted-foreground/50" />
                                        <span className="text-[13px] text-muted-foreground">
                                            {new Date(deal.expected_close_date).toLocaleDateString('en-PH', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 flex gap-0">
                            {(['tasks', 'proposals', 'notes', 'activity'] as Tab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={[
                                        'px-3 py-2 text-[12px] font-medium capitalize transition-colors',
                                        activeTab === tab
                                            ? 'border-b-2 border-foreground text-foreground -mb-px'
                                            : 'text-muted-foreground/60 hover:text-foreground',
                                    ].join(' ')}
                                >
                                    {tab === 'proposals'
                                        ? `Proposals${attachments.length > 0 ? ` · ${attachments.length}` : ''}`
                                        : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab content */}
                    <div className="overflow-y-auto px-6 py-5 flex-1">
                        {activeTab === 'tasks' && dealId && orgId && (
                            <EntityTasks dealId={dealId} orgId={orgId} inlineAdd />
                        )}
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
                        {activeTab === 'notes' && dealId && orgId && (
                            <NotesList entityType="deal" entityId={dealId} orgId={orgId} inlineAdd />
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
