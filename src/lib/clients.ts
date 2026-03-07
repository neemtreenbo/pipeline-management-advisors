import { supabase } from './supabase'

export interface ClientSummary {
    id: string
    name: string
    profile_picture_url: string | null
}

export interface ClientPolicy {
    id: string
    policy_number: string | null
    product: string | null
}

/** Search clients by name for an org (debounce at call site) */
export async function searchClients(
    orgId: string,
    query?: string,
    limit = 20
): Promise<ClientSummary[]> {
    let q = supabase
        .from('clients')
        .select('id, name, profile_picture_url')
        .eq('org_id', orgId)
        .order('name')
        .limit(limit)

    if (query?.trim()) {
        q = q.ilike('name', `%${query.trim()}%`)
    }

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as ClientSummary[]
}

/** Fetch policies for a specific client */
export async function fetchClientPolicies(
    orgId: string,
    clientId: string
): Promise<ClientPolicy[]> {
    const { data, error } = await supabase
        .from('policies')
        .select('id, policy_number, product')
        .eq('org_id', orgId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as ClientPolicy[]
}

/** Create a new client with minimal info */
export async function createClient(
    orgId: string,
    ownerId: string,
    name: string
): Promise<ClientSummary> {
    const { data, error } = await supabase
        .from('clients')
        .insert({ org_id: orgId, owner_id: ownerId, name })
        .select('id, name, profile_picture_url')
        .single()

    if (error) throw error
    return data as ClientSummary
}
