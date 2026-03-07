import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { fetchComments, fetchOrgMembers } from '@/lib/comments'

export function useComments(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.comments.byEntity(entityType, entityId!),
    queryFn: () => fetchComments(entityType, entityId!),
    enabled: !!entityId,
  })
}

export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.members.byOrg(orgId!),
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // members don't change often
  })
}
