import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { getTasks, createTask, updateTask, deleteTask, setTaskClientLink, getClientsForTasks } from '@/lib/tasks'
import type { GetTasksOptions, TaskInsert, TaskUpdate } from '@/lib/tasks'

export function useTasks(options: GetTasksOptions) {
  return useQuery({
    queryKey: queryKeys.tasks.filtered(options.orgId, options.view ?? 'all'),
    queryFn: () => getTasks(options),
    enabled: !!options.orgId,
  })
}

export function useEntityTasks(orgId: string, entityType: 'client' | 'deal', entityId: string | undefined) {
  const options: GetTasksOptions = {
    orgId,
    view: 'all',
    ...(entityType === 'client' ? { clientId: entityId } : { dealId: entityId }),
  }
  return useQuery({
    queryKey: queryKeys.tasks.byEntity(entityType, entityId!),
    queryFn: () => getTasks(options),
    enabled: !!entityId && !!orgId,
  })
}

export function useTaskClientInfo(taskIds: string[]) {
  return useQuery({
    queryKey: queryKeys.tasks.clientInfo(taskIds),
    queryFn: () => getClientsForTasks(taskIds),
    enabled: taskIds.length > 0,
  })
}

export function useCreateTask(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { data: TaskInsert; links?: { toId: string; toType: string }[] }) =>
      createTask(args.data, args.links),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all(orgId) })
    },
  })
}

export function useUpdateTask(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; updates: TaskUpdate }) => updateTask(args.id, args.updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all(orgId) })
    },
  })
}

export function useDeleteTask(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all(orgId) })
    },
  })
}

export function useSetTaskClientLink(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { taskId: string; clientId: string | null; createdBy: string }) =>
      setTaskClientLink(args.taskId, orgId, args.clientId, args.createdBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all(orgId) })
    },
  })
}
