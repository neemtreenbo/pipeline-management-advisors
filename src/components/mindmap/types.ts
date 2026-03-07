export interface MindmapPositions {
  [nodeId: string]: { x: number; y: number }
}

export interface MindmapClientNodeData extends Record<string, unknown> {
  clientId: string
  name: string
  profilePictureUrl: string | null
}

export type StickyColor = 'yellow' | 'pink' | 'blue' | 'green'

export interface MindmapSticky {
  id: string
  text: string
  color: StickyColor
  createdAt: string
}

export interface MindmapStickyNodeData extends Record<string, unknown> {
  stickyId: string
  text: string
  color: StickyColor
  onTextChange: (id: string, text: string) => void
  onDelete: (id: string) => void
  onColorChange: (id: string, color: StickyColor) => void
}
