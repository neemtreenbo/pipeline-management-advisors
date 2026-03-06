import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
  type Connection,
  type OnConnectStartParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import ClientNode from './ClientNode'
import EntityNode from './EntityNode'
import GroupNode from './GroupNode'
import ConnectionTypePopover from './ConnectionTypePopover'
import AddClientPopover from './AddClientPopover'
import type { ClientNodeData } from '@/hooks/useGraphData'
import { applyElkLayout, placeNewNodesInSlots, type LayoutEdge } from '@/lib/graphLayout'
import type { NetworkPositions, ClientRelationType } from '@/lib/clientRelationships'

const NODE_TYPES = { clientNode: ClientNode, entityNode: EntityNode, groupNode: GroupNode }

/**
 * For each edge, pick the handle (top/right/bottom/left) on source and target
 * based on the relative position of the two connected nodes.
 */
function assignEdgeHandles(edges: Edge[], nodePositions: Map<string, { x: number; y: number }>): Edge[] {
  return edges.map((edge) => {
    const srcPos = nodePositions.get(edge.source)
    const tgtPos = nodePositions.get(edge.target)
    if (!srcPos || !tgtPos) return edge

    const dx = tgtPos.x - srcPos.x
    const dy = tgtPos.y - srcPos.y

    // Pick side based on dominant direction from source → target
    let sourceHandle: string
    let targetHandle: string
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal dominant
      sourceHandle = dx > 0 ? 'right' : 'left'
      targetHandle = dx > 0 ? 'left' : 'right'
    } else {
      // Vertical dominant
      sourceHandle = dy > 0 ? 'bottom' : 'top'
      targetHandle = dy > 0 ? 'top' : 'bottom'
    }

    return { ...edge, sourceHandle, targetHandle }
  })
}

function DeleteEdgePopover({
  x,
  y,
  label,
  onConfirm,
  onClose,
}: {
  x: number
  y: number
  label: string
  onConfirm: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose()
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

  return (
    <div
      ref={ref}
      className="absolute z-50 rounded-xl border border-border bg-card shadow-lg p-3 w-[180px]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      <p className="text-xs text-foreground mb-2">
        Remove <span className="font-semibold">{label}</span> link?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-2 py-1 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 px-2 py-1 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

type PopoverState =
  | null
  | { type: 'connectionType'; x: number; y: number; sourceId: string; targetId: string }
  | { type: 'addClient'; x: number; y: number; sourceNodeId: string | null }
  | { type: 'deleteEdge'; x: number; y: number; edgeId: string; label: string }

interface RelationshipGraphProps {
  nodes: Node<ClientNodeData>[]
  edges: Edge[]
  layoutAlgorithm?: 'force' | 'radial'
  className?: string
  savedPositions?: NetworkPositions | null
  onPositionsChange?: (positions: NetworkPositions) => void
  interactive?: boolean
  orgId?: string
  onCreateRelationship?: (sourceId: string, targetId: string, relationType: ClientRelationType) => void
  onAddClient?: (clientId: string, relationType: ClientRelationType | null, sourceNodeId: string | null) => void
  onDeleteRelationship?: (edgeId: string) => void
}

function RelationshipGraphInner({
  nodes: initialNodes,
  edges: initialEdges,
  layoutAlgorithm = 'force',
  className,
  savedPositions,
  onPositionsChange,
  interactive = false,
  orgId,
  onCreateRelationship,
  onAddClient,
  onDeleteRelationship,
}: RelationshipGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ClientNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [layoutReady, setLayoutReady] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [popover, setPopover] = useState<PopoverState>(null)
  const connectStartRef = useRef<OnConnectStartParams | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (initialNodes.length === 0) {
      setNodes([])
      setEdges(initialEdges)
      setLayoutReady(true)
      return
    }

    // Convert xyflow edges to layout edges with relationType
    const layoutEdges: LayoutEdge[] = initialEdges.map((e) => ({
      source: e.source,
      target: e.target,
      relationType: (e.data as Record<string, unknown>)?.relationType as string ?? '',
    }))

    // Split nodes into those with saved positions and those without
    const withPosition: Node<ClientNodeData>[] = []
    const withoutPosition: Node<ClientNodeData>[] = []

    for (const n of initialNodes) {
      if (savedPositions?.[n.id]) {
        withPosition.push({ ...n, position: savedPositions[n.id] })
      } else {
        withoutPosition.push(n)
      }
    }

    // Helper: build position map and set nodes + edges with handle assignments
    const applyLayout = (layoutNodes: Node<ClientNodeData>[]) => {
      const posMap = new Map<string, { x: number; y: number }>()
      for (const n of layoutNodes) posMap.set(n.id, n.position)
      setNodes(layoutNodes)
      setEdges(assignEdgeHandles(initialEdges, posMap))
      setLayoutReady(true)
    }

    if (withoutPosition.length === 0) {
      // All nodes have saved positions — use them directly
      applyLayout(withPosition as Node<ClientNodeData>[])
      return
    }

    if (withPosition.length === 0) {
      // All nodes are new — full cluster layout
      setLayoutReady(false)
      applyElkLayout(withoutPosition, layoutEdges, { algorithm: layoutAlgorithm })
        .then((laidOut) => {
          applyLayout(laidOut as Node<ClientNodeData>[])
        })
        .catch(() => {
          const fallback = withoutPosition.map((n, i) => ({
            ...n,
            position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 120 },
          }))
          applyLayout(fallback as Node<ClientNodeData>[])
        })
      return
    }

    // Place new nodes in slots near their connections
    const placed = placeNewNodesInSlots(withoutPosition, withPosition, layoutEdges)
    applyLayout([...withPosition, ...placed] as Node<ClientNodeData>[])
  }, [initialNodes, initialEdges, layoutAlgorithm, savedPositions])

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<ClientNodeData>>[]) => {
      onNodesChange(changes)

      const hasDragEnd = changes.some(
        (c) => c.type === 'position' && c.dragging === false && c.position
      )
      if (hasDragEnd && onPositionsChange) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
          setNodes((currentNodes) => {
            const positions: NetworkPositions = {}
            for (const n of currentNodes) {
              positions[n.id] = { x: n.position.x, y: n.position.y }
            }
            onPositionsChange(positions)
            return currentNodes
          })
        }, 500)
      }
    },
    [onNodesChange, onPositionsChange]
  )

  // ── Interactive connection handlers ──

  const handleConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      connectStartRef.current = params
    },
    []
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!interactive || !connection.source || !connection.target) return
      if (connection.source === connection.target) return

      // Get screen position for popover
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = rect.width / 2
      const y = rect.height / 2

      setPopover({
        type: 'connectionType',
        x,
        y,
        sourceId: connection.source,
        targetId: connection.target,
      })
    },
    [interactive]
  )

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!interactive) return

      const startParams = connectStartRef.current
      connectStartRef.current = null

      if (!startParams?.nodeId) return

      // Check if the connection ended on a node (onConnect would have fired)
      const target = event.target as HTMLElement
      const isOnNode = target.closest('.react-flow__node')
      if (isOnNode) return

      // Ended on empty space — show add client popover
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return

      let clientX: number, clientY: number
      if ('touches' in event) {
        const touch = event.changedTouches[0]
        clientX = touch.clientX
        clientY = touch.clientY
      } else {
        clientX = event.clientX
        clientY = event.clientY
      }

      setPopover({
        type: 'addClient',
        x: clientX - rect.left,
        y: clientY - rect.top,
        sourceNodeId: startParams.nodeId,
      })
    },
    [interactive]
  )

  const handleSelectRelationType = useCallback(
    (relationType: ClientRelationType) => {
      if (popover?.type !== 'connectionType') return
      onCreateRelationship?.(popover.sourceId, popover.targetId, relationType)
      setPopover(null)
    },
    [popover, onCreateRelationship]
  )

  const handleAddClient = useCallback(
    (clientId: string, relationType: ClientRelationType | null) => {
      if (popover?.type !== 'addClient') return
      onAddClient?.(clientId, relationType, popover.sourceNodeId)
      setPopover(null)
    },
    [popover, onAddClient]
  )

  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!interactive) return
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      setPopover({
        type: 'deleteEdge',
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        edgeId: edge.id,
        label: (edge.label as string) ?? 'relationship',
      })
    },
    [interactive]
  )

  const handleConfirmDelete = useCallback(() => {
    if (popover?.type !== 'deleteEdge') return
    onDeleteRelationship?.(popover.edgeId)
    setPopover(null)
  }, [popover, onDeleteRelationship])

  const existingNodeIds = new Set(initialNodes.map((n) => n.id))

  return (
    <div
      ref={wrapperRef}
      className={`relative rounded-xl border border-border overflow-hidden bg-background ${className ?? ''}`}
    >
      {!layoutReady && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={interactive ? handleConnect : undefined}
        onConnectStart={interactive ? handleConnectStart : undefined}
        onConnectEnd={interactive ? handleConnectEnd : undefined}
        onEdgeClick={interactive ? handleEdgeClick : undefined}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{
          background: 'hsl(var(--background))',
          opacity: layoutReady ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        <Background color="hsl(var(--border))" gap={20} size={1} />
        <Controls
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.75rem',
          }}
        />
        {interactive && (
          <MiniMap
            nodeColor="hsl(var(--muted))"
            maskColor="hsla(var(--background), 0.7)"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.75rem',
            }}
          />
        )}
      </ReactFlow>

      {/* Popovers rendered on top of the graph */}
      {popover?.type === 'connectionType' && (
        <ConnectionTypePopover
          x={popover.x}
          y={popover.y}
          onSelect={handleSelectRelationType}
          onClose={() => setPopover(null)}
        />
      )}
      {popover?.type === 'deleteEdge' && (
        <DeleteEdgePopover
          x={popover.x}
          y={popover.y}
          label={popover.label}
          onConfirm={handleConfirmDelete}
          onClose={() => setPopover(null)}
        />
      )}
      {popover?.type === 'addClient' && orgId && (
        <AddClientPopover
          x={popover.x}
          y={popover.y}
          orgId={orgId}
          sourceNodeId={popover.sourceNodeId}
          existingNodeIds={existingNodeIds}
          onAdd={handleAddClient}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  )
}

export default function RelationshipGraph(props: RelationshipGraphProps) {
  return (
    <ReactFlowProvider>
      <RelationshipGraphInner {...props} />
    </ReactFlowProvider>
  )
}
