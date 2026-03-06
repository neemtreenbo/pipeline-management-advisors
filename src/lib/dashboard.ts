import { supabase } from './supabase'
import type { Deal, DealStage } from './deals'
import { PIPELINE_STAGES } from './deals'
import type { Task } from './tasks'

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
    dealId?: string
    taskId?: string
    dealTitle?: string
    taskTitle?: string
    clientName?: string
    stage?: DealStage
    urgency: 'high' | 'medium' | 'low'
    reason: string
    actionLabel: string
    link: string
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
// ─────────────────────────────────────────────

export interface RulesConfig {
    // Deal rules
    staleDealDays: number
    earlyStageFollowUpDays: number
    earlyStages: DealStage[]

    // Task rules
    taskOverdueDays: number
    taskDueSoonDays: number
    taskOverdueHighThreshold: number

    // General
    activityFeedLimit: number
    activityLookbackDays: number
}

const DEFAULT_RULES: RulesConfig = {
    // Deal rules
    staleDealDays: 14,
    earlyStageFollowUpDays: 5,
    earlyStages: ['Contacted', 'Engaged'],

    // Task rules
    taskOverdueDays: 0,
    taskDueSoonDays: 3,
    taskOverdueHighThreshold: 3,

    // General
    activityFeedLimit: 20,
    activityLookbackDays: 60,
}

const STORAGE_KEY = 'pma-rules-config'

/** Load rules from localStorage, falling back to defaults */
export function loadRules(): RulesConfig {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored)
            return { ...DEFAULT_RULES, ...parsed }
        }
    } catch {
        // ignore parse errors
    }
    return { ...DEFAULT_RULES }
}

/** Save rules to localStorage */
export function saveRules(rules: RulesConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

/** Reset rules to defaults */
export function resetRules(): RulesConfig {
    localStorage.removeItem(STORAGE_KEY)
    return { ...DEFAULT_RULES }
}

/** Get default rules (for comparison) */
export function getDefaultRules(): RulesConfig {
    return { ...DEFAULT_RULES }
}

// Active rules instance — loaded once, updated by the rules page
export let RULES: RulesConfig = loadRules()

/** Refresh the in-memory rules from localStorage */
export function refreshRules(): void {
    RULES = loadRules()
}

// ─────────────────────────────────────────────
// Rule Metadata (for the rules UI)
// ─────────────────────────────────────────────

export interface RuleMeta {
    key: keyof RulesConfig
    label: string
    description: string
    category: 'deal' | 'task' | 'general'
    type: 'number' | 'stages'
    unit?: string
    min?: number
    max?: number
}

export const RULE_DEFINITIONS: RuleMeta[] = [
    // Deal rules
    {
        key: 'staleDealDays',
        label: 'Stale deal threshold',
        description: 'Days without activity before a deal is flagged as stale (HIGH urgency)',
        category: 'deal',
        type: 'number',
        unit: 'days',
        min: 1,
        max: 90,
    },
    {
        key: 'earlyStageFollowUpDays',
        label: 'Early-stage follow-up',
        description: 'Days without activity in early stages before suggesting follow-up (MEDIUM urgency)',
        category: 'deal',
        type: 'number',
        unit: 'days',
        min: 1,
        max: 30,
    },
    // Task rules
    {
        key: 'taskOverdueDays',
        label: 'Overdue task grace period',
        description: 'Days past due before a task appears as an action item (0 = immediately)',
        category: 'task',
        type: 'number',
        unit: 'days',
        min: 0,
        max: 14,
    },
    {
        key: 'taskDueSoonDays',
        label: 'Due soon window',
        description: 'Days before a task is due to flag it as "due soon" (MEDIUM urgency)',
        category: 'task',
        type: 'number',
        unit: 'days',
        min: 1,
        max: 14,
    },
    {
        key: 'taskOverdueHighThreshold',
        label: 'Overdue HIGH threshold',
        description: 'Days overdue to escalate a task from MEDIUM to HIGH urgency',
        category: 'task',
        type: 'number',
        unit: 'days',
        min: 1,
        max: 30,
    },

    // General
    {
        key: 'activityFeedLimit',
        label: 'Activity feed limit',
        description: 'Number of recent activities to show in the feed',
        category: 'general',
        type: 'number',
        unit: 'items',
        min: 5,
        max: 100,
    },
    {
        key: 'activityLookbackDays',
        label: 'Activity lookback',
        description: 'How far back to check for deal activity when detecting staleness',
        category: 'general',
        type: 'number',
        unit: 'days',
        min: 14,
        max: 365,
    },
]

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
// Heuristic Engine — Helpers
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

// ─────────────────────────────────────────────
// Heuristic Engine — Action Items
// ─────────────────────────────────────────────

/** Generate ranked action items from pipeline + task data */
export function generateActionItems(
    deals: Deal[],
    lastActivityMap: Map<string, string>,
    tasks?: Task[]
): ActionItem[] {
    const items: ActionItem[] = []
    const activeDeals = deals.filter((d) => d.stage !== 'Closed')

    // ── Deal-based rules ──

    for (const deal of activeDeals) {
        const lastActivity = lastActivityMap.get(deal.id)
        const idle = lastActivity ? daysSince(lastActivity) : null
        const title = dealTitle(deal)
        const client = deal.client?.name ?? 'Unknown'

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
                link: `/app/pipeline?deal=${deal.id}`,
            })
        } else if (idle === null) {
            items.push({
                id: `${deal.id}-no-activity`,
                dealId: deal.id,
                dealTitle: title,
                clientName: client,
                stage: deal.stage,
                urgency: 'high',
                reason: 'No recorded activity',
                actionLabel: 'Review deal',
                link: `/app/pipeline?deal=${deal.id}`,
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
                link: `/app/pipeline?deal=${deal.id}`,
            })
        }
    }

    // ── Task-based rules ──

    if (tasks) {
        const now = new Date()
        const soonCutoff = new Date()
        soonCutoff.setDate(now.getDate() + RULES.taskDueSoonDays)

        for (const task of tasks) {
            if (task.status === 'completed') continue
            if (!task.due_at) continue

            const dueDate = new Date(task.due_at)
            const overdueDays = daysSince(task.due_at)
            const dueIn = daysUntil(task.due_at)

            // Overdue tasks
            if (dueDate < now && overdueDays >= RULES.taskOverdueDays) {
                const isHigh = overdueDays >= RULES.taskOverdueHighThreshold
                items.push({
                    id: `task-${task.id}-overdue`,
                    taskId: task.id,
                    taskTitle: task.title,
                    urgency: isHigh ? 'high' : 'medium',
                    reason: overdueDays === 0
                        ? 'Task is due today'
                        : `Task overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`,
                    actionLabel: 'Complete task',
                    link: '/app/tasks',
                })
            }
            // Due soon (not overdue)
            else if (dueDate >= now && dueDate <= soonCutoff) {
                items.push({
                    id: `task-${task.id}-due-soon`,
                    taskId: task.id,
                    taskTitle: task.title,
                    urgency: 'low',
                    reason: dueIn === 0
                        ? 'Due today'
                        : `Due in ${dueIn} day${dueIn !== 1 ? 's' : ''}`,
                    actionLabel: 'Review task',
                    link: '/app/tasks',
                })
            }
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

    // 1. Pipeline imbalance
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

    // 2. Stale pipeline
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

    // 3. Revenue concentration
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

    // 4. Positive: recently active deals
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

    // 5. Funnel distribution
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
