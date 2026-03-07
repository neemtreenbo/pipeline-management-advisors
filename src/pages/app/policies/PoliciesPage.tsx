import { useState, useMemo } from 'react'
import { Search, Plus, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { usePolicies, useCreatePolicy } from '@/hooks/queries/usePolicies'
import { formatCurrency } from '@/lib/format'
import type { Policy, NewPolicyInput, PremiumMode } from '@/lib/policies'
import { PREMIUM_MODES } from '@/lib/policies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ClientSelector from '@/components/ui/ClientSelector'

function PolicyRow({ policy }: { policy: Policy }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-4 py-3 hover:border-border hover:shadow-sm transition-all">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <Shield size={13} className="text-muted-foreground/40 shrink-0" />
                    <p className="text-[13px] font-medium text-foreground truncate">
                        {policy.policy_number || 'No Policy #'}
                    </p>
                    {policy.product && (
                        <span className="text-[11px] text-muted-foreground/60 shrink-0">{policy.product}</span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground/60">
                        {policy.client?.name || 'Unknown client'}
                    </span>
                    {policy.premium != null && (
                        <span className="text-[11px] font-medium text-foreground/60">
                            {formatCurrency(policy.premium)}
                            {policy.premium_mode && ` / ${policy.premium_mode}`}
                        </span>
                    )}
                    {policy.issue_date && (
                        <span className="text-[11px] text-muted-foreground/50">
                            Issued {new Date(policy.issue_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    )}
                    {policy.paying_years && (
                        <span className="text-[11px] text-muted-foreground/50">{policy.paying_years}yr pay</span>
                    )}
                </div>
                {(policy.policy_owner_client || policy.insured_client) && (
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {policy.policy_owner_client && (
                            <span className="text-[11px] text-muted-foreground/50">
                                Owner: {policy.policy_owner_client.name}
                            </span>
                        )}
                        {policy.insured_client && (
                            <span className="text-[11px] text-muted-foreground/50">
                                Insured: {policy.insured_client.name}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function NewPolicyModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
    const { user } = useAuth()
    const createMutation = useCreatePolicy(orgId)
    const [form, setForm] = useState({
        client_id: '',
        policy_number: '',
        product: '',
        premium: '',
        premium_mode: '' as PremiumMode | '',
        paying_years: '',
        issue_date: '',
        policy_owner_client_id: '',
        insured_client_id: '',
    })
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!user) return
        if (!form.client_id) { setError('Please select a client.'); return }
        setError(null)

        const input: NewPolicyInput = {
            org_id: orgId,
            owner_id: user.id,
            client_id: form.client_id,
            policy_number: form.policy_number || undefined,
            product: form.product || undefined,
            premium: form.premium ? Number(form.premium) : undefined,
            premium_mode: (form.premium_mode || undefined) as PremiumMode | undefined,
            paying_years: form.paying_years ? Number(form.paying_years) : undefined,
            issue_date: form.issue_date || null,
            policy_owner_client_id: form.policy_owner_client_id || null,
            insured_client_id: form.insured_client_id || null,
        }

        try {
            await createMutation.mutateAsync(input)
            onClose()
        } catch (err) {
            setError((err as Error).message)
        }
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-card rounded-2xl shadow-lg w-full max-w-xl flex flex-col overflow-hidden border border-border pointer-events-auto max-h-[90vh] overflow-y-auto">
                    <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border/60">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[15px] font-semibold text-foreground">New Policy</h2>
                            <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition-colors text-sm">Cancel</button>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Client *</span>
                            <ClientSelector orgId={orgId} value={form.client_id} onChange={(id) => setForm(f => ({ ...f, client_id: id }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Policy Number</span>
                                <Input value={form.policy_number} onChange={(e) => setForm(f => ({ ...f, policy_number: e.target.value }))} className="h-9 rounded-xl bg-muted/30 border-muted-foreground/10 shadow-none text-sm" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Product</span>
                                <Input value={form.product} onChange={(e) => setForm(f => ({ ...f, product: e.target.value }))} className="h-9 rounded-xl bg-muted/30 border-muted-foreground/10 shadow-none text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Premium</span>
                                <Input type="number" value={form.premium} onChange={(e) => setForm(f => ({ ...f, premium: e.target.value }))} className="h-9 rounded-xl bg-muted/30 border-muted-foreground/10 shadow-none text-sm" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Mode</span>
                                <select value={form.premium_mode} onChange={(e) => setForm(f => ({ ...f, premium_mode: e.target.value as PremiumMode }))} className="h-9 rounded-xl bg-muted/30 border border-muted-foreground/10 text-sm px-3 text-foreground">
                                    <option value="">Select...</option>
                                    {PREMIUM_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Paying Years</span>
                                <Input type="number" value={form.paying_years} onChange={(e) => setForm(f => ({ ...f, paying_years: e.target.value }))} className="h-9 rounded-xl bg-muted/30 border-muted-foreground/10 shadow-none text-sm" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Issue Date</span>
                            <Input type="date" value={form.issue_date} onChange={(e) => setForm(f => ({ ...f, issue_date: e.target.value }))} className="h-9 rounded-xl bg-muted/30 border-muted-foreground/10 shadow-none text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Policy Owner</span>
                                <ClientSelector orgId={orgId} value={form.policy_owner_client_id} onChange={(id) => setForm(f => ({ ...f, policy_owner_client_id: id }))} placeholder="Same as client if blank" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Insured</span>
                                <ClientSelector orgId={orgId} value={form.insured_client_id} onChange={(id) => setForm(f => ({ ...f, insured_client_id: id }))} placeholder="Same as client if blank" />
                            </div>
                        </div>
                        {error && <p className="text-[12px] text-destructive">{error}</p>}
                        <div className="flex gap-2 pt-2 border-t border-border/40">
                            <Button type="button" variant="secondary" className="flex-1 h-9 rounded-xl shadow-none text-sm" onClick={onClose}>Cancel</Button>
                            <Button type="submit" className="flex-1 h-9 rounded-xl shadow-none text-sm font-medium" disabled={createMutation.isPending}>
                                {createMutation.isPending ? 'Creating...' : 'Create Policy'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}

export default function PoliciesPage() {
    const { user } = useAuth()
    const { orgId } = useOrg()
    const { data: policies = [], isLoading } = usePolicies(orgId ?? undefined)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)

    const filtered = useMemo(() => {
        if (!search.trim()) return policies
        const q = search.toLowerCase()
        return policies.filter(p =>
            (p.policy_number?.toLowerCase().includes(q)) ||
            (p.product?.toLowerCase().includes(q)) ||
            (p.client?.name?.toLowerCase().includes(q))
        )
    }, [policies, search])

    if (!user || !orgId) return null

    return (
        <div className="min-h-screen bg-transparent pt-6">
            <div className="max-w-5xl mx-auto px-6 pb-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-foreground">Policies</h1>
                        {policies.length > 0 && (
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {policies.length}
                            </span>
                        )}
                    </div>
                    <Button onClick={() => setShowModal(true)} className="h-8 rounded-xl text-[13px] gap-1.5 shadow-none">
                        <Plus size={14} /> Add Policy
                    </Button>
                </div>

                {policies.length > 0 && (
                    <div className="relative mb-4">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                        <Input
                            placeholder="Search by policy number, product, or client..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 rounded-xl bg-muted/30 border-muted-foreground/10 shadow-none text-sm"
                        />
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-sm text-muted-foreground/50">
                        {policies.length === 0 ? 'No policies yet. Create your first policy.' : 'No policies match your search.'}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filtered.map(policy => <PolicyRow key={policy.id} policy={policy} />)}
                    </div>
                )}

                {showModal && <NewPolicyModal orgId={orgId} onClose={() => setShowModal(false)} />}
            </div>
        </div>
    )
}
