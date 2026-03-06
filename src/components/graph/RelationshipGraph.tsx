import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import ClientNode from './ClientNode'
import type { ClientNodeData } from '@/hooks/useGraphData'
import { applyElkLayout } from '@/lib/graphLayout'
import type { NetworkPositions } from '@/lib/clientRelationships'

const NODE_TYPES = { clientNode: ClientNode }

interface RelationshipGraphProps {
  nodes: Node<ClientNodeData>[]
  edges: Edge[]
  layoutAlgorithm?: 'force' | 'radial'
  className?: string
  savedPositions?: NetworkPositions | null
  onPositionsChange?: (positions: NetworkPositions) => void
}

export default function RelationshipGraph({
  nodes: initialNodes,
  edges: initialEdges,
  layoutAlgorithm = 'force',
  className,
  savedPositions,
  onPositionsChange,
}: RelationshipGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ClientNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [layoutReady, setLayoutReady] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (initialNodes.length === 0) {
      setNodes([])
      setEdges(initialEdges)
      setLayoutReady(true)
      return
    }

    // Check if we have saved positions for all current nodes
    if (savedPositions) {
      const allHavePositions = initialNodes.every((n) => savedPositions[n.id])
      if (allHavePositions) {
        const positioned = initialNodes.map((n) => ({
          ...n,
          position: savedPositions[n.id],
        }))
        setNodes(positioned as Node<ClientNodeData>[])
        setEdges(initialEdges)
        setLayoutReady(true)
        return
      }
    }

    // Fall back to computed layout
    setLayoutReady(false)
    applyElkLayout(initialNodes, initialEdges, { algorithm: layoutAlgorithm })
      .then((laidOutNodes) => {
        setNodes(laidOutNodes as Node<ClientNodeData>[])
        setEdges(initialEdges)
        setLayoutReady(true)
      })
      .catch(() => {
        setNodes(initialNodes)
        setEdges(initialEdges)
        setLayoutReady(true)
      })
  }, [initialNodes, initialEdges, layoutAlgorithm, savedPositions])

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<ClientNodeData>>[]) => {
      onNodesChange(changes)

      // Detect drag end (position finalized)
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

  return (
    <div
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
        <MiniMap
          nodeColor="hsl(var(--muted))"
          maskColor="hsla(var(--background), 0.7)"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.75rem',
          }}
        />
      </ReactFlow>
    </div>
  )
}
