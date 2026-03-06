import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Kanban, CheckSquare, Users, StickyNote, Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { usePageActions } from '@/contexts/PageActionsContext'
import { useTheme } from '@/contexts/ThemeContext'
import GlobalSearch from './GlobalSearch'

const NAV_ITEMS = [
    { path: '/app/home', icon: Home, label: 'Home' },
    { path: '/app/clients', icon: Users, label: 'Clients' },
    { path: '/app/pipeline', icon: Kanban, label: 'Pipeline' },
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
    const { theme, toggleTheme } = useTheme()

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
        <div className="sticky top-0 z-50 w-full pt-6 pb-4 px-6 flex justify-center bg-background/95 backdrop-blur-sm border-b border-border/60 shrink-0">
            <motion.nav
                layout
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                className="flex items-center bg-card border border-border shadow-sm rounded-full p-1.5 gap-1 w-full max-w-5xl"
            >
                {/* Logo / Avatar dropdown area */}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <motion.button layout className="flex items-center pl-2 pr-2 sm:pr-4 py-1 shrink-0 group focus:outline-none">
                            <div className="w-8 h-8 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-foreground flex items-center justify-center transition-opacity group-hover:opacity-80">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-background font-semibold text-sm leading-none">
                                        {userInitial}
                                    </span>
                                )}
                            </div>
                        </motion.button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            className="z-[100] mt-2 w-48 bg-popover/95 backdrop-blur-xl rounded-2xl shadow-lg border border-border p-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                            sideOffset={8}
                        >
                            <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-muted-foreground truncate">
                                {user?.email || 'My Account'}
                            </DropdownMenu.Label>
                            <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />

                            <DropdownMenu.Item disabled className="relative flex cursor-default select-none items-center rounded-xl px-2 py-2 text-sm outline-none transition-colors focus:bg-muted focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                                User Settings
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />

                            <DropdownMenu.Item
                                onSelect={handleSignOut}
                                className="relative flex cursor-pointer select-none items-center rounded-xl px-2 py-2 text-sm outline-none transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 focus:bg-red-50 dark:focus:bg-red-950/30 focus:text-red-700 font-medium"
                            >
                                Log Out
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>

                {/* Global search — always visible */}
                <div className="w-[1px] h-6 bg-border/80 mx-1 shrink-0" />
                <div className="flex-1 min-w-0">
                    <GlobalSearch />
                </div>

                {/* Injected page actions (add buttons, etc.) */}
                <AnimatePresence>
                    {portalNode && (
                        <motion.div
                            initial={{ opacity: 0, width: 0, scale: 0.8 }}
                            animate={{ opacity: 1, width: "auto", scale: 1 }}
                            exit={{ opacity: 0, width: 0, scale: 0.8, filter: "blur(4px)" }}
                            className="flex items-center overflow-hidden whitespace-nowrap"
                        >
                            <div className="w-[1px] h-6 bg-border/80 mx-1 origin-center" />
                            <div className="pl-1 pr-1 h-full flex items-center">
                                {portalNode}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {!isMobile && (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, width: 0, margin: 0 }}
                            className="w-[1px] h-6 bg-border/80 mx-1 origin-center"
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
                                        ? 'text-foreground'
                                        : isHovered
                                            ? 'text-foreground'
                                            : 'text-muted-foreground'
                                    }`}
                                title={isMobile ? label : undefined}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute inset-0 bg-foreground/10 rounded-full -z-10 border border-foreground/15"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}
                                {!isActive && isHovered && (
                                    <motion.div
                                        layoutId="hover-pill"
                                        className="absolute inset-0 bg-muted/60 rounded-full -z-10"
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

                {/* Theme toggle — always visible in nav */}
                <AnimatePresence>
                    {!isMobile && (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, width: 0, margin: 0 }}
                            className="w-[1px] h-6 bg-border/80 mx-1 origin-center"
                        />
                    )}
                </AnimatePresence>

                <motion.button
                    layout
                    onClick={toggleTheme}
                    className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
                    title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                    {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                </motion.button>
            </motion.nav>
        </div>
    )
}
