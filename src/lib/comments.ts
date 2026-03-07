import { supabase } from './supabase'

export interface Comment {
  id: string
  org_id: string
  entity_type: string
  entity_id: string
  author_id: string
  body: string
  mentions: string[]
  created_at: string
  updated_at: string
  author?: {
    full_name: string | null
    avatar_url: string | null
  }
}

export interface OrgMember {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: string
}

export async function fetchComments(entityType: string, entityId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Comment[]
}

export async function createComment(
  orgId: string,
  entityType: string,
  entityId: string,
  authorId: string,
  body: string,
  mentions: string[] = []
): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      org_id: orgId,
      entity_type: entityType,
      entity_id: entityId,
      author_id: authorId,
      body,
      mentions,
    })
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .single()

  if (error) throw error
  return data as Comment
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw error
}

export async function fetchOrgMembers(orgId: string): Promise<OrgMember[]> {
  // Fetch memberships first, then profiles separately (no FK between memberships and profiles)
  const { data: memberships, error: mErr } = await supabase
    .from('memberships')
    .select('user_id, role')
    .eq('org_id', orgId)
    .eq('status', 'active')

  if (mErr) throw mErr
  if (!memberships?.length) return []

  const userIds = memberships.map(m => m.user_id)
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', userIds)

  if (pErr) throw pErr

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  return memberships.map(m => {
    const profile = profileMap.get(m.user_id)
    return {
      id: m.user_id,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      avatar_url: profile?.avatar_url ?? null,
      role: m.role,
    }
  })
}
