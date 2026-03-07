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
import { useClientRelationships } from '@/hooks/queries/useClients'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { StickyNote } from 'lucide-react'
import MindmapClientNode from './MindmapClientNode'
import MindmapGroupNode, { type GroupNodeData } from './MindmapGroupNode'
import MindmapStickyNode from './MindmapStickyNode'
import type { MindmapPositions, MindmapClientNodeData, MindmapSticky, MindmapStickyNodeData, StickyColor } from './types'

const NODE_TYPES = {
  mindmapClient: MindmapClientNode,
  mindmapGroup: MindmapGroupNode,
  mindmapSticky: MindmapStickyNode,
}

const NODE_W = 160
const NODE_H = 48
const GROUP_W = 200
const SPACING_X = 280

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  'group-deals': { x: SPACING_X, y: -NODE_H / 2 },
  'group-tasks': { x: -SPACING_X - GROUP_W, y: -NODE_H / 2 },
  'group-notes': { x: -GROUP_W / 2, y: NODE_H / 2 + 100 },
  'group-relationships': { x: -GROUP_W / 2, y: -NODE_H / 2 - 160 },
}

const RELATION_LABELS: Record<string, string> = {
  spouse: 'Spouse',
  child: 'Child',
  family: 'Family',
  referred_by: 'Referral',
  friend: 'Friend',
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
  const { data: relationships = [], isLoading: relationshipsLoading } = useClientRelationships(clientId, orgId)

  const clientDataRef = useRef(clientData)
  const initialPositionsRef = useRef<MindmapPositions | null>(
    (clientData?.mindmapPositions ?? null) as MindmapPositions | null
  )
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  clientDataRef.current = clientData

  const stickiesRef = useRef<MindmapSticky[]>(
    ((clientData?.mindmapStickies ?? []) as MindmapSticky[])
  )

  const isLoading = dealsLoading || tasksLoading || notesLoading || relationshipsLoading

  // Stable callback refs so sticky nodes don't cause re-memos
  const stickyCallbacksRef = useRef({
    onTextChange: (_id: string, _text: string) => {},
    onDelete: (_id: string) => {},
    onColorChange: (_id: string, _color: StickyColor) => {},
  })

  const buildStickyNodes = useCallback((
    stickies: MindmapSticky[],
    getPos: (id: string, fallback: { x: number; y: number }) => { x: number; y: number }
  ) => {
    return stickies.map((s, i) => ({
      id: `sticky-${s.id}`,
      type: 'mindmapSticky' as const,
      position: getPos(`sticky-${s.id}`, { x: 50 + i * 160, y: -200 }),
      data: {
        stickyId: s.id,
        text: s.text,
        color: s.color,
        onTextChange: (id: string, text: string) => stickyCallbacksRef.current.onTextChange(id, text),
        onDelete: (id: string) => stickyCallbacksRef.current.onDelete(id),
        onColorChange: (id: string, color: StickyColor) => stickyCallbacksRef.current.onColorChange(id, color),
      },
    }))
  }, [])

  const initialNodes = useMemo(() => {
    const nodes: Node<MindmapClientNodeData | GroupNodeData | MindmapStickyNodeData>[] = []
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

    if (relationships.length > 0) {
      nodes.push({
        id: 'group-relationships',
        type: 'mindmapGroup',
        position: getPos('group-relationships', DEFAULT_POSITIONS['group-relationships']),
        data: {
          entityType: 'relationship' as const,
          title: `${relationships.length} Relationship${relationships.length === 1 ? '' : 's'}`,
          items: relationships.map((r) => ({
            label: r.relatedClientName,
            subtitle: RELATION_LABELS[r.relationType] ?? r.relationType,
            navigateTo: `/app/clients/${r.relatedClientId}`,
          })),
        },
      })
    }

    // Add sticky notes
    nodes.push(...buildStickyNodes(stickiesRef.current, getPos))

    return nodes
  }, [clientId, clientName, profilePictureUrl, deals, notes, tasks, relationships, buildStickyNodes])

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

  const persistStickies = useCallback((stickies: MindmapSticky[]) => {
    stickiesRef.current = stickies
    const newData = { ...(clientDataRef.current ?? {}), mindmapStickies: stickies }
    clientDataRef.current = newData
    supabase.from('clients').update({ data: newData }).eq('id', clientId).then()
  }, [clientId])

  const handleStickyTextChange = useCallback((id: string, text: string) => {
    const updated = stickiesRef.current.map(s => s.id === id ? { ...s, text } : s)
    persistStickies(updated)
    setNodes(curr => curr.map(n =>
      n.id === `sticky-${id}` ? { ...n, data: { ...n.data, text } } : n
    ))
  }, [persistStickies, setNodes])

  const handleDeleteSticky = useCallback((id: string) => {
    const updated = stickiesRef.current.filter(s => s.id !== id)
    persistStickies(updated)
    setNodes(curr => curr.filter(n => n.id !== `sticky-${id}`))
  }, [persistStickies, setNodes])

  const handleStickyColorChange = useCallback((id: string, color: StickyColor) => {
    const updated = stickiesRef.current.map(s => s.id === id ? { ...s, color } : s)
    persistStickies(updated)
    setNodes(curr => curr.map(n =>
      n.id === `sticky-${id}` ? { ...n, data: { ...n.data, color } } : n
    ))
  }, [persistStickies, setNodes])

  const handleAddSticky = useCallback(() => {
    const newSticky: MindmapSticky = {
      id: crypto.randomUUID(),
      text: '',
      color: 'yellow',
      createdAt: new Date().toISOString(),
    }
    const updated = [...stickiesRef.current, newSticky]
    persistStickies(updated)
    setNodes(curr => [
      ...curr,
      {
        id: `sticky-${newSticky.id}`,
        type: 'mindmapSticky' as const,
        position: { x: 50 + Math.random() * 100, y: -200 + Math.random() * 80 },
        data: {
          stickyId: newSticky.id,
          text: newSticky.text,
          color: newSticky.color,
          onTextChange: handleStickyTextChange,
          onDelete: handleDeleteSticky,
          onColorChange: handleStickyColorChange,
        },
      },
    ])
  }, [persistStickies, setNodes, handleStickyTextChange, handleDeleteSticky, handleStickyColorChange])

  // Keep callback refs up to date for sticky nodes
  stickyCallbacksRef.current = {
    onTextChange: handleStickyTextChange,
    onDelete: handleDeleteSticky,
    onColorChange: handleStickyColorChange,
  }

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<MindmapClientNodeData | GroupNodeData | MindmapStickyNodeData>>[]) => {
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
      const newData = {
        ...(clientDataRef.current ?? {}),
        mindmapPositions: positions,
        mindmapStickies: stickiesRef.current,
      }
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

  return (
    <div className="relative rounded-xl border border-border overflow-hidden bg-background h-[480px]">
      {/* Add sticky note button */}
      <button
        onClick={handleAddSticky}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5
          rounded-lg bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700
          text-xs font-medium text-yellow-800 dark:text-yellow-200
          hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors shadow-sm"
        title="Add sticky note"
      >
        <StickyNote size={14} />
        <span>Sticky</span>
      </button>
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
