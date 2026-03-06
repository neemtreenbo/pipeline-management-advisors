import type { Node } from '@xyflow/react'

const NODE_W = 160
const NODE_H = 56

// ── Types ──

export interface LayoutEdge {
  source: string
  target: string
  relationType: string
}

// ── Zone mapping: relationship type → preferred angular zone ──
// Zones are measured in radians from center of the hub node.
// Family-ish relations cluster at top, social/professional at bottom.

const ZONE_ANGLES: Record<string, number> = {
  spouse: -Math.PI / 2 - Math.PI / 6,   // top-left (~-120°)
  child: -Math.PI / 2 + Math.PI / 6,    // top-right (~-60°)
  family: 0,                              // right (0°)
  referred_by: Math.PI / 2 + Math.PI / 6, // bottom-right (~120°)
  friend: Math.PI / 2 - Math.PI / 6,      // bottom-left (~60°)
}
const ZONE_SPAN = Math.PI / 3 // each zone spans 60°
const DEFAULT_ZONE_ANGLE = Math.PI // left (fallback)

const RING_1 = 200  // first ring distance from hub
const RING_STEP = 180
const SLOTS_PER_RING = 4 // max nodes per zone per ring before overflowing
const MIN_NODE_DISTANCE = 180

// ── Public API ──

/**
 * Main layout entry point.
 * - 'force' (default): cluster-based layout for org-wide network
 * - 'radial': focused node at center with single ring (for client detail page)
 */
export async function applyElkLayout(
  nodes: Node[],
  edges: LayoutEdge[],
  options: { algorithm?: 'force' | 'radial' } = {}
): Promise<Node[]> {
  if (nodes.length === 0) return []
  if (nodes.length === 1) {
    return [{ ...nodes[0], position: { x: 0, y: 0 } }]
  }

  const algorithm = options.algorithm ?? 'force'

  if (algorithm === 'radial') {
    return layoutRadial(nodes, edges)
  }

  return layoutClustered(nodes, edges)
}

/**
 * Slot-based placement for new nodes near their already-positioned connections.
 * Uses relationship type to pick the correct zone around the anchor node.
 * Existing positioned nodes are never moved.
 */
export function placeNewNodesInSlots(
  newNodes: Node[],
  positionedNodes: Node[],
  edges: LayoutEdge[]
): Node[] {
  if (newNodes.length === 0) return []

  // Build adjacency with relation types
  const adjWithType = new Map<string, Map<string, string>>() // nodeId -> Map<neighborId, relationType>
  for (const e of edges) {
    if (!adjWithType.has(e.source)) adjWithType.set(e.source, new Map())
    if (!adjWithType.has(e.target)) adjWithType.set(e.target, new Map())
    adjWithType.get(e.source)!.set(e.target, e.relationType)
    adjWithType.get(e.target)!.set(e.source, e.relationType)
  }

  // Track positions of all placed nodes
  const posMap = new Map<string, { x: number; y: number }>()
  for (const n of positionedNodes) {
    posMap.set(n.id, { x: n.position.x, y: n.position.y })
  }

  const result: Node[] = []
  const unplaced = new Set(newNodes.map((n) => n.id))
  const nodeMap = new Map(newNodes.map((n) => [n.id, n]))

  // Iteratively place nodes that have at least one positioned neighbor
  let progress = true
  while (progress) {
    progress = false
    for (const nodeId of [...unplaced]) {
      const neighbors = adjWithType.get(nodeId)
      if (!neighbors) continue

      // Find the best anchor: a positioned neighbor (prefer the one with most connections)
      let bestAnchorId: string | null = null
      let bestRelType = ''
      for (const [nbId, relType] of neighbors) {
        if (posMap.has(nbId)) {
          if (!bestAnchorId) {
            bestAnchorId = nbId
            bestRelType = relType
          }
        }
      }
      if (!bestAnchorId) continue

      const anchor = posMap.get(bestAnchorId)!
      const pos = findSlotPosition(anchor, bestRelType, posMap)

      posMap.set(nodeId, pos)
      result.push({ ...nodeMap.get(nodeId)!, position: pos })
      unplaced.delete(nodeId)
      progress = true
    }
  }

  // Handle remaining unplaced nodes (isolated from positioned nodes)
  if (unplaced.size > 0) {
    // Find bounding box of all placed nodes
    let maxY = -Infinity
    let minX = Infinity
    for (const [, pos] of posMap) {
      if (pos.y > maxY) maxY = pos.y
      if (pos.x < minX) minX = pos.x
    }

    const isolatedEdges = edges.filter(
      (e) => unplaced.has(e.source) && unplaced.has(e.target)
    )

    if (isolatedEdges.length > 0) {
      const isolatedNodes = [...unplaced].map((id) => nodeMap.get(id)!)
      const subLayout = layoutClustered(isolatedNodes, isolatedEdges)
      for (const n of subLayout) {
        n.position.x += minX === Infinity ? 0 : minX
        n.position.y += (maxY === -Infinity ? 0 : maxY) + 300
        posMap.set(n.id, { ...n.position })
        result.push(n)
      }
    } else {
      const startX = minX === Infinity ? 0 : minX
      const startY = (maxY === -Infinity ? 0 : maxY) + 300
      let i = 0
      for (const nodeId of unplaced) {
        const x = startX + (i % 4) * 220
        const y = startY + Math.floor(i / 4) * 120
        posMap.set(nodeId, { x, y })
        result.push({ ...nodeMap.get(nodeId)!, position: { x, y } })
        i++
      }
    }
  }

  // Overlap resolution
  resolveOverlaps(result)

  return result
}

// ── Private: Cluster Layout ──

/**
 * Cluster-based layout for org-wide network.
 * Hub nodes at center, neighbors clustered by relationship type in zones.
 */
function layoutClustered(nodes: Node[], edges: LayoutEdge[]): Node[] {
  if (nodes.length === 0) return []
  if (nodes.length === 1) {
    return [{ ...nodes[0], position: { x: -NODE_W / 2, y: -NODE_H / 2 } }]
  }

  // Build adjacency with relation types
  const adjWithType = new Map<string, Map<string, string>>()
  const degree = new Map<string, number>()
  for (const n of nodes) degree.set(n.id, 0)

  for (const e of edges) {
    if (!adjWithType.has(e.source)) adjWithType.set(e.source, new Map())
    if (!adjWithType.has(e.target)) adjWithType.set(e.target, new Map())
    adjWithType.get(e.source)!.set(e.target, e.relationType)
    adjWithType.get(e.target)!.set(e.source, e.relationType)
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
  }

  // Sort by degree descending — most connected first
  const sorted = [...nodes].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)
  )

  const posMap = new Map<string, { x: number; y: number }>()
  const placed = new Set<string>()
  const result: Node[] = []
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // Place hubs and their clusters
  let hubIndex = 0
  const HUB_SPACING = 600

  for (const hub of sorted) {
    if (placed.has(hub.id)) continue

    // Position hub
    let hubPos: { x: number; y: number }
    if (hubIndex === 0) {
      hubPos = { x: -NODE_W / 2, y: -NODE_H / 2 }
    } else {
      // Place secondary hubs spaced out in a ring around origin
      const hubAngle = (2 * Math.PI * hubIndex) / Math.max(sorted.length, 6) - Math.PI / 2
      const hubRadius = HUB_SPACING * Math.ceil(hubIndex / 6)
      hubPos = {
        x: Math.cos(hubAngle) * hubRadius - NODE_W / 2,
        y: Math.sin(hubAngle) * hubRadius - NODE_H / 2,
      }
    }

    posMap.set(hub.id, hubPos)
    placed.add(hub.id)
    result.push({ ...hub, position: hubPos })

    // Group unplaced neighbors by relationship type
    const neighbors = adjWithType.get(hub.id)
    if (!neighbors) {
      hubIndex++
      continue
    }

    const typeGroups = new Map<string, string[]>()
    for (const [nbId, relType] of neighbors) {
      if (placed.has(nbId)) continue
      if (!nodeMap.has(nbId)) continue
      if (!typeGroups.has(relType)) typeGroups.set(relType, [])
      typeGroups.get(relType)!.push(nbId)
    }

    // Place each group in its zone
    for (const [relType, memberIds] of typeGroups) {
      const zoneCenterAngle = ZONE_ANGLES[relType] ?? DEFAULT_ZONE_ANGLE

      for (let i = 0; i < memberIds.length; i++) {
        const memberId = memberIds[i]
        if (placed.has(memberId)) continue

        const ring = Math.floor(i / SLOTS_PER_RING)
        const slotInRing = i % SLOTS_PER_RING
        const slotsThisRing = Math.min(SLOTS_PER_RING, memberIds.length - ring * SLOTS_PER_RING)

        const ringDist = RING_1 + ring * RING_STEP
        // Distribute slots evenly within the zone span
        const angleOffset = slotsThisRing === 1
          ? 0
          : (slotInRing / (slotsThisRing - 1) - 0.5) * ZONE_SPAN

        const angle = zoneCenterAngle + angleOffset
        const pos = {
          x: hubPos.x + NODE_W / 2 + Math.cos(angle) * ringDist - NODE_W / 2,
          y: hubPos.y + NODE_H / 2 + Math.sin(angle) * ringDist - NODE_H / 2,
        }

        posMap.set(memberId, pos)
        placed.add(memberId)
        result.push({ ...nodeMap.get(memberId)!, position: pos })
      }
    }

    hubIndex++
  }

  // Place any remaining unplaced nodes (shouldn't happen, but safety net)
  for (const n of nodes) {
    if (!placed.has(n.id)) {
      const pos = { x: result.length * 200, y: 0 }
      posMap.set(n.id, pos)
      result.push({ ...n, position: pos })
    }
  }

  // Overlap resolution
  resolveOverlaps(result)

  return result
}

// ── Private: Radial Layout (for client detail page) ──

/**
 * Simple mind-map: focused node at center, others evenly spaced in a ring.
 * Deterministic positions based on count. No saved positions needed.
 */
function layoutRadial(nodes: Node[], _edges: LayoutEdge[]): Node[] {
  const focused = nodes.find((n) => (n.data as Record<string, unknown>)?.isFocused)
  const others = nodes.filter((n) => n !== focused)
  const result: Node[] = []

  if (focused) {
    result.push({ ...focused, position: { x: 0, y: 0 } })
  }

  if (others.length === 0) return result

  const n = others.length
  const RADIUS = 250

  for (let i = 0; i < n; i++) {
    // Start from top (-π/2), distribute evenly around the circle
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
    result.push({
      ...others[i],
      position: {
        x: Math.cos(angle) * RADIUS,
        y: Math.sin(angle) * RADIUS,
      },
    })
  }

  return result
}

// ── Private: Slot finder for new node insertion ──

/**
 * Find a clean slot position for a new node around an anchor,
 * using the relationship type to pick the preferred zone.
 * Scans outward through rings until an unoccupied slot is found.
 */
function findSlotPosition(
  anchor: { x: number; y: number },
  relationType: string,
  posMap: Map<string, { x: number; y: number }>
): { x: number; y: number } {
  const zoneCenterAngle = ZONE_ANGLES[relationType] ?? DEFAULT_ZONE_ANGLE
  const centerX = anchor.x + NODE_W / 2
  const centerY = anchor.y + NODE_H / 2

  // Try slots expanding outward through rings
  for (let ring = 0; ring < 5; ring++) {
    const ringDist = RING_1 + ring * RING_STEP
    const slotsInRing = SLOTS_PER_RING + ring * 2 // more slots on outer rings

    for (let s = 0; s < slotsInRing; s++) {
      const angleOffset = slotsInRing === 1
        ? 0
        : (s / (slotsInRing - 1) - 0.5) * ZONE_SPAN

      const angle = zoneCenterAngle + angleOffset
      const candidate = {
        x: centerX + Math.cos(angle) * ringDist - NODE_W / 2,
        y: centerY + Math.sin(angle) * ringDist - NODE_H / 2,
      }

      // Check if this slot is clear of all existing nodes
      let clear = true
      for (const [, existing] of posMap) {
        const dx = candidate.x - existing.x
        const dy = candidate.y - existing.y
        if (Math.sqrt(dx * dx + dy * dy) < MIN_NODE_DISTANCE) {
          clear = false
          break
        }
      }

      if (clear) return candidate
    }
  }

  // Absolute fallback: place far out
  return {
    x: centerX + Math.cos(zoneCenterAngle) * (RING_1 + 5 * RING_STEP) - NODE_W / 2,
    y: centerY + Math.sin(zoneCenterAngle) * (RING_1 + 5 * RING_STEP) - NODE_H / 2,
  }
}

// ── Private: Overlap resolution ──

function resolveOverlaps(nodes: Node[]): void {
  for (let iter = 0; iter < 10; iter++) {
    let moved = false
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].position.x - nodes[i].position.x
        const dy = nodes[j].position.y - nodes[i].position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MIN_NODE_DISTANCE && dist > 0) {
          const push = (MIN_NODE_DISTANCE - dist) / 2 + 5
          const nx = dx / dist
          const ny = dy / dist
          nodes[i].position.x -= nx * push
          nodes[i].position.y -= ny * push
          nodes[j].position.x += nx * push
          nodes[j].position.y += ny * push
          moved = true
        }
      }
    }
    if (!moved) break
  }
}
