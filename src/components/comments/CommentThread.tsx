import { useState, useRef, useCallback, useMemo } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { useComments, useOrgMembers } from '@/hooks/queries/useComments'
import { createComment, deleteComment } from '@/lib/comments'
import type { Comment, OrgMember } from '@/lib/comments'
import { queryKeys } from '@/lib/queryKeys'

interface CommentThreadProps {
  entityType: string
  entityId: string
  onCommentCreated?: (comment: Comment) => void
}

// ─── Mention helpers ───────────────────────────────────────────

interface MentionTracker {
  userId: string
  name: string
}

function detectMentionQuery(text: string, cursorPos: number): { query: string; start: number } | null {
  // Walk backwards from cursor to find the last unmatched @
  const before = text.slice(0, cursorPos)
  const lastAt = before.lastIndexOf('@')
  if (lastAt === -1) return null
  // @ must be at start of text or preceded by whitespace
  if (lastAt > 0 && !/\s/.test(before[lastAt - 1])) return null
  const query = before.slice(lastAt + 1)
  // No spaces allowed in the query (mention not yet completed)
  if (/\s/.test(query)) return null
  return { query, start: lastAt }
}

// ─── Time formatting ───────────────────────────────────────────

function formatTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatAbsolute(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ─── Render body with highlighted @mentions ────────────────────

function renderBody(body: string, mentions: string[], members: OrgMember[]) {
  if (!mentions.length) return <span>{body}</span>

  // Build a map of mentioned member names
  const mentionedMembers = members.filter(m => mentions.includes(m.id))
  if (!mentionedMembers.length) return <span>{body}</span>

  // Build regex to match @Name patterns
  const names = mentionedMembers
    .map(m => m.full_name)
    .filter(Boolean)
    .sort((a, b) => b!.length - a!.length) // longest first to avoid partial matches
  if (!names.length) return <span>{body}</span>

  const pattern = new RegExp(`@(${names.map(n => escapeRegex(n!)).join('|')})`, 'g')
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index))
    }
    parts.push(
      <span
        key={match.index}
        className="text-accent font-medium bg-accent/10 rounded px-0.5"
      >
        @{match[1]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex))
  }

  return <>{parts}</>
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─── Main component ───────────────────────────────────────────

export default function CommentThread({ entityType, entityId, onCommentCreated }: CommentThreadProps) {
  const { user } = useAuth()
  const { orgId } = useOrg()
  const qc = useQueryClient()

  const { data: comments = [], isLoading } = useComments(entityType, entityId)
  const { data: members = [] } = useOrgMembers(orgId ?? undefined)

  const [body, setBody] = useState('')
  const [trackedMentions, setTrackedMentions] = useState<MentionTracker[]>([])
  const [mentionQuery, setMentionQuery] = useState<{ query: string; start: number } | null>(null)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Filter members for mention dropdown (exclude self, match query)
  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery) return []
    const q = mentionQuery.query.toLowerCase()
    return members
      .filter(m => {
        const name = m.full_name?.toLowerCase() ?? ''
        const email = m.email?.toLowerCase() ?? ''
        return name.includes(q) || email.includes(q)
      })
      .slice(0, 6)
  }, [mentionQuery, members])

  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setBody(value)

    const cursorPos = e.target.selectionStart
    const mq = detectMentionQuery(value, cursorPos)
    setMentionQuery(mq)
  }, [])

  const handleSelectMention = useCallback((member: OrgMember) => {
    if (!mentionQuery || !textareaRef.current) return
    const name = member.full_name ?? member.email ?? 'User'
    // Replace @query with @Name
    const before = body.slice(0, mentionQuery.start)
    const after = body.slice(textareaRef.current.selectionStart)
    const newBody = `${before}@${name} ${after}`
    setBody(newBody)
    setTrackedMentions(prev => {
      if (prev.some(m => m.userId === member.id)) return prev
      return [...prev, { userId: member.id, name }]
    })
    setMentionQuery(null)

    // Re-focus textarea
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = before.length + name.length + 2 // +2 for @ and space
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(pos, pos)
      }
    })
  }, [body, mentionQuery])

  const handleSubmit = useCallback(async () => {
    if (!body.trim() || !user || !orgId || sending) return
    setSending(true)
    try {
      // Filter tracked mentions to only those still in the body
      const mentionIds = trackedMentions
        .filter(m => body.includes(`@${m.name}`))
        .map(m => m.userId)

      const comment = await createComment(orgId, entityType, entityId, user.id, body.trim(), mentionIds)
      setBody('')
      setTrackedMentions([])
      setMentionQuery(null)
      await qc.invalidateQueries({ queryKey: queryKeys.comments.byEntity(entityType, entityId) })
      onCommentCreated?.(comment)
      // Scroll to bottom
      requestAnimationFrame(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
    } catch (err) {
      console.error('Failed to post comment', err)
    } finally {
      setSending(false)
    }
  }, [body, trackedMentions, user, orgId, entityType, entityId, sending, qc, onCommentCreated])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setMentionQuery(null)
    }
  }, [handleSubmit])

  const handleDelete = useCallback(async (commentId: string) => {
    setDeletingId(commentId)
    try {
      await deleteComment(commentId)
      await qc.invalidateQueries({ queryKey: queryKeys.comments.byEntity(entityType, entityId) })
    } catch (err) {
      console.error('Failed to delete comment', err)
    } finally {
      setDeletingId(null)
    }
  }, [entityType, entityId, qc])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <p className="text-[13px] text-muted-foreground/40 animate-pulse">Loading comments…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comments list */}
      <div className="flex-1 space-y-4 mb-4">
        {comments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <MessageCircle size={18} className="text-muted-foreground/30" />
            <p className="text-[13px] text-muted-foreground/40">No comments yet</p>
          </div>
        )}

        {comments.map((comment: Comment) => {
          const authorName = comment.author?.full_name ?? 'Unknown'
          const authorInitial = authorName.charAt(0).toUpperCase()
          const isOwn = comment.author_id === user?.id

          return (
            <div key={comment.id} className="flex gap-2.5 group">
              {/* Avatar */}
              {comment.author?.avatar_url ? (
                <img
                  src={comment.author.avatar_url}
                  alt={authorName}
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {authorInitial}
                  </span>
                </div>
              )}

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="inline-block bg-muted/60 rounded-2xl rounded-tl-md px-3.5 py-2 max-w-full">
                  <p className="text-[12px] font-semibold text-foreground/80 leading-none mb-1">
                    {authorName}
                  </p>
                  <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                    {renderBody(comment.body, comment.mentions ?? [], members)}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5 px-1">
                  <time
                    className="text-[10px] text-muted-foreground/40"
                    title={formatAbsolute(comment.created_at)}
                  >
                    {formatTime(comment.created_at)}
                  </time>
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="text-[10px] text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      {deletingId === comment.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={commentsEndRef} />
      </div>

      {/* Input area */}
      <div className="relative shrink-0 border-t border-border/40 pt-3">
        {/* Mention dropdown */}
        {mentionSuggestions.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 right-0 bg-popover border border-border rounded-xl shadow-lg py-1 z-50 max-h-[180px] overflow-y-auto">
            {mentionSuggestions.map((member) => (
              <button
                key={member.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelectMention(member) }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-muted transition-colors flex items-center gap-2"
              >
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.full_name ?? ''}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-[9px] font-medium text-muted-foreground">
                      {(member.full_name ?? member.email ?? '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-foreground/80 truncate">
                  {member.full_name ?? member.email}
                </span>
                {member.full_name && member.email && (
                  <span className="text-muted-foreground/40 text-[11px] truncate ml-auto">
                    {member.email}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleBodyChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment… Use @ to mention"
            rows={1}
            className="flex-1 text-[13px] text-foreground bg-muted/40 border border-border/60 rounded-xl px-3 py-2 resize-none outline-none focus:border-accent/40 transition-colors placeholder:text-muted-foreground/40 max-h-[120px] overflow-y-auto"
            style={{ minHeight: '38px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || sending}
            className="p-2 rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
