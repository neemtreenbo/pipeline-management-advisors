import { useState, useCallback } from 'react'
import { Plus, X, RotateCcw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/contexts/OrgContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  useOrgClientNetwork,
  useNetworkPositions,
  useSaveNetworkPositions,
  useResetNetworkPositions,
} from '@/hooks/queries/useClients'
import { useOrgGraphData } from '@/hooks/useGraphData'
import { addClientRelationship, type ClientRelationType, type NetworkPositions } from '@/lib/clientRelationships'
import { queryKeys } from '@/lib/queryKeys'
import RelationshipGraph from '@/components/graph/RelationshipGraph'
import ClientSelector from '@/components/ui/ClientSelector'

const RELATION_TYPES: { value: ClientRelationType; label: string }[] = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'referred_by', label: 'Referred By' },
]

export default function NetworkPage() {
  const { orgId } = useOrg()
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data, isLoading, isError } = useOrgClientNetwork(orgId ?? undefined)
  const { nodes, edges } = useOrgGraphData(data)

  const { data: savedPositions } = useNetworkPositions(orgId ?? undefined, user?.id)
  const savePositions = useSaveNetworkPositions(orgId ?? undefined, user?.id)
  const resetPositions = useResetNetworkPositions(orgId ?? undefined, user?.id)

  const [showForm, setShowForm] = useState(false)
  const [clientAId, setClientAId] = useState('')
  const [clientBId, setClientBId] = useState('')
  const [relationType, setRelationType] = useState<ClientRelationType>('friend')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setClientAId('')
    setClientBId('')
    setRelationType('friend')
    setError(null)
    setShowForm(false)
  }

  async function handleAdd() {
    if (!clientAId || !clientBId || !orgId || !user) return
    if (clientAId === clientBId) {
      setError('Cannot link a client to themselves')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addClientRelationship(orgId, clientAId, clientBId, relationType, user.id)
      qc.invalidateQueries({ queryKey: queryKeys.clients.network(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.clients.relationships(clientAId) })
      qc.invalidateQueries({ queryKey: queryKeys.clients.relationships(clientBId) })
      resetForm()
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to add relationship')
    } finally {
      setSaving(false)
    }
  }

  const handlePositionsChange = useCallback(
    (positions: NetworkPositions) => {
      savePositions.mutate(positions)
    },
    [savePositions]
  )

  function handleResetLayout() {
    resetPositions.mutate()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Failed to load network data.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Network</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {nodes.length} clients &middot; {edges.length} relationships
          </p>
        </div>
        <div className="flex items-center gap-2">
          {nodes.length > 0 && (
            <button
              type="button"
              onClick={handleResetLayout}
              disabled={resetPositions.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
              title="Reset to auto layout"
            >
              <RotateCcw size={14} />
              Reset Layout
            </button>
          )}
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              Add Relationship
            </button>
          )}
        </div>
      </div>

      {showForm && orgId && (
        <div className="px-6 pb-4 shrink-0">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Add Relationship</h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Client A</label>
                <ClientSelector
                  orgId={orgId}
                  value={clientAId}
                  onChange={(id) => { setClientAId(id); setError(null) }}
                  placeholder="Search client..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Relationship</label>
                <select
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value as ClientRelationType)}
                  className="h-11 px-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {RELATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Client B</label>
                <ClientSelector
                  orgId={orgId}
                  value={clientBId}
                  onChange={(id) => { setClientBId(id); setError(null) }}
                  placeholder="Search client..."
                />
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!clientAId || !clientBId || saving}
                className="h-11 px-4 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
            {error && (
              <p className="text-xs text-destructive mt-2">{error}</p>
            )}
          </div>
        </div>
      )}

      {nodes.length === 0 && !showForm ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-sm font-medium text-foreground">No relationships yet</p>
          <p className="text-xs text-muted-foreground">
            Click &quot;Add Relationship&quot; to start building your client network.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-1"
          >
            <Plus size={14} />
            Add Relationship
          </button>
        </div>
      ) : (
        <div className="flex-1 px-6 pb-6 min-h-0">
          <RelationshipGraph
            nodes={nodes}
            edges={edges}
            layoutAlgorithm="force"
            className="h-full"
            savedPositions={savedPositions}
            onPositionsChange={handlePositionsChange}
          />
        </div>
      )}
    </div>
  )
}
