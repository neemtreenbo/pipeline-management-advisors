import type { ReactNode } from 'react'

export interface PlanType {
    label: string
    value: string
    icon: ReactNode
}

export const PLAN_TYPES: PlanType[] = [
    { label: 'Retire', value: 'Retirement Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="3"/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5"/><path d="M12 3l1.5-1.5M13 4.5l1.5-.5"/></svg> },
    { label: 'Education', value: 'Education Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L1 5l7 4 7-4-7-4z"/><path d="M3 7v4c0 1.7 2.2 3 5 3s5-1.3 5-3V7"/></svg> },
    { label: 'Insurance', value: 'Insurance Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L2 4v4c0 3.3 2.6 6.4 6 7 3.4-.6 6-3.7 6-7V4L8 1z"/></svg> },
    { label: 'Health', value: 'Health Protection Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2H10V6H14V10H10V14H6V10H2V6H6V2Z"/></svg> },
    { label: 'Critical', value: 'Critical Illness Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2C5 2 2 5 2 8s3 6 6 6 6-3 6-6-3-6-6-6z"/><path d="M4 8h3l1-2 2 4 1-2h3"/></svg> },
    { label: 'Invest', value: 'Investment Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 14l4-5 3 3 5-7"/><path d="M11 5h3v3"/></svg> },
    { label: 'Estate', value: 'Estate Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l6-5 6 5"/><path d="M4 6v7h8V6"/><path d="M6.5 13V10h3v3"/></svg> },
    { label: 'Legacy', value: 'Legacy Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h8v10H4z"/><path d="M6 6h4M6 8.5h4M6 11h2"/></svg> },
    { label: 'Milestone', value: 'Life Milestone Plan', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14V2"/><path d="M4 2h7l-2 3 2 3H4"/></svg> },
]

/** Plain string list for contexts that don't need icons (e.g. InlineDealsList) */
export const PLAN_TYPE_VALUES = PLAN_TYPES.map((p) => p.value)
