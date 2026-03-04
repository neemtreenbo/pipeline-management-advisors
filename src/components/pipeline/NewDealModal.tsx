import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PIPELINE_STAGES } from '@/lib/deals'
import type { DealStage, NewDealInput } from '@/lib/deals'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
        value: '',
        expected_close_date: '',
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
            value: form.value ? parseFloat(form.value) : 0,
            expected_close_date: form.expected_close_date || null,
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl border border-border shadow-xl w-full max-w-md flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="text-base font-semibold text-foreground">New Deal</h2>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-5">
                        {/* Client */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="deal-client-search">Client *</Label>
                            <Input
                                id="deal-client-search"
                                placeholder="Search clients..."
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                            />
                            {clientSearch && filteredClients.length > 0 && (
                                <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto shadow-sm">
                                    {filteredClients.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${form.client_id === c.id ? 'bg-muted font-medium' : ''
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
                                <p className="text-xs text-success">
                                    ✓ {clients.find((c) => c.id === form.client_id)?.name}
                                </p>
                            )}
                        </div>

                        {/* Deal title */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="deal-title">Deal Title</Label>
                            <Input
                                id="deal-title"
                                placeholder="e.g. Comprehensive VUL Plan"
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            />
                        </div>

                        {/* Stage */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="deal-stage">Stage</Label>
                            <select
                                id="deal-stage"
                                value={form.stage}
                                onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as DealStage }))}
                                className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
                            >
                                {PIPELINE_STAGES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Value */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="deal-value">Value (₱)</Label>
                            <Input
                                id="deal-value"
                                type="number"
                                placeholder="e.g. 50000"
                                value={form.value}
                                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                                min={0}
                            />
                        </div>

                        {/* Close date */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="deal-close-date">Expected Close Date</Label>
                            <Input
                                id="deal-close-date"
                                type="date"
                                value={form.expected_close_date}
                                onChange={(e) => setForm((f) => ({ ...f, expected_close_date: e.target.value }))}
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-destructive bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-3 pt-2 border-t border-border">
                            <Button
                                type="button"
                                variant="secondary"
                                className="flex-1"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={saving}
                                id="save-deal-btn"
                            >
                                {saving ? 'Creating...' : 'Create Deal'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}
