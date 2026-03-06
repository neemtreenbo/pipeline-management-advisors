import type { Node, Edge } from '@xyflow/react'

const NODE_W = 160
const NODE_H = 56

/**
 * Deterministic concentric layout.
 *
 * - Org-wide ("concentric"): nodes sorted by connection count.
 *   Most-connected nodes sit in the center ring, least-connected on the outside.
 *   Each ring is evenly spaced in a circle.
 *
 * - Client-focused ("radial"): the focused node (isFocused=true) goes to the
 *   exact center, all others sit in a single ring around it.
 */
export async function applyElkLayout(
  nodes: Node[],
  edges: Edge[],
  options: { algorithm?: 'force' | 'radial' } = {}
): Promise<Node[]> {
  if (nodes.length === 0) return []
  if (nodes.length === 1) {
    return [{ ...nodes[0], position: { x: 0, y: 0 } }]
  }

  const algorithm = options.algorithm ?? 'force'

  if (algorithm === 'radial') {
    return layoutRadial(nodes)
  }

  return layoutConcentric(nodes, edges)
}

/** Client-focused: center node + single ring */
function layoutRadial(nodes: Node[]): Node[] {
  const focused = nodes.find((n) => (n.data as Record<string, unknown>)?.isFocused)
  const others = nodes.filter((n) => n !== focused)

  const result: Node[] = []

  if (focused) {
    result.push({ ...focused, position: { x: 0, y: 0 } })
  }

  if (others.length === 0) return result

  // Calculate ring radius based on number of nodes so they don't overlap
  const minRadius = 180
  const circumferenceNeeded = others.length * (NODE_W + 40)
  const radius = Math.max(minRadius, circumferenceNeeded / (2 * Math.PI))

  const angleStep = (2 * Math.PI) / others.length
  // Start from top (-π/2) for visual balance
  const startAngle = -Math.PI / 2

  for (let i = 0; i < others.length; i++) {
    const angle = startAngle + i * angleStep
    result.push({
      ...others[i],
      position: {
        x: Math.cos(angle) * radius - NODE_W / 2,
        y: Math.sin(angle) * radius - NODE_H / 2,
      },
    })
  }

  return result
}

/** Org-wide: concentric rings sorted by connection count */
function layoutConcentric(nodes: Node[], edges: Edge[]): Node[] {
  // Count connections per node
  const degree = new Map<string, number>()
  for (const n of nodes) degree.set(n.id, 0)
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
  }

  // Sort by degree descending (most-connected first)
  const sorted = [...nodes].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)
  )

  // Split into concentric rings.
  // Ring 0 (center): top hub(s) — nodes with the highest degree
  // Remaining nodes distributed into rings of increasing size.
  const rings: Node[][] = []
  const maxDeg = degree.get(sorted[0].id) ?? 1

  if (sorted.length <= 6) {
    // Small graph: single ring with most-connected node in center
    rings.push([sorted[0]])
    if (sorted.length > 1) rings.push(sorted.slice(1))
  } else {
    // Tier into 3 rings based on degree thresholds
    const highThreshold = Math.max(Math.ceil(maxDeg * 0.6), 2)
    const midThreshold = Math.max(Math.ceil(maxDeg * 0.3), 1)

    const high: Node[] = []
    const mid: Node[] = []
    const low: Node[] = []

    for (const n of sorted) {
      const d = degree.get(n.id) ?? 0
      if (d >= highThreshold) high.push(n)
      else if (d >= midThreshold) mid.push(n)
      else low.push(n)
    }

    // Ensure center ring isn't empty
    if (high.length === 0 && mid.length > 0) {
      high.push(mid.shift()!)
    }
    if (high.length === 0 && low.length > 0) {
      high.push(low.shift()!)
    }

    if (high.length > 0) rings.push(high)
    if (mid.length > 0) rings.push(mid)
    if (low.length > 0) rings.push(low)
  }

  // Position each ring
  const result: Node[] = []
  let currentRadius = 0
  const ringGap = 220 // space between rings

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r]

    if (r === 0 && ring.length === 1) {
      // Single center node
      result.push({ ...ring[0], position: { x: -NODE_W / 2, y: -NODE_H / 2 } })
      currentRadius = ringGap
      continue
    }

    if (r === 0 && ring.length > 1) {
      // Multiple center nodes — small inner circle
      currentRadius = Math.max(120, ring.length * 50 / Math.PI)
    }

    const circumferenceNeeded = ring.length * (NODE_W + 50)
    const radius = Math.max(currentRadius, circumferenceNeeded / (2 * Math.PI))

    const angleStep = (2 * Math.PI) / ring.length
    const startAngle = -Math.PI / 2

    for (let i = 0; i < ring.length; i++) {
      const angle = startAngle + i * angleStep
      result.push({
        ...ring[i],
        position: {
          x: Math.cos(angle) * radius - NODE_W / 2,
          y: Math.sin(angle) * radius - NODE_H / 2,
        },
      })
    }

    currentRadius = radius + ringGap
  }

  return result
}
