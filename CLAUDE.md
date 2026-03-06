# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite development server
npm run build     # tsc -b && vite build
npm run lint      # Run ESLint (flat config, ESLint 9+)
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

**Stack:** React 19 + TypeScript + Vite 7, Supabase (PostgreSQL + Auth + Storage), Tailwind CSS 3, Radix UI primitives, Framer Motion, BlockNote editor, @hello-pangea/dnd for drag-and-drop, Lucide React icons.

**Path alias:** `@/` maps to `./src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

### Project Structure

```
src/
├── main.tsx                    # Entry: BrowserRouter → AuthProvider → App
├── App.tsx                     # All route definitions
├── contexts/
│   ├── AuthContext.tsx          # Supabase session/user state → useAuth()
│   └── PageActionsContext.tsx   # Portal system for nav actions → usePageActions()
├── lib/
│   ├── supabase.ts             # Supabase client singleton
│   ├── utils.ts                # cn() helper (clsx + tailwind-merge)
│   ├── deals.ts                # Deal CRUD + activity logging
│   ├── tasks.ts                # Task CRUD + client linking via links table
│   ├── notes.ts                # Note CRUD + entity linking + search
│   ├── attachments.ts          # File upload/download + validation (10MB max)
│   └── database.types.ts       # Auto-generated Supabase types
├── pages/
│   ├── LandingPage.tsx, LoginPage.tsx, SignupPage.tsx, ForgotPasswordPage.tsx
│   └── app/
│       ├── HomePage.tsx         # Dashboard with quick navigation
│       ├── pipeline/
│       │   ├── PipelinePage.tsx  # Kanban board with drag-and-drop
│       │   └── DealDetailPage.tsx
│       ├── clients/
│       │   ├── ClientsPage.tsx   # Inline-editable table
│       │   └── ClientDetailPage.tsx
│       ├── tasks/
│       │   └── TasksPage.tsx     # Views: today/upcoming/overdue
│       └── notes/
│           ├── NotesPage.tsx     # Notes grouped by client
│           └── NoteDetailPage.tsx # BlockNote editor + auto-save
└── components/
    ├── ProtectedRoute.tsx
    ├── layout/
    │   ├── AppLayout.tsx         # PageActionsProvider + DynamicIslandNav + Outlet
    │   └── DynamicIslandNav.tsx  # Floating pill navbar with portal slot
    ├── pipeline/                 # KanbanColumn, DealCard, NewDealModal, etc.
    ├── notes/                    # BlockNoteEditor, NoteLinks, AddLinkModal
    ├── tasks/                    # TaskList, TaskItem, TaskDialog, EntityTasks
    └── ui/                       # Radix-based primitives (button, card, input, etc.)
```

### Routing

**Public routes:** `/`, `/login`, `/signup`, `/forgot-password`

**Protected routes** (wrapped with `<ProtectedRoute>` → `<AppLayout>`):
- `/app/home` → HomePage
- `/app/clients` → ClientsPage
- `/app/clients/:clientId` → ClientDetailPage
- `/app/pipeline` → PipelinePage (Kanban)
- `/app/deals/:dealId` → DealDetailPage
- `/app/tasks` → TasksPage
- `/app/notes` → NotesPage
- `/app/notes/:noteId` → NoteDetailPage

Catch-all `*` redirects to `/`.

### Auth & State Management

React Context only — no Redux/Zustand:

- **`AuthContext`** (`useAuth()` hook): Supabase session, user, loading state, signOut. Wraps entire app in `main.tsx`.
- **`PageActionsContext`** (`usePageActions()` hook): Portal system allowing pages to inject UI (search bars, action buttons) into `DynamicIslandNav`. Pages call `setPortalNode(...)` on mount and `setPortalNode(null)` on unmount.

### Navigation

`DynamicIslandNav` is a floating pill-shaped navbar with Framer Motion animations. It renders 5 nav links (Home, Clients, Pipeline, Tasks, Notes), a user avatar dropdown, and a portal slot for page-specific actions injected via `PageActionsContext`.

### Database Access Layer

All Supabase queries are centralized in `src/lib/`. Each module exports typed async functions that throw on error.

**Pattern:**
```ts
export async function fetchX(orgId: string): Promise<X[]> {
  const { data, error } = await supabase.from('x').select(...).eq('org_id', orgId)
  if (error) throw error
  return (data ?? []) as X[]
}
```

**Key modules:**
- `deals.ts` — CRUD + `PIPELINE_STAGES` constant (7 stages: Opportunity → Closed) + activity logging + `order_index` for Kanban ordering
- `tasks.ts` — CRUD + view filtering (today/upcoming/overdue) + client linking via `links` table + `getClientsForTasks()` for resolving client info
- `notes.ts` — CRUD + entity linking + `searchEntitiesForLinking()` + throttled activity logging (1hr)
- `attachments.ts` — File upload to Supabase Storage + signed URLs + MIME validation + 10MB limit

### Database Schema

**Core entities:**
- **profiles** — Linked to `auth.users` via trigger on signup
- **organizations** — Multi-org support with settings JSONB
- **memberships** — Roles: admin, manager, member, viewer. Statuses: active, pending, suspended
- **clients** — Sales contacts with JSONB fields (`data`, `talking_points`, `education`, `experiences`)
- **deals** — Kanban pipeline stages: Opportunity → Contacted → Engaged → Schedule To Present → Proposal Presented → Decision Pending → Closed. Has `order_index` for column ordering
- **tasks** — Action items with status/priority, due dates, `completed_at`
- **notes** — Rich text stored as JSONB (BlockNote format)
- **proposals** — Deal proposals with status tracking and AI summary field

**Relationship system:**
- **links** — Generic entity graph: `(from_type, from_id) → (to_type, to_id)` with optional `relation_type`. Used to connect notes/tasks to clients, deals, proposals
- **activities** — Audit log of all significant actions (entity_type, entity_id, event_type, data JSONB)
- **deal_attachments** — File metadata; actual files in Supabase Storage `deal-files` bucket

**RLS:** Row-level security on all tables. Helper functions: `is_org_member()`, `is_org_admin()`, `is_org_manager()`.

**Migrations:** `supabase/migrations/` numbered `0000`-`0006` for base schema, then timestamped (`YYYYMMDDHHMMSS_*`) for incremental changes.

### Key Architectural Patterns

1. **Multi-org scoping** — Every query filters by `org_id`; pages fetch org membership first via the logged-in user
2. **Entity linking via links table** — Flexible N-N relationships without hardcoded foreign keys; helper functions resolve transitive relationships (e.g., task → deal → client)
3. **Portal system for nav actions** — Pages inject search bars and buttons into `DynamicIslandNav` via `PageActionsContext`, avoiding prop drilling
4. **Optimistic updates** — Kanban drag-and-drop updates UI immediately, reverts on API error
5. **Inline editing** — ClientsPage, TasksPage, DealDetailPage use click-to-edit cells with autofocus
6. **Debounced auto-save** — NoteDetailPage saves content with 1s debounce; activity logging throttled to 1hr
7. **Activity audit trail** — All significant actions logged to `activities` table for timeline views

### UI Components

- `src/components/ui/` — Radix-based primitives using `class-variance-authority` (CVA) + `cn()` pattern
- Feature components grouped by domain: `pipeline/`, `notes/`, `tasks/`
- Icons: Lucide React

### Styling

Tailwind CSS with custom design tokens in `tailwind.config.js`:
- **Dark mode:** `class` strategy
- **Colors:** Primary `#111111`, Accent `#0A84FF`, Success `#30D158`, Warning `#FF9F0A`, Destructive `#FF453A`, Muted `#F8F8F8`
- **Font:** Inter + system fallbacks
- **Border radius:** lg `0.75rem`, md `0.5rem`, sm `0.375rem`
- Use `cn()` from `src/lib/utils.ts` for conditional class merging

### Supabase Migrations

Schema changes go in `supabase/migrations/`. Apply with the Supabase MCP tool (`apply_migration`) or Supabase CLI. The `database.types.ts` file should be regenerated after schema changes.

### Key Types

```ts
// Deal stages (from deals.ts)
type DealStage = 'Opportunity' | 'Contacted' | 'Engaged' | 'Schedule To Present'
  | 'Proposal Presented' | 'Decision Pending' | 'Closed'

// Task view options (from tasks.ts)
type TaskView = 'today' | 'upcoming' | 'overdue' | 'all'

// Attachment types (from attachments.ts)
type FileType = 'proposal' | 'supporting_document'

// Entity types used in links table
type EntityType = 'client' | 'deal' | 'proposal' | 'note' | 'task'

// Supabase table type helpers (from database.types.ts)
Tables<'table_name'>       // Row type
TablesInsert<'table_name'> // Insert type
TablesUpdate<'table_name'> // Update type
```

### Conventions

- All data access goes through `src/lib/` — never query Supabase directly from components
- Use `useAuth()` for session/user, never access Supabase auth directly in components
- Use `usePageActions().setPortalNode()` to add page-specific UI to the navbar
- Prefer `Tables<'x'>` types from `database.types.ts` for Supabase row types
- Activity logging: always log significant actions via the appropriate `log*Activity` function
- Error handling: lib functions throw; pages catch and display errors
