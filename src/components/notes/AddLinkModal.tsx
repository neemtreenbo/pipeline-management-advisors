import { useState, useEffect } from 'react'
import { Search, User, Briefcase, FileText, CheckSquare, File, Loader2, Link as LinkIcon } from 'lucide-react'
import { searchEntitiesForLinking } from '@/lib/notes'
import type { SearchResult } from '@/lib/notes'
import * as Dialog from '@radix-ui/react-dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface AddLinkModalProps {
    orgId: string
    noteId: string
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onLinkSelected: (type: string, id: string) => Promise<void>
}

const TYPE_ICONS: Record<string, React.ElementType> = {
    client: User,
    deal: Briefcase,
    task: CheckSquare,
    note: FileText,
    proposal: File
}

export default function AddLinkModal({ orgId, noteId, isOpen, onOpenChange, onLinkSelected }: AddLinkModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [linkingId, setLinkingId] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) {
            setQuery('')
            setResults([])
        }
    }, [isOpen])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.trim().length >= 2) {
                performSearch()
            } else {
                setResults([])
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [query])

    async function performSearch() {
        setLoading(true)
        try {
            const res = await searchEntitiesForLinking(orgId, query, noteId)
            setResults(res)
        } catch (error) {
            console.error('Search failed', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSelect(result: SearchResult) {
        if (linkingId) return
        setLinkingId(result.id)
        try {
            await onLinkSelected(result.type, result.id)
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to link', error)
        } finally {
            setLinkingId(null)
        }
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-popover rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden max-h-[80vh] border border-border">
                    <div className="flex flex-col p-4 border-b border-border bg-muted/30">
                        <Dialog.Title className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <LinkIcon size={18} />
                            Add Link to Note
                        </Dialog.Title>
                        <Dialog.Description className="text-sm text-muted-foreground mt-1">
                            Search for clients, deals, proposals, or other notes to link.
                        </Dialog.Description>
                    </div>

                    <div className="p-4 border-b border-border bg-popover sticky top-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <Input
                                autoFocus
                                placeholder="Search by name, title, or email..."
                                className="pl-9 bg-muted/20 border-border focus-visible:ring-accent"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            {loading && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" size={16} />
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 bg-muted/10">
                        {query.trim().length > 0 && query.trim().length < 2 && (
                            <p className="text-center text-sm text-muted-foreground py-8">Type at least 2 characters to search...</p>
                        )}
                        {query.trim().length >= 2 && !loading && results.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-8">No results found for "{query}"</p>
                        )}

                        {results.length > 0 && (
                            <div className="flex flex-col gap-1">
                                {results.map((res) => {
                                    const Icon = TYPE_ICONS[res.type] || FileText
                                    return (
                                        <button
                                            key={res.id}
                                            onClick={() => handleSelect(res)}
                                            disabled={linkingId === res.id}
                                            className="w-full text-left flex items-center justify-between p-3 rounded-xl hover:bg-card hover:shadow-sm border border-transparent hover:border-border transition-all group disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent/10 group-hover:text-accent transition-colors text-muted-foreground">
                                                    <Icon size={14} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground">{res.title}</span>
                                                    {res.subtitle && <span className="text-xs text-muted-foreground">{res.subtitle}</span>}
                                                </div>
                                            </div>
                                            <Badge variant={res.type === 'client' ? 'success' : res.type === 'deal' ? 'accent' : res.type === 'proposal' ? 'warning' : 'muted'} className="capitalize mx-2 shrink-0">
                                                {res.type}
                                            </Badge>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
