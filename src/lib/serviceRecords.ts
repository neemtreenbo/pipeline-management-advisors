import { supabase } from './supabase'
import { logActivity } from './activities'

export type ServiceRecordType = 'renewal' | 'review' | 'follow_up' | 'claim' | 'check_in' | 'custom'
export type ServiceRecordStatus = 'upcoming' | 'in_progress' | 'completed' | 'overdue'

export interface ServiceRecord {
    id: string
    org_id: string
    client_id: string
    deal_id: string | null
    assignee_id: string | null
    owner_id: string
    type: ServiceRecordType
    status: ServiceRecordStatus
    title: string
    description: string | null
    due_date: string
    completed_at: string | null
    data: Record<string, unknown>
    created_at: string
    updated_at: string
    // joined
    client?: { id: string; name: string; profile_picture_url: string | null }
    deal?: { id: string; data: Record<string, unknown> } | null
    assignee?: { full_name: string; avatar_url: string | null } | null
}

export interface ServiceRecordInsert {
    org_id: string
    client_id: string
    deal_id?: string | null
    assignee_id?: string | null
    owner_id: string
    type?: ServiceRecordType
    title: string
    description?: string | null
    due_date: string
}

/** Fetch all service records for an org with optional filters */
export async function fetchServiceRecordsByOrg(
    orgId: string,
    filters?: { status?: string; assigneeId?: string }
): Promise<ServiceRecord[]> {
    let query = supabase
        .from('service_records')
        .select(`
            *,
            client:clients(id, name, profile_picture_url),
            deal:deals(id, data),
            assignee:profiles!assignee_id(full_name, avatar_url)
        `)
        .eq('org_id', orgId)
        .order('due_date', { ascending: true })

    if (filters?.status) {
        query = query.eq('status', filters.status)
    }
    if (filters?.assigneeId) {
        query = query.eq('assignee_id', filters.assigneeId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as ServiceRecord[]
}

/** Fetch service records for a specific client */
export async function fetchServiceRecordsByClient(clientId: string): Promise<ServiceRecord[]> {
    const { data, error } = await supabase
        .from('service_records')
        .select(`
            *,
            deal:deals(id, data),
            assignee:profiles!assignee_id(full_name, avatar_url)
        `)
        .eq('client_id', clientId)
        .order('due_date', { ascending: true })

    if (error) throw error
    return (data ?? []) as ServiceRecord[]
}

/** Create a new service record */
export async function createServiceRecord(input: ServiceRecordInsert): Promise<ServiceRecord> {
    const { data, error } = await supabase
        .from('service_records')
        .insert({
            org_id: input.org_id,
            client_id: input.client_id,
            deal_id: input.deal_id ?? null,
            assignee_id: input.assignee_id ?? null,
            owner_id: input.owner_id,
            type: input.type ?? 'follow_up',
            title: input.title,
            description: input.description ?? null,
            due_date: input.due_date,
        })
        .select(`
            *,
            deal:deals(id, data),
            assignee:profiles!assignee_id(full_name, avatar_url)
        `)
        .single()

    if (error) throw error

    await logActivity({
        orgId: input.org_id,
        actorId: input.owner_id,
        entityType: 'service_record',
        entityId: data.id,
        eventType: 'service_created',
        data: { title: input.title, type: input.type ?? 'follow_up', client_id: input.client_id },
    })

    return data as ServiceRecord
}

/** Update a service record */
export async function updateServiceRecord(
    id: string,
    updates: Partial<Pick<ServiceRecord, 'title' | 'description' | 'due_date' | 'type' | 'status' | 'assignee_id' | 'deal_id'>>,
    actorId?: string,
    orgId?: string
): Promise<ServiceRecord> {
    // If status is changing, fetch old status for logging
    let oldStatus: string | undefined
    if (updates.status && actorId && orgId) {
        const { data: existing } = await supabase
            .from('service_records')
            .select('status')
            .eq('id', id)
            .maybeSingle()
        oldStatus = existing?.status
    }

    const { data, error } = await supabase
        .from('service_records')
        .update(updates)
        .eq('id', id)
        .select(`
            *,
            deal:deals(id, data),
            assignee:profiles!assignee_id(full_name, avatar_url)
        `)
        .single()

    if (error) throw error

    // Log status change
    if (updates.status && oldStatus && updates.status !== oldStatus && actorId && orgId) {
        await logActivity({
            orgId,
            actorId,
            entityType: 'service_record',
            entityId: id,
            eventType: 'service_status_changed',
            data: { from_status: oldStatus, to_status: updates.status, title: data.title, client_id: data.client_id },
        })
    }

    return data as ServiceRecord
}

/** Complete a service record */
export async function completeServiceRecord(
    id: string,
    actorId: string,
    orgId: string
): Promise<ServiceRecord> {
    const { data, error } = await supabase
        .from('service_records')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
            *,
            deal:deals(id, data),
            assignee:profiles!assignee_id(full_name, avatar_url)
        `)
        .single()

    if (error) throw error

    await logActivity({
        orgId,
        actorId,
        entityType: 'service_record',
        entityId: id,
        eventType: 'service_completed',
        data: { title: data.title, client_id: data.client_id },
    })

    return data as ServiceRecord
}

/** Delete a service record */
export async function deleteServiceRecord(id: string): Promise<void> {
    const { error } = await supabase
        .from('service_records')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export const SERVICE_TYPE_LABELS: Record<ServiceRecordType, string> = {
    renewal: 'Renewal',
    review: 'Review',
    follow_up: 'Follow-up',
    claim: 'Claim',
    check_in: 'Check-in',
    custom: 'Custom',
}

export const SERVICE_STATUS_LABELS: Record<ServiceRecordStatus, string> = {
    upcoming: 'Upcoming',
    in_progress: 'In Progress',
    completed: 'Completed',
    overdue: 'Overdue',
}
