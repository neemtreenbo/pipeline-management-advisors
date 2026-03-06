import React from 'react'
import { X } from 'lucide-react'

interface ClientChipProps {
    name: string
    onRemove: () => void
}

const ClientChip = React.memo(function ClientChip({ name, onRemove }: ClientChipProps) {
    return (
        <div className="flex items-center gap-2 px-4 pb-2.5 pl-11">
            <span className="flex items-center gap-1 text-[11px] text-foreground/80 bg-muted rounded-full px-2.5 py-0.5">
                <span className="text-foreground/40">@</span>
                {name}
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onRemove}
                    className="ml-0.5 text-foreground/30 hover:text-foreground/60 transition-colors"
                >
                    <X size={9} />
                </button>
            </span>
        </div>
    )
})

export default ClientChip
