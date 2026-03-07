import { memo, useState, useRef, useEffect } from 'react'
import { type NodeProps, type Node } from '@xyflow/react'
import { X } from 'lucide-react'
import type { MindmapStickyNodeData, StickyColor } from './types'

const STICKY_COLORS: Record<StickyColor, { bg: string; border: string; dot: string }> = {
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    border: 'border-yellow-300 dark:border-yellow-700',
    dot: 'bg-yellow-400',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/40',
    border: 'border-pink-300 dark:border-pink-700',
    dot: 'bg-pink-400',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    border: 'border-blue-300 dark:border-blue-700',
    dot: 'bg-blue-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    border: 'border-green-300 dark:border-green-700',
    dot: 'bg-green-400',
  },
}

const COLOR_KEYS: StickyColor[] = ['yellow', 'pink', 'blue', 'green']

export default memo(function MindmapStickyNode({ data }: NodeProps<Node<MindmapStickyNodeData>>) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(data.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const colors = STICKY_COLORS[data.color]

  // Sync text when data changes externally
  useEffect(() => {
    if (!isEditing) setText(data.text)
  }, [data.text, isEditing])

  const commitEdit = () => {
    setIsEditing(false)
    if (text !== data.text) data.onTextChange(data.stickyId, text)
  }

  return (
    <div
      className={`group relative rounded-lg border ${colors.bg} ${colors.border} shadow-md select-none p-2.5`}
      style={{ width: 140, minHeight: 80 }}
      onDoubleClick={() => {
        setIsEditing(true)
        setTimeout(() => textareaRef.current?.focus(), 0)
      }}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          data.onDelete(data.stickyId)
        }}
        className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-card border border-border
          flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
          hover:bg-destructive hover:text-white hover:border-destructive"
      >
        <X size={10} />
      </button>

      {/* Color picker dots */}
      <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {COLOR_KEYS.map((c) => (
          <button
            key={c}
            onClick={(e) => {
              e.stopPropagation()
              data.onColorChange(data.stickyId, c)
            }}
            className={`w-3 h-3 rounded-full ${STICKY_COLORS[c].dot} border border-white/50
              ${c === data.color ? 'ring-1 ring-foreground/30 ring-offset-1' : ''}
              hover:scale-125 transition-transform`}
          />
        ))}
      </div>

      {/* Content */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="nodrag nowheel w-full bg-transparent text-[11px] leading-relaxed
            font-medium text-foreground resize-none outline-none placeholder:text-foreground/40"
          style={{ minHeight: 50 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') commitEdit()
          }}
          placeholder="Type a note..."
        />
      ) : (
        <p className="text-[11px] leading-relaxed font-medium text-foreground whitespace-pre-wrap break-words min-h-[50px]">
          {data.text || 'Double-click to edit'}
        </p>
      )}
    </div>
  )
})
