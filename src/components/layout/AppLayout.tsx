import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, LayoutGrid, CheckSquare, Users, StickyNote, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS = [
    { path: '/app/home', icon: Home, label: 'Home' },
    { path: '/app/clients', icon: Users, label: 'Clients' },
    { path: '/app/pipeline', icon: LayoutGrid, label: 'Pipeline' },
    { path: '/app/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/app/notes', icon: StickyNote, label: 'Notes' },
]

export default function AppLayout() {
    const { signOut } = useAuth()
    const navigate = useNavigate()

    async function handleSignOut() {
        await signOut()
        navigate('/login')
    }

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {/* Background radial gradient for premium feel */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.03),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(147,51,234,0.03),transparent_40%)]" />

            {/* Sidebar (Desktop only for now, can be responsive later) */}
            <aside className="w-[72px] lg:w-64 h-full shrink-0 border-r border-border bg-white/50 backdrop-blur-md flex flex-col items-center lg:items-stretch py-6 z-10 transition-all duration-300">

                {/* Logo area */}
                <div className="flex items-center justify-center lg:justify-start lg:px-6 mb-8 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-lg leading-none tracking-tighter">N</span>
                    </div>
                    <span className="hidden lg:block ml-3 font-semibold text-lg tracking-tight text-foreground">
                        NeemTree
                    </span>
                </div>

                {/* Navigation links */}
                <nav className="flex-1 w-full px-3 flex flex-col gap-2">
                    {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) =>
                                `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-accent/10 text-accent font-medium'
                                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                }`
                            }
                            title={label}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon
                                        size={20}
                                        className={`shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                                    />
                                    <span className="hidden lg:block text-sm">{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom area (Profile/Logout) */}
                <div className="px-3 mt-auto w-full">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                        title="Sign out"
                    >
                        <LogOut size={20} className="shrink-0 group-hover:-translate-x-0.5 transition-transform duration-200" />
                        <span className="hidden lg:block text-sm font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto z-10">
                <Outlet />
            </main>
        </div>
    )
}
