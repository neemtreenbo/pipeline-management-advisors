import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
    fetchServiceRequests, fetchServiceRequestsByClient, fetchServiceRequestById,
    createServiceRequest, updateServiceRequest, deleteServiceRequest,
    logServiceRequestActivity, fetchServiceRequestAttachments,
    fetchServiceRequestActivities,
} from '@/lib/service-requests'
import type { NewServiceRequestInput, ServiceRequestStatus, ServiceRequestType } from '@/lib/service-requests'

export function useServiceRequests(
    orgId: string | undefined,
    filters?: { status?: ServiceRequestStatus; request_type?: ServiceRequestType; assigned_to?: string }
) {
    return useQuery({
        queryKey: [...queryKeys.serviceRequests.all(orgId!), filters],
        queryFn: () => fetchServiceRequests(orgId!, filters),
        enabled: !!orgId,
    })
}

export function useServiceRequestsByClient(clientId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.serviceRequests.byClient(clientId!),
        queryFn: () => fetchServiceRequestsByClient(clientId!),
        enabled: !!clientId,
    })
}

export function useServiceRequest(id: string | undefined) {
    return useQuery({
        queryKey: queryKeys.serviceRequests.detail(id!),
        queryFn: () => fetchServiceRequestById(id!),
        enabled: !!id,
    })
}

export function useServiceRequestActivities(serviceRequestId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.serviceRequests.activities(serviceRequestId!),
        queryFn: () => fetchServiceRequestActivities(serviceRequestId!),
        enabled: !!serviceRequestId,
    })
}

export function useServiceRequestAttachments(serviceRequestId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.serviceRequests.attachments(serviceRequestId!),
        queryFn: () => fetchServiceRequestAttachments(serviceRequestId!),
        enabled: !!serviceRequestId,
    })
}

export function useCreateServiceRequest(orgId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: NewServiceRequestInput) => createServiceRequest(input),
        onSuccess: async (data, variables) => {
            await logServiceRequestActivity(orgId, variables.owner_id, data.id, 'service_request_created', {
                request_type: data.request_type,
                title: data.title,
            })
            qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.all(orgId) })
            if (variables.client_id) {
                qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.byClient(variables.client_id) })
            }
        },
    })
}

export function useUpdateServiceRequest(orgId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (args: { id: string; updates: Parameters<typeof updateServiceRequest>[1] }) =>
            updateServiceRequest(args.id, args.updates),
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.detail(variables.id) })
            qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.all(orgId) })
        },
    })
}

export function useDeleteServiceRequest(orgId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteServiceRequest(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.all(orgId) })
        },
    })
}
