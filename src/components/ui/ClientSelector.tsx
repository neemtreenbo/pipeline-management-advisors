import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'

interface Client {
    id: string
    name: string
    source: string | null
}

interface ClientSelectorProps {
    orgId: string
    value: string
    onChange: (clientId: string, clientName: string) => void
    placeholder?: string
    error?: string | null
    defaultSearch?: string
}

export default function ClientSelector({
    orgId,
    value,
    onChange,
    placeholder = "Search or create client...",
    error,
    defaultSearch = ''
}: ClientSelectorProps) {

    const { user } = useAuth()
    const [clients, setClients] = useState<Client[]>([])
    const [clientSearch, setClientSearch] = useState(defaultSearch)
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
    const [creatingClient, setCreatingClient] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)

    useEffect(() => {
        if (!orgId) return
        supabase
            .from('clients')
            .select('id, name, source')
            .eq('org_id', orgId)
            .order('name')
            .then(({ data }) => setClients(data ?? []))
    }, [orgId])

    useEffect(() => {
        // If external value is cleared but we have a search term (and it's not the name of a selected client), reset it?
        // Let's just update search term if a valid defaultSearch prop changes and we have no value.
        // Usually, the parent controls `value`.
        if (!value && !clientDropdownOpen && clientSearch !== defaultSearch && defaultSearch !== '') {
            //setClientSearch(defaultSearch)
        }
    }, [value, defaultSearch, clientDropdownOpen, clientSearch])

    const filteredClients = clients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
    )

    const exactMatchExists = clients.some(
        (c) => c.name.toLowerCase() === clientSearch.toLowerCase().trim()
    )

    async function handleCreateClient() {
        if (!user || !clientSearch.trim() || creatingClient) return
        setCreatingClient(true)
        setLocalError(null)

        const clientName = clientSearch.trim()

        try {
            const { data, error: createError } = await supabase
                .from('clients')
                .insert({
                    org_id: orgId,
                    owner_id: user.id,
                    name: clientName,
                })
                .select('id, name')
                .single()

            if (createError) throw createError

            if (data) {
                setClients((prev) => [...prev, data])
                onChange(data.id, data.name)
                setClientSearch(data.name)
                setClientDropdownOpen(false)
            }
        } catch (err: unknown) {
            setLocalError((err as Error).message || 'Failed to create client')
        } finally {
            setCreatingClient(false)
        }
    }

    const displayError = error || localError

    return (
        <div className="flex flex-col gap-2 relative">
            <div className="relative">
                <Input
                    placeholder={placeholder}
                    value={clientSearch}
                    onFocus={() => {
                        if (value) {
                            onChange('', '')
                            setClientSearch('')
                        }
                        setClientDropdownOpen(true)
                    }}
                    onBlur={() => {
                        setTimeout(() => setClientDropdownOpen(false), 150)
                    }}
                    onChange={(e) => {
                        setClientSearch(e.target.value)
                        onChange('', '')
                        setClientDropdownOpen(true)
                    }}
                    className={`h-11 pr-10 rounded-xl bg-muted/30 border-muted-foreground/10 focus-visible:ring-1 focus-visible:bg-background transition-all shadow-none ${displayError ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                />
                <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    onClick={() => {
                        setClientDropdownOpen(!clientDropdownOpen)
                    }}
                >
                    <ChevronDown size={16} className={`transition-transform duration-200 ${clientDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {clientDropdownOpen && (
                <div className="absolute top-[100%] left-0 z-10 w-full mt-1 border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-md bg-popover">
                    {filteredClients.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3"
                            onClick={() => {
                                onChange(c.id, c.name)
                                setClientSearch(c.name)
                                setClientDropdownOpen(false)
                            }}
                        >
                            <span className="text-sm text-foreground truncate">{c.name}</span>
                            {c.source && (
                                <span className="text-[11px] text-muted-foreground/60 shrink-0 capitalize">{c.source}</span>
                            )}
                        </button>
                    ))}

                    {filteredClients.length === 0 && !clientSearch.trim() && (
                        <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                            No clients created yet.
                        </div>
                    )}

                    {!exactMatchExists && clientSearch.trim() && (
                        <div className="border-t border-border bg-muted/20">
                            <button
                                type="button"
                                disabled={creatingClient}
                                onClick={handleCreateClient}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                            >
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary shrink-0">
                                    +
                                </span>
                                <div className="flex flex-col items-start truncate text-left">
                                    <span className="truncate w-full max-w-[300px]">Create "{clientSearch.trim()}"</span>
                                    <span className="text-xs text-muted-foreground font-normal">Add as a new client</span>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {displayError && (
                <p className="text-xs text-destructive mt-1">{displayError}</p>
            )}
        </div>
    )
}
