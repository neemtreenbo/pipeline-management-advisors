import type { DealStage } from '@/lib/deals'

/**
 * Centralized accent color palette for the app.
 *
 * Every named color has a light-mode and dark-mode HSL value.
 * Use `getColor(name, isDark)` to resolve the right value at render time,
 * or access individual maps (`STAGE_COLORS`, `SOURCE_COLORS`) for
 * domain-specific lookups.
 *
 * When adding a new accent color, add it to ACCENT_PALETTE first,
 * then reference it from any domain map.
 */

// ─── Base palette ───────────────────────────────────────────────────────────
export interface AccentColor {
    bg: string
    bgDark: string
}

/**
 * Seven distinct muted accents that work in both themes.
 * Named by hue so they stay domain-agnostic.
 */
export const ACCENT_PALETTE = {
    blue:   { bg: 'hsl(210, 60%, 72%)', bgDark: 'hsl(210, 50%, 45%)' },
    cyan:   { bg: 'hsl(185, 50%, 62%)', bgDark: 'hsl(185, 40%, 40%)' },
    teal:   { bg: 'hsl(160, 45%, 58%)', bgDark: 'hsl(160, 35%, 38%)' },
    gold:   { bg: 'hsl(45, 65%, 62%)',  bgDark: 'hsl(45, 50%, 42%)' },
    orange: { bg: 'hsl(28, 60%, 62%)',  bgDark: 'hsl(28, 45%, 42%)' },
    purple: { bg: 'hsl(280, 40%, 65%)', bgDark: 'hsl(280, 30%, 42%)' },
    green:  { bg: 'hsl(142, 45%, 55%)', bgDark: 'hsl(142, 35%, 38%)' },
} as const satisfies Record<string, AccentColor>

/** Resolve the theme-appropriate background for a palette entry. */
export function getAccentBg(color: AccentColor, isDark: boolean): string {
    return isDark ? color.bgDark : color.bg
}

// ─── Pipeline stage colors ──────────────────────────────────────────────────
export const STAGE_COLORS: Record<DealStage, AccentColor> = {
    'Opportunity':          ACCENT_PALETTE.blue,
    'Contacted':            ACCENT_PALETTE.cyan,
    'Engaged':              ACCENT_PALETTE.teal,
    'Schedule To Present':  ACCENT_PALETTE.gold,
    'Proposal Presented':   ACCENT_PALETTE.orange,
    'Decision Pending':     ACCENT_PALETTE.purple,
    'Closed':               ACCENT_PALETTE.green,
}

// ─── Service request status colors ──────────────────────────────────────────
export const SERVICE_STATUS_COLORS: Record<string, AccentColor> = {
    'New':                ACCENT_PALETTE.blue,
    'Pending Documents':  ACCENT_PALETTE.gold,
    'Ready to Submit':    ACCENT_PALETTE.purple,
    'Submitted':          ACCENT_PALETTE.cyan,
    'In Progress':        ACCENT_PALETTE.orange,
    'Completed':          ACCENT_PALETTE.green,
    'Rejected':           ACCENT_PALETTE.teal,
}

// ─── Service request priority colors ────────────────────────────────────────
export const SERVICE_PRIORITY_COLORS: Record<string, AccentColor> = {
    'low':    ACCENT_PALETTE.cyan,
    'medium': ACCENT_PALETTE.blue,
    'high':   ACCENT_PALETTE.orange,
    'urgent': ACCENT_PALETTE.purple,
}

// ─── Client source colors ───────────────────────────────────────────────────
export const SOURCE_COLORS: Record<string, AccentColor> = {
    referral:     ACCENT_PALETTE.green,
    family:       ACCENT_PALETTE.teal,
    friends:      ACCENT_PALETTE.cyan,
    social_media: ACCENT_PALETTE.purple,
    website:      ACCENT_PALETTE.orange,
    cold_call:    ACCENT_PALETTE.gold,
    event:        ACCENT_PALETTE.gold,
    other:        ACCENT_PALETTE.cyan,
}
