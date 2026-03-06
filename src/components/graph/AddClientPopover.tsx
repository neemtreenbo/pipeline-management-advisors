import { useEffect, useRef, useState } from 'react'
import type { ClientRelationType } from '@/lib/clientRelationships'
import ClientSelector from '@/components/ui/ClientSelector'

const RELATION_OPTIONS: { value: ClientRelationType; label: string; color: string }[] = [
  { value: 'spouse', label: 'Spouse', color: '#0A84FF' },
  { value: 'child', label: 'Child', color: '#FF9F0A' },
  { value: 'family', label: 'Family', color: '#30D158' },
  { value: 'friend', label: 'Friend', color: '#FF6B6B' },
  { value: 'referred_by', label: 'Referred By', color: '#BF5AF2' },
]

interface AddClientPopoverProps {
  x?: number
  y?: number
  orgId: string
  /** If provided, we're connecting from this node. If null, adding a standalone node. */
  sourceNodeId: string | null
  existingNodeIds: Set<string>
  onAdd: (clientId: string, relationType: ClientRelationType | null) => void
  onClose: () => void
}

export default function AddClientPopover({
  x,
  y,
  orgId,
  sourceNodeId,
  existingNodeIds,
  onAdd,
  onClose,
}: AddClientPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [clientId, setClientId] = useState('')
  const [relationType, setRelationType] = useState<ClientRelationType>('friend')

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  function handleConfirm() {
    if (!clientId) return
    if (existingNodeIds.has(clientId) && !sourceNodeId) {
      // Node already on canvas and no connection to make
      onClose()
      return
    }
    onAdd(clientId, sourceNodeId ? relationType : null)
  }

  return (
    <div
      ref={ref}
      className="z-50 rounded-xl border border-border bg-card shadow-lg p-3 w-[260px]"
      style={
        x != null && y != null
          ? { position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)' }
          : {}
      }
    >
      <p className="text-[10px] font-medium text-muted-foreground mb-2">
        {sourceNodeId ? 'Connect to client' : 'Add client to network'}
      </p>

      <ClientSelector
        orgId={orgId}
        value={clientId}
        onChange={(id) => setClientId(id)}
        placeholder="Search client..."
      />

      {sourceNodeId && (
        <div className="mt-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Relationship</p>
          <div className="flex flex-wrap gap-1">
            {RELATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRelationType(opt.value)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  relationType === opt.value
                    ? 'bg-accent/10 text-accent ring-1 ring-accent/30'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!clientId}
        className="w-full mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {sourceNodeId ? 'Connect' : 'Add to Canvas'}
      </button>
    </div>
  )
}
