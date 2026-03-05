import { supabase } from './supabase'
import type { Tables, TablesInsert, TablesUpdate } from './database.types'

export type Task = Tables<'tasks'>
export type TaskInsert = TablesInsert<'tasks'>
export type TaskUpdate = TablesUpdate<'tasks'>

export interface GetTasksOptions {
    orgId: string
    view?: 'today' | 'upcoming' | 'overdue' | 'all'
    clientId?: string
    dealId?: string
    status?: string
}

export async function getTasks(options: GetTasksOptions) {
    let query = supabase
        .from('tasks')
        .select('*')
        .eq('org_id', options.orgId)
        .order('due_at', { ascending: true, nullsFirst: false })

    if (options.status) {
        query = query.eq('status', options.status)
    }

    if (options.view) {
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

        switch (options.view) {
            case 'today':
                query = query.gte('due_at', startOfToday).lte('due_at', endOfToday)
                break
            case 'upcoming':
                query = query.gt('due_at', endOfToday)
                break
            case 'overdue':
                query = query.lt('due_at', startOfToday).neq('status', 'completed')
                break
            case 'all':
            default:
                break
        }
    }

    // Need to handle client/deal filtering through links if needed, 
    // but the schema doesn't have client_id in tasks. 
    // Tasks are linked to clients/deals via the `links` table.
    // For now, if we need to filter by clientId, we might have to fetch links first, or do a join.
    // We can use an inner join with links table using PostgREST syntax if needed.
    // Let's implement that.
    if (options.clientId) {
        // Find tasks linked to this client
        // Since we can't easily do a subquery in supabase JS for dynamic entities compactly,
        // we can fetch the link IDs first, or use a crafted query:
        // supabase.from('tasks').select('*, links!inner(from_id)').eq('links.to_id', clientId)
        // Wait, the links table structure: from_id, from_type, to_id, to_type.
        // Task to Client link: from_type = 'task', from_id = task.id, to_type = 'client', to_id = clientId.
        // Actually, without explicit foreign keys between links and tasks, Supabase JS inner join won't work easily.
        // Let's fetch the task IDs from links.
        const { data: linkData, error: linkError } = await supabase
            .from('links')
            .select('from_id')
            .eq('from_type', 'task')
            .eq('to_type', 'client')
            .eq('to_id', options.clientId)

        if (linkError) throw linkError
        const taskIds: string[] = linkData.map((l: { from_id: string }) => l.from_id)

        if (taskIds.length === 0) {
            // No tasks for this client
            return []
        }
        query = query.in('id', taskIds)
    }

    if (options.dealId) {
        const { data: linkData, error: linkError } = await supabase
            .from('links')
            .select('from_id')
            .eq('from_type', 'task')
            .eq('to_type', 'deal')
            .eq('to_id', options.dealId)

        if (linkError) throw linkError
        const taskIds: string[] = linkData.map((l: { from_id: string }) => l.from_id)

        if (taskIds.length === 0) {
            return []
        }
        query = query.in('id', taskIds)
    }

    const { data, error } = await query

    if (error) throw error
    return data as Task[]
}

export async function createTask(
    taskData: TaskInsert,
    links?: { toId: string, toType: string }[]
) {
    const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

    if (error) throw error

    // Create links if any
    if (links && links.length > 0 && taskData.org_id && data) {
        const linkInserts = links.map(link => ({
            org_id: taskData.org_id!,
            from_type: 'task',
            from_id: data.id,
            to_type: link.toType,
            to_id: link.toId,
            created_by: taskData.owner_id
        }))

        const { error: linkError } = await supabase
            .from('links')
            .insert(linkInserts)

        if (linkError) {
            console.error('Failed to create task links:', linkError)
        }
    }

    if (taskData.org_id && data) {
        await supabase.from('activities').insert({
            org_id: taskData.org_id,
            actor_id: taskData.owner_id,
            entity_type: 'task',
            entity_id: data.id,
            event_type: 'task_created',
            data: { title: data.title },
        })
    }

    return data as Task
}

export async function updateTask(id: string, updates: TaskUpdate) {
    if (updates.status === 'completed' && !updates.completed_at) {
        updates.completed_at = new Date().toISOString()
    } else if (updates.status && updates.status !== 'completed') {
        updates.completed_at = null
    }

    const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error

    // Log complete/uncomplete activities
    if (updates.status && data) {
        const { data: userData } = await supabase.auth.getUser()
        const actorId = userData.user?.id

        if (actorId && data.org_id) {
            if (updates.status === 'completed') {
                await supabase.from('activities').insert({
                    org_id: data.org_id,
                    actor_id: actorId,
                    entity_type: 'task',
                    entity_id: data.id,
                    event_type: 'task_completed',
                    data: { title: data.title },
                })
            } else if (updates.status === 'todo') {
                // For when a task is uncompleted after being completed
                await supabase.from('activities').insert({
                    org_id: data.org_id,
                    actor_id: actorId,
                    entity_type: 'task',
                    entity_id: data.id,
                    event_type: 'task_uncompleted',
                    data: { title: data.title },
                })
            }
        }
    }

    return data as Task
}

export async function deleteTask(id: string) {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

    if (error) throw error
    return true
}

export async function setTaskClientLink(taskId: string, orgId: string, clientId: string | null, createdBy: string): Promise<void> {
    await supabase
        .from('links')
        .delete()
        .eq('from_type', 'task')
        .eq('from_id', taskId)
        .eq('to_type', 'client')

    if (clientId) {
        const { error } = await supabase
            .from('links')
            .insert({ org_id: orgId, from_type: 'task', from_id: taskId, to_type: 'client', to_id: clientId, created_by: createdBy })
        if (error) throw error
    }
}

export async function getTaskLinks(taskId: string) {
    const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('from_type', 'task')
        .eq('from_id', taskId)

    if (error) throw error
    return data
}

export type TaskClientInfo = {
    taskId: string
    clientId: string
    clientName: string
    profilePictureUrl: string | null
}

export async function getClientsForTasks(taskIds: string[]): Promise<TaskClientInfo[]> {
    if (!taskIds.length) return []

    // Fetch direct client links and deal links
    const { data: links } = await supabase
        .from('links')
        .select('from_id, to_id, to_type')
        .eq('from_type', 'task')
        .in('from_id', taskIds)
        .in('to_type', ['client', 'deal'])

    if (!links || links.length === 0) return []

    const clientLinks = links.filter(l => l.to_type === 'client')
    const dealLinks = links.filter(l => l.to_type === 'deal')

    const clientIdsToFetch = new Set<string>()
    const taskToClientMap = new Map<string, string>() // taskId -> clientId
    const dealIds = dealLinks.map(d => d.to_id)

    // Map direct clients
    for (const l of clientLinks) {
        clientIdsToFetch.add(l.to_id)
        if (!taskToClientMap.has(l.from_id)) {
            taskToClientMap.set(l.from_id, l.to_id)
        }
    }

    // Map deal clients
    if (dealIds.length > 0) {
        const { data: deals } = await supabase
            .from('deals')
            .select('id, client_id')
            .in('id', dealIds)

        if (deals) {
            const dealClientMap = new Map(deals.map(d => [d.id, d.client_id]))
            for (const l of dealLinks) {
                const clientId = dealClientMap.get(l.to_id)
                if (clientId) {
                    clientIdsToFetch.add(clientId)
                    if (!taskToClientMap.has(l.from_id)) {
                        taskToClientMap.set(l.from_id, clientId)
                    }
                }
            }
        }
    }

    if (clientIdsToFetch.size === 0) return []

    const { data: clients } = await supabase
        .from('clients')
        .select('id, name, profile_picture_url')
        .in('id', Array.from(clientIdsToFetch))

    if (!clients) return []

    const clientMap = new Map(clients.map(c => [c.id, c]))

    const results: TaskClientInfo[] = []
    for (const [taskId, clientId] of taskToClientMap.entries()) {
        const client = clientMap.get(clientId)
        if (client) {
            results.push({
                taskId,
                clientId,
                clientName: client.name,
                profilePictureUrl: client.profile_picture_url ?? null,
            })
        }
    }

    return results
}
