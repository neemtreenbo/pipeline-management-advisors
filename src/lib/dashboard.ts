import { supabase } from './supabase'
import type { Deal, DealStage } from './deals'
import { PIPELINE_STAGES } from './deals'
// Task type available via './tasks' if needed for future overdue-task rules

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface DashboardStats {
    totalProspects: number
    activeDeals: number
    closingSoon: number
    annualRevenue: number
}

export interface PipelineSnapshot {
    stage: DealStage
    count: number
    value: number
}

export interface ActionItem {
    id: string
    dealId: string
    dealTitle: string
    clientName: string
    stage: DealStage
    urgency: 'high' | 'medium' | 'low'
    reason: string
    actionLabel: string
}

export interface Insight {
    id: string
    type: 'warning' | 'info' | 'positive'
    title: string
    description: string
    metric?: string
}

export interface ActivityRecord {
    id: string
    event_type: string
    entity_type?: string
    entity_id?: string
    data: Record<string, unknown>
    created_at: string
    actor_id: string
}

// ─────────────────────────────────────────────
// Tunable Rule Configuration
//
// Adjust thresholds here to change how the
// heuristic engine scores and classifies deals.
// ─────────────────────────────────────────────

export const RULES = {
    /** Days without activity before a deal is considered stale */
    staleDealDays: 14,

    /** Days without activity for early-stage deals (Contacted/Engaged) to trigger follow-up */
    earlyStageFollowUpDays: 5,

    /** Days before close date to flag a deal as "closing soon" */
    closingSoonDays: 30,

    /** Days before close date + no proposal = high urgency */
    closingNoProposalDays: 14,

    /** % of active deals in one stage to flag pipeline imbalance */
    imbalanceThresholdPct: 40,

    /** % of deals with no activity to flag stale pipeline */
    stalePipelinePct: 30,

    /** % of total pipeline value in a single deal to flag concentration risk */
    revenueConcentrationPct: 50,

    /** Stages considered "early" for follow-up rules */
    earlyStages: ['Contacted', 'Engaged'] as DealStage[],

    /** Stages considered "late" where a proposal is expected */
    lateStages: ['Schedule To Present', 'Proposal Presented', 'Decision Pending'] as DealStage[],

    /** Recent activity feed default limit */
    activityFeedLimit: 20,

    /** Max deal activities to fetch for staleness map (last N days) */
    activityLookbackDays: 60,
}

// ─────────────────────────────────────────────
// Data Fetchers
// ─────────────────────────────────────────────

/** Fetch recent org-wide activities */
export async function fetchRecentActivities(
    orgId: string,
    limit = RULES.activityFeedLimit
): Promise<ActivityRecord[]> {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) throw error
    return (data ?? []) as ActivityRecord[]
}

/** Fetch the last activity timestamp per deal within the lookback window */
export async function fetchDealActivitiesMap(
    orgId: string
): Promise<Map<string, string>> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RULES.activityLookbackDays)

    const { data, error } = await supabase
        .from('activities')
        .select('entity_id, created_at')
        .eq('org_id', orgId)
        .eq('entity_type', 'deal')
        .gte('created_at', cutoff.toISOString())
        .order('created_at', { ascending: false })

    if (error) throw error

    const map = new Map<string, string>()
    for (const row of data ?? []) {
        // Only keep the most recent activity per deal
        if (!map.has(row.entity_id)) {
            map.set(row.entity_id, row.created_at!)
        }
    }
    return map
}

/** Batch-check which deals have at least one proposal attachment */
export async function getProposalStatusForDeals(
    dealIds: string[]
): Promise<Set<string>> {
    if (dealIds.length === 0) return new Set()

    const { data, error } = await supabase
        .from('deal_attachments')
        .select('deal_id')
        .in('deal_id', dealIds)
        .eq('file_type', 'proposal')

    if (error) throw error

    return new Set((data ?? []).map((r) => r.deal_id))
}

// ─────────────────────────────────────────────
// Pure Computation Functions
// ─────────────────────────────────────────────

/** Compute the 4 stat cards from deals */
export function computeStats(deals: Deal[]): DashboardStats {
    const now = new Date()
    const soonCutoff = new Date()
    soonCutoff.setDate(now.getDate() + RULES.closingSoonDays)

    let totalProspects = 0
    let closingSoon = 0
    let annualRevenue = 0

    for (const deal of deals) {
        if (deal.stage !== 'Closed') {
            totalProspects++
            if (
                deal.expected_close_date &&
                new Date(deal.expected_close_date) <= soonCutoff
            ) {
                closingSoon++
            }
        } else {
            annualRevenue += deal.value ?? 0
        }
    }

    return {
        totalProspects,
        activeDeals: deals.length,
        closingSoon,
        annualRevenue,
    }
}

/** Compute pipeline snapshot — deal count and value per stage */
export function computePipelineSnapshot(deals: Deal[]): PipelineSnapshot[] {
    const countMap = new Map<DealStage, { count: number; value: number }>()
    for (const stage of PIPELINE_STAGES) {
        countMap.set(stage, { count: 0, value: 0 })
    }
    for (const deal of deals) {
        const entry = countMap.get(deal.stage)
        if (entry) {
            entry.count++
            entry.value += deal.value ?? 0
        }
    }
    return PIPELINE_STAGES.map((stage) => ({
        stage,
        count: countMap.get(stage)!.count,
        value: countMap.get(stage)!.value,
    }))
}

// ─────────────────────────────────────────────
// Heuristic Engine — Action Items
// ─────────────────────────────────────────────

function daysSince(dateStr: string): number {
    return Math.floor(
        (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    )
}

function daysUntil(dateStr: string): number {
    return Math.floor(
        (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
}

function dealTitle(deal: Deal): string {
    return (deal.data?.title as string) || deal.client?.name || 'Untitled Deal'
}

/** Generate ranked action items from pipeline data */
export function generateActionItems(
    deals: Deal[],
    lastActivityMap: Map<string, string>,
    proposalDealIds: Set<string>
): ActionItem[] {
    const items: ActionItem[] = []
    const activeDeals = deals.filter((d) => d.stage !== 'Closed')

    for (const deal of activeDeals) {
        const lastActivity = lastActivityMap.get(deal.id)
        const idle = lastActivity ? daysSince(lastActivity) : null
        const closesIn = deal.expected_close_date
            ? daysUntil(deal.expected_close_date)
            : null
        const hasProposal = proposalDealIds.has(deal.id)
        const title = dealTitle(deal)
        const client = deal.client?.name ?? 'Unknown'

        // HIGH: Closing soon with no proposal
        if (
            closesIn !== null &&
            closesIn <= RULES.closingNoProposalDays &&
            closesIn >= 0 &&
            !hasProposal &&
            RULES.lateStages.includes(deal.stage)
        ) {
            items.push({
                id: `${deal.id}-no-proposal`,
                dealId: deal.id,
                dealTitle: title,
                clientName: client,
                stage: deal.stage,
                urgency: 'high',
                reason: `Closing in ${closesIn} day${closesIn !== 1 ? 's' : ''} with no proposal uploaded`,
                actionLabel: 'Upload proposal',
            })
        }

        // HIGH: Stale deal — no activity in staleDealDays+
        if (idle !== null && idle >= RULES.staleDealDays) {
            items.push({
                id: `${deal.id}-stale`,
                dealId: deal.id,
                dealTitle: title,
                clientName: client,
                stage: deal.stage,
                urgency: 'high',
                reason: `No activity in ${idle} days`,
                actionLabel: 'Follow up',
            })
        } else if (idle === null) {
            // No recorded activity at all within lookback window
            items.push({
                id: `${deal.id}-no-activity`,
                dealId: deal.id,
                dealTitle: title,
                clientName: client,
                stage: deal.stage,
                urgency: 'high',
                reason: 'No recorded activity',
                actionLabel: 'Review deal',
            })
        }

        // MEDIUM: Early-stage deal idle for earlyStageFollowUpDays+
        if (
            idle !== null &&
            idle >= RULES.earlyStageFollowUpDays &&
            idle < RULES.staleDealDays &&
            RULES.earlyStages.includes(deal.stage)
        ) {
            items.push({
                id: `${deal.id}-early-followup`,
                dealId: deal.id,
                dealTitle: title,
                clientName: client,
                stage: deal.stage,
                urgency: 'medium',
                reason: `In ${deal.stage} with no activity for ${idle} days`,
                actionLabel: 'Reach out',
            })
        }

        // MEDIUM: Closing within closingSoonDays (general)
        if (
            closesIn !== null &&
            closesIn > RULES.closingNoProposalDays &&
            closesIn <= RULES.closingSoonDays
        ) {
            items.push({
                id: `${deal.id}-closing-soon`,
                dealId: deal.id,
                dealTitle: title,
                clientName: client,
                stage: deal.stage,
                urgency: 'medium',
                reason: `Expected to close in ${closesIn} days`,
                actionLabel: 'Prepare',
            })
        }
    }

    // Sort: high first, then medium, then low
    const urgencyOrder = { high: 0, medium: 1, low: 2 }
    items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

    return items
}

// ─────────────────────────────────────────────
// Heuristic Engine — Pattern Insights
// ─────────────────────────────────────────────

export function generateInsights(
    deals: Deal[],
    lastActivityMap: Map<string, string>
): Insight[] {
    const insights: Insight[] = []
    const activeDeals = deals.filter((d) => d.stage !== 'Closed')

    if (activeDeals.length === 0) return insights

    // 1. Pipeline imbalance — any single stage holding too many deals
    const stageCounts = new Map<DealStage, number>()
    for (const deal of activeDeals) {
        stageCounts.set(deal.stage, (stageCounts.get(deal.stage) ?? 0) + 1)
    }
    for (const [stage, count] of stageCounts) {
        const pct = Math.round((count / activeDeals.length) * 100)
        if (pct >= RULES.imbalanceThresholdPct) {
            insights.push({
                id: `imbalance-${stage}`,
                type: 'warning',
                title: 'Pipeline imbalance',
                description: `${count} of ${activeDeals.length} active deals are in "${stage}". Consider advancing or re-qualifying these prospects.`,
                metric: `${pct}% in one stage`,
            })
        }
    }

    // 2. Stale pipeline — too many deals with no recent activity
    const staleCount = activeDeals.filter((d) => {
        const last = lastActivityMap.get(d.id)
        return !last || daysSince(last) >= RULES.staleDealDays
    }).length
    const stalePct = Math.round((staleCount / activeDeals.length) * 100)
    if (stalePct >= RULES.stalePipelinePct) {
        insights.push({
            id: 'stale-pipeline',
            type: 'warning',
            title: 'Stale pipeline',
            description: `${staleCount} of ${activeDeals.length} deals have had no activity in ${RULES.staleDealDays}+ days. Review your pipeline for deals that need attention or should be closed.`,
            metric: `${stalePct}% idle`,
        })
    }

    // 3. Revenue concentration — one deal dominates the pipeline
    const totalValue = activeDeals.reduce(
        (sum, d) => sum + (d.value ?? 0),
        0
    )
    if (totalValue > 0) {
        const topDeal = activeDeals.reduce((top, d) =>
            (d.value ?? 0) > (top.value ?? 0) ? d : top
        )
        const topPct = Math.round(((topDeal.value ?? 0) / totalValue) * 100)
        if (topPct >= RULES.revenueConcentrationPct) {
            insights.push({
                id: 'revenue-concentration',
                type: 'warning',
                title: 'Revenue concentration risk',
                description: `"${dealTitle(topDeal)}" represents ${topPct}% of your active pipeline value. Diversifying your pipeline reduces risk.`,
                metric: `$${(topDeal.value ?? 0).toLocaleString()}`,
            })
        }
    }

    // 4. Positive: recently moved deals (activity in last 3 days)
    const recentlyActive = activeDeals.filter((d) => {
        const last = lastActivityMap.get(d.id)
        return last && daysSince(last) <= 3
    }).length
    if (recentlyActive > 0) {
        insights.push({
            id: 'recently-active',
            type: 'positive',
            title: 'Active momentum',
            description: `${recentlyActive} deal${recentlyActive !== 1 ? 's have' : ' has'} had activity in the last 3 days. Keep the momentum going.`,
            metric: `${recentlyActive} active`,
        })
    }

    // 5. Info: early-stage pipeline health
    const earlyCount = activeDeals.filter((d) =>
        (['Opportunity', ...RULES.earlyStages] as DealStage[]).includes(d.stage)
    ).length
    const lateCount = activeDeals.filter((d) =>
        RULES.lateStages.includes(d.stage)
    ).length
    if (earlyCount > 0 && lateCount > 0) {
        insights.push({
            id: 'funnel-shape',
            type: 'info',
            title: 'Pipeline distribution',
            description: `${earlyCount} deal${earlyCount !== 1 ? 's' : ''} in early stages, ${lateCount} in late stages. ${earlyCount > lateCount * 2 ? 'Healthy top-of-funnel.' : lateCount > earlyCount ? 'Consider adding more prospects to the top of the funnel.' : 'Balanced distribution.'}`,
        })
    }

    return insights
}
