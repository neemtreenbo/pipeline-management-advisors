import { supabase } from './supabase'

export type DealStage =
    | 'Opportunity'
    | 'Contacted'
    | 'Engaged'
    | 'Schedule To Present'
    | 'Proposal Presented'
    | 'Decision Pending'
    | 'Closed'

export const PIPELINE_STAGES: DealStage[] = [
    'Opportunity',
    'Contacted',
    'Engaged',
    'Schedule To Present',
    'Proposal Presented',
    'Decision Pending',
    'Closed',
]

export interface Deal {
    id: string
    org_id: string
    client_id: string
    owner_id: string
    stage: DealStage
    value: number
    order_index?: number
    expected_close_date: string | null
    data: Record<string, unknown>
    created_at: string
    updated_at: string
    // joined
    client?: { id: string; name: string; email: string | null; profile_picture_url: string | null }
    _proposal_count?: number
    _attachment_count?: number
}

export interface NewDealInput {
    org_id: string
    client_id: string
    owner_id: string
    stage?: DealStage
    value?: number
    expected_close_date?: string | null
    title?: string
}

/** Fetch all deals for an org with client info joined */
export async function fetchDealsByOrg(orgId: string): Promise<Deal[]> {
    const { data, error } = await supabase
        .from('deals')
        .select(`
      *,
      client:clients(id, name, email, profile_picture_url)
    `)
        .eq('org_id', orgId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as Deal[]
}

/** Fetch a single deal by ID */
export async function fetchDealById(dealId: string): Promise<Deal | null> {
    const { data, error } = await supabase
        .from('deals')
        .select(`
      *,
      client:clients(id, name, email, profile_picture_url)
    `)
        .eq('id', dealId)
        .maybeSingle()

    if (error) throw error
    return data as Deal | null
}

/** Create a new deal */
export async function createDeal(input: NewDealInput): Promise<Deal> {
    const { data, error } = await supabase
        .from('deals')
        .insert({
            org_id: input.org_id,
            client_id: input.client_id,
            owner_id: input.owner_id,
            stage: input.stage ?? 'Opportunity',
            value: input.value ?? 0,
            expected_close_date: input.expected_close_date ?? null,
            data: input.title ? { title: input.title } : {},
        })
        .select(`*, client:clients(id, name, email)`)
        .single()

    if (error) throw error
    return data as Deal
}

/** Update the stage and optionally the order_index of a deal */
export async function updateDealStage(dealId: string, stage: DealStage, orderIndex?: number): Promise<void> {
    const updateData: any = { stage }
    if (orderIndex !== undefined) {
        updateData.order_index = orderIndex
    }

    const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId)

    if (error) throw error
}

/** Update deal info fields */
export async function updateDeal(
    dealId: string,
    updates: Partial<Pick<Deal, 'value' | 'expected_close_date' | 'stage'>> & { title?: string }
): Promise<void> {
    const { title, ...rest } = updates
    const patch: Record<string, unknown> = { ...rest }
    if (title !== undefined) {
        // read current data first
        const { data: existing } = await supabase
            .from('deals')
            .select('data')
            .eq('id', dealId)
            .maybeSingle()
        patch.data = { ...(existing?.data ?? {}), title }
    }
    const { error } = await supabase.from('deals').update(patch).eq('id', dealId)
    if (error) throw error
}

/** Fetch all deals for a given client */
export async function fetchDealsByClient(clientId: string): Promise<Deal[]> {
    const { data, error } = await supabase
        .from('deals')
        .select(`*, client:clients(id, name, email)`)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as Deal[]
}

/** Log an activity tied to a deal */
export async function logDealActivity(
    orgId: string,
    actorId: string,
    dealId: string,
    eventType: string,
    data: Record<string, unknown> = {}
): Promise<void> {
    await supabase.from('activities').insert({
        org_id: orgId,
        actor_id: actorId,
        entity_type: 'deal',
        entity_id: dealId,
        event_type: eventType,
        data,
    })
}

/** Fetch all activity records for a deal */
export async function fetchDealActivities(dealId: string) {
    const { data: links } = await supabase
        .from('links')
        .select('from_id, from_type')
        .in('from_type', ['note', 'task'])
        .eq('to_type', 'deal')
        .eq('to_id', dealId)

    const noteIds = Array.from(new Set(links?.filter(l => l.from_type === 'note').map(l => l.from_id) || []))
    const taskIds = Array.from(new Set(links?.filter(l => l.from_type === 'task').map(l => l.from_id) || []))

    let query = supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })

    const chunks = [`and(entity_type.eq.deal,entity_id.eq.${dealId})`]
    if (noteIds.length > 0) {
        chunks.push(`and(entity_type.eq.note,entity_id.in.(${noteIds.join(',')}))`)
    }
    if (taskIds.length > 0) {
        chunks.push(`and(entity_type.eq.task,entity_id.in.(${taskIds.join(',')}))`)
    }
    query = query.or(chunks.join(','))

    const { data, error } = await query

    if (error) throw error
    return data ?? []
}
