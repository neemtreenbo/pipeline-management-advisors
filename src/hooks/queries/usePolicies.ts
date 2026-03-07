import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
    fetchPolicies, fetchPoliciesByClient, fetchPolicyById,
    createPolicy, updatePolicy, deletePolicy, logPolicyActivity,
} from '@/lib/policies'
import type { NewPolicyInput } from '@/lib/policies'

export function usePolicies(orgId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.policies.all(orgId!),
        queryFn: () => fetchPolicies(orgId!),
        enabled: !!orgId,
    })
}

export function usePoliciesByClient(clientId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.policies.byClient(clientId!),
        queryFn: () => fetchPoliciesByClient(clientId!),
        enabled: !!clientId,
    })
}

export function usePolicy(policyId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.policies.detail(policyId!),
        queryFn: () => fetchPolicyById(policyId!),
        enabled: !!policyId,
    })
}

export function useCreatePolicy(orgId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: NewPolicyInput) => createPolicy(input),
        onSuccess: async (data, variables) => {
            await logPolicyActivity(orgId, variables.owner_id, data.id, 'policy_created', {
                policy_number: data.policy_number,
                product: data.product,
            })
            qc.invalidateQueries({ queryKey: queryKeys.policies.all(orgId) })
            if (variables.client_id) {
                qc.invalidateQueries({ queryKey: queryKeys.policies.byClient(variables.client_id) })
            }
        },
    })
}

export function useUpdatePolicy(orgId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (args: { policyId: string; updates: Parameters<typeof updatePolicy>[1] }) =>
            updatePolicy(args.policyId, args.updates),
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: queryKeys.policies.detail(variables.policyId) })
            qc.invalidateQueries({ queryKey: queryKeys.policies.all(orgId) })
        },
    })
}

export function useDeletePolicy(orgId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (policyId: string) => deletePolicy(policyId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.policies.all(orgId) })
        },
    })
}
