import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
  getNotesByOrgPaginated, getNoteById, createNote, updateNote,
  deleteNote, getNotesLinkedToEntity, getClientsForNotes,
  linkNoteToEntity, unlinkNoteFromEntity,
} from '@/lib/notes'
import type { Note } from '@/lib/notes'

export function useNotesPaginated(orgId: string | undefined, pageSize = 24) {
  return useInfiniteQuery({
    queryKey: queryKeys.notes.paginated(orgId!),
    queryFn: ({ pageParam }) => getNotesByOrgPaginated(orgId!, pageSize, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!orgId,
  })
}

export function useNote(noteId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notes.detail(noteId!),
    queryFn: () => getNoteById(noteId!),
    enabled: !!noteId,
  })
}

export function useEntityNotes(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notes.byEntity(entityType, entityId!),
    queryFn: () => getNotesLinkedToEntity(entityType, entityId!),
    enabled: !!entityId,
  })
}

export function useNoteClientInfo(noteIds: string[]) {
  return useQuery({
    queryKey: queryKeys.notes.clientInfo(noteIds),
    queryFn: () => getClientsForNotes(noteIds),
    enabled: noteIds.length > 0,
  })
}

export function useCreateNote(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { authorId: string; title?: string | null; content?: unknown; data?: Record<string, unknown> }) =>
      createNote(orgId, args.authorId, args.title ?? null, args.content ?? null, args.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all(orgId) })
    },
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; updates: Partial<Pick<Note, 'title' | 'content' | 'data'>> }) =>
      updateNote(args.id, args.updates),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.detail(variables.id) })
    },
  })
}

export function useDeleteNote(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all(orgId) })
    },
  })
}

export function useLinkNote(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { noteId: string; entityType: string; entityId: string; userId: string; relationType?: string | null }) =>
      linkNoteToEntity(args.noteId, args.entityType, args.entityId, orgId, args.userId, args.relationType),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.byEntity(variables.entityType, variables.entityId) })
    },
  })
}

export function useUnlinkNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { noteId: string; entityType: string; entityId: string }) =>
      unlinkNoteFromEntity(args.noteId, args.entityType, args.entityId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.byEntity(variables.entityType, variables.entityId) })
    },
  })
}
