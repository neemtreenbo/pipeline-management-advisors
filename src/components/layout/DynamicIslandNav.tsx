import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, LayoutGrid, CheckSquare, Users, StickyNote } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { usePageActions } from '@/contexts/PageActionsContext'

const NAV_ITEMS = [
    { path: '/app/home', icon: Home, label: 'Home' },
    { path: '/app/clients', icon: Users, label: 'Clients' },
    { path: '/app/pipeline', icon: LayoutGrid, label: 'Pipeline' },
    { path: '/app/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/app/notes', icon: StickyNote, label: 'Notes' },
]

// Create a framer-motion wrapped NavLink for smooth layout animations
const MotionNavLink = motion.create(NavLink)

export default function DynamicIslandNav() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, signOut } = useAuth()
    const { portalNode } = usePageActions()

    const [hoveredPath, setHoveredPath] = useState<string | null>(null)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    async function handleSignOut() {
        await signOut()
        navigate('/login')
    }

    const userInitial = user?.email?.[0]?.toUpperCase() || 'U'
    const avatarUrl = user?.user_metadata?.avatar_url

    return (
        <div className="sticky top-0 z-50 w-full pt-6 pb-4 px-4 flex justify-center bg-slate-50/95 backdrop-blur-sm border-b border-slate-200/60 shrink-0">
            <motion.nav
                layout
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                className="flex items-center bg-white border border-slate-200 shadow-sm rounded-full p-1.5 gap-1"
            >
                {/* Render any injected page actions inline with the island */}
                <AnimatePresence>
                    {portalNode && (
                        <motion.div
                            initial={{ opacity: 0, width: 0, scale: 0.8 }}
                            animate={{ opacity: 1, width: "auto", scale: 1 }}
                            exit={{ opacity: 0, width: 0, scale: 0.8, filter: "blur(4px)" }}
                            className="flex items-center overflow-hidden whitespace-nowrap"
                        >
                            <div className="pl-2 pr-1 h-full flex items-center">
                                {portalNode}
                            </div>
                            <div className="w-[1px] h-6 bg-slate-200/80 mx-1 origin-center" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Logo / Avatar dropdown area */}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <motion.button layout className="flex items-center pl-2 pr-2 sm:pr-4 py-1 shrink-0 group focus:outline-none">
                            <div className="w-8 h-8 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition-shadow group-hover:shadow-[0_4px_16px_rgba(37,99,235,0.4)]">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white font-bold text-sm leading-none tracking-tighter shadow-sm">
                                        {userInitial}
                                    </span>
                                )}
                            </div>
                        </motion.button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            className="z-[100] mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-100 p-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                            sideOffset={8}
                        >
                            <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-slate-500 truncate">
                                {user?.email || 'My Account'}
                            </DropdownMenu.Label>
                            <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-slate-100" />

                            <DropdownMenu.Item disabled className="relative flex cursor-default select-none items-center rounded-xl px-2 py-2 text-sm outline-none transition-colors focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                                User Settings
                            </DropdownMenu.Item>

                            <DropdownMenu.Item disabled className="relative flex cursor-default select-none items-center rounded-xl px-2 py-2 text-sm outline-none transition-colors focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                                Theme
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-slate-100" />

                            <DropdownMenu.Item
                                onClick={handleSignOut}
                                className="relative flex cursor-pointer select-none items-center rounded-xl px-2 py-2 text-sm outline-none transition-colors text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 font-medium"
                            >
                                Log Out
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>

                <AnimatePresence>
                    {!isMobile && (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, width: 0, margin: 0 }}
                            className="w-[1px] h-6 bg-slate-200/80 mx-1 origin-center"
                        />
                    )}
                </AnimatePresence>

                {/* Navigation links */}
                <motion.div layout className="flex items-center gap-1 px-1">
                    {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
                        const isActive = location.pathname.startsWith(path)
                        const isHovered = hoveredPath === path

                        return (
                            <MotionNavLink
                                layout
                                key={path}
                                to={path}
                                onMouseEnter={() => setHoveredPath(path)}
                                onMouseLeave={() => setHoveredPath(null)}
                                className={`relative flex items-center gap-2 rounded-full text-sm font-medium z-10 transition-colors duration-200
                                    ${isMobile ? 'px-3 py-3' : 'px-4 py-2.5'}
                                    ${isActive
                                        ? 'text-blue-700'
                                        : isHovered
                                            ? 'text-slate-800'
                                            : 'text-slate-500'
                                    }`}
                                title={isMobile ? label : undefined}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute inset-0 bg-blue-50/80 rounded-full -z-10 shadow-[inner_0_1px_2px_rgba(0,0,0,0.02)] border border-blue-100/30"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}
                                {!isActive && isHovered && (
                                    <motion.div
                                        layoutId="hover-pill"
                                        className="absolute inset-0 bg-slate-100/60 rounded-full -z-10"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <Icon size={isMobile ? 18 : 16} strokeWidth={isActive ? 2.5 : 2} className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {!isMobile && (
                                        <motion.span
                                            key="label"
                                            layout
                                            initial={{ opacity: 0, width: 0, filter: "blur(4px)" }}
                                            animate={{ opacity: 1, width: "auto", filter: "blur(0px)" }}
                                            exit={{ opacity: 0, width: 0, filter: "blur(4px)" }}
                                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                            className="whitespace-nowrap overflow-hidden origin-left"
                                        >
                                            {label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </MotionNavLink>
                        )
                    })}
                </motion.div>
            </motion.nav>
        </div>
    )
}
