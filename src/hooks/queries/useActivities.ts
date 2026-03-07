import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { fetchOrgActivities, fetchOrgMembers, fetchClientActivities } from '@/lib/activities'

export function useOrgActivities(
    orgId: string | undefined,
    filters?: { actorId?: string; entityType?: string }
) {
    return useQuery({
        queryKey: [...queryKeys.activities.orgFeed(orgId!), filters?.actorId, filters?.entityType],
        queryFn: () => fetchOrgActivities(orgId!, {
            limit: 50,
            actorId: filters?.actorId,
            entityType: filters?.entityType,
        }),
        enabled: !!orgId,
        refetchInterval: 30_000,
    })
}

export function useClientActivities(clientId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.activities.byEntity('client', clientId!),
        queryFn: () => fetchClientActivities(clientId!),
        enabled: !!clientId,
    })
}

export function useOrgMembers(orgId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.activities.orgMembers(orgId!),
        queryFn: () => fetchOrgMembers(orgId!),
        enabled: !!orgId,
        staleTime: 5 * 60_000,
    })
}
