import { memo } from 'react'
import { type NodeProps, type Node } from '@xyflow/react'
import { useNavigate } from 'react-router-dom'
import ClientAvatar from '@/components/pipeline/ClientAvatar'
import type { MindmapClientNodeData } from './types'

export default memo(function MindmapClientNode({ data }: NodeProps<Node<MindmapClientNodeData>>) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/app/clients/${data.clientId}`)}
      className="flex items-center gap-2 rounded-xl border cursor-pointer
        transition-shadow duration-150 hover:shadow-md select-none
        text-card-foreground px-3.5 py-2.5 bg-accent/5 border-accent/30
        shadow-md ring-2 ring-accent/30"
      style={{ width: 160, height: 48 }}
    >
      <div className="shrink-0">
        <ClientAvatar name={data.name} profilePictureUrl={data.profilePictureUrl} size="sm" />
      </div>
      <span className="truncate leading-tight text-xs font-semibold text-foreground">
        {data.name}
      </span>
    </div>
  )
})
