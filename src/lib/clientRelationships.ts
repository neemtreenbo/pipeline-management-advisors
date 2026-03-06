import { supabase } from './supabase'

export type ClientRelationType = 'spouse' | 'child' | 'family' | 'referred_by' | 'friend'

export interface ClientRelationship {
  linkId: string
  relatedClientId: string
  relatedClientName: string
  relatedClientProfilePictureUrl: string | null
  relationType: ClientRelationType
  direction: 'from' | 'to'
}

export async function fetchClientRelationships(
  clientId: string,
  orgId: string
): Promise<ClientRelationship[]> {
  // Query outgoing links (this client is from_id)
  const { data: outgoing, error: outErr } = await supabase
    .from('links')
    .select('id, to_id, relation_type')
    .eq('org_id', orgId)
    .eq('from_type', 'client')
    .eq('to_type', 'client')
    .eq('from_id', clientId)

  if (outErr) throw outErr

  // Query incoming links (this client is to_id)
  const { data: incoming, error: inErr } = await supabase
    .from('links')
    .select('id, from_id, relation_type')
    .eq('org_id', orgId)
    .eq('from_type', 'client')
    .eq('to_type', 'client')
    .eq('to_id', clientId)

  if (inErr) throw inErr

  // Collect all related client IDs
  const relatedIds = new Set<string>()
  for (const l of outgoing ?? []) relatedIds.add(l.to_id)
  for (const l of incoming ?? []) relatedIds.add(l.from_id)

  if (relatedIds.size === 0) return []

  // Batch fetch related client info
  const { data: clients, error: clientErr } = await supabase
    .from('clients')
    .select('id, name, profile_picture_url')
    .in('id', Array.from(relatedIds))

  if (clientErr) throw clientErr

  const clientMap = new Map(
    (clients ?? []).map((c) => [c.id, c])
  )

  const results: ClientRelationship[] = []

  for (const l of outgoing ?? []) {
    const c = clientMap.get(l.to_id)
    if (!c) continue
    results.push({
      linkId: l.id,
      relatedClientId: l.to_id,
      relatedClientName: c.name,
      relatedClientProfilePictureUrl: c.profile_picture_url,
      relationType: l.relation_type as ClientRelationType,
      direction: 'from',
    })
  }

  for (const l of incoming ?? []) {
    const c = clientMap.get(l.from_id)
    if (!c) continue
    results.push({
      linkId: l.id,
      relatedClientId: l.from_id,
      relatedClientName: c.name,
      relatedClientProfilePictureUrl: c.profile_picture_url,
      relationType: l.relation_type as ClientRelationType,
      direction: 'to',
    })
  }

  return results
}

export async function addClientRelationship(
  orgId: string,
  fromClientId: string,
  toClientId: string,
  relationType: ClientRelationType,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('links').insert({
    org_id: orgId,
    from_type: 'client',
    from_id: fromClientId,
    to_type: 'client',
    to_id: toClientId,
    relation_type: relationType,
    created_by: userId,
  })
  if (error) throw error
}

export async function removeClientRelationship(linkId: string): Promise<void> {
  const { error } = await supabase.from('links').delete().eq('id', linkId)
  if (error) throw error
}

export interface OrgNetworkData {
  clients: Array<{ id: string; name: string; profile_picture_url: string | null }>
  edges: Array<{ linkId: string; fromId: string; toId: string; relationType: ClientRelationType }>
}

// ── Network position persistence ──

export interface NetworkPositions {
  [nodeId: string]: { x: number; y: number }
}

export async function fetchNetworkPositions(
  orgId: string,
  userId: string
): Promise<NetworkPositions | null> {
  const { data, error } = await supabase
    .from('network_positions')
    .select('positions')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return (data?.positions as NetworkPositions) ?? null
}

export async function saveNetworkPositions(
  orgId: string,
  userId: string,
  positions: NetworkPositions
): Promise<void> {
  const { error } = await supabase
    .from('network_positions')
    .upsert(
      { org_id: orgId, user_id: userId, positions, updated_at: new Date().toISOString() },
      { onConflict: 'org_id,user_id' }
    )
  if (error) throw error
}

export async function deleteNetworkPositions(
  orgId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('network_positions')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function fetchAllClientRelationships(orgId: string): Promise<OrgNetworkData> {
  const { data: links, error: linksErr } = await supabase
    .from('links')
    .select('id, from_id, to_id, relation_type')
    .eq('org_id', orgId)
    .eq('from_type', 'client')
    .eq('to_type', 'client')

  if (linksErr) throw linksErr
  if (!links || links.length === 0) return { clients: [], edges: [] }

  const clientIdSet = new Set<string>()
  for (const link of links) {
    clientIdSet.add(link.from_id)
    clientIdSet.add(link.to_id)
  }

  const { data: clients, error: clientsErr } = await supabase
    .from('clients')
    .select('id, name, profile_picture_url')
    .in('id', Array.from(clientIdSet))

  if (clientsErr) throw clientsErr

  return {
    clients: clients ?? [],
    edges: links.map((l) => ({
      linkId: l.id,
      fromId: l.from_id,
      toId: l.to_id,
      relationType: l.relation_type as ClientRelationType,
    })),
  }
}
