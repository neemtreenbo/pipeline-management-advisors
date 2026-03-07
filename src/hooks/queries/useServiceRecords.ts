import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
    fetchServiceRecordsByOrg,
    fetchServiceRecordsByClient,
    createServiceRecord,
    updateServiceRecord,
    completeServiceRecord,
    deleteServiceRecord,
    type ServiceRecordInsert,
    type ServiceRecord,
} from '@/lib/serviceRecords'

export function useServiceRecordsByClient(clientId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.serviceRecords.byClient(clientId!),
        queryFn: () => fetchServiceRecordsByClient(clientId!),
        enabled: !!clientId,
    })
}

export function useServiceRecordsByOrg(
    orgId: string | undefined,
    filters?: { status?: string; assigneeId?: string }
) {
    return useQuery({
        queryKey: [...queryKeys.serviceRecords.all(orgId!), filters?.status, filters?.assigneeId],
        queryFn: () => fetchServiceRecordsByOrg(orgId!, filters),
        enabled: !!orgId,
    })
}

export function useCreateServiceRecord(orgId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: ServiceRecordInsert) => createServiceRecord(input),
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: queryKeys.serviceRecords.all(orgId) })
            qc.invalidateQueries({ queryKey: queryKeys.serviceRecords.byClient(variables.client_id) })
        },
    })
}

export function useUpdateServiceRecord(orgId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: {
            id: string
            updates: Partial<Pick<ServiceRecord, 'title' | 'description' | 'due_date' | 'type' | 'status' | 'assignee_id' | 'deal_id'>>
            actorId?: string
        }) => updateServiceRecord(input.id, input.updates, input.actorId, orgId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['serviceRecords'] })
        },
    })
}

export function useCompleteServiceRecord(orgId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: { id: string; actorId: string }) =>
            completeServiceRecord(input.id, input.actorId, orgId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['serviceRecords'] })
        },
    })
}

export function useDeleteServiceRecord() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteServiceRecord(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['serviceRecords'] })
        },
    })
}
