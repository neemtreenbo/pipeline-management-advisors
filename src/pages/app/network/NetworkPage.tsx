import { useState, useCallback, useRef, useMemo } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { Node } from '@xyflow/react'
import { useOrg } from '@/contexts/OrgContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  useOrgClientNetwork,
  useClients,
  useNetworkLayout,
  useSaveNetworkPositions,
  useSavePinnedClients,
  useResetNetworkPositions,
} from '@/hooks/queries/useClients'
import { useOrgGraphData, type ClientNodeData } from '@/hooks/useGraphData'
import { addClientRelationship, removeClientRelationship, type ClientRelationType, type NetworkPositions } from '@/lib/clientRelationships'
import { queryKeys } from '@/lib/queryKeys'
import RelationshipGraph from '@/components/graph/RelationshipGraph'
import AddClientPopover from '@/components/graph/AddClientPopover'

export default function NetworkPage() {
  const { orgId } = useOrg()
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: networkData, isLoading: networkLoading, isError } = useOrgClientNetwork(orgId ?? undefined)
  const { data: allClients = [] } = useClients(orgId ?? undefined)
  const { nodes: relationshipNodes, edges } = useOrgGraphData(networkData)

  const { data: layoutData } = useNetworkLayout(orgId ?? undefined, user?.id)
  const savedPositions = layoutData?.positions ?? null
  const pinnedClientIds = layoutData?.pinnedClientIds ?? []

  const savePositions = useSaveNetworkPositions(orgId ?? undefined, user?.id)
  const savePinned = useSavePinnedClients(orgId ?? undefined, user?.id)
  const resetPositions = useResetNetworkPositions(orgId ?? undefined, user?.id)

  // Merge pinned standalone clients into graph nodes
  const nodes = useMemo(() => {
    const existingIds = new Set(relationshipNodes.map((n) => n.id))
    const clientMap = new Map(allClients.map((c) => [c.id, c]))

    const pinnedNodes: Node<ClientNodeData>[] = pinnedClientIds
      .filter((id) => !existingIds.has(id) && clientMap.has(id))
      .map((id) => {
        const c = clientMap.get(id)!
        return {
          id: c.id,
          type: 'clientNode' as const,
          position: { x: 0, y: 0 },
          data: {
            clientId: c.id,
            name: c.name,
            profilePictureUrl: c.profile_picture_url,
          },
        }
      })

    return [...relationshipNodes, ...pinnedNodes]
  }, [relationshipNodes, pinnedClientIds, allClients])

  // Floating "+" button popover state
  const [showAddPopover, setShowAddPopover] = useState(false)
  const addBtnRef = useRef<HTMLButtonElement>(null)

  function invalidateNetwork(clientAId?: string, clientBId?: string) {
    if (!orgId) return
    qc.invalidateQueries({ queryKey: queryKeys.clients.network(orgId) })
    if (clientAId) qc.invalidateQueries({ queryKey: queryKeys.clients.relationships(clientAId) })
    if (clientBId) qc.invalidateQueries({ queryKey: queryKeys.clients.relationships(clientBId) })
  }

  const handleCreateRelationship = useCallback(
    async (sourceId: string, targetId: string, relationType: ClientRelationType) => {
      if (!orgId || !user) return
      try {
        await addClientRelationship(orgId, sourceId, targetId, relationType, user.id)
        invalidateNetwork(sourceId, targetId)
      } catch {
        // silently fail — user can retry
      }
    },
    [orgId, user]
  )

  const handleAddClient = useCallback(
    async (clientId: string, relationType: ClientRelationType | null, sourceNodeId: string | null) => {
      if (!orgId || !user) return
      if (sourceNodeId && relationType) {
        // Connecting from a node — create relationship
        try {
          await addClientRelationship(orgId, sourceNodeId, clientId, relationType, user.id)
          invalidateNetwork(sourceNodeId, clientId)
        } catch {
          // silently fail
        }
      } else {
        // Adding standalone node — pin the client
        const newPinned = [...new Set([...pinnedClientIds, clientId])]
        savePinned.mutate(newPinned)
      }
    },
    [orgId, user, pinnedClientIds, savePinned]
  )

  const handleAddStandaloneClient = useCallback(
    (clientId: string, relationType: ClientRelationType | null) => {
      handleAddClient(clientId, relationType, null)
      setShowAddPopover(false)
    },
    [handleAddClient]
  )

  const handleDeleteRelationship = useCallback(
    async (edgeId: string) => {
      if (!orgId) return
      try {
        await removeClientRelationship(edgeId)
        invalidateNetwork()
      } catch {
        // silently fail
      }
    },
    [orgId]
  )

  const handlePositionsChange = useCallback(
    (positions: NetworkPositions) => {
      savePositions.mutate(positions)
    },
    [savePositions]
  )

  function handleResetLayout() {
    resetPositions.mutate()
  }

  if (networkLoading) {
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

  const existingNodeIds = new Set(nodes.map((n) => n.id))

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Network</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {nodes.length} clients &middot; {edges.length} relationships
            {nodes.length > 0 && (
              <span className="ml-2 text-muted-foreground/60">
                &middot; Drag handles to connect
              </span>
            )}
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
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 min-h-0 relative">
        {nodes.length === 0 ? (
          <div className="h-full rounded-xl border border-border bg-background flex flex-col items-center justify-center gap-3">
            <p className="text-sm font-medium text-foreground">No clients on the board yet</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Click the + button to add clients, then drag from the handle dots to connect them.
            </p>
          </div>
        ) : (
          <RelationshipGraph
            nodes={nodes}
            edges={edges}
            className="h-full"
            savedPositions={savedPositions}
            onPositionsChange={handlePositionsChange}
            interactive
            orgId={orgId ?? undefined}
            onCreateRelationship={handleCreateRelationship}
            onAddClient={handleAddClient}
            onDeleteRelationship={handleDeleteRelationship}
          />
        )}

        {/* Floating add button */}
        <div className="absolute bottom-10 right-10 z-20">
          <button
            ref={addBtnRef}
            type="button"
            onClick={() => setShowAddPopover((v) => !v)}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
            title="Add client to network"
          >
            <Plus size={20} />
          </button>
          {showAddPopover && orgId && (
            <div className="absolute bottom-14 right-0">
              <AddClientPopover
                orgId={orgId}
                sourceNodeId={null}
                existingNodeIds={existingNodeIds}
                onAdd={handleAddStandaloneClient}
                onClose={() => setShowAddPopover(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
