import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import type { DealStage, NewDealInput } from '@/lib/deals'
import { Input } from '@/components/ui/input'
import { STAGE_COLORS } from './stageColors'

const PLAN_TYPES: { label: string; value: string; icon: ReactNode }[] = [
    { label: 'Retire', value: 'Retirement Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="3"/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5"/><path d="M12 3l1.5-1.5M13 4.5l1.5-.5"/></svg> },
    { label: 'Education', value: 'Education Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L1 5l7 4 7-4-7-4z"/><path d="M3 7v4c0 1.7 2.2 3 5 3s5-1.3 5-3V7"/></svg> },
    { label: 'Insurance', value: 'Insurance Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L2 4v4c0 3.3 2.6 6.4 6 7 3.4-.6 6-3.7 6-7V4L8 1z"/></svg> },
    { label: 'Health', value: 'Health Protection Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2H10V6H14V10H10V14H6V10H2V6H6V2Z"/></svg> },
    { label: 'Critical', value: 'Critical Illness Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2C5 2 2 5 2 8s3 6 6 6 6-3 6-6-3-6-6-6z"/><path d="M4 8h3l1-2 2 4 1-2h3"/></svg> },
    { label: 'Invest', value: 'Investment Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 14l4-5 3 3 5-7"/><path d="M11 5h3v3"/></svg> },
    { label: 'Estate', value: 'Estate Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l6-5 6 5"/><path d="M4 6v7h8V6"/><path d="M6.5 13V10h3v3"/></svg> },
    { label: 'Legacy', value: 'Legacy Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h8v10H4z"/><path d="M6 6h4M6 8.5h4M6 11h2"/></svg> },
    { label: 'Milestone', value: 'Life Milestone Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14V2"/><path d="M4 2h7l-2 3 2 3H4"/></svg> },
]

interface Client {
    id: string
    name: string
    profile_picture_url: string | null
}

interface InlineAddDealProps {
    stage: DealStage
    onCreated: (input: NewDealInput) => void
    onCancel: () => void
}

export default function InlineAddDeal({ stage, onCreated, onCancel }: InlineAddDealProps) {
    const isDark = document.documentElement.classList.contains('dark')
    const stageColor = isDark ? STAGE_COLORS[stage].bgDark : STAGE_COLORS[stage].bg
    const { user } = useAuth()
    const { orgId } = useOrg()
    const [step, setStep] = useState<'client' | 'title'>('client')
    const [clientSearch, setClientSearch] = useState('')
    const [clients, setClients] = useState<Client[]>([])
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [title, setTitle] = useState('')
    const [saving, setSaving] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const clientInputRef = useRef<HTMLInputElement>(null)
    const titleInputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Load clients
    useEffect(() => {
        if (!orgId) return
        supabase
            .from('clients')
            .select('id, name, profile_picture_url')
            .eq('org_id', orgId)
            .order('name')
            .then(({ data }) => setClients(data ?? []))
    }, [orgId])

    // Auto-focus client input
    useEffect(() => {
        clientInputRef.current?.focus()
    }, [])

    // Auto-focus title input when step changes
    useEffect(() => {
        if (step === 'title') {
            titleInputRef.current?.focus()
        }
    }, [step])

    const filteredClients = clients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
    )

    const exactMatchExists = clients.some(
        (c) => c.name.toLowerCase() === clientSearch.toLowerCase().trim()
    )

    function handleSelectClient(client: Client) {
        setSelectedClient(client)
        setClientSearch(client.name)
        setShowDropdown(false)
        setStep('title')
    }

    async function handleCreateClient() {
        if (!user || !orgId || !clientSearch.trim()) return
        const { data, error } = await supabase
            .from('clients')
            .insert({ org_id: orgId, owner_id: user.id, name: clientSearch.trim() })
            .select('id, name, profile_picture_url')
            .single()
        if (error || !data) return
        setClients((prev) => [...prev, data])
        handleSelectClient(data)
    }

    const handleSubmit = useCallback(async () => {
        if (!user || !orgId || !selectedClient || saving) return
        setSaving(true)
        const input: NewDealInput = {
            org_id: orgId,
            client_id: selectedClient.id,
            owner_id: user.id,
            stage,
            value: 0,
            expected_close_date: null,
            due_date: null,
            title: title.trim() || undefined,
        }
        onCreated(input)
    }, [user, orgId, selectedClient, saving, stage, title, onCreated])

    function handleTitleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
        if (e.key === 'Escape') onCancel()
    }

    function handleClientKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Escape') onCancel()
    }

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onCancel()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onCancel])

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
        >
            <div className="bg-card border border-border/80 dark:border-border/60 rounded-xl px-3 py-2.5 shadow-sm">
                <AnimatePresence mode="wait">
                    {step === 'client' ? (
                        <motion.div
                            key="client"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                        >
                            {/* Client search */}
                            <div className="relative">
                                <Input
                                    ref={clientInputRef}
                                    placeholder="Search or create client..."
                                    value={clientSearch}
                                    onChange={(e) => {
                                        setClientSearch(e.target.value)
                                        setShowDropdown(true)
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    onKeyDown={handleClientKeyDown}
                                    className="h-8 text-sm rounded-lg bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-background shadow-none"
                                />
                                <button
                                    onClick={onCancel}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>

                            {/* Dropdown */}
                            {showDropdown && (
                                <div className="mt-1.5 border border-border rounded-lg overflow-hidden max-h-36 overflow-y-auto bg-popover shadow-md">
                                    {filteredClients.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleSelectClient(c)}
                                        >
                                            {c.profile_picture_url ? (
                                                <img
                                                    src={c.profile_picture_url}
                                                    alt={c.name}
                                                    className="w-5 h-5 rounded-full object-cover shrink-0"
                                                />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center shrink-0">
                                                    <span className="text-[9px] font-semibold text-muted-foreground">
                                                        {c.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="text-sm text-foreground truncate">{c.name}</span>
                                        </button>
                                    ))}

                                    {filteredClients.length === 0 && !clientSearch.trim() && (
                                        <div className="px-3 py-2.5 text-xs text-muted-foreground text-center">
                                            No clients yet
                                        </div>
                                    )}

                                    {!exactMatchExists && clientSearch.trim() && (
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={handleCreateClient}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors border-t border-border"
                                        >
                                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0">+</span>
                                            <span className="truncate">Create &ldquo;{clientSearch.trim()}&rdquo;</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="title"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            className="flex flex-col gap-2"
                        >
                            {/* Selected client chip */}
                            <div className="flex items-center gap-2">
                                {selectedClient?.profile_picture_url ? (
                                    <img
                                        src={selectedClient.profile_picture_url}
                                        alt={selectedClient.name}
                                        className="w-4 h-4 rounded-full object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="w-4 h-4 rounded-full bg-muted-foreground/20 flex items-center justify-center shrink-0">
                                        <span className="text-[8px] font-semibold text-muted-foreground">
                                            {selectedClient?.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <span className="text-xs text-muted-foreground truncate flex-1">
                                    {selectedClient?.name}
                                </span>
                                <button
                                    onClick={() => { setStep('client'); setSelectedClient(null); setClientSearch('') }}
                                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                >
                                    <X size={11} />
                                </button>
                            </div>

                            {/* Plan type quick picks — 3×3 grid */}
                            <div className="grid grid-cols-3 gap-1">
                                {PLAN_TYPES.map(({ label, value, icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => {
                                            setTitle(value)
                                            titleInputRef.current?.focus()
                                        }}
                                        className={`flex items-center gap-1 px-1.5 py-1 text-[10px] rounded-md border transition-colors ${
                                            title === value
                                                ? 'text-white font-medium'
                                                : 'bg-background text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
                                        }`}
                                        style={title === value ? { backgroundColor: stageColor, borderColor: stageColor } : undefined}
                                    >
                                        <span className={`shrink-0 ${title === value ? 'opacity-90' : 'opacity-70'}`}>{icon}</span>
                                        <span className="truncate">{label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Title input */}
                            <div className="flex items-center gap-1.5">
                                <Input
                                    ref={titleInputRef}
                                    placeholder="Custom title... (Enter to create)"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onKeyDown={handleTitleKeyDown}
                                    className="h-7 text-sm rounded-lg bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-background shadow-none flex-1"
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="px-2.5 py-1 text-[11px] font-medium text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 shrink-0"
                                    style={{ backgroundColor: stageColor }}
                                >
                                    {saving ? '...' : 'Add'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
