export const queryKeys = {
  clients: {
    all: (orgId: string) => ['clients', orgId] as const,
    detail: (clientId: string) => ['clients', 'detail', clientId] as const,
    list: (orgId: string) => ['clients', 'list', orgId] as const,
    relationships: (clientId: string) => ['clients', 'relationships', clientId] as const,
    network: (orgId: string) => ['clients', 'network', orgId] as const,
    networkPositions: (orgId: string, userId: string) => ['clients', 'networkPositions', orgId, userId] as const,
  },
  deals: {
    all: (orgId: string) => ['deals', orgId] as const,
    detail: (dealId: string) => ['deals', 'detail', dealId] as const,
    byClient: (clientId: string) => ['deals', 'byClient', clientId] as const,
    activities: (dealId: string) => ['deals', 'activities', dealId] as const,
    attachmentCounts: (orgId: string) => ['deals', 'attachmentCounts', orgId] as const,
    stageHistories: (orgId: string) => ['deals', 'stageHistories', orgId] as const,
  },
  notes: {
    all: (orgId: string) => ['notes', orgId] as const,
    paginated: (orgId: string) => ['notes', 'paginated', orgId] as const,
    detail: (noteId: string) => ['notes', 'detail', noteId] as const,
    byEntity: (entityType: string, entityId: string) =>
      ['notes', 'byEntity', entityType, entityId] as const,
    clientInfo: (noteIds: string[]) => ['notes', 'clientInfo', ...noteIds] as const,
    withClients: (orgId: string) => ['notes', 'withClients', orgId] as const,
  },
  tasks: {
    all: (orgId: string) => ['tasks', orgId] as const,
    filtered: (orgId: string, view: string) => ['tasks', orgId, view] as const,
    byEntity: (entityType: string, entityId: string) =>
      ['tasks', 'byEntity', entityType, entityId] as const,
    links: (taskId: string) => ['tasks', 'links', taskId] as const,
    clientInfo: (taskIds: string[]) => ['tasks', 'clientInfo', ...taskIds] as const,
  },
  attachments: {
    byDeal: (dealId: string) => ['attachments', dealId] as const,
  },
  policies: {
    all: (orgId: string) => ['policies', orgId] as const,
    detail: (policyId: string) => ['policies', 'detail', policyId] as const,
    byClient: (clientId: string) => ['policies', 'byClient', clientId] as const,
  },
  serviceRequests: {
    all: (orgId: string) => ['serviceRequests', orgId] as const,
    detail: (id: string) => ['serviceRequests', 'detail', id] as const,
    byClient: (clientId: string) => ['serviceRequests', 'byClient', clientId] as const,
    byPolicy: (policyId: string) => ['serviceRequests', 'byPolicy', policyId] as const,
    attachments: (id: string) => ['serviceRequests', 'attachments', id] as const,
    activities: (id: string) => ['serviceRequests', 'activities', id] as const,
  },
  comments: {
    byEntity: (entityType: string, entityId: string) => ['comments', entityType, entityId] as const,
  },
  members: {
    byOrg: (orgId: string) => ['members', orgId] as const,
  },
  search: {
    global: (orgId: string, query: string) => ['search', 'global', orgId, query] as const,
    entityLinking: (orgId: string, query: string, excludeNoteId: string) =>
      ['search', 'entityLinking', orgId, query, excludeNoteId] as const,
  },
} as const
