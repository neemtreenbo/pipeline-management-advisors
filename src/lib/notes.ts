import { supabase } from './supabase'

export interface Note {
    id: string
    org_id: string
    author_id: string
    title: string | null
    content: any | null
    data: Record<string, any>
    created_at: string
    updated_at: string
}

export interface NoteLink {
    id: string
    org_id: string
    from_type: string
    from_id: string
    to_type: string
    to_id: string
    relation_type: string | null
    created_by: string
    created_at: string
}

export async function createNote(
    orgId: string,
    authorId: string,
    title: string | null = null,
    content: any | null = null,
    data: Record<string, any> = {}
): Promise<Note> {
    const { data: note, error } = await supabase
        .from('notes')
        .insert({
            org_id: orgId,
            author_id: authorId,
            title,
            content,
            data
        })
        .select()
        .single()

    if (error) throw error
    return note as Note
}

export async function getNoteById(id: string): Promise<Note | null> {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (error) throw error
    return data as Note | null
}

export async function updateNote(
    id: string,
    updates: Partial<Pick<Note, 'title' | 'content' | 'data'>>
): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) throw error
}

export async function deleteNote(id: string): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function getNotesByOrg(orgId: string): Promise<Note[]> {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })

    if (error) throw error
    return data as Note[]
}

// Links
export async function linkNoteToEntity(
    noteId: string,
    entityType: string,
    entityId: string,
    orgId: string,
    userId: string,
    relationType: string | null = null
): Promise<void> {
    // Check if link already exists
    const { data: existing } = await supabase
        .from('links')
        .select('id')
        .eq('from_type', 'note')
        .eq('from_id', noteId)
        .eq('to_type', entityType)
        .eq('to_id', entityId)
        .maybeSingle()

    if (existing) return

    const { error } = await supabase
        .from('links')
        .insert({
            org_id: orgId,
            from_type: 'note',
            from_id: noteId,
            to_type: entityType,
            to_id: entityId,
            relation_type: relationType,
            created_by: userId
        })

    if (error) throw error

    // Fetch note to get title for activity logging
    const { data: noteData } = await supabase
        .from('notes')
        .select('title')
        .eq('id', noteId)
        .maybeSingle()

    // Log Activity
    await supabase.from('activities').insert({
        org_id: orgId,
        actor_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        event_type: 'note_linked',
        data: {
            note_id: noteId,
            title: noteData?.title || 'Untitled Note'
        }
    })
}

export async function unlinkNoteFromEntity(
    noteId: string,
    entityType: string,
    entityId: string
): Promise<void> {
    const { error } = await supabase
        .from('links')
        .delete()
        .eq('from_type', 'note')
        .eq('from_id', noteId)
        .eq('to_type', entityType)
        .eq('to_id', entityId)

    if (error) throw error
}

export async function getNotesLinkedToEntity(entityType: string, entityId: string): Promise<Note[]> {
    let toTypeQuery = [entityType]
    let toIdQuery = [entityId]

    if (entityType === 'client') {
        const { data: deals } = await supabase
            .from('deals')
            .select('id')
            .eq('client_id', entityId)

        if (deals && deals.length > 0) {
            toTypeQuery.push('deal')
            for (const d of deals) {
                toIdQuery.push(d.id)
            }
        }
    }

    // Fetch links first
    const { data: links, error: linksError } = await supabase
        .from('links')
        .select('from_id')
        .eq('from_type', 'note')
        .in('to_type', toTypeQuery)
        .in('to_id', toIdQuery)

    if (linksError) throw linksError

    if (!links || links.length === 0) return []

    const noteIds = Array.from(new Set(links.map(l => l.from_id)))

    // Fetch notes
    const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .in('id', noteIds)
        .order('updated_at', { ascending: false })

    if (notesError) throw notesError

    return notes as Note[]
}

export async function getEntitiesLinkedToNote(noteId: string) {
    const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('from_type', 'note')
        .eq('from_id', noteId)

    if (error) throw error
    return data as NoteLink[]
}

export interface SearchResult {
    id: string
    type: 'client' | 'deal' | 'proposal' | 'note'
    title: string
    subtitle?: string
}

export async function searchEntitiesForLinking(orgId: string, query: string, excludeNoteId: string): Promise<SearchResult[]> {
    const results: SearchResult[] = []

    // Clean query
    const q = query.trim()
    if (!q) return results

    // 1. Search Clients
    const { data: clients, error: errClients } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('org_id', orgId)
        .ilike('name', `%${q}%`)
        .limit(5)

    if (!errClients && clients) {
        clients.forEach(c => results.push({ id: c.id, type: 'client', title: c.name, subtitle: c.email || undefined }))
    }

    // 2. Search Deals
    const { data: deals, error: errDeals } = await supabase
        .from('deals')
        .select('id, data, stage')
        .eq('org_id', orgId)
        .limit(20) // Cannot properly ilike jsonb directly without specific postgres functions in standard rest, so let's filter in memory

    if (!errDeals && deals) {
        const matchedDeals = deals.filter(d => {
            const title = d.data?.title || 'Unknown'
            return title.toLowerCase().includes(q.toLowerCase())
        }).slice(0, 5)

        matchedDeals.forEach(d => results.push({ id: d.id, type: 'deal', title: d.data?.title || 'Unknown', subtitle: `Stage: ${d.stage}` }))
    }

    // 3. Search Proposals
    const { data: proposals, error: errProposals } = await supabase
        .from('proposals')
        .select('id, title, status')
        .eq('org_id', orgId)
        .ilike('title', `%${q}%`)
        .limit(5)

    if (!errProposals && proposals) {
        proposals.forEach(p => results.push({ id: p.id, type: 'proposal', title: p.title, subtitle: p.status }))
    }

    // 4. Search Notes
    const { data: notes, error: errNotes } = await supabase
        .from('notes')
        .select('id, title')
        .eq('org_id', orgId)
        .neq('id', excludeNoteId)
        .ilike('title', `%${q}%`)
        .limit(5)

    if (!errNotes && notes) {
        notes.forEach(n => results.push({ id: n.id, type: 'note', title: n.title || 'Untitled Note', subtitle: 'Note' }))
    }

    return results
}

export async function logNoteActivityThrottled(orgId: string, userId: string, noteId: string, title: string, eventType: 'note_created' | 'note_edited') {
    if (eventType === 'note_edited') {
        const { data: recent } = await supabase
            .from('activities')
            .select('id, created_at')
            .eq('entity_type', 'note')
            .eq('entity_id', noteId)
            .eq('event_type', 'note_edited')
            .eq('actor_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (recent && recent.created_at) {
            const timeDiff = new Date().getTime() - new Date(recent.created_at).getTime()
            if (timeDiff < 1000 * 60 * 60) return // Skip if edited within 1 hour
        }
    }

    await supabase.from('activities').insert({
        org_id: orgId,
        actor_id: userId,
        entity_type: 'note',
        entity_id: noteId,
        event_type: eventType,
        data: { note_id: noteId, title }
    })
}

export type NoteClientInfo = {
    noteId: string
    clientId: string
    clientName: string
    profilePictureUrl: string | null
}

export async function getClientsForNotes(noteIds: string[]): Promise<NoteClientInfo[]> {
    if (!noteIds.length) return []

    // Fetch direct client links and deal links
    const { data: links } = await supabase
        .from('links')
        .select('from_id, to_id, to_type')
        .eq('from_type', 'note')
        .in('from_id', noteIds)
        .in('to_type', ['client', 'deal'])

    if (!links || links.length === 0) return []

    const clientLinks = links.filter(l => l.to_type === 'client')
    const dealLinks = links.filter(l => l.to_type === 'deal')

    const clientIdsToFetch = new Set<string>()
    const noteToClientMap = new Map<string, string>() // noteId -> clientId
    const dealIds = dealLinks.map(d => d.to_id)

    // Map direct clients
    for (const l of clientLinks) {
        clientIdsToFetch.add(l.to_id)
        if (!noteToClientMap.has(l.from_id)) {
            noteToClientMap.set(l.from_id, l.to_id)
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
                    if (!noteToClientMap.has(l.from_id)) {
                        noteToClientMap.set(l.from_id, clientId)
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

    const results: NoteClientInfo[] = []
    for (const [noteId, clientId] of noteToClientMap.entries()) {
        const client = clientMap.get(clientId)
        if (client) {
            results.push({
                noteId,
                clientId,
                clientName: client.name,
                profilePictureUrl: client.profile_picture_url ?? null
            })
        }
    }

    return results
}

