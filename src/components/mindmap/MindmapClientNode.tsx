import { memo } from 'react'
import { type NodeProps, type Node } from '@xyflow/react'
import { useNavigate } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'
import ClientAvatar from '@/components/pipeline/ClientAvatar'
import type { MindmapClientNodeData } from './types'

export default memo(function MindmapClientNode({ data }: NodeProps<Node<MindmapClientNodeData>>) {
  const navigate = useNavigate()
  const hasContact = data.email || data.phone

  return (
    <div
      onClick={() => navigate(`/app/clients/${data.clientId}`)}
      className="flex items-center gap-2.5 rounded-xl border cursor-pointer
        transition-shadow duration-150 hover:shadow-lg select-none
        text-card-foreground px-3.5 py-2.5 bg-accent/5 border-accent/30
        shadow-md ring-2 ring-accent/30 max-w-[260px]"
    >
      <div className="shrink-0">
        <ClientAvatar name={data.name} profilePictureUrl={data.profilePictureUrl} size="md" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="truncate leading-tight text-xs font-semibold text-foreground">
          {data.name}
        </span>
        {hasContact && (
          <div className="flex flex-col gap-0.5 mt-1">
            {data.email && (
              <div className="flex items-center gap-1 min-w-0">
                <Mail size={10} className="shrink-0 text-muted-foreground/50" />
                <span className="truncate text-[10px] text-muted-foreground">{data.email}</span>
              </div>
            )}
            {data.phone && (
              <div className="flex items-center gap-1 min-w-0">
                <Phone size={10} className="shrink-0 text-muted-foreground/50" />
                <span className="truncate text-[10px] text-muted-foreground">{data.phone}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
