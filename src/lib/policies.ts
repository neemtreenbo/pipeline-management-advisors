import { supabase } from './supabase'

export type PremiumMode = 'Annual' | 'Semi Annual' | 'Quarterly' | 'Monthly'

export const PREMIUM_MODES: PremiumMode[] = [
    'Annual',
    'Semi Annual',
    'Quarterly',
    'Monthly',
]

export interface Policy {
    id: string
    org_id: string
    owner_id: string
    client_id: string
    policy_owner_client_id: string | null
    insured_client_id: string | null
    policy_number: string | null
    issue_date: string | null
    product: string | null
    premium: number | null
    premium_mode: PremiumMode | null
    paying_years: number | null
    data: Record<string, unknown>
    created_at: string
    updated_at: string
    // joined
    client?: { id: string; name: string; email: string | null }
    policy_owner_client?: { id: string; name: string } | null
    insured_client?: { id: string; name: string } | null
}

export interface NewPolicyInput {
    org_id: string
    owner_id: string
    client_id: string
    policy_owner_client_id?: string | null
    insured_client_id?: string | null
    policy_number?: string
    issue_date?: string | null
    product?: string
    premium?: number
    premium_mode?: PremiumMode
    paying_years?: number
}

/** Fetch all policies for an org with client info joined */
export async function fetchPolicies(orgId: string): Promise<Policy[]> {
    const { data, error } = await supabase
        .from('policies')
        .select(`
            *,
            client:clients!policies_client_id_fkey(id, name, email),
            policy_owner_client:clients!policies_policy_owner_client_id_fkey(id, name),
            insured_client:clients!policies_insured_client_id_fkey(id, name)
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as Policy[]
}

/** Fetch all policies for a given client */
export async function fetchPoliciesByClient(clientId: string): Promise<Policy[]> {
    const { data, error } = await supabase
        .from('policies')
        .select(`
            *,
            client:clients!policies_client_id_fkey(id, name, email),
            policy_owner_client:clients!policies_policy_owner_client_id_fkey(id, name),
            insured_client:clients!policies_insured_client_id_fkey(id, name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as Policy[]
}

/** Fetch a single policy by ID */
export async function fetchPolicyById(policyId: string): Promise<Policy | null> {
    const { data, error } = await supabase
        .from('policies')
        .select(`
            *,
            client:clients!policies_client_id_fkey(id, name, email),
            policy_owner_client:clients!policies_policy_owner_client_id_fkey(id, name),
            insured_client:clients!policies_insured_client_id_fkey(id, name)
        `)
        .eq('id', policyId)
        .maybeSingle()

    if (error) throw error
    return data as Policy | null
}

/** Create a new policy */
export async function createPolicy(input: NewPolicyInput): Promise<Policy> {
    const { data, error } = await supabase
        .from('policies')
        .insert({
            org_id: input.org_id,
            owner_id: input.owner_id,
            client_id: input.client_id,
            policy_owner_client_id: input.policy_owner_client_id ?? null,
            insured_client_id: input.insured_client_id ?? null,
            policy_number: input.policy_number ?? null,
            issue_date: input.issue_date ?? null,
            product: input.product ?? null,
            premium: input.premium ?? null,
            premium_mode: input.premium_mode ?? null,
            paying_years: input.paying_years ?? null,
        })
        .select(`
            *,
            client:clients!policies_client_id_fkey(id, name, email),
            policy_owner_client:clients!policies_policy_owner_client_id_fkey(id, name),
            insured_client:clients!policies_insured_client_id_fkey(id, name)
        `)
        .single()

    if (error) throw error
    return data as Policy
}

/** Update a policy */
export async function updatePolicy(
    policyId: string,
    updates: Partial<Pick<Policy, 'client_id' | 'policy_owner_client_id' | 'insured_client_id' | 'policy_number' | 'issue_date' | 'product' | 'premium' | 'premium_mode' | 'paying_years' | 'data'>>
): Promise<void> {
    const { error } = await supabase
        .from('policies')
        .update(updates)
        .eq('id', policyId)

    if (error) throw error
}

/** Delete a policy */
export async function deletePolicy(policyId: string): Promise<void> {
    const { error } = await supabase
        .from('policies')
        .delete()
        .eq('id', policyId)

    if (error) throw error
}

/** Log an activity tied to a policy */
export async function logPolicyActivity(
    orgId: string,
    actorId: string,
    policyId: string,
    eventType: string,
    data: Record<string, unknown> = {}
): Promise<void> {
    await supabase.from('activities').insert({
        org_id: orgId,
        actor_id: actorId,
        entity_type: 'policy',
        entity_id: policyId,
        event_type: eventType,
        data,
    })
}
