import { Link } from 'react-router-dom'
import { BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
            {/* Hero */}
            <div className="max-w-lg w-full text-center mb-16">
                <span className="inline-block bg-blue-50 text-accent border border-blue-100 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-6">
                    Sales Rep CRM
                </span>
                <h1 className="text-4xl font-semibold text-foreground leading-tight mb-4 tracking-tight">
                    Your pipeline,<br />
                    <span className="text-accent">under control.</span>
                </h1>
                <p className="text-base text-muted-foreground leading-relaxed mb-8">
                    A lightweight CRM built for insurance advisors. Track clients, deals, tasks, and proposals — all in one place.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                    <Button asChild size="lg">
                        <Link to="/signup">Get Started</Link>
                    </Button>
                    <Button asChild variant="secondary" size="lg">
                        <Link to="/login">Sign In</Link>
                    </Button>
                </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
                {[
                    { icon: '🗂️', title: 'Pipeline', desc: 'Kanban board to move deals from Prospect to Issued.' },
                    { icon: '✅', title: 'Tasks', desc: 'Never miss a follow-up. Today, upcoming, overdue.' },
                    { icon: '📝', title: 'Notes', desc: 'Capture meeting context and link it to clients and deals.' },
                ].map(f => (
                    <div
                        key={f.title}
                        className="rounded-xl border border-border bg-white p-5 text-center hover:shadow-sm hover:border-zinc-300 transition-all duration-150"
                    >
                        <div className="text-2xl mb-3">{f.icon}</div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </div>

            {/* Footer wordmark */}
            <div className="mt-16 flex items-center gap-2 text-muted-foreground">
                <BarChart2 size={16} />
                <span className="text-xs font-medium">Pipeline CRM</span>
            </div>
        </div>
    )
}
