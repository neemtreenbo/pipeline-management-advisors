import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PIPELINE_STAGES } from '@/lib/deals'
import type { DealStage, NewDealInput } from '@/lib/deals'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="deal-client-search" className="text-sm font-medium text-foreground/80">Client</Label>
                            <Input
                                id="deal-client-search"
                                placeholder="Search clients..."
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                className="h-11 rounded-xl bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-white transition-all shadow-none"
                            />
                            {clientSearch && filteredClients.length > 0 && (
                                <div className="border border-border rounded-xl overflow-hidden max-h-40 overflow-y-auto shadow-sm mt-1">
                                    {filteredClients.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors ${form.client_id === c.id ? 'bg-muted font-medium' : ''
                                                }`}
                                            onClick={() => {
                                                setForm((f) => ({ ...f, client_id: c.id }))
                                                setClientSearch(c.name)
                                            }}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {form.client_id && (
                                <p className="text-[13px] font-medium text-emerald-600 flex items-center gap-1.5 mt-0.5">
                                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 text-[10px]">✓</span>
                                    {clients.find((c) => c.id === form.client_id)?.name}
                                </p>
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
