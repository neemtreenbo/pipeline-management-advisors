# Action Items — Implementation Reference

## Overview

The Action Items bar on the home page surfaces deals and tasks that need attention, ranked by urgency. It is a **client-side heuristic engine** — no backend scoring, no AI. All logic runs in the browser after fetching raw data from Supabase.

---

## Architecture

```
HomePage
  └── useDashboardData()              ← fetches all raw data
        ├── fetchDealsByOrg()         ← deals + client info
        ├── getTasks()                ← all org tasks
        ├── fetchRecentActivities()   ← activity feed (for display)
        └── fetchDealActivitiesMap()  ← last activity per deal (for staleness)
              └── generateActionItems(deals, activityMap, tasks)
                    └── ActionItemsBar (UI)
```

---

## Key Files

| File | Role |
|------|------|
| `src/lib/dashboard.ts` | Rules config, data fetchers, `generateActionItems` |
| `src/hooks/useDashboardData.ts` | Orchestrates fetching, exposes `actionItems`, `loading`, `refresh` |
| `src/components/dashboard/ActionItemsBar.tsx` | Renders the bar, rows, urgency badges |
| `src/pages/app/HomePage.tsx` | Mounts the bar, passes `onRefresh` and `onOpenRules` |
| `src/pages/app/settings/RulesPage.tsx` | UI to tune thresholds, saved to `localStorage` |

---

## Rules Configuration

Rules are stored in `localStorage` under the key `pma-rules-config` and loaded via `loadRules()` at startup. Defaults are defined in `DEFAULT_RULES`.

### Active Rules

| Key | Default | Description |
|-----|---------|-------------|
| `staleDealDays` | 14 | Days without activity before a deal is flagged HIGH |
| `earlyStageFollowUpDays` | 5 | Days idle in an early stage before flagging MEDIUM |
| `earlyStages` | `['Contacted', 'Engaged']` | Stages considered "early" for follow-up checks |
| `taskOverdueDays` | 0 | Grace period (days past due) before a task appears |
| `taskDueSoonDays` | 3 | Days before due date to surface a task as LOW |
| `taskOverdueHighThreshold` | 3 | Days overdue to escalate a task from MEDIUM → HIGH |
| `activityFeedLimit` | 20 | Max activities fetched for the feed |
| `activityLookbackDays` | 60 | How far back the staleness check looks |

Rules are editable at `/app/settings/rules` (gear icon in the Action Items header).

---

## Deal Rules (`generateActionItems`)

Only **non-Closed** deals are evaluated. Staleness is determined by the last entry in the `activities` table where `entity_type = 'deal'`, within the `activityLookbackDays` window.

### HIGH — Stale Deal
```
idle >= staleDealDays
```
Fires when no activity has been recorded for the deal in 14+ days.
Link: `/app/pipeline?deal=<id>` → opens DealDetailsModal directly.

### HIGH — No Recorded Activity
```
idle === null (no activity entry at all)
```
Fires for deals with zero activity entries in the lookback window.
Link: `/app/pipeline?deal=<id>`

### MEDIUM — Early-Stage Follow-up
```
idle >= earlyStageFollowUpDays
AND idle < staleDealDays
AND deal.stage in earlyStages
```
Fires for deals in early stages (Contacted, Engaged) that have been quiet for 5–13 days.
Link: `/app/pipeline?deal=<id>`

> **Note:** Close-date–based rules (`closingSoonDays`, `closingNoProposalDays`) were removed because `expected_close_date` is not used in this workflow.

---

## Task Rules (`generateActionItems`)

Tasks with no `due_at` are always skipped. Completed tasks are always skipped.

### HIGH or MEDIUM — Overdue Task
```
dueDate < now AND overdueDays >= taskOverdueDays
```
- Overdue by `taskOverdueHighThreshold`+ days → **HIGH**
- Overdue by less → **MEDIUM**

Link: `/app/tasks`

### LOW — Due Soon
```
dueDate >= now AND dueDate <= (now + taskDueSoonDays)
```
Fires for tasks due within the next 3 days that are not yet overdue.
Link: `/app/tasks`

---

## Urgency Sorting

Items are sorted: `high → medium → low`. Within the same urgency level, order is insertion order (deals first, then tasks).

---

## Refresh Behaviour

- Data loads **once on mount** of `HomePage`.
- The ↻ button in the bar header calls `refresh` (re-runs `loadData`), which also calls `refreshRules()` to pick up any rule changes saved in `localStorage`.
- Navigating away from and back to `/app/home` also triggers a full reload.
- There is **no polling or real-time subscription**.

---

## Data Flow — Staleness Detection

```
fetchDealActivitiesMap(orgId)
  SELECT entity_id, created_at FROM activities
  WHERE entity_type = 'deal'
    AND org_id = ?
    AND created_at >= (now - activityLookbackDays)
  ORDER BY created_at DESC
→ returns Map<dealId, lastActivityTimestamp>

daysSince(timestamp) = floor((now - timestamp) / 86400000)
```

If a deal ID is absent from the map, `idle` is `null` → triggers "No recorded activity" HIGH item.

---

## Adding a New Rule

1. Add the field to `RulesConfig` and `DEFAULT_RULES` in `src/lib/dashboard.ts`
2. Add a `RuleMeta` entry to `RULE_DEFINITIONS` (controls the settings UI automatically)
3. Use `RULES.<yourField>` inside `generateActionItems`
