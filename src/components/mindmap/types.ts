export interface MindmapPositions {
  [nodeId: string]: { x: number; y: number }
}

export interface MindmapClientNodeData extends Record<string, unknown> {
  clientId: string
  name: string
  profilePictureUrl: string | null
}
