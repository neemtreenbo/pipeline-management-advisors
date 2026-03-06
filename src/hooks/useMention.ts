import { useState, useMemo, useCallback } from 'react'

export interface ClientOption {
    id: string
    name: string
}

interface UseMentionReturn {
    mentionQuery: string | null
    mentionClients: ClientOption[]
    selectedClientId: string
    selectedClientName: string | null
    setSelectedClientId: (id: string) => void
    /** Call on every title change to detect @mention patterns */
    detectMention: (value: string) => void
    /** Call when user selects a mention. Returns the new title with @query stripped. */
    selectMention: (client: ClientOption, currentTitle: string) => string
    /** Close the mention popup without selecting */
    closeMention: () => void
    /** Reset all mention state (query + selection) */
    reset: (initialClientId?: string) => void
}

export function useMention(
    availableClients: ClientOption[],
    initialClientId = ''
): UseMentionReturn {
    const [mentionQuery, setMentionQuery] = useState<string | null>(null)
    const [selectedClientId, setSelectedClientId] = useState(initialClientId)

    const mentionClients = useMemo(() =>
        mentionQuery !== null
            ? availableClients.filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
            : [],
        [mentionQuery, availableClients]
    )

    const selectedClientName = useMemo(() =>
        availableClients.find(c => c.id === selectedClientId)?.name ?? null,
        [selectedClientId, availableClients]
    )

    const detectMention = useCallback((value: string) => {
        const lastAt = value.lastIndexOf('@')
        if (lastAt !== -1) {
            const afterAt = value.slice(lastAt + 1)
            if (!afterAt.includes(' ')) {
                setMentionQuery(afterAt)
                return
            }
        }
        setMentionQuery(null)
    }, [])

    const selectMention = useCallback((client: ClientOption, currentTitle: string): string => {
        const lastAt = currentTitle.lastIndexOf('@')
        const newTitle = currentTitle.slice(0, lastAt).trimEnd()
        setSelectedClientId(client.id)
        setMentionQuery(null)
        return newTitle
    }, [])

    const closeMention = useCallback(() => {
        setMentionQuery(null)
    }, [])

    const reset = useCallback((newInitialClientId = '') => {
        setMentionQuery(null)
        setSelectedClientId(newInitialClientId)
    }, [])

    return {
        mentionQuery,
        mentionClients,
        selectedClientId,
        selectedClientName,
        setSelectedClientId,
        detectMention,
        selectMention,
        closeMention,
        reset,
    }
}
