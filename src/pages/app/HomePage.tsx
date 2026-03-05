import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Users, Briefcase, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
    const { user } = useAuth()
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-transparent pt-4">
            <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Good day 👋</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
                </div>
                {/* SignOut is now in the nav avatar, but leaving here as a quick action if desired, 
                    or we could just drop it. We'll drop it since it's redundant. */}
            </div>

            <div className="max-w-5xl mx-auto px-6 py-4">
                {/* Quick navigate */}
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Jump to</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <button
                        onClick={() => navigate('/app/clients')}
                        className="rounded-xl border border-border bg-white p-5 text-left hover:shadow-md hover:border-zinc-300 transition-all duration-150 group"
                        id="goto-clients"
                    >
                        <Users size={20} className="text-accent mb-3" />
                        <p className="text-sm font-semibold text-foreground">Clients</p>
                        <p className="text-xs text-muted-foreground mt-0.5">View your relationships</p>
                    </button>
                    <button
                        onClick={() => navigate('/app/pipeline')}
                        className="rounded-xl border border-border bg-white p-5 text-left hover:shadow-md hover:border-zinc-300 transition-all duration-150"
                        id="goto-pipeline"
                    >
                        <Briefcase size={20} className="text-accent mb-3" />
                        <p className="text-sm font-semibold text-foreground">Pipeline</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Track your deals</p>
                    </button>
                    <button
                        onClick={() => navigate('/app/notes')}
                        className="rounded-xl border border-border bg-white p-5 text-left hover:shadow-md hover:border-zinc-300 transition-all duration-150"
                        id="goto-notes"
                    >
                        <FileText size={20} className="text-accent mb-3" />
                        <p className="text-sm font-semibold text-foreground">Notes</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Capture context</p>
                    </button>
                </div>

                {/* Widgets */}
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Today</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                Tasks Due Today
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">No tasks due today.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                Deals Needing Follow-up
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">All caught up!</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                Proposals Pending
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">No pending proposals.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
