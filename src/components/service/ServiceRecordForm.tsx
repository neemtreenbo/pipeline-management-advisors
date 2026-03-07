import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ServiceRecordType } from '@/lib/serviceRecords'

const SERVICE_TYPES: { value: ServiceRecordType; label: string }[] = [
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'renewal', label: 'Renewal' },
    { value: 'review', label: 'Review' },
    { value: 'claim', label: 'Claim' },
    { value: 'check_in', label: 'Check-in' },
    { value: 'custom', label: 'Custom' },
]

interface ServiceRecordFormProps {
    onSubmit: (data: {
        title: string
        type: ServiceRecordType
        description: string
        due_date: string
        assignee_id?: string
        deal_id?: string
    }) => void
    onCancel: () => void
    saving?: boolean
    deals?: { id: string; title: string }[]
    members?: { id: string; full_name: string }[]
}

export default function ServiceRecordForm({ onSubmit, onCancel, saving, deals, members }: ServiceRecordFormProps) {
    const [title, setTitle] = useState('')
    const [type, setType] = useState<ServiceRecordType>('follow_up')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [assigneeId, setAssigneeId] = useState('')
    const [dealId, setDealId] = useState('')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!title.trim() || !dueDate) return
        onSubmit({
            title: title.trim(),
            type,
            description: description.trim(),
            due_date: dueDate,
            assignee_id: assigneeId || undefined,
            deal_id: dealId || undefined,
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6 mx-4">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-semibold text-foreground">New Service Record</h3>
                    <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <Label htmlFor="sr-title" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</Label>
                        <Input
                            id="sr-title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g., Annual policy renewal"
                            autoFocus
                            className="mt-1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="sr-type" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</Label>
                            <select
                                id="sr-type"
                                value={type}
                                onChange={e => setType(e.target.value as ServiceRecordType)}
                                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                {SERVICE_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="sr-due" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</Label>
                            <Input
                                id="sr-due"
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="sr-desc" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</Label>
                        <textarea
                            id="sr-desc"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Optional notes..."
                            rows={2}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                    </div>

                    {members && members.length > 0 && (
                        <div>
                            <Label htmlFor="sr-assignee" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignee</Label>
                            <select
                                id="sr-assignee"
                                value={assigneeId}
                                onChange={e => setAssigneeId(e.target.value)}
                                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Unassigned</option>
                                {members.map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {deals && deals.length > 0 && (
                        <div>
                            <Label htmlFor="sr-deal" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Linked Deal</Label>
                            <select
                                id="sr-deal"
                                value={dealId}
                                onChange={e => setDealId(e.target.value)}
                                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">No linked deal</option>
                                {deals.map(d => (
                                    <option key={d.id} value={d.id}>{d.title}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={!title.trim() || !dueDate || saving}>
                            {saving ? 'Creating...' : 'Create'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
