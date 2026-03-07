import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Briefcase, FileText, RefreshCw, Activity, Filter } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import ActionItemsBar from '@/components/dashboard/ActionItemsBar'
import ActivityTimeline from '@/components/pipeline/ActivityTimeline'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useOrgActivities, useOrgMembers } from '@/hooks/queries/useActivities'

export default function HomePage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { actionItems, loading, refresh } = useDashboardData()
    const [orgId, setOrgId] = useState<string | null>(null)
    const [actorFilter, setActorFilter] = useState('')

    useEffect(() => {
        if (!user) return
        supabase
            .from('memberships')
            .select('org_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1)
            .single()
            .then(({ data }) => {
                if (data) setOrgId(data.org_id)
            })
    }, [user])

    const { data: activities = [] } = useOrgActivities(orgId ?? undefined, {
        actorId: actorFilter || undefined,
    })
    const { data: members = [] } = useOrgMembers(orgId ?? undefined)

    return (
        <div className="min-h-screen bg-transparent">
            <div className="max-w-5xl mx-auto px-6 py-4">
                {/* Action Items */}
                <div className="mb-8">
                    <ActionItemsBar
                        items={actionItems}
                        loading={loading}
                        onOpenRules={() => navigate('/app/settings/rules')}
                        onRefresh={refresh}
                    />
                </div>

                {/* Quick navigate */}
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Jump to
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <button
                        onClick={() => navigate('/app/clients')}
                        className="rounded-xl border border-border bg-card p-5 text-left hover:shadow-md hover:border-border transition-all duration-150 group"
                        id="goto-clients"
                    >
                        <Users size={20} className="text-accent mb-3" />
                        <p className="text-sm font-semibold text-foreground">Clients</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            View your relationships
                        </p>
                    </button>
                    <button
                        onClick={() => navigate('/app/pipeline')}
                        className="rounded-xl border border-border bg-card p-5 text-left hover:shadow-md hover:border-border transition-all duration-150"
                        id="goto-pipeline"
                    >
                        <Briefcase size={20} className="text-accent mb-3" />
                        <p className="text-sm font-semibold text-foreground">Pipeline</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Track your deals
                        </p>
                    </button>
                    <button
                        onClick={() => navigate('/app/notes')}
                        className="rounded-xl border border-border bg-card p-5 text-left hover:shadow-md hover:border-border transition-all duration-150"
                        id="goto-notes"
                    >
                        <FileText size={20} className="text-accent mb-3" />
                        <p className="text-sm font-semibold text-foreground">Notes</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Capture context
                        </p>
                    </button>
                    <button
                        onClick={() => navigate('/app/service')}
                        className="rounded-xl border border-border bg-card p-5 text-left hover:shadow-md hover:border-border transition-all duration-150"
                        id="goto-service"
                    >
                        <RefreshCw size={20} className="text-accent mb-3" />
                        <p className="text-sm font-semibold text-foreground">Service</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            After-sale tracking
                        </p>
                    </button>
                </div>

                {/* Team Activity Feed */}
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-accent" />
                            <h3 className="text-sm font-semibold text-foreground">Team Activity</h3>
                        </div>
                        {members.length > 1 && (
                            <div className="flex items-center gap-1.5">
                                <Filter size={11} className="text-muted-foreground" />
                                <select
                                    value={actorFilter}
                                    onChange={e => setActorFilter(e.target.value)}
                                    className="h-7 rounded-md border border-border bg-background px-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">All members</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <ActivityTimeline
                        activities={activities}
                        showActorNames
                    />
                </div>
            </div>
        </div>
    )
}
