import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import {
  fetchClientRelationships,
  fetchAllClientRelationships,
  addClientRelationship,
  removeClientRelationship,
  fetchNetworkLayout,
  saveNetworkPositions,
  savePinnedClientIds,
  deleteNetworkPositions,
  type ClientRelationType,
  type NetworkPositions,
} from '@/lib/clientRelationships'

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
  birthday: string | null
}

export function useClients(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.list(orgId!),
    queryFn: async () => {
      const PAGE_SIZE = 1000
      let allData: ClientListItem[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('org_id', orgId!)
          .order('name')
          .range(from, from + PAGE_SIZE - 1)
        if (error) throw error
        allData = allData.concat((data ?? []) as ClientListItem[])
        if (!data || data.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }
      return allData
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

export function useClientRelationships(clientId: string | undefined, orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.relationships(clientId!),
    queryFn: () => fetchClientRelationships(clientId!, orgId!),
    enabled: !!clientId && !!orgId,
  })
}

export function useAddClientRelationship(clientId: string, orgId: string, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { toClientId: string; relationType: ClientRelationType }) =>
      addClientRelationship(orgId, clientId, input.toClientId, input.relationType, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.relationships(clientId) })
    },
  })
}

export function useRemoveClientRelationship(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) => removeClientRelationship(linkId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.relationships(clientId) })
    },
  })
}

export function useNetworkLayout(orgId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.networkPositions(orgId!, userId!),
    queryFn: () => fetchNetworkLayout(orgId!, userId!),
    enabled: !!orgId && !!userId,
    staleTime: Infinity,
  })
}

export function useSaveNetworkPositions(orgId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (positions: NetworkPositions) =>
      saveNetworkPositions(orgId!, userId!, positions),
    onSuccess: () => {
      if (orgId && userId) {
        qc.invalidateQueries({ queryKey: queryKeys.clients.networkPositions(orgId, userId) })
      }
    },
  })
}

export function useSavePinnedClients(orgId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pinnedClientIds: string[]) =>
      savePinnedClientIds(orgId!, userId!, pinnedClientIds),
    onSuccess: () => {
      if (orgId && userId) {
        qc.invalidateQueries({ queryKey: queryKeys.clients.networkPositions(orgId, userId) })
      }
    },
  })
}

export function useResetNetworkPositions(orgId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteNetworkPositions(orgId!, userId!),
    onSuccess: () => {
      if (orgId && userId) {
        qc.invalidateQueries({ queryKey: queryKeys.clients.networkPositions(orgId, userId) })
      }
    },
  })
}

export function useOrgClientNetwork(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.network(orgId!),
    queryFn: () => fetchAllClientRelationships(orgId!),
    enabled: !!orgId,
    staleTime: 60_000,
  })
}
