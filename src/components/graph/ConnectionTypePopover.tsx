import { useEffect, useRef } from 'react'
import type { ClientRelationType } from '@/lib/clientRelationships'

const RELATION_OPTIONS: { value: ClientRelationType; label: string; color: string }[] = [
  { value: 'spouse', label: 'Spouse', color: '#0A84FF' },
  { value: 'child', label: 'Child', color: '#FF9F0A' },
  { value: 'family', label: 'Family', color: '#30D158' },
  { value: 'friend', label: 'Friend', color: '#FF6B6B' },
  { value: 'referred_by', label: 'Referred By', color: '#BF5AF2' },
]

interface ConnectionTypePopoverProps {
  x: number
  y: number
  onSelect: (relationType: ClientRelationType) => void
  onClose: () => void
}

export default function ConnectionTypePopover({
  x,
  y,
  onSelect,
  onClose,
}: ConnectionTypePopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-50 rounded-xl border border-border bg-card shadow-lg p-1.5 min-w-[140px]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      <p className="text-[10px] font-medium text-muted-foreground px-2 py-1">
        Relationship type
      </p>
      {RELATION_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: opt.color }}
          />
          {opt.label}
        </button>
      ))}
    </div>
  )
}
