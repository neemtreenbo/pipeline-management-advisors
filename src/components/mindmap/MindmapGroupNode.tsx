import { memo } from 'react'
import { type NodeProps, type Node } from '@xyflow/react'
import { useNavigate } from 'react-router-dom'
import { FileText, DollarSign, CheckSquare } from 'lucide-react'

export interface GroupNodeItem {
  label: string
  subtitle?: string
  navigateTo?: string
}

export interface GroupNodeData extends Record<string, unknown> {
  entityType: 'deal' | 'note' | 'tasks'
  title: string
  items: GroupNodeItem[]
}

const ICON_MAP = {
  deal: DollarSign,
  note: FileText,
  tasks: CheckSquare,
}

const COLOR_MAP = {
  deal: { icon: 'text-green-500', border: 'border-green-500/30', bg: 'bg-green-500/5' },
  note: { icon: 'text-blue-500', border: 'border-blue-500/30', bg: 'bg-blue-500/5' },
  tasks: { icon: 'text-orange-500', border: 'border-orange-500/30', bg: 'bg-orange-500/5' },
}

export default memo(function MindmapGroupNode({ data }: NodeProps<Node<GroupNodeData>>) {
  const navigate = useNavigate()
  const Icon = ICON_MAP[data.entityType]
  const colors = COLOR_MAP[data.entityType]

  return (
    <div
      className={`
        rounded-xl border ${colors.border} ${colors.bg}
        shadow-sm select-none text-card-foreground
      `}
      style={{ width: 200 }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <Icon className={`shrink-0 w-4 h-4 ${colors.icon}`} />
        <span className="text-xs font-semibold text-foreground">{data.title}</span>
      </div>
      <div className="flex flex-col">
        {data.items.map((item, i) => (
          <div
            key={i}
            onClick={() => item.navigateTo && navigate(item.navigateTo)}
            className={`
              flex items-center justify-between px-3 py-1.5
              ${item.navigateTo ? 'cursor-pointer hover:bg-accent/10' : ''}
              ${i < data.items.length - 1 ? 'border-b border-border/30' : ''}
            `}
          >
            <span className="text-[11px] font-medium text-foreground truncate mr-2">
              {item.label}
            </span>
            {item.subtitle && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {item.subtitle}
              </span>
            )}
          </div>
        ))}
        {data.items.length === 0 && (
          <div className="px-3 py-2">
            <span className="text-[11px] text-muted-foreground">None</span>
          </div>
        )}
      </div>
    </div>
  )
})
