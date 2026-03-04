import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PIPELINE_STAGES } from '@/lib/deals'
import type { DealStage, NewDealInput } from '@/lib/deals'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown } from 'lucide-react'

const FINANCIAL_PLAN_TYPES = [
    'Retirement Plan',
    'Education Plan',
    'Income Protection Plan',
    'Health Protection Plan',
    'Critical Illness Plan',
    'Investment Plan',
    'Estate Plan',
    'Legacy Plan',
]

interface Client {
    id: string
    name: string
}

interface NewDealModalProps {
    orgId: string
    defaultStage?: DealStage
    onClose: () => void
    onCreated: (input: NewDealInput) => void
}

export default function NewDealModal({ orgId, defaultStage = 'Opportunity', onClose, onCreated }: NewDealModalProps) {

    const { user } = useAuth()

    const [clients, setClients] = useState<Client[]>([])
    const [clientSearch, setClientSearch] = useState('')
    const [form, setForm] = useState({
        client_id: '',
        title: '',
        stage: defaultStage,
    })
    const [saving, setSaving] = useState(false)
    const [creatingClient, setCreatingClient] = useState(false)
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        supabase
            .from('clients')
            .select('id, name')
            .eq('org_id', orgId)
            .order('name')
            .then(({ data }) => setClients(data ?? []))
    }, [orgId])

    const filteredClients = clients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
    )

    const exactMatchExists = clients.some(
        (c) => c.name.toLowerCase() === clientSearch.toLowerCase().trim()
    )

    async function handleCreateClient() {
        if (!user || !clientSearch.trim() || creatingClient) return
        setCreatingClient(true)
        setError(null)

        const clientName = clientSearch.trim()

        try {
            const { data, error: createError } = await supabase
                .from('clients')
                .insert({
                    org_id: orgId,
                    owner_id: user.id,
                    name: clientName,
                })
                .select('id, name')
                .single()

            if (createError) throw createError

            if (data) {
                setClients((prev) => [...prev, data])
                setForm((f) => ({ ...f, client_id: data.id }))
                setClientSearch(data.name)
            }
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to create client')
        } finally {
            setCreatingClient(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!user) return
        if (!form.client_id) { setError('Please select a client.'); return }

        setSaving(true)
        setError(null)

        const input: NewDealInput = {
            org_id: orgId,
            client_id: form.client_id,
            owner_id: user.id,
            stage: form.stage,
            value: 0,
            expected_close_date: null,
            title: form.title.trim() || undefined,
        }

        onCreated(input)
        setSaving(false)
    }

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <div className="bg-white rounded-[24px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] w-full max-w-lg flex flex-col overflow-hidden border border-black/[0.04]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 pb-2">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold tracking-tight text-foreground">New Deal</h2>
                            <p className="text-sm text-muted-foreground">Add a new opportunity to your pipeline</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors self-start"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 flex flex-col gap-6">
                        {/* Client */}
                        <div className="flex flex-col gap-2 relative">
                            <Label htmlFor="deal-client-search" className="text-sm font-medium text-foreground/80">Client</Label>
                            <div className="relative">
                                <Input
                                    id="deal-client-search"
                                    placeholder="Search or create client..."
                                    value={clientSearch}
                                    onFocus={() => setClientDropdownOpen(true)}
                                    // Make sure clicking inside doesn't immediately close it, but handle outside clicks if needed 
                                    // A simple onBlur that delays closing so we can handle button clicks
                                    onBlur={() => {
                                        // Delay hiding to allow click events on dropdown items to fire
                                        setTimeout(() => {
                                            setClientDropdownOpen(false)
                                        }, 150)
                                    }}
                                    onChange={(e) => {
                                        setClientSearch(e.target.value)
                                        setForm((f) => ({ ...f, client_id: '' }))
                                        setClientDropdownOpen(true)
                                    }}
                                    className="h-11 pr-10 rounded-xl bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-white transition-all shadow-none"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                    onClick={() => {
                                        setClientDropdownOpen(!clientDropdownOpen)
                                        if (!clientDropdownOpen) document.getElementById('deal-client-search')?.focus()
                                    }}
                                >
                                    <ChevronDown size={16} className={`transition-transform duration-200 ${clientDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {clientDropdownOpen && !form.client_id && (
                                <div className="absolute top-[100%] left-0 z-10 w-full mt-1 border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-md bg-white">
                                    {filteredClients.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                                            onClick={() => {
                                                setForm((f) => ({ ...f, client_id: c.id }))
                                                setClientSearch(c.name)
                                                setClientDropdownOpen(false)
                                            }}
                                        >
                                            {c.name}
                                        </button>
                                    ))}

                                    {filteredClients.length === 0 && !clientSearch.trim() && (
                                        <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                            No clients created yet.
                                        </div>
                                    )}

                                    {!exactMatchExists && clientSearch.trim() && (
                                        <div className="border-t border-border bg-muted/20">
                                            <button
                                                type="button"
                                                disabled={creatingClient}
                                                onClick={handleCreateClient}
                                                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                                            >
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary shrink-0">
                                                    +
                                                </span>
                                                <div className="flex flex-col items-start truncate text-left">
                                                    <span className="truncate w-full max-w-[300px]">Create "{clientSearch.trim()}"</span>
                                                    <span className="text-xs text-muted-foreground font-normal">Add as a new client</span>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {form.client_id && (
                                <div className="text-[13px] font-medium text-emerald-600 flex items-center justify-between mt-0.5 px-3 py-2 bg-emerald-50/50 border border-emerald-100/50 rounded-lg">
                                    <span className="flex items-center gap-2">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] shadow-sm">✓</span>
                                        {clients.find((c) => c.id === form.client_id)?.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForm(f => ({ ...f, client_id: '' }))
                                            setClientSearch('')
                                            setTimeout(() => document.getElementById('deal-client-search')?.focus(), 0)
                                        }}
                                        className="text-[11px] text-muted-foreground hover:text-foreground underline decoration-muted-foreground/30 underline-offset-2"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Deal title */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="deal-title" className="text-sm font-medium text-foreground/80">Deal Title</Label>
                            <div className="flex flex-wrap gap-2 pb-1">
                                {FINANCIAL_PLAN_TYPES.map((plan) => (
                                    <button
                                        key={plan}
                                        type="button"
                                        onClick={() => {
                                            setForm((f) => ({ ...f, title: plan }))
                                            setTimeout(() => {
                                                const el = document.getElementById('deal-title') as HTMLInputElement
                                                if (el) {
                                                    el.focus()
                                                }
                                            }, 0)
                                        }}
                                        className={`px-3 py-1.5 text-[13px] rounded-lg border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${form.title.includes(plan)
                                            ? 'bg-primary/5 text-primary border-primary/30 font-medium shadow-sm ring-1 ring-primary/10'
                                            : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:bg-muted/30 hover:text-foreground hover:shadow-sm'
                                            }`}
                                    >
                                        {plan}
                                    </button>
                                ))}
                            </div>
                            <Input
                                id="deal-title"
                                placeholder="Choose a plan above or type a custom title..."
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                className="h-11 rounded-xl bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-white transition-all shadow-none"
                            />
                        </div>

                        {/* Stage */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="deal-stage" className="text-sm font-medium text-foreground/80">Pipeline Stage</Label>
                            <select
                                id="deal-stage"
                                value={form.stage}
                                onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as DealStage }))}
                                className="flex h-11 w-full rounded-xl border border-muted-foreground/10 bg-muted/30 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:bg-white transition-all shadow-none"
                            >
                                {PIPELINE_STAGES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Value */}
                        {error && (
                            <p className="text-sm text-destructive bg-red-50/50 border border-red-100 rounded-xl px-4 py-3">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-3 pt-6 mt-2 border-t border-border/40">
                            <Button
                                type="button"
                                variant="secondary"
                                className="flex-1 h-11 rounded-xl shadow-none font-medium text-muted-foreground hover:bg-muted/50 border-muted-foreground/20"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-11 rounded-xl shadow-none font-medium"
                                disabled={saving}
                                id="save-deal-btn"
                            >
                                {saving ? 'Creating Deal...' : 'Create Deal'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}
