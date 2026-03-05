import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Kanban, CheckSquare, StickyNote, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/contexts/OrgContext'

interface SearchResult {
    id: string
    type: 'client' | 'deal' | 'task' | 'note'
    title: string
    subtitle?: string
}

const TYPE_CONFIG = {
    client: { icon: Users, label: 'Client', path: (id: string) => `/app/clients/${id}` },
    deal: { icon: Kanban, label: 'Deal', path: (id: string) => `/app/pipeline?deal=${id}` },
    task: { icon: CheckSquare, label: 'Task', path: () => `/app/tasks` },
    note: { icon: StickyNote, label: 'Note', path: (id: string) => `/app/notes/${id}` },
}

export default function GlobalSearch() {
    const { orgId } = useOrg()
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const search = useCallback(async (q: string) => {
        if (!orgId || q.trim().length < 2) {
            setResults([])
            return
        }
        setLoading(true)
        const term = `%${q.trim()}%`

        const [clients, deals, tasks, notes] = await Promise.all([
            supabase.from('clients').select('id, name, job_title').eq('org_id', orgId).ilike('name', term).limit(3),
            supabase.from('deals').select('id, data, client:clients(name)').eq('org_id', orgId).ilike('data->>title', term).limit(3),
            supabase.from('tasks').select('id, title, status').eq('org_id', orgId).ilike('title', term).limit(3),
            supabase.from('notes').select('id, title').eq('org_id', orgId).ilike('title', term).limit(3),
        ])

        const compiled: SearchResult[] = [
            ...(clients.data ?? []).map(c => ({
                id: c.id,
                type: 'client' as const,
                title: c.name,
                subtitle: c.job_title ?? undefined,
            })),
            ...(deals.data ?? []).map((d: any) => ({
                id: d.id,
                type: 'deal' as const,
                title: (d.data as Record<string, string>)?.title ?? 'Untitled Deal',
                subtitle: d.client?.name ?? undefined,
            })),
            ...(tasks.data ?? []).map(t => ({
                id: t.id,
                type: 'task' as const,
                title: t.title ?? 'Untitled Task',
                subtitle: t.status ?? undefined,
            })),
            ...(notes.data ?? []).map(n => ({
                id: n.id,
                type: 'note' as const,
                title: n.title ?? 'Untitled Note',
            })),
        ]

        setResults(compiled)
        setLoading(false)
    }, [orgId])

    useEffect(() => {
        const timer = setTimeout(() => search(query), 200)
        return () => clearTimeout(timer)
    }, [query, search])

    useEffect(() => {
        setActiveIndex(0)
    }, [results])

    // Close on outside click
    useEffect(() => {
        function onPointerDown(e: PointerEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [])

    function handleSelect(result: SearchResult) {
        navigate(TYPE_CONFIG[result.type].path(result.id))
        setQuery('')
        setOpen(false)
        inputRef.current?.blur()
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (!open || results.length === 0) return
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
        if (e.key === 'Enter') { e.preventDefault(); handleSelect(results[activeIndex]) }
        if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
    }

    const showDropdown = open && query.trim().length >= 2

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative w-full">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search..."
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true) }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="h-8 w-full pl-7 pr-6 text-xs rounded-full bg-muted/80 border border-transparent focus:outline-none focus:ring-1 focus:ring-accent focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
                />
                {query && (
                    <button
                        onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        <X size={11} />
                    </button>
                )}
            </div>

            {showDropdown && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-popover border border-border rounded-2xl shadow-lg overflow-hidden z-[200]">
                    {loading && results.length === 0 && (
                        <div className="px-3 py-4 text-xs text-muted-foreground text-center">Searching…</div>
                    )}
                    {!loading && results.length === 0 && (
                        <div className="px-3 py-4 text-xs text-muted-foreground text-center">No results for "{query}"</div>
                    )}
                    {results.length > 0 && (
                        <ul className="py-1">
                            {results.map((result, idx) => {
                                const { icon: Icon, label } = TYPE_CONFIG[result.type]
                                return (
                                    <li key={`${result.type}-${result.id}`}>
                                        <button
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${idx === activeIndex ? 'bg-muted' : 'hover:bg-muted/60'}`}
                                            onPointerDown={e => { e.preventDefault(); handleSelect(result) }}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                <Icon size={12} className="text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-foreground truncate">{result.title}</p>
                                                {result.subtitle && (
                                                    <p className="text-[11px] text-muted-foreground truncate">{result.subtitle}</p>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground shrink-0">{label}</span>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
