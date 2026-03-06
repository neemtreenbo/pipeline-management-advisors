import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useClientRelationships,
  useAddClientRelationship,
  useRemoveClientRelationship,
} from '@/hooks/queries/useClients'
import type { ClientRelationType } from '@/lib/clientRelationships'
import ClientSelector from '@/components/ui/ClientSelector'
import ClientAvatar from '@/components/pipeline/ClientAvatar'

const RELATION_TYPES: { value: ClientRelationType; label: string }[] = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'referred_by', label: 'Referred By' },
]

function getDisplayLabel(relationType: ClientRelationType, direction: 'from' | 'to'): string {
  if (relationType === 'referred_by') {
    return direction === 'to' ? 'Referred By' : 'Referred'
  }
  if (relationType === 'child') {
    return direction === 'from' ? 'Child' : 'Parent'
  }
  const labels: Record<ClientRelationType, string> = {
    spouse: 'Spouse',
    child: 'Child',
    family: 'Family',
    friend: 'Friend',
    referred_by: 'Referred By',
  }
  return labels[relationType]
}

interface ClientRelationshipsProps {
  clientId: string
  orgId: string
}

export default function ClientRelationships({ clientId, orgId }: ClientRelationshipsProps) {
  const { user } = useAuth()
  const { data: relationships = [], isLoading } = useClientRelationships(clientId, orgId)
  const addMutation = useAddClientRelationship(clientId, orgId, user?.id ?? '')
  const removeMutation = useRemoveClientRelationship(clientId)

  const [isAdding, setIsAdding] = useState(false)
  const [selectedRelationType, setSelectedRelationType] = useState<ClientRelationType>('spouse')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Group relationships by display label
  const grouped = useMemo(() => {
    const groups: Record<string, typeof relationships> = {}
    for (const rel of relationships) {
      const label = getDisplayLabel(rel.relationType, rel.direction)
      if (!groups[label]) groups[label] = []
      groups[label].push(rel)
    }
    return groups
  }, [relationships])

  async function handleAdd() {
    if (!selectedClientId) return
    if (selectedClientId === clientId) {
      setError('Cannot link a client to themselves')
      return
    }
    setError(null)
    try {
      await addMutation.mutateAsync({
        toClientId: selectedClientId,
        relationType: selectedRelationType,
      })
      setIsAdding(false)
      setSelectedClientId('')
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to add relationship')
    }
  }

  async function handleRemove(linkId: string) {
    try {
      await removeMutation.mutateAsync(linkId)
    } catch {
      // silently fail — the UI will stay consistent via query refetch
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Relationships</h3>
          {relationships.length > 0 && (
            <span className="text-xs text-muted-foreground">({relationships.length})</span>
          )}
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus size={14} />
            <span>Add</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : relationships.length === 0 && !isAdding ? (
        <p className="text-xs text-muted-foreground">No relationships yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {Object.entries(grouped).map(([label, rels]) => (
            <div key={label}>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {label}
              </span>
              <div className="mt-1 flex flex-col gap-1">
                {rels.map((rel) => (
                  <div
                    key={rel.linkId}
                    className="group flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <ClientAvatar
                      name={rel.relatedClientName}
                      profilePictureUrl={rel.relatedClientProfilePictureUrl}
                      size="sm"
                    />
                    <Link
                      to={`/app/clients/${rel.relatedClientId}`}
                      className="text-sm text-foreground hover:text-accent transition-colors truncate flex-1"
                    >
                      {rel.relatedClientName}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(rel.linkId)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdding && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Relationship Type</label>
            <select
              value={selectedRelationType}
              onChange={(e) => setSelectedRelationType(e.target.value as ClientRelationType)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {RELATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Client</label>
            <ClientSelector
              orgId={orgId}
              value={selectedClientId}
              onChange={(id) => {
                setSelectedClientId(id)
                setError(null)
              }}
              placeholder="Search for a client..."
              error={error}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedClientId || addMutation.isPending}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {addMutation.isPending ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setSelectedClientId('')
                setError(null)
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
