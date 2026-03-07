import { useState, useRef } from 'react'
import { Plus, Shield, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePoliciesByClient, useCreatePolicy, useDeletePolicy } from '@/hooks/queries/usePolicies'
import { PREMIUM_MODES } from '@/lib/policies'
import { formatCurrency } from '@/lib/format'
import type { Policy, NewPolicyInput, PremiumMode } from '@/lib/policies'
import { queryKeys } from '@/lib/queryKeys'
import { useQueryClient } from '@tanstack/react-query'

interface ClientPoliciesListProps {
    clientId: string
    orgId: string
}

function PolicyItem({ policy, onDelete }: { policy: Policy; onDelete: (id: string) => void }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-4 py-3">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <Shield size={13} className="text-muted-foreground/40 shrink-0" />
                    <p className="text-[13px] font-medium text-foreground truncate">
                        {policy.policy_number || 'No Policy #'}
                    </p>
                    {policy.product && (
                        <span className="text-[11px] text-muted-foreground/60">{policy.product}</span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
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
                    <div className="flex items-center gap-3 mt-0.5">
                        {policy.policy_owner_client && (
                            <span className="text-[11px] text-muted-foreground/50">Owner: {policy.policy_owner_client.name}</span>
                        )}
                        {policy.insured_client && (
                            <span className="text-[11px] text-muted-foreground/50">Insured: {policy.insured_client.name}</span>
                        )}
                    </div>
                )}
            </div>
            <button
                onClick={() => onDelete(policy.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground/30 hover:text-red-500 transition-colors shrink-0"
            >
                <Trash2 size={13} />
            </button>
        </div>
    )
}

export default function ClientPoliciesList({ clientId, orgId }: ClientPoliciesListProps) {
    const { user } = useAuth()
    const qc = useQueryClient()
    const { data: policies = [], isLoading } = usePoliciesByClient(clientId)
    const createMutation = useCreatePolicy(orgId)
    const deleteMutation = useDeletePolicy(orgId)

    const [adding, setAdding] = useState(false)
    const [form, setForm] = useState({ policy_number: '', product: '', premium: '', premium_mode: '' as PremiumMode | '', paying_years: '', issue_date: '' })
    const numRef = useRef<HTMLInputElement>(null)

    function openAdd() {
        setForm({ policy_number: '', product: '', premium: '', premium_mode: '', paying_years: '', issue_date: '' })
        setAdding(true)
        setTimeout(() => numRef.current?.focus(), 0)
    }

    async function handleAdd() {
        if (!user || createMutation.isPending) return
        const input: NewPolicyInput = {
            org_id: orgId,
            owner_id: user.id,
            client_id: clientId,
            policy_number: form.policy_number || undefined,
            product: form.product || undefined,
            premium: form.premium ? Number(form.premium) : undefined,
            premium_mode: (form.premium_mode || undefined) as PremiumMode | undefined,
            paying_years: form.paying_years ? Number(form.paying_years) : undefined,
            issue_date: form.issue_date || null,
        }
        try {
            await createMutation.mutateAsync(input)
            setAdding(false)
        } catch (err) {
            console.error('Failed to create policy', err)
        }
    }

    async function handleDelete(policyId: string) {
        try {
            await deleteMutation.mutateAsync(policyId)
            qc.invalidateQueries({ queryKey: queryKeys.policies.byClient(clientId) })
        } catch (err) {
            console.error('Failed to delete policy', err)
        }
    }

    if (isLoading) {
        return <div className="py-8 text-center text-sm text-muted-foreground/40 animate-pulse">Loading...</div>
    }

    return (
        <div className="flex flex-col gap-2">
            {adding ? (
                <div className="flex flex-col gap-3 bg-card border border-border/60 rounded-xl px-4 py-3">
                    <div className="grid grid-cols-2 gap-2">
                        <input ref={numRef} placeholder="Policy number" value={form.policy_number} onChange={(e) => setForm(f => ({ ...f, policy_number: e.target.value }))}
                            className="text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 border-b border-border/40 pb-0.5" />
                        <input placeholder="Product" value={form.product} onChange={(e) => setForm(f => ({ ...f, product: e.target.value }))}
                            className="text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 border-b border-border/40 pb-0.5" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <input type="number" placeholder="Premium" value={form.premium} onChange={(e) => setForm(f => ({ ...f, premium: e.target.value }))}
                            className="text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 border-b border-border/40 pb-0.5" />
                        <select value={form.premium_mode} onChange={(e) => setForm(f => ({ ...f, premium_mode: e.target.value as PremiumMode }))}
                            className="text-sm bg-transparent outline-none border-b border-border/40 pb-0.5 text-muted-foreground">
                            <option value="">Mode</option>
                            {PREMIUM_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <input type="number" placeholder="Pay years" value={form.paying_years} onChange={(e) => setForm(f => ({ ...f, paying_years: e.target.value }))}
                            className="text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 border-b border-border/40 pb-0.5" />
                    </div>
                    <input type="date" value={form.issue_date} onChange={(e) => setForm(f => ({ ...f, issue_date: e.target.value }))}
                        className="text-sm bg-transparent outline-none border-b border-border/40 pb-0.5 text-muted-foreground w-fit" />
                    <div className="flex items-center gap-3 pt-1 border-t border-border/40">
                        <button onClick={handleAdd} disabled={createMutation.isPending}
                            className="text-[12px] font-medium text-accent hover:text-accent/80 disabled:text-muted-foreground/30 transition-colors">
                            {createMutation.isPending ? 'Saving...' : 'Add policy'}
                        </button>
                        <button onClick={() => setAdding(false)} className="text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">Cancel</button>
                    </div>
                </div>
            ) : (
                <button onClick={openAdd} className="flex items-center gap-1.5 text-[12px] text-muted-foreground/50 hover:text-foreground transition-colors py-1 w-fit">
                    <Plus size={13} /> Add policy
                </button>
            )}

            {policies.length === 0 && !adding ? (
                <div className="py-8 text-center text-[13px] text-muted-foreground/40">No policies yet</div>
            ) : (
                <div className="flex flex-col gap-2">
                    {policies.map(p => <PolicyItem key={p.id} policy={p} onDelete={handleDelete} />)}
                </div>
            )}
        </div>
    )
}
