import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useNavigate } from 'react-router-dom'
import { FileText, DollarSign, CheckSquare } from 'lucide-react'

export interface EntityNodeData extends Record<string, unknown> {
  entityType: 'deal' | 'note' | 'tasks'
  label: string
  subtitle?: string
  navigateTo?: string
}

const handleStyle = {
  width: 10,
  height: 10,
  background: 'hsl(var(--accent))',
  border: '2px solid hsl(var(--background))',
  opacity: 0,
  transition: 'opacity 0.15s ease',
}

const ICON_MAP = {
  deal: DollarSign,
  note: FileText,
  tasks: CheckSquare,
}

const COLOR_MAP = {
  deal: 'text-green-500',
  note: 'text-blue-500',
  tasks: 'text-orange-500',
}

export default memo(function EntityNode({ data }: NodeProps<Node<EntityNodeData>>) {
  const navigate = useNavigate()
  const Icon = ICON_MAP[data.entityType]

  return (
    <div
      onClick={() => data.navigateTo && navigate(data.navigateTo)}
      className={`
        group flex items-center gap-2 rounded-xl border px-3 py-2
        bg-card border-border hover:border-accent/50
        transition-shadow duration-150 hover:shadow-md select-none
        text-card-foreground
        ${data.navigateTo ? 'cursor-pointer' : ''}
      `}
      style={{ width: 160, height: 48 }}
    >
      <Handle type="target" id="top" position={Position.Top} style={handleStyle} className="!opacity-0 group-hover:!opacity-100" />
      <Handle type="target" id="right" position={Position.Right} style={handleStyle} className="!opacity-0 group-hover:!opacity-100" />
      <Handle type="target" id="bottom" position={Position.Bottom} style={handleStyle} className="!opacity-0 group-hover:!opacity-100" />
      <Handle type="target" id="left" position={Position.Left} style={handleStyle} className="!opacity-0 group-hover:!opacity-100" />
      <Handle type="source" id="top" position={Position.Top} style={handleStyle} className="!opacity-0 group-hover:!opacity-100" />
      <Handle type="source" id="right" position={Position.Right} style={handleStyle} className="!opacity-0 group-hover:!opacity-100" />
      <Handle type="source" id="bottom" position={Position.Bottom} style={handleStyle} className="!opacity-0 group-hover:!opacity-100" />
      <Handle type="source" id="left" position={Position.Left} style={handleStyle} className="!opacity-0 group-hover:!opacity-100" />
      <Icon className={`shrink-0 w-4 h-4 ${COLOR_MAP[data.entityType]}`} />
      <div className="min-w-0 flex flex-col">
        <span className="text-xs font-medium text-foreground truncate leading-tight">
          {data.label}
        </span>
        {data.subtitle && (
          <span className="text-[10px] text-muted-foreground truncate leading-tight">
            {data.subtitle}
          </span>
        )}
      </div>
    </div>
  )
})
