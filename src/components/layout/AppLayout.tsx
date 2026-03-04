import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DynamicIslandNav from './DynamicIslandNav'

export default function AppLayout() {
    const { signOut } = useAuth()
    const navigate = useNavigate()

    async function handleSignOut() {
        await signOut()
        navigate('/login')
    }

    return (
        <div className="flex flex-col h-screen w-full bg-slate-50/50 overflow-hidden relative font-sans">
            {/* Background radial gradient for premium feel */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.04),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(147,51,234,0.04),transparent_50%)]" />

            {/* Floating Island Navigation */}
            <DynamicIslandNav />

            {/* Main Content Area */}
            <main className="flex-1 w-full h-full overflow-y-auto pt-24 pb-8 z-10 relative">
                <div className="h-full w-full">
                    <Outlet />
                </div>
            </main>

            {/* Floating Sign Out (Since it was removed from the island) */}
            <div className="fixed bottom-6 left-6 z-40">
                <button
                    onClick={handleSignOut}
                    className="p-3 bg-white/80 backdrop-blur-md rounded-full shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] border border-white/50 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95 group"
                    title="Sign out"
                >
                    <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
            </div>
        </div>
    )
}
