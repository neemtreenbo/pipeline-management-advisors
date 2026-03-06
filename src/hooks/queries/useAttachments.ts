import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { fetchAttachmentsByDeal, uploadDealAttachment, deleteAttachment } from '@/lib/attachments'
import type { FileType } from '@/lib/attachments'

export function useDealAttachments(dealId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.attachments.byDeal(dealId!),
    queryFn: () => fetchAttachmentsByDeal(dealId!),
    enabled: !!dealId,
  })
}

export function useUploadAttachment(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { orgId: string; uploadedBy: string; file: File; fileType?: FileType }) =>
      uploadDealAttachment(dealId, args.orgId, args.uploadedBy, args.file, args.fileType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.attachments.byDeal(dealId) })
      qc.invalidateQueries({ queryKey: ['deals', 'attachmentCounts'] })
    },
  })
}

export function useDeleteAttachment(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; storagePath: string }) =>
      deleteAttachment(args.id, args.storagePath),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.attachments.byDeal(dealId) })
      qc.invalidateQueries({ queryKey: ['deals', 'attachmentCounts'] })
    },
  })
}
