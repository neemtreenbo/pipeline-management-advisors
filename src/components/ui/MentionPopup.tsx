import React from 'react'
import type { ClientOption } from '@/hooks/useMention'

interface MentionPopupProps {
    clients: ClientOption[]
    anchorRef: React.RefObject<HTMLInputElement | null>
    onSelect: (client: ClientOption) => void
}

const MentionPopup = React.memo(function MentionPopup({ clients, anchorRef, onSelect }: MentionPopupProps) {
    if (!clients.length || !anchorRef.current) return null

    const rect = anchorRef.current.getBoundingClientRect()

    return (
        <div
            style={{
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                zIndex: 50,
            }}
            className="bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[180px]"
        >
            {clients.map(c => (
                <button
                    key={c.id}
                    onMouseDown={(e) => { e.preventDefault(); onSelect(c) }}
                    className="w-full text-left px-4 py-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                    <span className="text-muted-foreground/40 mr-0.5">@</span>
                    {c.name}
                </button>
            ))}
        </div>
    )
})

export default MentionPopup
