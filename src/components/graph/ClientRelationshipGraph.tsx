import { useMemo, useCallback, useRef, useEffect } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { useQueryClient } from '@tanstack/react-query'
import { useDealsByClient } from '@/hooks/queries/useDeals'
import { useEntityTasks } from '@/hooks/queries/useTasks'
import { useEntityNotes } from '@/hooks/queries/useNotes'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import RelationshipGraph from './RelationshipGraph'
import type { ClientNodeData } from '@/hooks/useGraphData'
import type { GroupNodeData } from './GroupNode'
import type { NetworkPositions } from '@/lib/clientRelationships'

const NODE_W = 160
const NODE_H = 48
const GROUP_W = 200
const SPACING_X = 280

// Default positions when no saved positions exist
const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  'group-deals': { x: SPACING_X, y: -NODE_H / 2 },
  'group-tasks': { x: -SPACING_X - GROUP_W, y: -NODE_H / 2 },
  'group-notes': { x: -GROUP_W / 2, y: NODE_H / 2 + 100 },
}

interface ClientRelationshipGraphProps {
  clientId: string
  clientName: string
  profilePictureUrl: string | null
  orgId: string
  clientData: Record<string, unknown> | null
}

export default function ClientRelationshipGraph({ clientId, clientName, profilePictureUrl, orgId, clientData }: ClientRelationshipGraphProps) {
  const qc = useQueryClient()
  const { data: deals = [], isLoading: dealsLoading } = useDealsByClient(clientId)
  const { data: tasks = [], isLoading: tasksLoading } = useEntityTasks(orgId, 'client', clientId)
  const { data: notes = [], isLoading: notesLoading } = useEntityNotes('client', clientId)
  const clientDataRef = useRef(clientData)

  const isLoading = dealsLoading || tasksLoading || notesLoading

  // Capture initial saved positions once — don't react to subsequent saves
  const initialPositionsRef = useRef<Record<string, { x: number; y: number }> | null>(
    (clientData?.mindmapPositions ?? null) as Record<string, { x: number; y: number }> | null
  )

  // Keep clientData ref current for save callbacks
  clientDataRef.current = clientData

  const { nodes, savedPositions } = useMemo(() => {
    const nodes: Node<ClientNodeData | GroupNodeData>[] = []
    const initPos = initialPositionsRef.current

    const getPos = (nodeId: string, defaultPos: { x: number; y: number }) =>
      initPos?.[nodeId] ?? defaultPos

    // Center: the client
    nodes.push({
      id: clientId,
      type: 'clientNode',
      position: getPos(clientId, { x: -NODE_W / 2, y: -NODE_H / 2 }),
      data: {
        clientId,
        name: clientName,
        profilePictureUrl,
        isFocused: true,
        connectionCount: 0,
      },
    })

    // Deals group — right
    if (deals.length > 0) {
      nodes.push({
        id: 'group-deals',
        type: 'groupNode',
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

    // Tasks group — left
    const uncompletedTasks = tasks.filter((t) => t.status !== 'completed')
    if (uncompletedTasks.length > 0) {
      nodes.push({
        id: 'group-tasks',
        type: 'groupNode',
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

    // Notes group — below
    if (notes.length > 0) {
      nodes.push({
        id: 'group-notes',
        type: 'groupNode',
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

    const savedPositions: Record<string, { x: number; y: number }> = {}
    for (const n of nodes) savedPositions[n.id] = n.position

    return { nodes, savedPositions }
  }, [clientId, clientName, profilePictureUrl, deals, notes, tasks])

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePositionsChange = useCallback(
    (positions: NetworkPositions) => {
      initialPositionsRef.current = positions
      // Debounce DB save — fire-and-forget, no cache update, no re-renders
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const newData = { ...(clientDataRef.current ?? {}), mindmapPositions: positions }
        clientDataRef.current = newData
        supabase.from('clients').update({ data: newData }).eq('id', clientId).then()
      }, 2000)
    },
    [clientId]
  )

  // On unmount: flush pending DB save + update cache so tab switches show correct positions
  useEffect(() => {
    const idRef = { clientId }
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      const positions = initialPositionsRef.current
      if (!positions) return
      const newData = { ...(clientDataRef.current ?? {}), mindmapPositions: positions }
      qc.setQueryData(queryKeys.clients.detail(idRef.clientId), (old: Record<string, unknown> | undefined) =>
        old ? { ...old, data: newData } : old
      )
      supabase.from('clients').update({ data: newData }).eq('id', clientId).then()
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

  if (nodes.length <= 1) {
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
    <RelationshipGraph
      nodes={nodes}
      edges={[] as Edge[]}
      savedPositions={savedPositions}
      onPositionsChange={handlePositionsChange}
      className="h-[480px]"
    />
  )
}
