# Supabase Migration Skill

Generate and write Supabase SQL migrations for this project following established conventions.

## Trigger

Activate when the user asks to:
- Create a new database table or modify an existing one
- Add/remove columns, indexes, or constraints
- Create or update RLS policies
- Add triggers, functions, or storage buckets
- Any schema change that requires a migration

## Instructions

### 1. Gather Requirements

Before writing the migration, confirm:
- What tables/columns are being added or changed
- Whether RLS policies are needed (they almost always are)
- Whether the change affects `database.types.ts` (it almost always does)

### 2. Generate the Migration File

**File naming:** Use timestamp format `YYYYMMDDHHMMSS_short_description.sql` in `supabase/migrations/`.

Generate the current timestamp:
```bash
date -u +%Y%m%d%H%M%S
```

**File location:** `supabase/migrations/<timestamp>_<description>.sql`

### 3. Follow These SQL Conventions

All migrations in this project follow a consistent structure. Apply these rules:

#### Table Creation Pattern
```sql
CREATE TABLE IF NOT EXISTS public.<table_name> (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- owner/creator reference:
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  -- domain columns here...
  data        jsonb DEFAULT '{}',         -- extensible metadata field
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
```

Key rules:
- Always use `uuid` primary keys with `gen_random_uuid()`
- Always include `org_id` referencing `organizations(id)` with `ON DELETE CASCADE` for multi-org scoping
- User references use `ON DELETE SET NULL`; org/parent references use `ON DELETE CASCADE`
- Include a `data jsonb DEFAULT '{}'` column for extensible metadata
- Include `created_at` and `updated_at` timestamps
- Use `text` for string columns, not `varchar`
- Use `timestamptz` for all timestamps, not `timestamp`
- Use `numeric` for monetary values

#### Auto-update Trigger
Every table with `updated_at` needs:
```sql
CREATE TRIGGER <table>_updated_at
  BEFORE UPDATE ON public.<table>
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

The `handle_updated_at()` function already exists (created in migration 0000).

#### RLS Policies (Required)
Always enable RLS and add policies. Follow this standard pattern:

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can view
CREATE POLICY "Org members can view <table>"
  ON public.<table> FOR SELECT
  USING (public.is_org_member(org_id));

-- INSERT: non-viewers can create, must be the owner
CREATE POLICY "Org members can create <table>"
  ON public.<table> FOR INSERT
  WITH CHECK (
    public.is_org_non_viewer(org_id)
    AND owner_id = auth.uid()
  );

-- UPDATE: owner or managers
CREATE POLICY "Owner or managers can update <table>"
  ON public.<table> FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR public.is_org_manager(org_id)
  );

-- DELETE: owner or admins
CREATE POLICY "Owner or admins can delete <table>"
  ON public.<table> FOR DELETE
  USING (
    owner_id = auth.uid()
    OR public.is_org_admin(org_id)
  );
```

Available RLS helper functions:
- `public.is_org_member(org_id)` — any active member (admin, manager, member, viewer)
- `public.is_org_non_viewer(org_id)` — member, manager, or admin (excludes viewer)
- `public.is_org_manager(org_id)` — manager or admin
- `public.is_org_admin(org_id)` — admin only

#### Column Alterations
For adding columns to existing tables:
```sql
ALTER TABLE public.<table> ADD COLUMN IF NOT EXISTS <column> <type> <default>;
```

#### Storage Buckets
If the migration creates a storage bucket:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('<bucket-name>', '<bucket-name>', false)
ON CONFLICT (id) DO NOTHING;

-- Add storage RLS policies for authenticated users
CREATE POLICY "Authenticated users can read <bucket> files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = '<bucket-name>');

CREATE POLICY "Authenticated users can upload <bucket> files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = '<bucket-name>');

CREATE POLICY "Authenticated users can delete <bucket> files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = '<bucket-name>');
```

#### Section Comments
Use section headers for readability:
```sql
-- ============================================================
-- PART N: Description
-- ============================================================
```

### 4. Post-Migration Checklist

After writing the migration SQL file, remind the user to:

1. **Apply the migration** — via Supabase CLI (`supabase db push`) or Supabase MCP tool (`apply_migration`)
2. **Regenerate types** — run `supabase gen types typescript --local > src/lib/database.types.ts` (or equivalent for remote) so the TypeScript types stay in sync
3. **Update `src/lib/`** — if a new table was created, a corresponding data access module should be added in `src/lib/` following the existing pattern:
   - Export typed async functions that throw on error
   - All queries must filter by `org_id`
   - Use `Tables<'table_name'>` types from `database.types.ts`
   - Log significant actions to the `activities` table
4. **Verify build** — run `npm run build` to confirm no type errors

### 5. Example: Full New Table Migration

```sql
-- ============================================================
-- Migration: Create emails table
-- ============================================================

-- ============================================================
-- PART 1: Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.emails (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id   uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  subject     text NOT NULL,
  body        text,
  sent_at     timestamptz,
  data        jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TRIGGER emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- PART 2: RLS Policies
-- ============================================================

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view emails"
  ON public.emails FOR SELECT
  USING (public.is_org_member(org_id));

CREATE POLICY "Org members can create emails"
  ON public.emails FOR INSERT
  WITH CHECK (
    public.is_org_non_viewer(org_id)
    AND owner_id = auth.uid()
  );

CREATE POLICY "Owner or managers can update emails"
  ON public.emails FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR public.is_org_manager(org_id)
  );

CREATE POLICY "Owner or admins can delete emails"
  ON public.emails FOR DELETE
  USING (
    owner_id = auth.uid()
    OR public.is_org_admin(org_id)
  );
```
