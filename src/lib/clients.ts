import { supabase } from './supabase'
import { logActivity } from './activities'

/** Create a client and log activity */
export async function createClient(
    input: { org_id: string; owner_id: string; name: string; email?: string; phone?: string; source?: string; tags?: string[] }
) {
    const { data, error } = await supabase
        .from('clients')
        .insert(input)
        .select()
        .single()

    if (error) throw error

    await logActivity({
        orgId: input.org_id,
        actorId: input.owner_id,
        entityType: 'client',
        entityId: data.id,
        eventType: 'client_created',
        data: { name: input.name },
    })

    return data
}

/** Update a client and log activity */
export async function updateClient(
    id: string,
    patch: Record<string, unknown>,
    actorId: string,
    orgId: string
) {
    const { error } = await supabase.from('clients').update(patch).eq('id', id)
    if (error) throw error

    const changedFields = Object.keys(patch)
    await logActivity({
        orgId,
        actorId,
        entityType: 'client',
        entityId: id,
        eventType: 'client_edited',
        data: { changed_fields: changedFields },
    })
}

/** Delete a client and log activity */
export async function deleteClient(
    id: string,
    name: string,
    actorId: string,
    orgId: string
) {
    await logActivity({
        orgId,
        actorId,
        entityType: 'client',
        entityId: id,
        eventType: 'client_deleted',
        data: { name },
    })

    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
}
