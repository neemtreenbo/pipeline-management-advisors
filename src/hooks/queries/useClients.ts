import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

export interface ClientListItem {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string | null
  tags: string[] | null
  job_title: string | null
  occupation: string | null
  profile_picture_url: string | null
  company_name: string | null
  company_industry: string | null
  company_website: string | null
  linkedin_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  owner_id: string
  org_id: string
  created_at: string
  updated_at: string
  experiences: string | null
  education: string | null
  updates: string | null
  ai_summary: string | null
  talking_points: any
  data: Record<string, unknown> | null
}

export function useClients(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.list(orgId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('org_id', orgId!)
        .order('name')
      if (error) throw error
      return (data ?? []) as ClientListItem[]
    },
    enabled: !!orgId,
  })
}

export function useClientDetail(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.detail(clientId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId!)
        .single()
      if (error) throw error
      return data as ClientListItem
    },
    enabled: !!clientId,
  })
}

export function useCreateClient(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; owner_id: string; email?: string; phone?: string; source?: string; tags?: string[] }) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({ org_id: orgId, ...input })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.list(orgId) })
    },
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase.from('clients').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.id) })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
