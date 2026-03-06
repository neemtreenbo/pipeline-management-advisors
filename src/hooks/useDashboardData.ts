import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { fetchDealsByOrg } from '@/lib/deals'
import { getTasks } from '@/lib/tasks'
import {
    fetchRecentActivities,
    fetchDealActivitiesMap,
    getProposalStatusForDeals,
    generateActionItems,
    refreshRules,
    type ActionItem,
    type ActivityRecord,
} from '@/lib/dashboard'

interface DashboardData {
    actionItems: ActionItem[]
    recentActivities: ActivityRecord[]
    loading: boolean
}

export function useDashboardData(): DashboardData {
    const { user } = useAuth()
    const [orgId, setOrgId] = useState<string | null>(null)
    const [actionItems, setActionItems] = useState<ActionItem[]>([])
    const [recentActivities, setRecentActivities] = useState<ActivityRecord[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch org membership
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

    const loadData = useCallback(async () => {
        if (!orgId) return
        setLoading(true)
        refreshRules()

        try {
            // Parallel fetch: deals, tasks, activities, activity map
            const [dealsResult, tasksResult, activitiesResult, activityMapResult] =
                await Promise.allSettled([
                    fetchDealsByOrg(orgId),
                    getTasks({ orgId, view: 'all' }),
                    fetchRecentActivities(orgId),
                    fetchDealActivitiesMap(orgId),
                ])

            const deals =
                dealsResult.status === 'fulfilled' ? dealsResult.value : []
            const tasks =
                tasksResult.status === 'fulfilled' ? tasksResult.value : []
            const activities =
                activitiesResult.status === 'fulfilled'
                    ? activitiesResult.value
                    : []
            const activityMap =
                activityMapResult.status === 'fulfilled'
                    ? activityMapResult.value
                    : new Map<string, string>()

            setRecentActivities(activities)

            // Batch proposal check for active deals
            const activeDealIds = deals
                .filter((d) => d.stage !== 'Closed')
                .map((d) => d.id)
            const proposalSet = await getProposalStatusForDeals(activeDealIds)

            // Generate action items with deal + task rules
            const items = generateActionItems(
                deals,
                activityMap,
                proposalSet,
                tasks
            )
            setActionItems(items)
        } catch (err) {
            console.error('Dashboard data load error:', err)
        } finally {
            setLoading(false)
        }
    }, [orgId])

    useEffect(() => {
        loadData()
    }, [loadData])

    return { actionItems, recentActivities, loading }
}
