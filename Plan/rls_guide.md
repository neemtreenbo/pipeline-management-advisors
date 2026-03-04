# Access Control Plan (RLS + Roles) — Sales Rep CRM

This document defines the authorization model for the Sales Rep CRM using Supabase Auth + Postgres Row Level Security (RLS).

Goals:
- Secure multi-tenant isolation by **organization**
- Enable collaboration inside an org with simple roles
- Support manager visibility (read-only or full) without bloating the model
- Keep policies implementable and predictable

---

## 1) Identity Model

### Auth and Profile
- `auth.users` = authentication identity
- `profiles` = app-level user profile (same `id` as `auth.users.id`)

### Workspace Model
- `organizations` = tenant/workspace boundary
- `memberships` = user ↔ organization mapping + role

Every record in CRM tables MUST have `org_id`.

---

## 2) Roles

Roles live in `memberships.role`.

### Role Definitions
- **admin**
  - Full control of org configuration and data
- **manager**
  - Visibility across the org (default) + can create/edit records
  - Used for team oversight (Home team summary, stuck deals, overdue follow-ups)
- **member**
  - Regular advisor/user
  - Can create and manage their own records
- **viewer**
  - Read-only access (typically via magic link or explicit membership)
  - No writes

Notes:
- “Manager visibility” can be tuned per org via `organizations.settings` if needed later.
- V1 keeps the role set minimal.

---

## 3) Ownership and Assignment Fields (Standard Columns)

To keep RLS simple and consistent, tables use these patterns:

### Core Columns
- `org_id` (uuid) — required on all business tables
- `owner_id` (uuid) — creator/primary owner (clients/deals/tasks/proposals)
- `assignee_id` (uuid) — execution owner (tasks; optionally deals later)
- `author_id` (uuid) — notes creator
- `actor_id` (uuid) — activities performer

Ownership rules:
- Members can manage records they own
- Managers/admins can see and manage broader org data (based on policies below)
- Viewers can only read

---

## 4) Membership Gate (Org Isolation Rule)

A user can access a record only if:
- user has an active membership in the record’s `org_id`

Membership status:
- `memberships.status = 'active'` is required for access

This is the base condition for most policies:
- `is_org_member(org_id)`
- `is_org_admin(org_id)`
- `is_org_manager(org_id)`

---

## 5) Default RLS Policy Pattern

For each table:
- **SELECT**: allowed if org member (with role-based restrictions)
- **INSERT**: allowed if authenticated + org member + role != viewer + org_id matches + ownership matches
- **UPDATE**: allowed if owner OR manager/admin (role-based)
- **DELETE**: allowed if owner OR admin (managers optional; decide below)

V1 simplification:
- Admin: can delete any record
- Manager: can update most records; delete only own (recommended)
- Member: can update/delete own
- Viewer: select only

---

## 6) Table-by-Table Access Rules

### 6.1 profiles
Who can see what:
- Users can **select** their own profile
- Users can **update** their own profile
- Admins/managers do NOT automatically get access to other users’ profiles via RLS
  - If you need “team directory”, create a view that exposes safe fields (name/avatar) for org members

Policy summary:
- select: `id = auth.uid()`
- update: `id = auth.uid()`
- insert: handled by trigger on signup (recommended)

---

### 6.2 organizations
- select:
  - allowed if user is a member of the org
- insert:
  - allowed for authenticated users
  - creator becomes admin via membership insert
- update:
  - admin only
- delete:
  - admin only (and usually disallowed in V1; prefer soft-delete later)

---

### 6.3 memberships
- select:
  - org members can see membership list (needed for assignee pickers)
  - optional: members see only “directory-safe” fields via view
- insert:
  - admin only (inviting users)
- update:
  - admin only (role changes, activation)
- delete:
  - admin only (removal)

---

### 6.4 clients
Purpose: relationship record. Often sensitive.

Recommended V1 model:
- **Org-visible** by default (so managers can coach)
- Editable by owner; managers/admins can edit if needed

Policy summary:
- select:
  - org member can read
- insert:
  - member/manager/admin can create
  - owner_id must equal `auth.uid()`
- update:
  - owner OR manager OR admin
- delete:
  - owner OR admin (manager delete optional; default NO)

Optional tightening (if you want privacy):
- add `visibility` later; V1 skip to stay simple

---

### 6.5 deals
Deals drive pipeline and coaching.

Policy summary:
- select:
  - org member can read
- insert:
  - member/manager/admin can create
  - owner_id must equal `auth.uid()`
- update:
  - owner OR manager OR admin
- delete:
  - owner OR admin

Note:
- If you introduce shared deals later, add a `visibility` or `shared_with` mechanism. Not required in V1.

---

### 6.6 tasks
Tasks are execution items; can be assigned.

Fields:
- owner_id (creator)
- assignee_id (responsible person)

Policy summary:
- select:
  - org member can read (recommended) OR restrict to (owner/assignee/manager)
  - V1 recommended: restrict to owner/assignee/manager/admin for privacy
- insert:
  - member/manager/admin can create
  - owner_id must equal `auth.uid()`
  - assignee_id must be an org member
- update:
  - owner OR assignee OR manager OR admin
- delete:
  - owner OR admin

Recommendation:
- Keep tasks semi-private. Managers can still read for oversight.

---

### 6.7 notes
Notes contain sensitive context; treat like tasks.

Fields:
- author_id (creator)

Policy summary:
- select:
  - author OR manager OR admin
  - optionally allow org-wide read if you want knowledge base behavior (NOT recommended for insurance notes)
- insert:
  - member/manager/admin can create
  - author_id must equal `auth.uid()`
- update:
  - author OR manager OR admin
- delete:
  - author OR admin

Important:
- Since notes can link to anything, do not allow viewers to browse notes unless explicitly desired.

---

### 6.8 proposals
Proposals include uploads + AI summary.

Fields:
- owner_id
- deal_id
- client_id
- link_source
- storage_path
- ai_summary, ai_metadata, data

Policy summary:
- select:
  - owner OR manager OR admin
  - optionally allow deal owner to read even if not proposal owner (recommended)
- insert:
  - member/manager/admin can create
  - owner_id must equal `auth.uid()`
  - deal must belong to same org
- update:
  - owner OR manager OR admin
  - AI pipeline uses service role (bypasses RLS) for updates to ai fields
- delete:
  - owner OR admin

Storage rules:
- proposals bucket is **private**
- clients obtain **signed URLs** via Edge Function (recommended)
- enforce org membership check before signing

---

### 6.9 links (graph edges)
Links connect nodes: client/deal/task/note/proposal.

Policy summary:
- select:
  - allowed if user can access BOTH endpoints (from/to)
  - V1 simplification: allow org member read; rely on endpoint access in UI
- insert:
  - member/manager/admin can create links
  - created_by must equal `auth.uid()`
  - both endpoints must be in same org
- delete:
  - created_by OR admin

Recommendation:
- Keep `links` restricted to prevent cross-org linking.

---

### 6.10 activities (timeline)
Activities are append-only event logs.

Policy summary:
- select:
  - org member read, but optionally restricted to:
    - actor, entity owner, managers/admin
  - V1 recommended: org member read for coaching, but ensure sensitive payloads are minimal
- insert:
  - created via server-side functions or controlled inserts
  - if allowing client inserts, require:
    - actor_id = auth.uid()
    - org_id is member org
- update/delete:
  - disallow updates/deletes (append-only)

Recommendation:
- Keep `activities.data` clean; do not store full note content there.

---

## 7) Viewer Access (Magic Link)

Viewer access model options:

### Option A (simple): Viewer is a membership
- Viewer receives invite, becomes `memberships.role = 'viewer'`
- Viewer can read allowed tables via RLS policies

Best for:
- stable manager visibility
- long-lived access

### Option B (temporary): Magic link session token
- Magic link creates a short-lived access token mapped to:
  - org_id
  - scope (read-only)
  - expiry
- Access is enforced via Edge Function proxying reads OR special RLS using JWT claims (more complex)

V1 recommendation:
- Use **Option A** (viewer as membership). It’s simpler and secure.

---

## 8) Access Matrix (V1 Summary)

Legend:
- R = Read (select)
- W = Write (insert/update)
- D = Delete

### Organizations / Memberships
- admin: R/W/D
- manager: R (no membership management)
- member: R (directory-only)
- viewer: R (limited)

### Business Data (clients, deals, tasks, notes, proposals)
- admin: R/W/D (all)
- manager: R/W (all), D (own only recommended)
- member: R/W/D (own records)
- viewer: R only (no writes)

Privacy-sensitive defaults:
- tasks: read owner/assignee/manager/admin
- notes: read author/manager/admin
- proposals: read deal owner + proposal owner + manager/admin

---

## 9) Decisions to Lock Now (Recommended Defaults)

1) **Org isolation is strict**: every row has `org_id`
2) **Managers can read across org** for coaching
3) **Notes are private by default**: author + manager/admin only
4) **Tasks are semi-private**: owner/assignee + manager/admin
5) **Proposals are visible to deal owner** even if uploaded by someone else
6) **Activities are append-only** and do not store sensitive full content

---

## 10) Future Enhancements (Not Required for V1)

- `visibility` field for clients/deals/notes (private/org/shared)
- Fine-grained sharing table (record_shares)
- Per-type notification preferences
- Team scoping for managers (manager sees only assigned members)

---

## 11) Implementation Notes (RLS Practicalities)

- Prefer helper SQL functions:
  - `is_org_member(org_id)`
  - `is_org_admin(org_id)`
  - `is_org_manager(org_id)`
- Ensure all inserts validate `org_id` membership
- AI ingestion updates should run with service role or via privileged Edge Function