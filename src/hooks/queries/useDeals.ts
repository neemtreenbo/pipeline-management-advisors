import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
  fetchDealsByOrg, fetchDealById, createDeal, updateDeal,
  updateDealStage, fetchDealActivities,
  fetchDealsByClient, fetchDealStageHistories,
} from '@/lib/deals'
import { fetchAttachmentCountsByDeals } from '@/lib/attachments'
import type { NewDealInput, DealStage } from '@/lib/deals'

export function useDeals(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.deals.all(orgId!),
    queryFn: () => fetchDealsByOrg(orgId!),
    enabled: !!orgId,
  })
}

export function useDeal(dealId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.deals.detail(dealId!),
    queryFn: () => fetchDealById(dealId!),
    enabled: !!dealId,
  })
}

export function useDealsByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.deals.byClient(clientId!),
    queryFn: () => fetchDealsByClient(clientId!),
    enabled: !!clientId,
  })
}

export function useDealAttachmentCounts(orgId: string | undefined, dealIds: string[]) {
  return useQuery({
    queryKey: queryKeys.deals.attachmentCounts(orgId!),
    queryFn: () => fetchAttachmentCountsByDeals(dealIds),
    enabled: !!orgId && dealIds.length > 0,
  })
}

export function useDealStageHistories(orgId: string | undefined, dealIds: string[]) {
  return useQuery({
    queryKey: queryKeys.deals.stageHistories(orgId!),
    queryFn: () => fetchDealStageHistories(dealIds),
    enabled: !!orgId && dealIds.length > 0,
  })
}

export function useDealActivities(dealId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.deals.activities(dealId!),
    queryFn: () => fetchDealActivities(dealId!),
    enabled: !!dealId,
  })
}

export function useCreateDeal(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewDealInput) => createDeal(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all(orgId) })
      if (variables.client_id) {
        qc.invalidateQueries({ queryKey: queryKeys.deals.byClient(variables.client_id) })
      }
    },
  })
}

export function useUpdateDeal(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { dealId: string; updates: Parameters<typeof updateDeal>[1] }) =>
      updateDeal(args.dealId, args.updates),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(variables.dealId) })
      qc.invalidateQueries({ queryKey: queryKeys.deals.all(orgId) })
    },
  })
}

export function useUpdateDealStage(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { dealId: string; stage: DealStage; orderIndex?: number }) =>
      updateDealStage(args.dealId, args.stage, args.orderIndex),
    onError: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all(orgId) })
    },
  })
}
