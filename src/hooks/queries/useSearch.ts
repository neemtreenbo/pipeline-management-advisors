import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'

interface GlobalSearchResult {
  id: string
  type: 'client' | 'deal' | 'task' | 'note'
  title: string
  subtitle?: string
}

export function useGlobalSearch(orgId: string | undefined, query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: queryKeys.search.global(orgId!, trimmed),
    queryFn: async (): Promise<GlobalSearchResult[]> => {
      const term = `%${trimmed}%`
      const [clientsRes, dealsRes, tasksRes, notesRes] = await Promise.all([
        supabase.from('clients').select('id, name, job_title').eq('org_id', orgId!).ilike('name', term).limit(3),
        supabase.from('deals').select('id, data, stage, client:clients(name)').eq('org_id', orgId!).limit(20),
        supabase.from('tasks').select('id, title, status').eq('org_id', orgId!).ilike('title', term).limit(3),
        supabase.from('notes').select('id, title').eq('org_id', orgId!).ilike('title', term).limit(3),
      ])

      const results: GlobalSearchResult[] = []

      if (clientsRes.data) {
        for (const c of clientsRes.data) {
          results.push({ id: c.id, type: 'client', title: c.name, subtitle: c.job_title || undefined })
        }
      }

      if (dealsRes.data) {
        const q = trimmed.toLowerCase()
        dealsRes.data
          .filter(d => ((d.data as Record<string, unknown>)?.title as string || '').toLowerCase().includes(q))
          .slice(0, 3)
          .forEach(d => {
            const client = d.client as unknown as { name: string } | null
            results.push({
              id: d.id,
              type: 'deal',
              title: ((d.data as Record<string, unknown>)?.title as string) || 'Untitled Deal',
              subtitle: client?.name || d.stage,
            })
          })
      }

      if (tasksRes.data) {
        for (const t of tasksRes.data) {
          results.push({ id: t.id, type: 'task', title: t.title, subtitle: t.status })
        }
      }

      if (notesRes.data) {
        for (const n of notesRes.data) {
          results.push({ id: n.id, type: 'note', title: n.title || 'Untitled Note' })
        }
      }

      return results
    },
    enabled: !!orgId && trimmed.length >= 2,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60,
  })
}
