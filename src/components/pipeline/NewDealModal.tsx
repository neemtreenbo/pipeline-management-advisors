import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Briefcase } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { DealStage, NewDealInput } from '@/lib/deals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ClientSelector from '@/components/ui/ClientSelector'

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

interface NewDealModalProps {
    orgId: string
    defaultStage?: DealStage
    onClose: () => void
    onCreated: (input: NewDealInput) => void
}

export default function NewDealModal({ orgId, defaultStage = 'Opportunity', onClose, onCreated }: NewDealModalProps) {
    const { user } = useAuth()
    const [form, setForm] = useState({ client_id: '', title: '' })
    const [selectedClient, setSelectedClient] = useState<{ name: string; avatarUrl: string | null } | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleClientChange(clientId: string, clientName: string) {
        setForm(f => ({ ...f, client_id: clientId }))
        if (!clientId) { setSelectedClient(null); return }
        const { data } = await supabase.from('clients').select('profile_picture_url').eq('id', clientId).single()
        setSelectedClient({ name: clientName, avatarUrl: data?.profile_picture_url ?? null })
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
            stage: defaultStage,
            value: 0,
            expected_close_date: null,
            title: form.title.trim() || undefined,
        }
        onCreated(input)
        setSaving(false)
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={onClose} />

            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white rounded-2xl shadow-[0_16px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-xl flex flex-col overflow-hidden border border-black/[0.06] pointer-events-auto">

                    {/* Header */}
                    <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border/60">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                {selectedClient ? (
                                    selectedClient.avatarUrl ? (
                                        <img src={selectedClient.avatarUrl} alt={selectedClient.name} className="w-9 h-9 rounded-full object-cover border border-border/40 shrink-0" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center border border-border/40 shrink-0">
                                            <span className="text-[13px] font-medium text-muted-foreground">
                                                {selectedClient.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                        <Briefcase size={15} className="text-muted-foreground/70" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-[15px] font-semibold text-foreground leading-tight">
                                        {selectedClient ? selectedClient.name : 'New Deal'}
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                                        {selectedClient ? 'New opportunity' : 'Add a new opportunity to your pipeline'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground/50 hover:text-foreground transition-colors mt-0.5"
                            >
                                <X size={15} strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">

                        {/* Client */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Client</span>
                            <ClientSelector
                                orgId={orgId}
                                value={form.client_id}
                                onChange={handleClientChange}
                            />
                        </div>

                        {/* Deal title */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Plan Type</span>
                            <div className="flex flex-wrap gap-1.5 mb-1">
                                {FINANCIAL_PLAN_TYPES.map((plan) => {
                                    const isSelected = form.title === plan
                                    return (
                                        <motion.button
                                            key={plan}
                                            type="button"
                                            onClick={() => {
                                                setForm((f) => ({ ...f, title: plan }))
                                                setTimeout(() => {
                                                    const el = document.getElementById('deal-title') as HTMLInputElement
                                                    if (el) el.focus()
                                                }, 0)
                                            }}
                                            whileHover={isSelected ? {} : { y: -2, scale: 1.04, boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}
                                            whileTap={{ scale: 0.96, y: 0 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                            className={`px-2.5 py-1 text-[12px] rounded-lg border ${
                                                isSelected
                                                    ? 'bg-foreground text-background border-foreground font-medium shadow-md'
                                                    : 'bg-white text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
                                            }`}
                                        >
                                            {plan}
                                        </motion.button>
                                    )
                                })}
                            </div>
                            <Input
                                id="deal-title"
                                placeholder="Or type a custom title…"
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                className="h-9 rounded-xl bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-white text-sm shadow-none"
                            />
                        </div>

{error && (
                            <p className="text-[12px] text-destructive bg-red-50/50 border border-red-100 rounded-xl px-3 py-2">
                                {error}
                            </p>
                        )}

                        {/* Footer */}
                        <div className="flex gap-2 pt-1 mt-1 border-t border-border/40">
                            <Button
                                type="button"
                                variant="secondary"
                                className="flex-1 h-9 rounded-xl shadow-none text-sm text-muted-foreground"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-9 rounded-xl shadow-none text-sm font-medium"
                                disabled={saving}
                                id="save-deal-btn"
                            >
                                {saving ? 'Creating…' : 'Create Deal'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}
