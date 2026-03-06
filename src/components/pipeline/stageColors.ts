import type { DealStage } from '@/lib/deals'

/**
 * Stage color palette for Gantt bars and column indicators.
 * Each stage gets a distinct but muted color that works in both light and dark mode.
 * Colors use Tailwind-compatible HSL values applied via inline styles.
 */
export const STAGE_COLORS: Record<DealStage, { bg: string; bgDark: string }> = {
    'Opportunity':          { bg: 'hsl(210, 60%, 72%)', bgDark: 'hsl(210, 50%, 45%)' },
    'Contacted':            { bg: 'hsl(185, 50%, 62%)', bgDark: 'hsl(185, 40%, 40%)' },
    'Engaged':              { bg: 'hsl(160, 45%, 58%)', bgDark: 'hsl(160, 35%, 38%)' },
    'Schedule To Present':  { bg: 'hsl(45, 65%, 62%)',  bgDark: 'hsl(45, 50%, 42%)' },
    'Proposal Presented':   { bg: 'hsl(28, 60%, 62%)',  bgDark: 'hsl(28, 45%, 42%)' },
    'Decision Pending':     { bg: 'hsl(280, 40%, 65%)', bgDark: 'hsl(280, 30%, 42%)' },
    'Closed':               { bg: 'hsl(142, 45%, 55%)', bgDark: 'hsl(142, 35%, 38%)' },
}
