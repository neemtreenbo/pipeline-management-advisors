import { useNavigate } from 'react-router-dom'
import { Users, Briefcase, FileText } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import ActionItemsBar from '@/components/dashboard/ActionItemsBar'

export default function HomePage() {
    const navigate = useNavigate()
    const { actionItems, loading } = useDashboardData()

    return (
        <div className="min-h-screen bg-transparent">
            <div className="max-w-5xl mx-auto px-6 py-4">
                {/* Action Items */}
                <div className="mb-8">
                    <ActionItemsBar
                        items={actionItems}
                        loading={loading}
                        onOpenRules={() => navigate('/app/settings/rules')}
                    />
                </div>

                {/* Quick navigate */}
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Jump to
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                </div>
            </div>
        </div>
    )
}
