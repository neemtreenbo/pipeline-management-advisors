import { useMemo, useCallback, useRef, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQueryClient } from '@tanstack/react-query'
import { useDealsByClient } from '@/hooks/queries/useDeals'
import { useEntityTasks } from '@/hooks/queries/useTasks'
import { useEntityNotes } from '@/hooks/queries/useNotes'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import MindmapClientNode from './MindmapClientNode'
import MindmapGroupNode, { type GroupNodeData } from './MindmapGroupNode'
import type { MindmapPositions, MindmapClientNodeData } from './types'

const NODE_TYPES = {
  mindmapClient: MindmapClientNode,
  mindmapGroup: MindmapGroupNode,
}

const NODE_W = 160
const NODE_H = 48
const GROUP_W = 200
const SPACING_X = 280

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  'group-deals': { x: SPACING_X, y: -NODE_H / 2 },
  'group-tasks': { x: -SPACING_X - GROUP_W, y: -NODE_H / 2 },
  'group-notes': { x: -GROUP_W / 2, y: NODE_H / 2 + 100 },
}

interface MindmapProps {
  clientId: string
  clientName: string
  profilePictureUrl: string | null
  orgId: string
  clientData: Record<string, unknown> | null
}

function MindmapInner({ clientId, clientName, profilePictureUrl, orgId, clientData }: MindmapProps) {
  const qc = useQueryClient()
  const { data: deals = [], isLoading: dealsLoading } = useDealsByClient(clientId)
  const { data: tasks = [], isLoading: tasksLoading } = useEntityTasks(orgId, 'client', clientId)
  const { data: notes = [], isLoading: notesLoading } = useEntityNotes('client', clientId)

  const clientDataRef = useRef(clientData)
  const initialPositionsRef = useRef<MindmapPositions | null>(
    (clientData?.mindmapPositions ?? null) as MindmapPositions | null
  )
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  clientDataRef.current = clientData

  const isLoading = dealsLoading || tasksLoading || notesLoading

  const initialNodes = useMemo(() => {
    const nodes: Node<MindmapClientNodeData | GroupNodeData>[] = []
    const pos = initialPositionsRef.current

    const getPos = (id: string, fallback: { x: number; y: number }) =>
      pos?.[id] ?? fallback

    nodes.push({
      id: clientId,
      type: 'mindmapClient',
      position: getPos(clientId, { x: -NODE_W / 2, y: -NODE_H / 2 }),
      data: { clientId, name: clientName, profilePictureUrl },
    })

    if (deals.length > 0) {
      nodes.push({
        id: 'group-deals',
        type: 'mindmapGroup',
        position: getPos('group-deals', DEFAULT_POSITIONS['group-deals']),
        data: {
          entityType: 'deal' as const,
          title: `${deals.length} Deal${deals.length === 1 ? '' : 's'}`,
          items: deals.map((d) => ({
            label: (d.data as Record<string, unknown>)?.name as string || d.stage,
            subtitle: `$${d.value.toLocaleString()}`,
            navigateTo: `/app/deals/${d.id}`,
          })),
        },
      })
    }

    const uncompletedTasks = tasks.filter((t) => t.status !== 'completed')
    if (uncompletedTasks.length > 0) {
      nodes.push({
        id: 'group-tasks',
        type: 'mindmapGroup',
        position: getPos('group-tasks', DEFAULT_POSITIONS['group-tasks']),
        data: {
          entityType: 'tasks' as const,
          title: `${uncompletedTasks.length} Task${uncompletedTasks.length === 1 ? '' : 's'}`,
          items: uncompletedTasks.map((t) => ({
            label: t.title,
            subtitle: t.priority ?? undefined,
          })),
        },
      })
    }

    if (notes.length > 0) {
      nodes.push({
        id: 'group-notes',
        type: 'mindmapGroup',
        position: getPos('group-notes', DEFAULT_POSITIONS['group-notes']),
        data: {
          entityType: 'note' as const,
          title: `${notes.length} Note${notes.length === 1 ? '' : 's'}`,
          items: notes.map((n) => ({
            label: n.title || 'Untitled Note',
            navigateTo: `/app/notes/${n.id}`,
          })),
        },
      })
    }

    return nodes
  }, [clientId, clientName, profilePictureUrl, deals, notes, tasks])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)

  // Sync when initialNodes change (data refetch)
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  const persistPositions = useCallback((positions: MindmapPositions) => {
    const newData = { ...(clientDataRef.current ?? {}), mindmapPositions: positions }
    clientDataRef.current = newData
    supabase.from('clients').update({ data: newData }).eq('id', clientId).then()
  }, [clientId])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)

      const hasDragEnd = changes.some(
        (c) => c.type === 'position' && c.dragging === false && c.position
      )
      if (!hasDragEnd) return

      // Debounce DB save — 2s after last drag
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        setNodes((curr) => {
          const positions: MindmapPositions = {}
          for (const n of curr) positions[n.id] = { x: n.position.x, y: n.position.y }
          initialPositionsRef.current = positions
          persistPositions(positions)
          return curr
        })
      }, 2000)
    },
    [onNodesChange, persistPositions, setNodes]
  )

  // On unmount: flush pending save + update cache for tab switches
  useEffect(() => {
    const cId = clientId
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      const positions = initialPositionsRef.current
      if (!positions) return
      const newData = { ...(clientDataRef.current ?? {}), mindmapPositions: positions }
      qc.setQueryData(queryKeys.clients.detail(cId), (old: Record<string, unknown> | undefined) =>
        old ? { ...old, data: newData } : old
      )
      supabase.from('clients').update({ data: newData }).eq('id', cId).then()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (initialNodes.length <= 1) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-foreground">No connections yet</p>
        <p className="text-xs text-muted-foreground">
          Add deals, notes, or tasks to see them visualized here.
        </p>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl border border-border overflow-hidden bg-background h-[480px]">
      <ReactFlow
        nodes={nodes}
        onNodesChange={handleNodesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'hsl(var(--background))' }}
      >
        <Background color="hsl(var(--border))" gap={20} size={1} />
        <Controls
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

export default function Mindmap(props: MindmapProps) {
  return (
    <ReactFlowProvider>
      <MindmapInner {...props} />
    </ReactFlowProvider>
  )
}
