# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite development server
npm run build     # tsc -b && vite build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

No test suite is configured.

## Environment

Requires a `.env` file with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

## Architecture Overview

**Stack:** React 19 + TypeScript + Vite, Supabase (PostgreSQL + Auth + Storage), Tailwind CSS, Radix UI primitives, Framer Motion, BlockNote editor, @hello-pangea/dnd for drag-and-drop.

**Path alias:** `@/` maps to `./src/`.

### Routing & Auth

- `src/main.tsx`: Wraps app with `BrowserRouter → AuthProvider → App`
- `src/App.tsx`: All routes. Protected routes use `<ProtectedRoute>` which checks auth, then render inside `<AppLayout>` (which provides `PageActionsProvider`)
- Public routes: `/`, `/login`, `/signup`, `/forgot-password`
- Protected routes under `/app/`: home, clients, pipeline, deals, tasks, notes

### State Management

Only React Context — no Redux/Zustand:

- **`AuthContext`** (`src/contexts/AuthContext.tsx`): Supabase session/user state. Use `useAuth()` hook.
- **`PageActionsContext`** (`src/contexts/PageActionsContext.tsx`): Portal system for pages to inject UI (search bars, action buttons) into the shared `DynamicIslandNav`. Pages call `setPortalNode(...)` on mount and `setPortalNode(null)` on unmount.

### Navigation

`DynamicIslandNav` is a floating pill-shaped navbar with Framer Motion animations. It renders a portal slot for page-specific actions injected via `PageActionsContext`. This is how per-page headers, search inputs, and action buttons appear inside the nav bar.

### Database Access

All Supabase queries are centralized in `src/lib/`:
- `deals.ts`, `notes.ts`, `tasks.ts`, `attachments.ts` — typed async functions that throw on error
- `supabase.ts` — client initialization
- `database.types.ts` — auto-generated types from Supabase schema (Row, Insert, Update per table)

Pattern:
```ts
export async function fetchX(orgId: string): Promise<X[]> {
  const { data, error } = await supabase.from('x').select(...).eq('org_id', orgId)
  if (error) throw error
  return (data ?? []) as X[]
}
```

### Database Schema (key tables)

- **profiles, organizations, memberships**: Multi-org support with roles (admin, manager, member, viewer). RLS helper functions: `is_org_admin()`, `is_org_member()`, etc.
- **clients**: Sales contacts with JSONB fields for `data`, `talking_points`, `education`, `experiences`
- **deals**: Kanban pipeline with stages: Opportunity → Contacted → Engaged → Schedule To Present → Proposal Presented → Decision Pending → Closed. Has `order_index` for column ordering.
- **notes**: Rich text stored as JSONB (BlockNote format)
- **tasks**: Action items with status/priority, linkable to any entity
- **links**: Generic entity relationship graph — connects any `(from_type, from_id)` to `(to_type, to_id)`. Used to link notes/tasks to clients, deals, proposals.
- **activities**: Audit log of all significant actions
- **deal_attachments**: File metadata; actual files in Supabase Storage

### UI Components

- `src/components/ui/` — Radix-based primitives (button, card, tabs, badge, input, etc.) using `cva` + `cn` pattern
- `src/components/layout/` — `AppLayout` and `DynamicIslandNav`
- Feature components grouped by domain: `components/pipeline/`, `components/notes/`, `components/tasks/`

### Styling

Tailwind with custom design tokens (defined in `tailwind.config.js`):
- Primary: `#111111`, Accent: `#0A84FF`, Success: `#30D158`, Warning: `#FF9F0A`, Destructive: `#FF453A`
- Dark mode via `class` strategy
- Use `cn()` from `src/lib/utils.ts` for conditional class merging

### Supabase Migrations

Schema changes go in `supabase/migrations/`. Apply with the Supabase MCP tool (`apply_migration`) or Supabase CLI. The `database.types.ts` file should be regenerated after schema changes.
