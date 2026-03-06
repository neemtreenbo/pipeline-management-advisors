import { useOrgClientNetwork } from '@/hooks/queries/useClients'
import { useClientGraphData } from '@/hooks/useGraphData'
import RelationshipGraph from './RelationshipGraph'

interface ClientRelationshipGraphProps {
  clientId: string
  orgId: string
}

export default function ClientRelationshipGraph({ clientId, orgId }: ClientRelationshipGraphProps) {
  const { data, isLoading } = useOrgClientNetwork(orgId)
  const { nodes, edges } = useClientGraphData(data, clientId)

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (nodes.length <= 1) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-foreground">No relationship connections</p>
        <p className="text-xs text-muted-foreground">
          Add relationships in the Overview tab to see them visualized here.
        </p>
      </div>
    )
  }

  return (
    <RelationshipGraph
      nodes={nodes}
      edges={edges}
      layoutAlgorithm="radial"
      className="h-[480px]"
    />
  )
}
