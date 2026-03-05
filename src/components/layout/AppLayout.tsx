import { Outlet } from 'react-router-dom'
import DynamicIslandNav from './DynamicIslandNav'
import { PageActionsProvider } from '@/contexts/PageActionsContext'
import { OrgProvider } from '@/contexts/OrgContext'

export default function AppLayout() {
    return (
        <OrgProvider>
        <PageActionsProvider>
            <div className="flex flex-col h-screen w-full bg-background overflow-hidden relative font-sans">
                {/* Background radial gradient for premium feel */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.04),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(147,51,234,0.04),transparent_50%)]" />

                {/* Floating Island Navigation */}
                <DynamicIslandNav />

                {/* Main Content Area */}
                <main className="flex-1 w-full h-full overflow-y-auto pb-8 z-10 relative">
                    <div className="h-full w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </PageActionsProvider>
        </OrgProvider>
    )
}
