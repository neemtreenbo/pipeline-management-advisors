import { useMemo } from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { OrgNetworkData, ClientRelationType } from '@/lib/clientRelationships'

export interface ClientNodeData extends Record<string, unknown> {
  clientId: string
  name: string
  profilePictureUrl: string | null
  isFocused?: boolean
  connectionCount?: number
}

export const RELATION_COLORS: Record<ClientRelationType, string> = {
  spouse: '#0A84FF',
  family: '#30D158',
  child: '#FF9F0A',
  referred_by: '#BF5AF2',
  friend: '#FF6B6B',
}

const RELATION_LABELS: Record<ClientRelationType, string> = {
  spouse: 'Spouse',
  family: 'Family',
  child: 'Child',
  referred_by: 'Referred By',
  friend: 'Friend',
}

function buildEdge(e: OrgNetworkData['edges'][number]): Edge {
  const color = RELATION_COLORS[e.relationType] ?? '#888'
  return {
    id: e.linkId,
    source: e.fromId,
    target: e.toId,
    label: RELATION_LABELS[e.relationType] ?? e.relationType,
    type: 'smoothstep',
    data: { relationType: e.relationType },
    style: { stroke: color, strokeWidth: 2, opacity: 0.7 },
    labelStyle: { fontSize: 9, fill: color, fontWeight: 600, letterSpacing: '0.03em' },
    labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.9 },
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 4,
  }
}

export function useOrgGraphData(
  data: OrgNetworkData | undefined
): { nodes: Node<ClientNodeData>[]; edges: Edge[] } {
  return useMemo(() => {
    if (!data) return { nodes: [], edges: [] }

    // Count connections per client
    const degree = new Map<string, number>()
    for (const e of data.edges) {
      degree.set(e.fromId, (degree.get(e.fromId) ?? 0) + 1)
      degree.set(e.toId, (degree.get(e.toId) ?? 0) + 1)
    }

    const nodes: Node<ClientNodeData>[] = data.clients.map((c) => ({
      id: c.id,
      type: 'clientNode',
      position: { x: 0, y: 0 },
      data: {
        clientId: c.id,
        name: c.name,
        profilePictureUrl: c.profile_picture_url,
        connectionCount: degree.get(c.id) ?? 0,
      },
    }))

    const edges: Edge[] = data.edges.map(buildEdge)

    return { nodes, edges }
  }, [data])
}

export function useClientGraphData(
  data: OrgNetworkData | undefined,
  focusClientId: string | undefined
): { nodes: Node<ClientNodeData>[]; edges: Edge[] } {
  return useMemo(() => {
    if (!data || !focusClientId) return { nodes: [], edges: [] }

    const relevantEdges = data.edges.filter(
      (e) => e.fromId === focusClientId || e.toId === focusClientId
    )

    const connectedIds = new Set<string>([focusClientId])
    for (const e of relevantEdges) {
      connectedIds.add(e.fromId)
      connectedIds.add(e.toId)
    }

    const clientMap = new Map(data.clients.map((c) => [c.id, c]))

    // Count connections for each node in this subgraph
    const degree = new Map<string, number>()
    for (const e of relevantEdges) {
      degree.set(e.fromId, (degree.get(e.fromId) ?? 0) + 1)
      degree.set(e.toId, (degree.get(e.toId) ?? 0) + 1)
    }

    const nodes: Node<ClientNodeData>[] = Array.from(connectedIds)
      .filter((id) => clientMap.has(id))
      .map((id) => {
        const c = clientMap.get(id)!
        return {
          id: c.id,
          type: 'clientNode',
          position: { x: 0, y: 0 },
          data: {
            clientId: c.id,
            name: c.name,
            profilePictureUrl: c.profile_picture_url,
            isFocused: c.id === focusClientId,
            connectionCount: degree.get(c.id) ?? 0,
          },
        }
      })

    const edges: Edge[] = relevantEdges.map(buildEdge)

    return { nodes, edges }
  }, [data, focusClientId])
}
