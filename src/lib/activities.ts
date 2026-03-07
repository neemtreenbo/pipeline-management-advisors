import { supabase } from './supabase'

export interface ActivityWithActor {
    id: string
    org_id: string
    actor_id: string
    entity_type: string
    entity_id: string
    event_type: string
    data: Record<string, unknown>
    created_at: string
    actor?: { full_name: string; avatar_url: string | null }
}

/** Generic activity logger */
export async function logActivity(params: {
    orgId: string
    actorId: string
    entityType: string
    entityId: string
    eventType: string
    data?: Record<string, unknown>
}): Promise<void> {
    await supabase.from('activities').insert({
        org_id: params.orgId,
        actor_id: params.actorId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        event_type: params.eventType,
        data: params.data ?? {},
    })
}

/** Fetch org-wide activities with actor profiles */
export async function fetchOrgActivities(
    orgId: string,
    options?: {
        limit?: number
        offset?: number
        actorId?: string
        entityType?: string
    }
): Promise<ActivityWithActor[]> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    let query = supabase
        .from('activities')
        .select('*, actor:profiles!actor_id(full_name, avatar_url)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (options?.actorId) {
        query = query.eq('actor_id', options.actorId)
    }
    if (options?.entityType) {
        query = query.eq('entity_type', options.entityType)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as ActivityWithActor[]
}

/** Fetch activities for a specific entity with actor profiles */
export async function fetchEntityActivities(
    entityType: string,
    entityId: string
): Promise<ActivityWithActor[]> {
    const { data, error } = await supabase
        .from('activities')
        .select('*, actor:profiles!actor_id(full_name, avatar_url)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as ActivityWithActor[]
}

/** Fetch activities for a client (including activities on related deals, tasks, notes) */
export async function fetchClientActivities(clientId: string): Promise<ActivityWithActor[]> {
    // Get deal IDs for this client
    const { data: deals } = await supabase
        .from('deals')
        .select('id')
        .eq('client_id', clientId)

    const dealIds = (deals ?? []).map(d => d.id)

    // Get linked note/task IDs
    const toIds = [clientId, ...dealIds]
    const { data: links } = await supabase
        .from('links')
        .select('from_id, from_type')
        .in('from_type', ['note', 'task'])
        .in('to_type', ['client', 'deal'])
        .in('to_id', toIds)

    const noteIds = Array.from(new Set(links?.filter(l => l.from_type === 'note').map(l => l.from_id) || []))
    const taskIds = Array.from(new Set(links?.filter(l => l.from_type === 'task').map(l => l.from_id) || []))

    // Build OR filter
    const chunks = [`and(entity_type.eq.client,entity_id.eq.${clientId})`]
    if (dealIds.length > 0) {
        chunks.push(`and(entity_type.eq.deal,entity_id.in.(${dealIds.join(',')}))`)
    }
    if (noteIds.length > 0) {
        chunks.push(`and(entity_type.eq.note,entity_id.in.(${noteIds.join(',')}))`)
    }
    if (taskIds.length > 0) {
        chunks.push(`and(entity_type.eq.task,entity_id.in.(${taskIds.join(',')}))`)
    }
    // Also include service_record activities linked to this client
    chunks.push(`and(entity_type.eq.service_record,data->>client_id.eq.${clientId})`)

    const { data, error } = await supabase
        .from('activities')
        .select('*, actor:profiles!actor_id(full_name, avatar_url)')
        .or(chunks.join(','))
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as ActivityWithActor[]
}

/** Fetch org members with profiles (for filter dropdowns) */
export async function fetchOrgMembers(orgId: string): Promise<{ id: string; full_name: string; avatar_url: string | null }[]> {
    const { data, error } = await supabase
        .from('memberships')
        .select('user_id, profiles:profiles!user_id(full_name, avatar_url)')
        .eq('org_id', orgId)
        .eq('status', 'active')

    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((m: any) => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
        return {
            id: m.user_id as string,
            full_name: (profile?.full_name as string) ?? 'Unknown',
            avatar_url: (profile?.avatar_url as string | null) ?? null,
        }
    })
}
