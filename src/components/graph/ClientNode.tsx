import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useNavigate } from 'react-router-dom'
import ClientAvatar from '@/components/pipeline/ClientAvatar'
import type { ClientNodeData } from '@/hooks/useGraphData'

export default memo(function ClientNode({ data }: NodeProps<Node<ClientNodeData>>) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/app/clients/${data.clientId}`)}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer
        transition-shadow duration-150 hover:shadow-md select-none
        bg-card text-card-foreground
        ${data.isFocused
          ? 'border-accent ring-2 ring-accent/30 shadow-md'
          : 'border-border hover:border-accent/50'
        }
      `}
      style={{ minWidth: 120, maxWidth: 200 }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <ClientAvatar
        name={data.name}
        profilePictureUrl={data.profilePictureUrl}
        size="sm"
      />
      <span className="text-xs font-medium text-foreground truncate leading-tight">
        {data.name}
      </span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
})
